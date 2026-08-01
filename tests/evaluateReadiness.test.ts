import { describe, expect, test } from 'vitest';
import type { CriterionId, CriterionStatus, VerifiedAssertion } from '@/types/readiness';
import {
  deriveOverallStatus,
  evaluateCriteria,
  evaluateRuleGraph,
} from '@/lib/evaluateReadiness';

function statusMap(entries: [CriterionId, CriterionStatus][]) {
  return new Map<CriterionId, CriterionStatus>(entries);
}

describe('three-valued rule graph', () => {
  test('anyOf succeeds when one branch is met and another is unknown', () => {
    expect(
      evaluateRuleGraph(
        {
          anyOf: [
            { criterionId: 'radiculopathy_symptoms' },
            { criterionId: 'neurological_deficit' },
          ],
        },
        statusMap([
          ['radiculopathy_symptoms', 'met'],
          ['neurological_deficit', 'unverified'],
        ]),
      ),
    ).toBe('satisfied');
  });

  test('allOf is unknown when no child fails and one is unknown', () => {
    expect(
      evaluateRuleGraph(
        {
          allOf: [
            { criterionId: 'conservative_tx_6wks' },
            { criterionId: 'radiculopathy_symptoms' },
          ],
        },
        statusMap([
          ['conservative_tx_6wks', 'met'],
          ['radiculopathy_symptoms', 'unverified'],
        ]),
      ),
    ).toBe('unknown');
  });

  test('policy is ready when therapy is met, radiculopathy met, and neuro is unknown', () => {
    const verified = new Map<CriterionId, VerifiedAssertion>([
      [
        'conservative_tx_6wks',
        {
          assertion: {
            criterionId: 'conservative_tx_6wks',
            therapyType: 'physical-therapy',
            durationWeeks: 8,
            completed: true,
            quote: 'PT completed.',
          },
          startCodeUnit: 0,
          endCodeUnit: 13,
        },
      ],
      [
        'radiculopathy_symptoms',
        {
          assertion: {
            criterionId: 'radiculopathy_symptoms',
            polarity: 'present',
            quote: 'Radicular pain.',
          },
          startCodeUnit: 14,
          endCodeUnit: 29,
        },
      ],
    ]);
    const results = evaluateCriteria({
      policyVersion: 'lumbar-mri-demo-v1',
      verifiedAssertions: verified,
      extractionOverrides: new Map(),
      documentReferenceId: 'doc',
      documentVersionId: '1',
      attachmentIndex: 0,
    });
    expect(deriveOverallStatus('lumbar-mri-demo-v1', results)).toBe('ready');
  });
});
