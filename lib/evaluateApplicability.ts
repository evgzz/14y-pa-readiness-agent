import type { ServiceRequest } from '@medplum/fhirtypes';
import type { ApplicabilityResult } from '@/types/readiness';
import type { PolicyDefinition } from '@/lib/policyRegistry';

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export function evaluateApplicability(
  serviceRequest: ServiceRequest,
  policy: PolicyDefinition,
): ApplicabilityResult {
  const reasons: ApplicabilityResult['reasons'] = [];
  const requestDate = serviceRequest.authoredOn ?? null;

  const codingMatches =
    serviceRequest.code?.coding?.some((coding) =>
      policy.applicableCodes.some(
        (applicable) =>
          applicable.system === coding.system &&
          applicable.code === coding.code,
      ),
    ) ?? false;

  if (!codingMatches) {
    reasons.push('CODE_MISMATCH');
  }

  if (serviceRequest.status !== 'active') {
    reasons.push('REQUEST_NOT_ACTIVE');
  }

  if (serviceRequest.intent !== 'order') {
    reasons.push('REQUEST_INTENT_UNSUPPORTED');
  }

  if (!requestDate) {
    reasons.push('REQUEST_DATE_MISSING');
  } else if (!DATE_PREFIX.test(requestDate)) {
    reasons.push('REQUEST_DATE_INVALID');
  } else {
    const requestDay = requestDate.slice(0, 10);
    if (
      requestDay < policy.effectivePeriod.start ||
      (policy.effectivePeriod.end && requestDay > policy.effectivePeriod.end)
    ) {
      reasons.push('OUTSIDE_EFFECTIVE_PERIOD');
    }
  }

  if (
    reasons.includes('REQUEST_DATE_MISSING') ||
    reasons.includes('REQUEST_DATE_INVALID')
  ) {
    return { status: 'unknown', requestDate, reasons };
  }

  if (reasons.length > 0) {
    return { status: 'not-applicable', requestDate, reasons };
  }

  return { status: 'applicable', requestDate, reasons: ['APPLICABLE'] };
}
