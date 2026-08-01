# Prerequisites and Environment Setup

This guide prepares a local workstation and a synthetic Medplum project for the 14Y PA Readiness Agent.

Complete this document before following `EXECUTION_RUNBOOK.md`.

## 1. Scope and Safety Boundary

Use this repository only with synthetic demonstration data unless your organization has completed its own security, privacy, clinical, and regulatory review.

The prototype:

- reads synthetic `Patient`, `ServiceRequest`, and `DocumentReference` resources;
- creates evaluation and human-review `Task` resources;
- uses a mocked extractor with predefined structured assertions;
- verifies source-text fidelity using unique exact matching and UTF-16 code-unit offsets;
- does not submit a prior-authorization request;
- does not approve, deny, or predict payer decisions.

Do not connect the demo credentials to a production clinical tenant.

## 2. Local Workstation Requirements

### Required software

| Tool | Required version | Purpose |
|---|---:|---|
| Node.js | 22.18.0 or newer | Next.js application, tests, and seed script |
| npm | Included with Node.js | Dependency installation and scripts |
| Git | Current supported release | Commit capture and demo freeze |
| Web browser | Current Chrome, Edge, Firefox, or Safari | Local application and Medplum inspection |

Optional but useful:

- `curl` for connectivity checks;
- `jq` for inspecting JSON output;
- a Node version manager such as `nvm`, `fnm`, or Volta.

### Verify installed tools

```bash
node --version
npm --version
git --version
```

The Node result must be `v22.18.0` or newer.

If the version is too old, install or activate a compatible Node release before running `npm install`.

## 3. Package Registry and Network Preflight

The project requires access to the public npm registry and the configured Medplum API endpoint.

Check npm connectivity:

```bash
npm ping
npm config get registry
```

The registry should normally resolve to:

```text
https://registry.npmjs.org/
```

A corporate proxy, VPN, firewall, or custom npm registry can prevent dependency installation. Resolve those issues before continuing.

Check basic Medplum endpoint reachability:

```bash
curl -I https://api.medplum.com/
```

Any HTTP response confirms network reachability. Authentication is validated later by `npm run seed`.

## 4. Repository Setup

Unzip or clone the repository and enter its root directory:

```bash
cd 14y-pa-readiness-agent
```

Confirm the expected files are present:

```bash
ls README.md EXECUTION_RUNBOOK.md package.json .env.example
```

Create the local environment file:

```bash
cp .env.example .env.local
```

`.env.local` is ignored by Git and must not be committed.

## 5. Medplum Project Prerequisites

Create or select a Medplum project dedicated to synthetic demonstration data.

The project must support the following operations for the demo credentials:

| Resource | Required operations |
|---|---|
| `Patient` | search, read, create, update |
| `ServiceRequest` | search, read, create, update |
| `DocumentReference` | search, read, create, update |
| `Task` | search, read, create, update |

The seed script performs identifier searches and deterministic create-or-update operations. The application reads the seeded resources and creates or retrieves evaluation and review Tasks.

### ClientApplication

Create or select a Medplum `ClientApplication` for server-to-server client-credential login.

Record:

- Client ID;
- Client secret;
- Medplum API base URL;
- project or tenant name used for the demo.

The repository authenticates through `MedplumClient.startClientLogin(clientId, clientSecret)` on the server. It does not require a browser login flow.

### Credential handling

- Store credentials only in `.env.local` or an approved secret manager.
- Never prefix the secret with `NEXT_PUBLIC_`.
- Never paste credentials into screenshots, slides, logs, issues, or commits.
- Rotate the client secret immediately if it is exposed.
- Use synthetic-only credentials with the minimum permissions required for the resources above.

## 6. Configure Environment Variables

Edit `.env.local`:

```env
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=<client-application-id>
MEDPLUM_CLIENT_SECRET=<client-application-secret>

# Filled after npm run seed
DEMO_PATIENT_ID=
DEMO_SERVICE_REQUEST_ID=
DEMO_DOCUMENT_REFERENCE_ID=

# Optional audit metadata
GIT_COMMIT=<current-git-sha>
VERCEL_GIT_COMMIT_SHA=
```

### Variable reference

| Variable | Required | Description |
|---|---|---|
| `MEDPLUM_BASE_URL` | Yes | Medplum FHIR API base URL. Defaults to `https://api.medplum.com/` in code. |
| `MEDPLUM_CLIENT_ID` | Yes | ClientApplication identifier used for server-side login. |
| `MEDPLUM_CLIENT_SECRET` | Yes | ClientApplication secret used for server-side login. |
| `DEMO_PATIENT_ID` | After seeding | Logical ID of the synthetic Patient. |
| `DEMO_SERVICE_REQUEST_ID` | After seeding | Logical ID of the lumbar MRI ServiceRequest. |
| `DEMO_DOCUMENT_REFERENCE_ID` | After seeding | Logical ID of the synthetic clinical note. |
| `GIT_COMMIT` | Recommended | Commit SHA included as reproducibility metadata when supported. |
| `VERCEL_GIT_COMMIT_SHA` | Optional | Deployment-provided commit SHA. |

Capture the current Git commit:

```bash
git rev-parse HEAD
```

If the repository is not yet committed, initialize and commit it before the final demo freeze.

## 7. Install Dependencies

Install the real package tree:

```bash
npm install
```

