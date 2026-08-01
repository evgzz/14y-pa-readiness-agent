import { describe, expect, test } from 'vitest';
import { buildExecutionManifest, hashExecutionManifest } from '@/lib/audit';

function baseManifest() {
  return buildExecutionManifest({
    patientId: 'patient-1',
    serviceRequest: {
      id: 'sr-1',
      versionId: '1',
      applicabilityFieldsHash: 'fields-a',
    },
    documentReference: {
      id: 'doc-1',
      versionId: '1',
      attachmentIndex: 0,
      sourceHash: 'source-a',
    },
    policy: { key: 'policy-v1', hash: 'policy-a' },
    engineVersion: 'engine-a',
    extractor: {
      mode: 'mock',
      model: null,
      promptHash: null,
      schemaHash: 'schema-a',
    },
    applicability: {
      status: 'applicable',
      requestDate: '2026-02-01',
      reasons: ['APPLICABLE'],
    },
    verifiedAssertions: {},
    extractionOverrides: {},
    criteriaResults: [],
  });
}

describe('execution manifest hashing', () => {
  test.each([
    ['service request version', (m: ReturnType<typeof baseManifest>) => { m.serviceRequest.versionId = '2'; }],
    ['applicability fields', (m: ReturnType<typeof baseManifest>) => { m.serviceRequest.applicabilityFieldsHash = 'fields-b'; }],
    ['document version', (m: ReturnType<typeof baseManifest>) => { m.documentReference.versionId = '2'; }],
    ['source hash', (m: ReturnType<typeof baseManifest>) => { m.documentReference.sourceHash = 'source-b'; }],
    ['policy hash', (m: ReturnType<typeof baseManifest>) => { m.policy.hash = 'policy-b'; }],
    ['engine version', (m: ReturnType<typeof baseManifest>) => { m.engineVersion = 'engine-b'; }],
    ['schema hash', (m: ReturnType<typeof baseManifest>) => { m.extractor.schemaHash = 'schema-b'; }],
    ['override', (m: ReturnType<typeof baseManifest>) => {
      m.extractionOverrides = {
        neurological_deficit: {
          evidenceStatus: 'hallucinated-quote',
          status: 'unverified',
          reasonCode: 'QUOTE_NOT_FOUND',
        },
      };
    }],
  ])('changes when %s changes', (_label: string, mutate: (manifest: ReturnType<typeof baseManifest>) => void) => {
    const before = baseManifest();
    const after = structuredClone(before);
    mutate(after);
    expect(hashExecutionManifest(before)).not.toBe(hashExecutionManifest(after));
  });
});
