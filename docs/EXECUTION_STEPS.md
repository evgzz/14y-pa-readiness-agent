# 14Y PA Readiness Agent — Execution Steps

This is the shortest operational path from a fresh checkout to a defensible MVP demonstration.

Detailed references:

- [`PRELIMINARY_SETUP_RUNBOOK.md`](./PRELIMINARY_SETUP_RUNBOOK.md)
- [`../EXECUTION_RUNBOOK.md`](../EXECUTION_RUNBOOK.md)
- [`VSCODE_SETUP.md`](./VSCODE_SETUP.md)
- [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md)

## Recommended MVP path

Use local Visual Studio Code plus a synthetic Medplum project first. Treat AWS as optional hosting after the local workflow passes.

```text
Local Next.js
→ synthetic Medplum
→ readiness evaluation
→ idempotent evaluation Task
→ separate human-review Task
```

## 1. Open the repository

```bash
cd 14y-pa-readiness-agent
code 14y-pa-readiness-agent.code-workspace
```

## 2. Verify prerequisites

```bash
node --version
npm --version
git --version
npm ping
curl -I https://api.medplum.com/
```

Requirements:

- Node.js 22.18.0 or newer
- npm registry access
- Git
- network access to Medplum
- a synthetic-only Medplum project

## 3. Configure Medplum

Create a server-to-server Medplum `ClientApplication` with synthetic-project access to:

- `Patient`
- `ServiceRequest`
- `DocumentReference`
- `Task`
- `Practitioner`

Create the environment file:

```bash
cp .env.example .env.local
```

Populate:

```env
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=<client-application-id>
MEDPLUM_CLIENT_SECRET=<client-application-secret>

DEMO_PATIENT_ID=
DEMO_SERVICE_REQUEST_ID=
DEMO_DOCUMENT_REFERENCE_ID=

GIT_COMMIT=<current-git-sha>
```

Confirm the file is ignored:

```bash
git check-ignore .env.local
```

Expected:

```text
.env.local
```

## 4. Install dependencies

```bash
npm install
npm ls --depth=0
```

Freeze the dependency graph:

```bash
git add package-lock.json
git commit -m "Freeze demo dependency graph"
```

Use `npm ci` for later clean rehearsals.

## 5. Seed synthetic resources

```bash
npm run seed
```

Copy the returned logical IDs into `.env.local`:

```env
DEMO_PATIENT_ID=<patientId>
DEMO_SERVICE_REQUEST_ID=<serviceRequestId>
DEMO_DOCUMENT_REFERENCE_ID=<documentReferenceId>
```

Run the seed again:

```bash
npm run seed
```

Confirm:

- logical IDs remain stable
- version IDs may increment
- no duplicate logical resources are created
- the source hash is printed
- a valid synthetic reviewer such as `Practitioner/demo-reviewer` exists

## 6. Run verification gates

```bash
npm run verify
```

Equivalent commands:

```bash
npm run typecheck
npm test
npm run build
```

Do not label a capability `[LIVE]` unless these gates and the corresponding Medplum workflow pass.

## 7. Run the local smoke test

```bash
npm run dev
```

Open `http://localhost:3000`.

```bash
curl -i http://localhost:3000/api/health
```

Confirm:

- demo resource IDs are prepopulated
- the page loads without server errors
- the health endpoint succeeds
- browser tools do not expose the Medplum client secret
- no real patient data appears

## 8. Execute the primary readiness flow

Select **Run Readiness Check**.

Expected:

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

Expected criteria:

| Criterion | Internal status |
|---|---|
| Radicular symptoms | `met` |
| Conservative therapy ≥6 weeks | `met` |
| Objective neurological deficit | `met` |

For each criterion verify:

- exact source quotation
- one unique source match
- UTF-16 code-unit offsets
- reason code
- `DocumentReference` ID and version
- source-verification status

## 9. Verify the evaluation record

Confirm the UI displays:

- source SHA-256
- policy SHA-256
- execution-manifest SHA-256
- evaluation Task ID
- readiness and review status

Confirm the evaluation `Task`:

```text
status: completed
businessStatus: ready
focus: ServiceRequest/{id}
for: Patient/{id}
```

## 10. Verify idempotency

Run the same evaluation again.

Expected:

```text
same execution-manifest hash
same evaluation Task ID
no duplicate evaluation Task
```

## 11. Record human review

Select **Confirm assertions**.

Confirm a separate review `Task` with:

- `basedOn` referencing the evaluation Task
- a distinct review identifier
- `owner` referencing the reviewer
- `businessStatus = confirmed`
- decision timestamp

The evaluation Task must remain unchanged.

## 12. Rehearse one negative path

Change one source sentence while leaving the predefined quotation unchanged.

Expected:

```text
reason: QUOTE_NOT_FOUND
criterionStatus: unverified
presentation state: Unknown
```

Restore the baseline:

```bash
npm run seed
```

## 13. Optional AWS deployment

Only after local validation:

```bash
npm run docker:build
npm run docker:run
curl -i http://localhost:3000/api/health

npm run aws:install
npm run aws:build
npm run aws:synth
```

Then follow [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md).

## 14. Freeze the demo

```bash
rm -rf node_modules .next
npm ci
npm run verify
npm run seed
npm run dev
```

Confirm the full flow succeeds twice from a fresh browser, capture a screenshot or recording fallback, and then:

```bash
git status --short
git rev-parse HEAD
git tag demo-freeze-v0.6.0
```

## MVP completion standard

```text
Synthetic Medplum resources
→ applicability and Patient-scope validation
→ mocked structured evidence
→ unique exact-source verification
→ deterministic ready result
→ completed content-addressed evaluation Task
→ identical rerun reuses the Task
→ human confirmation creates a separate linked review Task
```

Do not add live LLM extraction or downstream PAS submission until this sequence is stable.
