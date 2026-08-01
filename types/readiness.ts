import { z } from 'zod';

export const CriterionIdSchema = z.enum([
  'radiculopathy_symptoms',
  'conservative_tx_6wks',
  'neurological_deficit',
]);

export type CriterionId =
  | 'radiculopathy_symptoms'
  | 'conservative_tx_6wks'
  | 'neurological_deficit';

export interface RadiculopathyAssertion {
  criterionId: 'radiculopathy_symptoms';
  polarity: 'present' | 'absent' | 'uncertain';
  quote: string;
}

export interface ConservativeTxAssertion {
  criterionId: 'conservative_tx_6wks';
  therapyType: 'physical-therapy' | 'home-exercise' | 'medication' | 'other';
  durationWeeks: number | null;
  completed: boolean | null;
  quote: string;
}

export interface NeurologicalDeficitAssertion {
  criterionId: 'neurological_deficit';
  polarity: 'present' | 'absent' | 'uncertain';
  findingType: 'motor' | 'reflex' | 'sensory' | null;
  finding: string | null;
  quote: string;
}

export type ExtractedAssertion =
  | RadiculopathyAssertion
  | ConservativeTxAssertion
  | NeurologicalDeficitAssertion;

export interface ExtractorResponse {
  assertions: ExtractedAssertion[];
}

export const RadiculopathyAssertionSchema = z.object({
  criterionId: z.literal('radiculopathy_symptoms'),
  polarity: z.enum(['present', 'absent', 'uncertain']),
  quote: z.string().trim().min(1).max(2000),
});

export const ConservativeTxAssertionSchema = z.object({
  criterionId: z.literal('conservative_tx_6wks'),
  therapyType: z.enum([
    'physical-therapy',
    'home-exercise',
    'medication',
    'other',
  ]),
  durationWeeks: z.number().finite().nonnegative().nullable(),
  completed: z.boolean().nullable(),
  quote: z.string().trim().min(1).max(2000),
});

export const NeurologicalDeficitAssertionSchema = z.object({
  criterionId: z.literal('neurological_deficit'),
  polarity: z.enum(['present', 'absent', 'uncertain']),
  findingType: z.enum(['motor', 'reflex', 'sensory']).nullable(),
  finding: z.string().trim().min(1).nullable(),
  quote: z.string().trim().min(1).max(2000),
}).refine(
  (value: NeurologicalDeficitAssertion) =>
    value.polarity !== 'present' || Boolean(value.findingType && value.finding),
  {
    message: 'Present neurological deficits require an objective finding type and value.',
    path: ['finding'],
  },
);

export const ExtractedAssertionSchema = z.union([
  RadiculopathyAssertionSchema,
  ConservativeTxAssertionSchema,
  NeurologicalDeficitAssertionSchema,
]);

export const ExtractorResponseSchema = z.object({
  assertions: z.array(ExtractedAssertionSchema).max(10),
});

export type EvidenceStatus =
  | 'verified'
  | 'ambiguous'
  | 'hallucinated-quote'
  | 'extraction-error'
  | 'extractor-omission'
  | 'not-run';

export type CriterionStatus = 'met' | 'not-met' | 'unverified';

export type CriterionReasonCode =
  | 'CRITERION_SATISFIED'
  | 'EXPLICIT_NEGATION'
  | 'ASSERTION_UNCERTAIN'
  | 'INSUFFICIENT_DURATION'
  | 'DURATION_NOT_DOCUMENTED'
  | 'COMPLETION_NOT_DOCUMENTED'
  | 'THERAPY_NOT_COMPLETED'
  | 'OBJECTIVE_FINDING_MISSING'
  | 'THERAPY_TYPE_NOT_PERMITTED'
  | 'EXTRACTOR_RETURNED_NO_CANDIDATE'
  | 'AMBIGUOUS_SOURCE_MATCH'
  | 'QUOTE_NOT_FOUND'
  | 'INVALID_EXTRACTOR_OUTPUT'
  | 'DUPLICATE_CRITERION_OUTPUT';

export interface VerifiedAssertion {
  assertion: ExtractedAssertion;
  startCodeUnit: number;
  endCodeUnit: number;
}

export interface ExtractionOverride {
  evidenceStatus:
    | 'ambiguous'
    | 'hallucinated-quote'
    | 'extraction-error'
    | 'extractor-omission';
  status: 'unverified';
  reasonCode:
    | 'AMBIGUOUS_SOURCE_MATCH'
    | 'QUOTE_NOT_FOUND'
    | 'INVALID_EXTRACTOR_OUTPUT'
    | 'DUPLICATE_CRITERION_OUTPUT'
    | 'EXTRACTOR_RETURNED_NO_CANDIDATE';
}

export interface CriteriaResult {
  id: CriterionId;
  label: string;
  evidenceStatus: EvidenceStatus;
  status: CriterionStatus;
  reasonCode: CriterionReasonCode;
  evidence?: {
    documentReferenceId: string;
    documentVersionId: string | null;
    attachmentIndex: number;
    quote: string;
    startCodeUnit: number;
    endCodeUnit: number;
  };
}

export type RuleResult = 'satisfied' | 'not-satisfied' | 'unknown';

export type ApplicabilityReason =
  | 'APPLICABLE'
  | 'CODE_MISMATCH'
  | 'OUTSIDE_EFFECTIVE_PERIOD'
  | 'REQUEST_NOT_ACTIVE'
  | 'REQUEST_INTENT_UNSUPPORTED'
  | 'REQUEST_DATE_MISSING'
  | 'REQUEST_DATE_INVALID';

export interface ApplicabilityResult {
  status: 'applicable' | 'not-applicable' | 'unknown';
  requestDate: string | null;
  reasons: ApplicabilityReason[];
}

export type ReviewStatus = 'pending' | 'confirmed' | 'corrected' | 'rejected';

export interface AuditFingerprints {
  sourceHash: string | null;
  policyHash: string;
  engineVersion: string;
  extractorMode: 'mock' | 'llm' | 'not-run';
  extractorModel: string | null;
  promptHash: string | null;
  extractionSchemaHash: string;
  executionManifestHash: string;
  gitCommit: string | null;
}

export interface ReadinessResult {
  status: 'ready' | 'incomplete' | 'unverified' | 'not-applicable';
  policy: {
    policyVersion: string;
    policyHash: string;
  };
  applicability: ApplicabilityResult;
  fingerprints: AuditFingerprints;
  criteria: CriteriaResult[];
  reviewStatus: ReviewStatus;
  evaluationTaskId?: string;
}

export const ReadinessRequestSchema = z.object({
  patientId: z.string().trim().min(1),
  serviceRequestId: z.string().trim().min(1),
  documentReferenceId: z.string().trim().min(1),
});

export interface ReadinessRequest {
  patientId: string;
  serviceRequestId: string;
  documentReferenceId: string;
}

export const HumanReviewRequestSchema = z.object({
  evaluationTaskId: z.string().trim().min(1),
  decision: z.enum(['confirmed', 'corrected', 'rejected']),
  reviewerReference: z.string().trim().min(1),
  correctedAssertions: z.array(ExtractedAssertionSchema).optional(),
  note: z.string().trim().max(4000).optional(),
});

export interface HumanReviewRequest {
  evaluationTaskId: string;
  decision: 'confirmed' | 'corrected' | 'rejected';
  reviewerReference: string;
  correctedAssertions?: ExtractedAssertion[];
  note?: string;
}
