import { writeFileSync, mkdirSync } from 'node:fs';
import { canonicalizeJson, sha256Hex } from '../lib/canonical';
import { deriveOverallStatus, ENGINE_VERSION, evaluateCriteria } from '../lib/evaluateReadiness';
import { POLICY_REGISTRY } from '../lib/policyRegistry';
import type { CriterionId, ReadinessResult, VerifiedAssertion } from '../types/readiness';

const PINNED_SOURCE_COMMIT = 'b054618be3b135006afb15dadb40d45648982fc4';
const POLICY_KEY = 'lumbar-mri-demo-v1' as const;
const EXTRACTION_SCHEMA_HASH = sha256Hex('readiness-extraction-schema-v2');

function hashJson(value: unknown): string {
  return sha256Hex(canonicalizeJson(value));
}

function makeResult(
  caseId: string,
  verifiedAssertions: Map<CriterionId, VerifiedAssertion>,
): ReadinessResult {
  const criteria = evaluateCriteria({
    policyVersion: POLICY_KEY,
    verifiedAssertions,
    extractionOverrides: new Map(),
    documentReferenceId: `doc-${caseId}`,
    documentVersionId: '1',
    attachmentIndex: 0,
  });
  const status = deriveOverallStatus(POLICY_KEY, criteria);
  const sourceText = canonicalizeJson(
    [...verifiedAssertions.entries()].map(([id, value]) => ({ id, assertion: value.assertion })),
  );
  const manifestBasis = {
    caseId,
    policyHash: POLICY_REGISTRY[POLICY_KEY].hash,
    engineVersion: ENGINE_VERSION,
    criteria,
  };

  return {
    status,
    policy: {
      policyVersion: POLICY_KEY,
      policyHash: POLICY_REGISTRY[POLICY_KEY].hash,
    },
    applicability: {
      status: 'applicable',
      requestDate: '2026-08-01',
      reasons: ['APPLICABLE'],
    },
    fingerprints: {
      sourceHash: sha256Hex(sourceText),
      policyHash: POLICY_REGISTRY[POLICY_KEY].hash,
      engineVersion: ENGINE_VERSION,
      extractorMode: 'mock',
      extractorModel: null,
      promptHash: null,
      extractionSchemaHash: EXTRACTION_SCHEMA_HASH,
      executionManifestHash: hashJson(manifestBasis),
      gitCommit: PINNED_SOURCE_COMMIT,
    },
    criteria,
    reviewStatus: 'pending',
  };
}

function radiculopathy(polarity: 'present' | 'absent' | 'uncertain'): VerifiedAssertion {
  return {
    assertion: {
      criterionId: 'radiculopathy_symptoms',
      polarity,
      quote: polarity === 'present' ? 'Radicular pain is documented.' : `Radicular symptoms are ${polarity}.`,
    },
    startCodeUnit: 0,
    endCodeUnit: 30,
  };
}

function therapy(durationWeeks: number | null, completed: boolean | null): VerifiedAssertion {
  return {
    assertion: {
      criterionId: 'conservative_tx_6wks',
      therapyType: 'physical-therapy',
      durationWeeks,
      completed,
      quote: durationWeeks === null ? 'Therapy duration is not documented.' : `${durationWeeks} weeks of physical therapy documented.`,
    },
    startCodeUnit: 31,
    endCodeUnit: 80,
  };
}

const fixtures: Array<{ caseId: string; assertions: Map<CriterionId, VerifiedAssertion> }> = [
  {
    caseId: 'PA-REAL-ENGINE-READY-001',
    assertions: new Map<CriterionId, VerifiedAssertion>([
      ['conservative_tx_6wks', therapy(8, true)],
      ['radiculopathy_symptoms', radiculopathy('present')],
    ]),
  },
  {
    caseId: 'PA-REAL-ENGINE-INCOMPLETE-001',
    assertions: new Map<CriterionId, VerifiedAssertion>([
      ['conservative_tx_6wks', therapy(4, true)],
      ['radiculopathy_symptoms', radiculopathy('present')],
    ]),
  },
  {
    caseId: 'PA-REAL-ENGINE-UNVERIFIED-001',
    assertions: new Map<CriterionId, VerifiedAssertion>([
      ['conservative_tx_6wks', therapy(null, null)],
      ['radiculopathy_symptoms', radiculopathy('uncertain')],
    ]),
  },
];

const items = fixtures.map(({ caseId, assertions }) => {
  const outcome = { kind: 'READINESS_RESULT' as const, result: makeResult(caseId, assertions) };
  return { case_id: caseId, outcome, outcome_hash: hashJson(outcome) };
});

const bundleBase = {
  schema_version: 'WT-PA-REAL-AGENT-RUN-1.0.0',
  run_id: `PA-REAL-ENGINE-${process.env.GITHUB_RUN_ID ?? 'LOCAL'}`,
  source_repository: 'evgzz/14y-pa-readiness-agent',
  source_commit: PINNED_SOURCE_COMMIT,
  captured_at: new Date().toISOString(),
  execution_scope: 'PINNED_REAL_ENGINE_CODE_WITH_NON_PHI_LOCAL_FIXTURES',
  workflow_run_id: process.env.GITHUB_RUN_ID ?? null,
  workflow_run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  items,
};
const bundle = { ...bundleBase, run_hash: hashJson(bundleBase) };

mkdirSync('../welltrace-evidence', { recursive: true });
writeFileSync('../welltrace-evidence/pa-real-engine-run.json', `${JSON.stringify(bundle, null, 2)}\n`);

const observed = Object.fromEntries(
  items.map((item) => [item.case_id, item.outcome.result.status]),
);
if (observed['PA-REAL-ENGINE-READY-001'] !== 'ready') throw new Error('ready fixture did not produce ready');
if (observed['PA-REAL-ENGINE-INCOMPLETE-001'] !== 'incomplete') throw new Error('incomplete fixture did not produce incomplete');
if (observed['PA-REAL-ENGINE-UNVERIFIED-001'] !== 'unverified') throw new Error('unverified fixture did not produce unverified');

console.log(JSON.stringify({
  source_commit: PINNED_SOURCE_COMMIT,
  engine_version: ENGINE_VERSION,
  policy_hash: POLICY_REGISTRY[POLICY_KEY].hash,
  observed,
  run_hash: bundle.run_hash,
}, null, 2));
