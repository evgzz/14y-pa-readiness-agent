import type { CriterionId } from '@/types/readiness';
import { canonicalizeJson, sha256Hex } from '@/lib/canonical';

export type CriterionRule =
  | { kind: 'polarity-present' }
  | {
      kind: 'therapy-duration';
      minimumWeeks: number;
      permittedTherapyTypes: string[];
    }
  | {
      kind: 'objective-finding-present';
      permittedFindingTypes: string[];
    };

export interface PolicyCriterionSpec {
  id: CriterionId;
  label: string;
  description: string;
  rule: CriterionRule;
}

export type PolicyRuleGraph =
  | { criterionId: CriterionId }
  | { allOf: PolicyRuleGraph[] }
  | { anyOf: PolicyRuleGraph[] };

export interface PolicyDefinition {
  policyVersion: string;
  label: string;
  applicableCodes: { system: string; code: string }[];
  effectivePeriod: { start: string; end?: string };
  source: { issuer: string; policyId: string };
  criteria: PolicyCriterionSpec[];
  ruleGraph: PolicyRuleGraph;
}

const LUMBAR_MRI_POLICY: PolicyDefinition = {
  policyVersion: 'lumbar-mri-demo-v1',
  label: 'Lumbar Spine MRI Clinical Coverage Policy',
  applicableCodes: [
    {
      system: 'http://www.ama-assn.org/go/cpt',
      code: '72148',
    },
  ],
  effectivePeriod: { start: '2026-01-01' },
  source: {
    issuer: 'Synthetic Demo Payer',
    policyId: 'LUMBAR-MRI-DEMO',
  },
  criteria: [
    {
      id: 'radiculopathy_symptoms',
      label: 'Documented Radicular Symptoms',
      description: 'Active radicular pain or symptoms must be documented.',
      rule: { kind: 'polarity-present' },
    },
    {
      id: 'conservative_tx_6wks',
      label: 'Conservative Therapy of at Least Six Weeks',
      description: 'A permitted conservative therapy must be completed for at least six weeks.',
      rule: {
        kind: 'therapy-duration',
        minimumWeeks: 6,
        permittedTherapyTypes: [
          'physical-therapy',
          'home-exercise',
          'medication',
          'other',
        ],
      },
    },
    {
      id: 'neurological_deficit',
      label: 'Objective Neurological Deficit',
      description: 'A motor, reflex, or sensory deficit must be documented.',
      rule: {
        kind: 'objective-finding-present',
        permittedFindingTypes: ['motor', 'reflex', 'sensory'],
      },
    },
  ],
  ruleGraph: {
    allOf: [
      { criterionId: 'conservative_tx_6wks' },
      {
        anyOf: [
          { criterionId: 'radiculopathy_symptoms' },
          { criterionId: 'neurological_deficit' },
        ],
      },
    ],
  },
};

export function computePolicyHash(definition: PolicyDefinition): string {
  return sha256Hex(canonicalizeJson(definition));
}

export const POLICY_REGISTRY = {
  'lumbar-mri-demo-v1': {
    definition: LUMBAR_MRI_POLICY,
    hash: computePolicyHash(LUMBAR_MRI_POLICY),
  },
} as const;

export type PolicyVersion = keyof typeof POLICY_REGISTRY;
