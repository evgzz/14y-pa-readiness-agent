# 14Y PA Readiness Agent — Preliminary Setup Runbook

## Purpose

Complete this runbook before starting implementation verification, the primary execution runbook, or any AWS deployment.

This preliminary runbook establishes:

- a compatible local workstation;
- a synthetic-only Medplum project;
- valid server-side credentials;
- a reproducible repository checkout;
- a working dependency installation;
- seeded FHIR resources and reviewer identity;
- an explicit local-versus-AWS demo path; and
- a clean handoff into `EXECUTION_RUNBOOK.md`.

The recommended MVP path is **local Visual Studio Code + synthetic Medplum**. Treat AWS as an optional hosting path after the local workflow passes.

---

# 1. Preliminary Setup Exit Criteria

Preliminary setup is complete only when all of the following are true:

- Node.js 22.18.0 or newer is active.
- npm and Git are available.
- The repository opens cleanly in Visual Studio Code or a terminal.
- Public npm registry access works.
- A synthetic-only Medplum project exists.
- A Medplum `ClientApplication` can read and write the required FHIR resources.
- `.env.local` exists and is excluded from Git.
- `npm install` succeeds and creates `package-lock.json`.
- `npm run seed` succeeds twice without duplicate logical resources.
- The synthetic Patient, request, document, and reviewer identity are visible in Medplum.
- The three generated logical IDs are copied into `.env.local`.
- The selected demo path is recorded as either `local` or `aws`.
- No production PHI, production credentials, or payer submission endpoint is in scope.

Do not continue to the execution runbook until these conditions are met.

---

# 2. Decide the MVP Demo Path

Choose one primary presentation path.

## Option A — Local Visual Studio Code

Recommended for the MVP because it has the lowest setup and network risk.

```text
VS Code / local Next.js
        ↓ HTTPS
Synthetic Medplum project
```

Required:

- Node.js and npm;
- Visual Studio Code or terminal;
- browser access;
- Medplum credentials.

## Option B — AWS ECS Fargate

Use only after the local path passes.

```text
Application Load Balancer
        ↓
ECS Fargate / Next.js
        ↓ HTTPS
Synthetic Medplum project
```

Additional requirements:

- Docker;
- AWS CLI;
- AWS CDK dependencies;
- AWS account and deployment permissions;
- Secrets Manager secret;
- time for deployment and teardown.

## Record the decision

Create a local note or environment variable:

```text
DEMO_PATH=local
```

or:

```text
DEMO_PATH=aws
```

Do not split rehearsal effort across both paths unless the primary path is already stable.

---

# 3. Workstation Preflight

## 3.1 Verify required tools

Run:

```bash
node --version
npm --version
git --version
```

Required Node version:

```text
v22.18.0 or newer
```

Optional tools:

```bash
code --version
curl --version
jq --version
docker --version
aws --version
```

Only Docker and AWS CLI are required for the AWS path.

## 3.2 Verify npm connectivity

```bash
npm ping
npm config get registry
```

Expected registry:

```text
https://registry.npmjs.org/
```

Stop and resolve corporate proxy, VPN, firewall, certificate, or private-registry issues before installing dependencies.

## 3.3 Verify Medplum network reachability

```bash
curl -I https://api.medplum.com/
```

Any HTTP response confirms basic network reachability. Credential validity is tested by the seed command later.

---

# 4. Repository Preparation

## 4.1 Unpack or clone

```bash
cd 14y-pa-readiness-agent
```

Confirm the expected files:

```bash
ls README.md package.json EXECUTION_RUNBOOK.md .env.example
ls docs/PRELIMINARY_SETUP_RUNBOOK.md docs/PREREQUISITES_SETUP.md
```

## 4.2 Open in Visual Studio Code

```bash
code 14y-pa-readiness-agent.code-workspace
```

Or open the repository folder manually.

Recommended workspace actions:

1. Trust the workspace only after reviewing the repository files.
2. Install the recommended extensions.
3. Select the workspace TypeScript version when prompted.
4. Open **Terminal → Run Task** to confirm the committed tasks are visible.

## 4.3 Confirm Git state

```bash
git status --short
git rev-parse --show-toplevel
```

When the repository is not yet under Git control:

```bash
git init
git add .
git commit -m "Initialize 14Y PA Readiness Agent scaffold"
```

