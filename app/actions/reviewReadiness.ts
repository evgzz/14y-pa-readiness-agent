'use server';

import type { Task } from '@medplum/fhirtypes';
import {
  HumanReviewRequestSchema,
  type HumanReviewRequest,
} from '@/types/readiness';
import { canonicalizeJson, sha256Hex } from '@/lib/canonical';
import { getServerMedplumClient } from '@/lib/medplum';
import { persistReviewTask } from '@/lib/fhirAudit';

export async function reviewReadiness(rawInput: unknown): Promise<{
  reviewTaskId: string | undefined;
  reviewStatus: HumanReviewRequest['decision'];
}> {
  const input = HumanReviewRequestSchema.parse(rawInput);
  const medplum = await getServerMedplumClient();
  const evaluationTask = await medplum.readResource<Task>(
    'Task',
    input.evaluationTaskId,
  );

  const reviewHash = sha256Hex(
    canonicalizeJson({
      evaluationTaskId: evaluationTask.id ?? input.evaluationTaskId,
      evaluationTaskVersion: evaluationTask.meta?.versionId ?? null,
      reviewerReference: input.reviewerReference,
      decision: input.decision,
      correctedAssertions: input.correctedAssertions ?? null,
      note: input.note ?? null,
    }),
  );

  const reviewTask = await persistReviewTask(medplum, reviewHash, {
    status: 'completed',
    intent: 'order',
    basedOn: [{ reference: `Task/${input.evaluationTaskId}` }],
    businessStatus: {
      coding: [
        {
          system: 'https://14y.health/fhir/CodeSystem/review-status',
          code: input.decision,
        },
      ],
    },
    owner: { reference: input.reviewerReference },
    input: [
      {
        type: { text: 'Reviewer Decision' },
        valueCode: input.decision,
      },
      ...(input.note
        ? [
            {
              type: { text: 'Reviewer Note' },
              valueString: input.note,
            },
          ]
        : []),
    ],
    output: input.correctedAssertions
      ? [
          {
            type: { text: 'Corrected Assertions' },
            valueString: JSON.stringify(input.correctedAssertions),
          },
        ]
      : [],
  });

  return {
    reviewTaskId: reviewTask.id,
    reviewStatus: input.decision,
  };
}
