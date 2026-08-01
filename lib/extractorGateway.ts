import {
  ExtractorResponseSchema,
  type CriterionId,
  type ExtractedAssertion,
  type ExtractionOverride,
  type VerifiedAssertion,
} from '@/types/readiness';

export interface VerificationResult {
  verifiedAssertions: Map<CriterionId, VerifiedAssertion>;
  extractionOverrides: Map<CriterionId, ExtractionOverride>;
}

export function verifyExtractorResponse(
  rawOutput: unknown,
  rawText: string,
  expectedCriterionIds: readonly CriterionId[],
): VerificationResult {
  const verifiedAssertions = new Map<CriterionId, VerifiedAssertion>();
  const extractionOverrides = new Map<CriterionId, ExtractionOverride>();
  const parsed = ExtractorResponseSchema.safeParse(rawOutput);

  if (!parsed.success) {
    for (const criterionId of expectedCriterionIds) {
      extractionOverrides.set(criterionId, {
        evidenceStatus: 'extraction-error',
        status: 'unverified',
        reasonCode: 'INVALID_EXTRACTOR_OUTPUT',
      });
    }
    return { verifiedAssertions, extractionOverrides };
  }

  const expectedSet = new Set<CriterionId>(expectedCriterionIds);
  const outputsByCriterion = new Map<CriterionId, ExtractedAssertion[]>();

  for (const assertion of parsed.data.assertions) {
    if (!expectedSet.has(assertion.criterionId)) {
      for (const criterionId of expectedCriterionIds) {
        extractionOverrides.set(criterionId, {
          evidenceStatus: 'extraction-error',
          status: 'unverified',
          reasonCode: 'INVALID_EXTRACTOR_OUTPUT',
        });
      }
      return { verifiedAssertions, extractionOverrides };
    }

    const existing = outputsByCriterion.get(assertion.criterionId) ?? [];
    existing.push(assertion);
    outputsByCriterion.set(assertion.criterionId, existing);
  }

  for (const criterionId of expectedCriterionIds) {
    const candidates = outputsByCriterion.get(criterionId) ?? [];

    if (candidates.length === 0) {
      extractionOverrides.set(criterionId, {
        evidenceStatus: 'extractor-omission',
        status: 'unverified',
        reasonCode: 'EXTRACTOR_RETURNED_NO_CANDIDATE',
      });
      continue;
    }

    if (candidates.length > 1) {
      extractionOverrides.set(criterionId, {
        evidenceStatus: 'extraction-error',
        status: 'unverified',
        reasonCode: 'DUPLICATE_CRITERION_OUTPUT',
      });
      continue;
    }

    const assertion = candidates[0];
    const startCodeUnit = rawText.indexOf(assertion.quote);

    if (startCodeUnit < 0) {
      extractionOverrides.set(criterionId, {
        evidenceStatus: 'hallucinated-quote',
        status: 'unverified',
        reasonCode: 'QUOTE_NOT_FOUND',
      });
      continue;
    }

    const duplicateIndex = rawText.indexOf(
      assertion.quote,
      startCodeUnit + assertion.quote.length,
    );

    if (duplicateIndex >= 0) {
      extractionOverrides.set(criterionId, {
        evidenceStatus: 'ambiguous',
        status: 'unverified',
        reasonCode: 'AMBIGUOUS_SOURCE_MATCH',
      });
      continue;
    }

    verifiedAssertions.set(criterionId, {
      assertion,
      startCodeUnit,
      endCodeUnit: startCodeUnit + assertion.quote.length,
    });
  }

  return { verifiedAssertions, extractionOverrides };
}
