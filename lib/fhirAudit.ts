import type { MedplumClient } from '@medplum/core';
import type { Task } from '@medplum/fhirtypes';

const EVALUATION_IDENTIFIER_SYSTEM =
  'https://14y.health/identifier/readiness-evaluation';
const REVIEW_IDENTIFIER_SYSTEM =
  'https://14y.health/identifier/readiness-review';

async function createTaskIfAbsent(
  medplum: MedplumClient,
  identifierSystem: string,
  identifierValue: string,
  task: Task,
): Promise<Task> {
  const query = new URLSearchParams({
    identifier: `${identifierSystem}|${identifierValue}`,
  });
  const matches = (await medplum.searchResources('Task', query)) as Task[];
  if (matches.length > 1) {
    throw new Error(`Duplicate Task identifier: ${identifierValue}`);
  }
  if (matches.length === 1) {
    return matches[0];
  }
  return medplum.createResource(task);
}

export async function persistEvaluationTask(
  medplum: MedplumClient,
  executionManifestHash: string,
  task: Omit<Task, 'resourceType' | 'identifier'>,
): Promise<Task> {
  return createTaskIfAbsent(
    medplum,
    EVALUATION_IDENTIFIER_SYSTEM,
    executionManifestHash,
    {
      resourceType: 'Task',
      identifier: [
        {
          system: EVALUATION_IDENTIFIER_SYSTEM,
          value: executionManifestHash,
        },
      ],
      ...task,
    },
  );
}

export async function persistReviewTask(
  medplum: MedplumClient,
  reviewHash: string,
  task: Omit<Task, 'resourceType' | 'identifier'>,
): Promise<Task> {
  return createTaskIfAbsent(
    medplum,
    REVIEW_IDENTIFIER_SYSTEM,
    reviewHash,
    {
      resourceType: 'Task',
      identifier: [
        {
          system: REVIEW_IDENTIFIER_SYSTEM,
          value: reviewHash,
        },
      ],
      ...task,
    },
  );
}
