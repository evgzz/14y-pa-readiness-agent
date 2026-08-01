import type {
  ApplicabilityResult,
  CriteriaResult,
  ExtractionOverride,
  VerifiedAssertion,
} from '@/types/readiness';
import { canonicalizeJson, sha256Hex } from '@/lib/canonical';

export interface ExecutionManifestInput {
  patientId: string;
  serviceRequest: {
    id: string;
    versionId: string | null;
    applicabilityFieldsHash: string;
  };
  documentReference: {
    id: string;
    versionId: string | null;
    attachmentIndex: number | null;
    sourceHash: string | null;
  };
  policy: {
    key: string;
    hash: string;
  };
  engineVersion: string;
  extractor: {
    mode: 'mock' | 'llm' | 'not-run';
    model: string | null;
    promptHash: string | null;
    schemaHash: string;
  };
  applicability: ApplicabilityResult;
  verifiedAssertions: Record<string, VerifiedAssertion>;
  extractionOverrides: Record<string, ExtractionOverride>;
  criteriaResults: CriteriaResult[];
}

export function buildExecutionManifest(input: ExecutionManifestInput) {
  return {
    ...input,
    verifiedAssertions: Object.fromEntries(
      Object.entries(input.verifiedAssertions).sort(([a], [b]) => a.localeCompare(b)),
    ),
    extractionOverrides: Object.fromEntries(
      Object.entries(input.extractionOverrides).sort(([a], [b]) => a.localeCompare(b)),
    ),
    criteriaResults: [...input.criteriaResults].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function hashExecutionManifest(
  manifest: ReturnType<typeof buildExecutionManifest>,
): string {
  return sha256Hex(canonicalizeJson(manifest));
}
