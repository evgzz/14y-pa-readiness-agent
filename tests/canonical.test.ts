import { describe, expect, test } from 'vitest';
import { canonicalizeJson, sha256Hex } from '@/lib/canonical';
import { computePolicyHash, POLICY_REGISTRY } from '@/lib/policyRegistry';

describe('canonical hashing', () => {
  test('object insertion order does not change canonical output', () => {
    expect(canonicalizeJson({ b: 2, a: 1 })).toBe(
      canonicalizeJson({ a: 1, b: 2 }),
    );
  });

  test('nested policy changes alter the policy hash', () => {
    const base = structuredClone(POLICY_REGISTRY['lumbar-mri-demo-v1'].definition);
    const changedCode = structuredClone(base);
    changedCode.applicableCodes[0].code = '72149';
    const changedRule = structuredClone(base);
    changedRule.ruleGraph = { criterionId: 'conservative_tx_6wks' };
    expect(computePolicyHash(base)).not.toBe(computePolicyHash(changedCode));
    expect(computePolicyHash(base)).not.toBe(computePolicyHash(changedRule));
  });

  test('hash is stable for the same canonical value', () => {
    expect(sha256Hex(canonicalizeJson({ a: ['x', 1] }))).toBe(
      sha256Hex(canonicalizeJson({ a: ['x', 1] })),
    );
  });
});
