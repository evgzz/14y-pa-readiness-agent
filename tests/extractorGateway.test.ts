import { describe, expect, test } from 'vitest';
import { verifyExtractorResponse } from '@/lib/extractorGateway';
import type { ExtractedAssertion } from '@/types/readiness';

const expected = [
  'radiculopathy_symptoms',
  'conservative_tx_6wks',
  'neurological_deficit',
] as const;

const baseAssertions: ExtractedAssertion[] = [
  {
    criterionId: 'radiculopathy_symptoms',
    polarity: 'present',
    quote: 'Radicular pain is present.',
  },
  {
    criterionId: 'conservative_tx_6wks',
    therapyType: 'physical-therapy',
    durationWeeks: 8,
    completed: true,
    quote: 'Eight weeks of PT completed.',
  },
  {
    criterionId: 'neurological_deficit',
    polarity: 'present',
    findingType: 'reflex',
    finding: 'Absent ankle reflex.',
    quote: 'Absent ankle reflex documented.',
  },
];

const note = baseAssertions.map((item) => item.quote).join('\n');

describe('extractor gateway', () => {
  test('verifies one exact quotation per criterion', () => {
    const result = verifyExtractorResponse({ assertions: baseAssertions }, note, expected);
    expect(result.verifiedAssertions.size).toBe(3);
    expect(result.extractionOverrides.size).toBe(0);
  });

  test('duplicate quote is ambiguous', () => {
    const duplicateNote = `${note}\nRadicular pain is present.`;
    const result = verifyExtractorResponse(
      { assertions: baseAssertions },
      duplicateNote,
      expected,
    );
    expect(result.extractionOverrides.get('radiculopathy_symptoms')?.reasonCode).toBe(
      'AMBIGUOUS_SOURCE_MATCH',
    );
  });

  test('missing quote is classified as quote not found', () => {
    const assertions = baseAssertions.map((item) => ({ ...item }));
    assertions[0] = { ...assertions[0], quote: 'Not in the source.' };
    const result = verifyExtractorResponse({ assertions }, note, expected);
    expect(result.extractionOverrides.get('radiculopathy_symptoms')?.reasonCode).toBe(
      'QUOTE_NOT_FOUND',
    );
  });

  test('omitted output is unverified rather than missing evidence', () => {
    const result = verifyExtractorResponse(
      { assertions: baseAssertions.slice(0, 2) },
      note,
      expected,
    );
    expect(result.extractionOverrides.get('neurological_deficit')?.reasonCode).toBe(
      'EXTRACTOR_RETURNED_NO_CANDIDATE',
    );
  });

  test('duplicate criterion output fails closed', () => {
    const result = verifyExtractorResponse(
      { assertions: [...baseAssertions, baseAssertions[0]] },
      note,
      expected,
    );
    expect(result.extractionOverrides.get('radiculopathy_symptoms')?.reasonCode).toBe(
      'DUPLICATE_CRITERION_OUTPUT',
    );
  });

  test('UTF-16 offsets account for surrogate pairs', () => {
    const source = `😀 ${note}`;
    const result = verifyExtractorResponse({ assertions: baseAssertions }, source, expected);
    expect(
      result.verifiedAssertions.get('radiculopathy_symptoms')?.startCodeUnit,
    ).toBe(3);
  });
});
