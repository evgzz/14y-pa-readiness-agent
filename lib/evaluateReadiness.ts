import type {
  CriteriaResult,
  CriterionId,
  CriterionStatus,
  ExtractionOverride,
  ReadinessResult,
  RuleResult,
  VerifiedAssertion,
} from '@/types/readiness';
import {
  POLICY_REGISTRY,
  type PolicyCriterionSpec,
  type PolicyRuleGraph,
  type PolicyVersion,
} from '@/lib/policyRegistry';

export const ENGINE_VERSION = 'v1.5.0-three-valued';

interface EvaluateInput {
  policyVersion: PolicyVersion;
  verifiedAssertions: Map<CriterionId, VerifiedAssertion>;
  extractionOverrides: Map<CriterionId, ExtractionOverride>;
  documentReferenceId: string;
  documentVersionId: string | null;
  attachmentIndex: number;
}

function evaluateCriterion(
  spec: PolicyCriterionSpec,
  verified: VerifiedAssertion,
  documentReferenceId: string,
  documentVersionId: string | null,
  attachmentIndex: number,
): CriteriaResult {
  const { assertion, startCodeUnit, endCodeUnit } = verified;
  const evidence = {
    documentReferenceId,
    documentVersionId,
    attachmentIndex,
    quote: assertion.quote,
    startCodeUnit,
    endCodeUnit,
  };

  switch (spec.rule.kind) {
    case 'polarity-present': {
      if (assertion.criterionId !== 'radiculopathy_symptoms') {
        throw new Error(`Criterion ${spec.id} has an incompatible assertion type.`);
      }
      if (assertion.polarity === 'present') {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'met',
          reasonCode: 'CRITERION_SATISFIED',
          evidence,
        };
      }
      if (assertion.polarity === 'uncertain') {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'unverified',
          reasonCode: 'ASSERTION_UNCERTAIN',
          evidence,
        };
      }
      return {
        id: spec.id,
        label: spec.label,
        evidenceStatus: 'verified',
        status: 'not-met',
        reasonCode: 'EXPLICIT_NEGATION',
        evidence,
      };
    }

    case 'therapy-duration': {
      if (assertion.criterionId !== 'conservative_tx_6wks') {
        throw new Error(`Criterion ${spec.id} has an incompatible assertion type.`);
      }
      if (!spec.rule.permittedTherapyTypes.includes(assertion.therapyType)) {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'unverified',
          reasonCode: 'THERAPY_TYPE_NOT_PERMITTED',
          evidence,
        };
      }
      if (assertion.durationWeeks === null) {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'unverified',
          reasonCode: 'DURATION_NOT_DOCUMENTED',
          evidence,
        };
      }
      if (assertion.completed === null) {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'unverified',
          reasonCode: 'COMPLETION_NOT_DOCUMENTED',
          evidence,
        };
      }
      if (!assertion.completed) {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'not-met',
          reasonCode: 'THERAPY_NOT_COMPLETED',
          evidence,
        };
      }
      if (assertion.durationWeeks < spec.rule.minimumWeeks) {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'not-met',
          reasonCode: 'INSUFFICIENT_DURATION',
          evidence,
        };
      }
      return {
        id: spec.id,
        label: spec.label,
        evidenceStatus: 'verified',
        status: 'met',
        reasonCode: 'CRITERION_SATISFIED',
        evidence,
      };
    }

    case 'objective-finding-present': {
      if (assertion.criterionId !== 'neurological_deficit') {
        throw new Error(`Criterion ${spec.id} has an incompatible assertion type.`);
      }
      if (assertion.polarity === 'uncertain') {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'unverified',
          reasonCode: 'ASSERTION_UNCERTAIN',
          evidence,
        };
      }
      if (assertion.polarity === 'absent') {
        return {
          id: spec.id,
          label: spec.label,
          evidenceStatus: 'verified',
          status: 'not-met',
          reasonCode: 'EXPLICIT_NEGATION',
          evidence,
        };
      }
      const findingIsValid =
        assertion.findingType !== null &&
        assertion.finding !== null &&
        spec.rule.permittedFindingTypes.includes(assertion.findingType) &&
        assertion.finding.trim().length > 0;
      return findingIsValid
        ? {
            id: spec.id,
            label: spec.label,
            evidenceStatus: 'verified',
            status: 'met',
            reasonCode: 'CRITERION_SATISFIED',
            evidence,
          }
        : {
            id: spec.id,
            label: spec.label,
            evidenceStatus: 'verified',
            status: 'unverified',
            reasonCode: 'OBJECTIVE_FINDING_MISSING',
            evidence,
          };
    }
  }
}

export function evaluateCriteria(input: EvaluateInput): CriteriaResult[] {
  const registry = POLICY_REGISTRY[input.policyVersion];
  return registry.definition.criteria.map((spec) => {
    const override = input.extractionOverrides.get(spec.id);
    if (override) {
      return {
        id: spec.id,
        label: spec.label,
        evidenceStatus: override.evidenceStatus,
        status: override.status,
        reasonCode: override.reasonCode,
      };
    }

    const verified = input.verifiedAssertions.get(spec.id);
    if (!verified) {
      return {
        id: spec.id,
        label: spec.label,
        evidenceStatus: 'extractor-omission',
        status: 'unverified',
        reasonCode: 'EXTRACTOR_RETURNED_NO_CANDIDATE',
      };
    }

    return evaluateCriterion(
      spec,
      verified,
      input.documentReferenceId,
      input.documentVersionId,
      input.attachmentIndex,
    );
  });
}

function criterionRuleResult(status: CriterionStatus | undefined): RuleResult {
  if (status === 'met') {
    return 'satisfied';
  }
  if (status === 'not-met') {
    return 'not-satisfied';
  }
  return 'unknown';
}

export function evaluateRuleGraph(
  graph: PolicyRuleGraph,
  statusMap: Map<CriterionId, CriterionStatus>,
): RuleResult {
  if ('criterionId' in graph) {
    return criterionRuleResult(statusMap.get(graph.criterionId));
  }

  if ('allOf' in graph) {
    const results = graph.allOf.map((child) => evaluateRuleGraph(child, statusMap));
    if (results.some((result) => result === 'not-satisfied')) {
      return 'not-satisfied';
    }
    if (results.every((result) => result === 'satisfied')) {
      return 'satisfied';
    }
    return 'unknown';
  }

  const results = graph.anyOf.map((child) => evaluateRuleGraph(child, statusMap));
  if (results.some((result) => result === 'satisfied')) {
    return 'satisfied';
  }
  if (results.every((result) => result === 'not-satisfied')) {
    return 'not-satisfied';
  }
  return 'unknown';
}

export function deriveOverallStatus(
  policyVersion: PolicyVersion,
  criteria: CriteriaResult[],
): ReadinessResult['status'] {
  const policy = POLICY_REGISTRY[policyVersion].definition;
  const statusMap = new Map<CriterionId, CriterionStatus>(
    criteria.map((criterion) => [criterion.id, criterion.status]),
  );
  const ruleResult = evaluateRuleGraph(policy.ruleGraph, statusMap);
  if (ruleResult === 'satisfied') {
    return 'ready';
  }
  if (ruleResult === 'not-satisfied') {
    return 'incomplete';
  }
  return 'unverified';
}
