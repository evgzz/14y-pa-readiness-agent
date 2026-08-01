import { MedplumClient } from '@medplum/core';

export async function getServerMedplumClient(): Promise<MedplumClient> {
  const clientId = process.env.MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET are required.');
  }

  const medplum = new MedplumClient({
    baseUrl: process.env.MEDPLUM_BASE_URL ?? 'https://api.medplum.com/',
  });

  await medplum.startClientLogin(clientId, clientSecret);
  return medplum;
}