This creates `node_modules` and, on the first successful install, `package-lock.json`.

Preserve the lock file:

```bash
git add package-lock.json
git commit -m "Freeze demo dependency graph"
```

Use the deterministic install command for later rehearsals and CI:

```bash
npm ci
```

Do not use `npm ci` before a valid `package-lock.json` exists.

## 8. Seed the Synthetic Tenant

Run:

```bash
npm run seed
```

The command authenticates to Medplum and prints JSON similar to:

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

Copy the three logical IDs into `.env.local`:

```env
DEMO_PATIENT_ID=<printed patientId>
DEMO_SERVICE_REQUEST_ID=<printed serviceRequestId>
DEMO_DOCUMENT_REFERENCE_ID=<printed documentReferenceId>
```

Run the seed a second time:

```bash
npm run seed
```

Expected behavior:

- the same logical IDs are reused;
- version IDs may increment;
- no duplicate demo identifiers are reported;
- the source hash is printed.

### Seeded resource expectations

Verify in Medplum:

- Patient name: `Jane Doe`;
- active `ServiceRequest`;
- CPT code: `72148`;
- `ServiceRequest.authoredOn`: `2026-02-01`;
- one current `DocumentReference`;
- one inline `text/plain; charset=utf-8` attachment;
- Patient references match across the request and document.

## 9. Reviewer Prerequisite

The UI defaults the reviewer reference to:

```text
Practitioner/demo-reviewer
```

Some Medplum tenants require this reference to resolve to an existing resource.

Before rehearsing human review, either:

1. create a synthetic `Practitioner` with logical ID `demo-reviewer`, if your tenant permits client-assigned IDs; or
2. create a synthetic Practitioner normally and replace the UI value with `Practitioner/{actual-id}`.

The reviewer must be synthetic and accessible to the ClientApplication.

## 10. Verification Gates

Run:

```bash
npm run typecheck
npm test
npm run build
```

All three commands must exit successfully before capabilities are labeled `[LIVE]`.

Then start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The three seeded IDs should appear automatically. If the fields are blank, stop the server, verify `.env.local`, and restart it.

## 11. Minimum Functional Preflight

Before following the full execution runbook, confirm:

- [ ] Node.js is 22.18.0 or newer.
- [ ] `npm install` or `npm ci` succeeds.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm test` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `npm run seed` authenticates to Medplum.
- [ ] Seeded Patient, ServiceRequest, and DocumentReference are visible.
- [ ] `.env.local` contains the returned logical IDs.
- [ ] The local dashboard loads the IDs.
- [ ] No client secret appears in browser developer tools.
- [ ] A valid synthetic reviewer reference is available.
- [ ] No real PHI is present.

## 12. Common Setup Failures

| Symptom | Likely cause | Resolution |
|---|---|---|
| `node` version is below 22.18 | Old system Node version | Activate or install a compatible Node release |
| `npm install` cannot reach registry | Proxy, firewall, VPN, or custom registry | Correct npm proxy/registry settings and rerun `npm ping` |
| `MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET are required` | Missing `.env.local` values | Populate both variables and restart the command |
| Client login fails | Invalid secret, ClientApplication state, base URL, or permission | Verify credentials and project access; rotate the secret if needed |
| Seed reports duplicate identifier | Multiple resources share the demo identifier | Remove or reconcile duplicates; do not choose an arbitrary resource |
| Seed cannot read the document back | Missing permissions or invalid stored attachment | Verify `DocumentReference` read/write access and rerun the seed |
| Dashboard fields are blank | IDs missing or dev server started before env update | Populate IDs and restart `npm run dev` |
| `Resource scope mismatch` | Patient references do not align | Restore the baseline seed or correct the resource references |
| Review Task fails | Reviewer reference does not resolve or is not permitted | Use an existing synthetic `Practitioner/{id}` |
| Production build fails after tests pass | Next.js environment or server/client boundary issue | Resolve the build before any live demonstration |

## 13. Clean Rehearsal Setup

Before the final rehearsal, run from a clean checkout:

```bash
rm -rf node_modules .next
npm ci
npm run typecheck
npm test
npm run build
npm run seed
npm run dev
```

Then continue with `EXECUTION_RUNBOOK.md`.

## 14. Setup Completion Criteria

Setup is complete only when:

- the real npm dependency tree is installed;
- the production build succeeds;
- authentication to the synthetic Medplum project succeeds;
- the synthetic resources are seeded and readable;
- a valid synthetic reviewer is available;
- the dashboard loads the seeded IDs;
- credentials remain server-side;
- the repository is ready for the primary evaluation, idempotency, and human-review checks in the execution runbook.

At that point, proceed to:

```text
EXECUTION_RUNBOOK.md
```

# AWS Deployment Prerequisites

For AWS deployment, also install and configure:

- AWS CLI v2;
- Docker Engine or Docker Desktop;
- AWS CDK v2 dependencies under `infra/aws`;
- an AWS account and Region;
- an AWS identity permitted to deploy CloudFormation, VPC, ECS/Fargate, ECR assets, Application Load Balancer, IAM roles, CloudWatch Logs, Auto Scaling, and Secrets Manager references.

Verify:

```bash
aws --version
docker --version
aws sts get-caller-identity
```

Before deploying, generate and commit `package-lock.json`, complete all application gates, seed the synthetic Medplum resources, and create the Secrets Manager JSON secret described in [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md).
