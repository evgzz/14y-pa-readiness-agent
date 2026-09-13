import fs from 'node:fs';
import path from 'node:path';

import { runReadiness } from '../app/actions/runReadiness';
import { canonicalizeJson, sha256Hex } from '../lib/canonical';

const SOURCE_REPOSITORY = 'evgzz/14y-pa-readiness-agent';
const SOURCE_COMMIT = 'b054618be3b135006afb15dadb40d45648982fc4';
const RUN_SCHEMA = 'WT-PA-REAL-AGENT-RUN-1.0.0';

type JsonObject = Record<string, unknown>;

type SeedRecord = {
  patientId: string;
  serviceRequestId: string;
  documentReferenceId: string;
  sourceHash: string;
};

function hashJson(value: unknown): string {
  return sha256Hex(canonicalizeJson(value));
}

function selfHash<T extends JsonObject>(value: T, field: string): string {
  const copy = { ...value };
  delete copy[field];
  return hashJson(copy);
}

async function main(): Promise<void> {
  const seedPath = process.argv[2];
  const outputPath = process.argv[3] ?? '../welltrace-live-medplum/pa-live-medplum-run.json';
  if (!seedPath) {
    throw new Error('Usage: welltrace-live-medplum.ts <seed-json> [output-json]');
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedRecord;
  if (!seed.patientId || !seed.serviceRequestId || !seed.documentReferenceId) {
    throw new Error('Seed output is missing required synthetic resource IDs.');
  }

  // runReadiness records this value in its audit fingerprints.
  process.env.GIT_COMMIT = SOURCE_COMMIT;

  const successResult = await runReadiness({
    patientId: seed.patientId,
    serviceRequestId: seed.serviceRequestId,
    documentReferenceId: seed.documentReferenceId,
  });

  let scopeError: string | null = null;
  try {
    await runReadiness({
      patientId: 'synthetic-wrong-patient-for-scope-test',
      serviceRequestId: seed.serviceRequestId,
      documentReferenceId: seed.documentReferenceId,
    });
  } catch (error: unknown) {
    scopeError = error instanceof Error ? error.message : String(error);
  }

  if (scopeError !== 'Resource scope mismatch.') {
    throw new Error(`Expected Resource scope mismatch., observed: ${scopeError}`);
  }

  const outcomes = [
    {
      case_id: 'PA-LIVE-MEDPLUM-READY-001',
      outcome: {
        kind: 'READINESS_RESULT',
        result: successResult,
      },
    },
    {
      case_id: 'PA-LIVE-MEDPLUM-SCOPE-001',
      outcome: {
        kind: 'ERROR',
        message: scopeError,
      },
    },
  ].map((item) => ({
    ...item,
    outcome_hash: hashJson(item.outcome),
  }));

  const run: JsonObject = {
    schema_version: RUN_SCHEMA,
    run_id: `PA-LIVE-MEDPLUM-${process.env.GITHUB_RUN_ID ?? 'local'}`,
    source_repository: SOURCE_REPOSITORY,
    source_commit: SOURCE_COMMIT,
    captured_at: new Date().toISOString(),
    execution_boundary: 'LIVE_MEDPLUM_SYNTHETIC_NON_PHI',
    medplum_base_url: process.env.MEDPLUM_BASE_URL ?? 'https://api.medplum.com/',
    seed_provenance: {
      patient_id: seed.patientId,
      service_request_id: seed.serviceRequestId,
      document_reference_id: seed.documentReferenceId,
      source_hash: seed.sourceHash,
    },
    items: outcomes,
  };
  run.run_hash = selfHash(run, 'run_hash');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        status: 'LIVE_MEDPLUM_SYNTHETIC_EXECUTION_COMPLETE',
        readinessStatus: successResult.status,
        evaluationTaskId: successResult.evaluationTaskId ?? null,
        scopeError,
        runHash: run.run_hash,
        outputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error('Fatal live Medplum evidence failure:', error);
  process.exitCode = 1;
});