Capture the commit:

```bash
git rev-parse HEAD
```

---

# 5. Synthetic Medplum Project Setup

## 5.1 Create or select the project

Use a project dedicated to synthetic demonstration data.

Do not reuse:

- a production clinical project;
- real patient records;
- production payer credentials;
- credentials shared with another application.

## 5.2 Create a ClientApplication

Create a server-to-server Medplum `ClientApplication` and record:

- Medplum API base URL;
- client ID;
- client secret;
- synthetic project name.

Required resource operations:

| Resource | Required operations |
|---|---|
| `Patient` | search, read, create, update |
| `ServiceRequest` | search, read, create, update |
| `DocumentReference` | search, read, create, update |
| `Task` | search, read, create, update |
| `Practitioner` | read; create if the reviewer fixture is not already present |

## 5.3 Credential rules

- Store the secret only in `.env.local` or an approved secret manager.
- Never use a `NEXT_PUBLIC_` variable for the client secret.
- Never commit `.env.local`.
- Never show the secret in screenshots or slides.
- Rotate the secret after accidental exposure.
- Use minimum synthetic-project permissions.

---

# 6. Local Environment Configuration

Create the environment file:

```bash
cp .env.example .env.local
```

Populate the initial values:

```env
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=<client-application-id>
MEDPLUM_CLIENT_SECRET=<client-application-secret>

DEMO_PATIENT_ID=
DEMO_SERVICE_REQUEST_ID=
DEMO_DOCUMENT_REFERENCE_ID=

GIT_COMMIT=<current-git-sha>
VERCEL_GIT_COMMIT_SHA=
```

Confirm `.env.local` is ignored:

```bash
git check-ignore .env.local
```

Expected output:

```text
.env.local
```

Stop if the file is not ignored.

---

# 7. Install and Freeze Dependencies

## 7.1 Install

```bash
npm install
```

Expected artifacts:

- `node_modules/`;
- `package-lock.json`.

## 7.2 Check for installation problems

```bash
npm ls --depth=0
```

Stop and resolve:

- missing packages;
- incompatible Node version;
- certificate or registry failures;
- peer-dependency failures that prevent build or tests.

## 7.3 Freeze the dependency graph

```bash
git add package-lock.json
git commit -m "Freeze demo dependency graph"
```

Use this command for subsequent clean installations:

```bash
npm ci
```

Do not use `npm ci` before a valid lock file exists.

---

# 8. Seed the Synthetic FHIR Resources

Run:

```bash
npm run seed
```

Expected output shape:

```json
{
  "patientId": "...",
  "patientVersion": "...",
  "serviceRequestId": "...",
  "serviceRequestVersion": "...",
  "documentReferenceId": "...",
  "documentReferenceVersion": "...",
  "sourceHash": "..."
}
```

Copy the logical IDs into `.env.local`:

```env
DEMO_PATIENT_ID=<patientId>
DEMO_SERVICE_REQUEST_ID=<serviceRequestId>
DEMO_DOCUMENT_REFERENCE_ID=<documentReferenceId>
```

Run the seed a second time:

```bash
npm run seed
```

Expected behavior:

- the same logical IDs are reused;
- version IDs may increment;
- no duplicate logical resources are created;
- the source hash is printed on both runs.

Stop if duplicate demo identifiers are reported.

---

# 9. Verify the Seeded FHIR Data

Confirm in Medplum:

## Patient

- name is `Jane Doe`;
- synthetic/demo identifiers are present.

## ServiceRequest

- status is `active`;
- CPT code is `72148`;
- `authoredOn` is present;
- subject references the synthetic Patient.

## DocumentReference

- subject references the same Patient;
- contains one inline `text/plain; charset=utf-8` attachment;
- source text can be decoded and read;
- the expected clinical statements occur exactly once.

## Task

No evaluation or review Task is required yet. Existing stale demo Tasks should be identified before the primary execution run.

## Reviewer

Confirm that the reviewer reference used by the UI exists, for example:

```text
Practitioner/demo-reviewer
```

When it does not exist, create a synthetic Practitioner and update the configured reviewer reference before the demo.

---

# 10. Initial Static Verification

Before starting the application, run:

```bash
npm run typecheck
npm test
npm run build
```

