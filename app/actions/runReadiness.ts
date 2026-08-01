'use server';

import type { DocumentReference, ServiceRequest } from '@medplum/fhirtypes';
import {
  ReadinessRequestSchema,
  type CriterionId,
  type ExtractionOverride,
  type ReadinessResult,
  type VerifiedAssertion,
} from '@/types/readiness';
import { getServerMedplumClient } from '@/lib/medplum';
import { POLICY_REGISTRY } from '@/lib/policyRegistry';
import { evaluateApplicability } from '@/lib/evaluateApplicability';
import { verifyExtractorResponse } from '@/lib/extractorGateway';
import {
  deriveOverallStatus,
  ENGINE_VERSION,
  evaluateCriteria,
} from '@/lib/evaluateReadiness';
import { buildExecutionManifest, hashExecutionManifest } from '@/lib/audit';
import { canonicalizeJson, sha256Hex } from '@/lib/canonical';
import { persistEvaluationTask } from '@/lib/fhirAudit';

const POLICY_KEY = 'lumbar-mri-demo-v1' as const;
const EXTRACTION_SCHEMA_HASH = sha256Hex('readiness-extraction-schema-v2');
const MAX_SOURCE_BYTES = 1_000_000;

function mapToSortedRecord<T>(map: Map<CriterionId, T>): Record<string, T> {
  return Object.fromEntries(
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
}

export async function runReadiness(rawInput: unknown): Promise<ReadinessResult> {
  const input = ReadinessRequestSchema.parse(rawInput);
  const medplum = await getServerMedplumClient();

  const [serviceRequest, documentReference] = await Promise.all([
    medplum.readResource<ServiceRequest>('ServiceRequest', input.serviceRequestId),
    medplum.readResource<DocumentReference>(
      'DocumentReference',
      input.documentReferenceId,
    ),
  ]);

  if (
    serviceRequest.subject?.reference !== `Patient/${input.patientId}` ||
    documentReference.subject?.reference !== `Patient/${input.patientId}`
  ) {
    throw new Error('Resource scope mismatch.');
  }

  const registry = POLICY_REGISTRY[POLICY_KEY];
  const applicability = evaluateApplicability(
    serviceRequest,
    registry.definition,
  );

  let sourceHash: string | null = null;
  let attachmentIndex: number | null = null;
  let verifiedAssertions = new Map<CriterionId, VerifiedAssertion>();
  let extractionOverrides = new Map<CriterionId, ExtractionOverride>();
  let criteriaResults: ReadinessResult['criteria'] = [];
  let overallStatus: ReadinessResult['status'];
  let extractorMode: 'mock' | 'not-run' = 'not-run';

  if (applicability.status === 'not-applicable') {
    overallStatus = 'not-applicable';
  } else if (applicability.status === 'unknown') {
    overallStatus = 'unverified';
  } else {
    const index =
      documentReference.content?.findIndex(
        (entry) =>
          entry.attachment?.contentType === 'text/plain; charset=utf-8' &&
          Boolean(entry.attachment?.data),
      ) ?? -1;

    if (index < 0) {
      throw new Error('No supported inline UTF-8 text attachment was found.');
    }

    attachmentIndex = index;
    const data = documentReference.content?.[index]?.attachment?.data;
    if (!data) {
      throw new Error('Document attachment data is missing.');
    }

    const rawBytes = Buffer.from(data, 'base64');
    if (rawBytes.length > MAX_SOURCE_BYTES) {
      throw new Error('Document exceeds the one-megabyte demo limit.');
    }

    sourceHash = sha256Hex(rawBytes);
    const rawText = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
    extractorMode = 'mock';

    const rawExtractorOutput: unknown = {
      assertions: [
        {
          criterionId: 'radiculopathy_symptoms',
          polarity: 'present',
          quote:
            'Patient reports severe lower back pain radiating down the right leg (L5 distribution).',
        },
        {
          criterionId: 'conservative_tx_6wks',
          therapyType: 'physical-therapy',
          durationWeeks: 8,
          completed: true,
          quote:
            'Completed 8 weeks of physical therapy and tried daily NSAIDs with no significant relief.',
        },
        {
          criterionId: 'neurological_deficit',
          polarity: 'present',
          findingType: 'reflex',
          finding: 'Right ankle reflex is 0/2.',
          quote:
            'On exam, right ankle reflex (S1) is 0/2 and positive straight leg raise at 30 degrees.',
        },
      ],
    };

    const expectedCriterionIds = registry.definition.criteria.map(
      (criterion) => criterion.id,
    );
    const verification = verifyExtractorResponse(
      rawExtractorOutput,
      rawText,
      expectedCriterionIds,
    );
    verifiedAssertions = verification.verifiedAssertions;
    extractionOverrides = verification.extractionOverrides;

    criteriaResults = evaluateCriteria({
      policyVersion: POLICY_KEY,
      verifiedAssertions,
      extractionOverrides,
      documentReferenceId: documentReference.id ?? input.documentReferenceId,
      documentVersionId: documentReference.meta?.versionId ?? null,
      attachmentIndex,
    });
    overallStatus = deriveOverallStatus(POLICY_KEY, criteriaResults);
  }

  const applicabilityFieldsHash = sha256Hex(
    canonicalizeJson({
      status: serviceRequest.status ?? null,
      intent: serviceRequest.intent ?? null,
      authoredOn: serviceRequest.authoredOn ?? null,
      coding:
        serviceRequest.code?.coding
          ?.map((coding) => ({
            system: coding.system ?? null,
            code: coding.code ?? null,
          }))
          .sort((a, b) =>
            `${a.system}|${a.code}`.localeCompare(`${b.system}|${b.code}`),
          ) ?? [],
    }),
  );

  const manifest = buildExecutionManifest({
    patientId: input.patientId,
    serviceRequest: {
      id: serviceRequest.id ?? input.serviceRequestId,
      versionId: serviceRequest.meta?.versionId ?? null,
      applicabilityFieldsHash,
    },
    documentReference: {
      id: documentReference.id ?? input.documentReferenceId,
      versionId: documentReference.meta?.versionId ?? null,
      attachmentIndex,
      sourceHash,
    },
    policy: { key: POLICY_KEY, hash: registry.hash },
    engineVersion: ENGINE_VERSION,
    extractor: {
      mode: extractorMode,
      model: null,
      promptHash: null,
      schemaHash: EXTRACTION_SCHEMA_HASH,
    },
    applicability,
    verifiedAssertions: mapToSortedRecord(verifiedAssertions),
    extractionOverrides: mapToSortedRecord(extractionOverrides),
    criteriaResults,
  });

  const executionManifestHash = hashExecutionManifest(manifest);
  const evaluationTask = await persistEvaluationTask(
    medplum,
    executionManifestHash,
    {
      status: 'completed',
      intent: 'order',
      businessStatus: {
        coding: [
          {
            system: 'https://14y.health/fhir/CodeSystem/readiness-status',
            code: overallStatus,
          },
        ],
      },
      for: { reference: `Patient/${input.patientId}` },
      focus: { reference: `ServiceRequest/${input.serviceRequestId}` },
      input: [
        {
          type: { text: 'Execution Manifest SHA-256' },
          valueString: executionManifestHash,
        },
        {
          type: { text: 'Policy SHA-256' },
          valueString: registry.hash,
        },
      ],
      output: [
        {
          type: { text: 'Readiness Result' },
          valueString: JSON.stringify({
            status: overallStatus,
            applicability,
            criteriaResults,
          }),
        },
      ],
    },
  );

  return {
    status: overallStatus,
    policy: {
      policyVersion: POLICY_KEY,
      policyHash: registry.hash,
    },
    applicability,
    fingerprints: {
      sourceHash,
      policyHash: registry.hash,
      engineVersion: ENGINE_VERSION,
      extractorMode,
      extractorModel: null,
      promptHash: null,
      extractionSchemaHash: EXTRACTION_SCHEMA_HASH,
      executionManifestHash,
      gitCommit:
        process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? null,
    },
    criteria: criteriaResults,
    reviewStatus: 'pending',
    evaluationTaskId: evaluationTask.id,
  };
}
