import { MedplumClient } from '@medplum/core';
import type {
  DocumentReference,
  Patient,
  Resource,
  ServiceRequest,
} from '@medplum/fhirtypes';
import { sha256Hex } from '../lib/canonical';

const DEMO_SYSTEM = 'https://14y.health/identifier/demo-resource';

async function upsertResource<T extends Resource>(
  medplum: MedplumClient,
  resource: T,
  identifierValue: string,
): Promise<T> {
  const query = new URLSearchParams({
    identifier: `${DEMO_SYSTEM}|${identifierValue}`,
  });
  const matches = await medplum.searchResources(resource.resourceType, query);

  if (matches.length > 1) {
    throw new Error(`Duplicate demo identifier: ${identifierValue}`);
  }

  if (matches.length === 1) {
    return medplum.updateResource({
      ...resource,
      id: matches[0].id,
      meta: matches[0].meta,
    } as T);
  }

  return medplum.createResource(resource);
}

async function seed(): Promise<void> {
  const clientId = process.env.MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Medplum client credentials are required.');
  }

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL ?? 'https://api.medplum.com/',
  });
  await medplum.startClientLogin(clientId, clientSecret);

  const patient = await upsertResource<Patient>(
    medplum,
    {
      resourceType: 'Patient',
      identifier: [{ system: DEMO_SYSTEM, value: 'synth-pat-101' }],
      name: [{ given: ['Jane'], family: 'Doe' }],
    },
    'synth-pat-101',
  );

  const serviceRequest = await upsertResource<ServiceRequest>(
    medplum,
    {
      resourceType: 'ServiceRequest',
      identifier: [{ system: DEMO_SYSTEM, value: 'synth-sr-202' }],
      status: 'active',
      intent: 'order',
      authoredOn: '2026-02-01',
      subject: { reference: `Patient/${patient.id}` },
      code: {
        coding: [
          {
            system: 'http://www.ama-assn.org/go/cpt',
            code: '72148',
            display: 'MRI Lumbar Spine without Contrast',
          },
        ],
      },
    },
    'synth-sr-202',
  );

  const rawNote = [
    'CLINICAL PROGRESS NOTE',
    'Patient reports severe lower back pain radiating down the right leg (L5 distribution).',
    'Completed 8 weeks of physical therapy and tried daily NSAIDs with no significant relief.',
    'On exam, right ankle reflex (S1) is 0/2 and positive straight leg raise at 30 degrees.',
  ].join('\n');

  const documentReference = await upsertResource<DocumentReference>(
    medplum,
    {
      resourceType: 'DocumentReference',
      identifier: [{ system: DEMO_SYSTEM, value: 'synth-doc-303' }],
      status: 'current',
      subject: { reference: `Patient/${patient.id}` },
      content: [
        {
          attachment: {
            contentType: 'text/plain; charset=utf-8',
            data: Buffer.from(rawNote, 'utf8').toString('base64'),
          },
        },
      ],
    },
    'synth-doc-303',
  );

  const readBack = await medplum.readResource<DocumentReference>(
    'DocumentReference',
    documentReference.id!,
  );
  const readBackData = readBack.content?.[0]?.attachment?.data;
  if (!readBackData) {
    throw new Error('Seeded document content could not be read back.');
  }

  const sourceHash = sha256Hex(Buffer.from(readBackData, 'base64'));
  console.log(
    JSON.stringify(
      {
        patientId: patient.id,
        patientVersion: patient.meta?.versionId,
        serviceRequestId: serviceRequest.id,
        serviceRequestVersion: serviceRequest.meta?.versionId,
        documentReferenceId: documentReference.id,
        documentReferenceVersion: documentReference.meta?.versionId,
        sourceHash,
      },
      null,
      2,
    ),
  );
}

seed().catch((error: unknown) => {
  console.error('Fatal seed failure:', error);
  process.exitCode = 1;
});