Expected result:

```text
all commands exit with status 0
```

This is the first point at which source-verification, policy, and build capabilities may be labeled `[LIVE]` in the presentation.

Stop if any command fails. Do not substitute development-mode success for a production build.

---

# 11. Local Application Smoke Test

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Confirm:

- Patient, request, and document IDs are prepopulated;
- the page loads without server errors;
- `/api/health` returns a successful response;
- browser developer tools do not reveal the Medplum client secret;
- no real patient information appears.

Health check:

```bash
curl -i http://localhost:3000/api/health
```

Stop the server after the smoke test unless continuing directly into the execution runbook.

---

# 12. Optional AWS Preliminary Setup

Complete this section only when `DEMO_PATH=aws` and the local smoke test already passes.

## 12.1 Verify tools and identity

```bash
docker --version
aws --version
aws sts get-caller-identity
```

## 12.2 Build the application image locally

```bash
npm run docker:build
npm run docker:run
```

Verify:

```bash
curl -i http://localhost:3000/api/health
```

## 12.3 Prepare AWS infrastructure dependencies

```bash
npm run aws:install
npm run aws:build
npm run aws:synth
```

Do not deploy until synthesis succeeds and the generated CloudFormation resources have been reviewed.

## 12.4 Prepare Secrets Manager

Follow `docs/AWS_DEPLOYMENT.md` to create the secret containing:

- Medplum base URL;
- client ID;
- client secret;
- Patient ID;
- `ServiceRequest` ID;
- `DocumentReference` ID;
- optional Git commit metadata.

Never place the Medplum client secret in CDK source, shell history, screenshots, or CloudFormation plaintext parameters.

---

# 13. Preliminary Failure Matrix

| Failure | Likely cause | Action |
|---|---|---|
| Node version below requirement | Wrong active runtime | Activate Node 22.18+ and reinstall dependencies |
| `npm ping` fails | Proxy, VPN, firewall, certificate, or registry problem | Repair network or npm configuration |
| `npm install` fails | Registry or dependency issue | Resolve before running any verification claims |
| Medplum login fails | Wrong base URL, client ID, secret, or permissions | Validate the ClientApplication and rotate credentials if needed |
| Seed creates duplicates | Existing duplicate identifiers | Reconcile or delete synthetic duplicates; do not select one arbitrarily |
| Resource scope mismatch | Patient references differ | Re-run seed or correct the synthetic resources |
| Source attachment cannot be read | Unsupported content type or malformed Base64 | Use inline UTF-8 plain text |
| Reviewer Task later fails | Reviewer Practitioner does not exist or lacks access | Create or select a valid synthetic Practitioner |
| Production build fails | Next.js configuration or server/client boundary issue | Fix before the execution runbook |
| Secret appears in browser bundle | Server-only boundary was violated | Stop; remove client-side access and rotate the secret |
| AWS synthesis fails | Missing dependencies, credentials, context, or permissions | Resolve locally before deployment |

---

# 14. Preliminary Setup Record

Capture the following in a private demo note:

```text
Setup date:
Developer:
Demo path: local | aws
Node version:
npm version:
Git commit:
Medplum project:
ClientApplication ID:
Patient ID:
ServiceRequest ID:
ServiceRequest version:
DocumentReference ID:
DocumentReference version:
Source hash:
Reviewer reference:
Dependency install: pass | fail
Typecheck: pass | fail
Tests: pass | fail
Production build: pass | fail
Local health check: pass | fail
AWS synth, when applicable: pass | fail
```

Do not record the client secret in this note.

---

# 15. Handoff to the Execution Runbook

Proceed to `EXECUTION_RUNBOOK.md` only after preliminary setup is complete.

The next runbook will verify:

- applicability and Patient scope;
- exact unique quotation matching;
- UTF-16 code-unit offsets;
- three-valued readiness evaluation;
- content-addressed evaluation Task persistence;
- idempotent Task reuse;
- separate human-review Task creation;
- negative-path behavior;
- deck synchronization; and
- final go/no-go status.

Recommended handoff command:

```bash
npm run preflight
```

Expected behavior:

```text
typecheck → tests → production build → synthetic seed
```

After preflight succeeds, begin the primary end-to-end steps in `EXECUTION_RUNBOOK.md`.
