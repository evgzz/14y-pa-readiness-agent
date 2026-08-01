# 14Y PA Readiness Agent

A human-supervised, source-verifiable prior-authorization evidence-readiness prototype built with Next.js and Medplum.

The repository demonstrates a bounded workflow that sits **before** downstream prior-authorization package assembly:

```text
Synthetic FHIR resources
→ scope and applicability validation
→ predefined evidence assertions
→ unique exact-source verification with UTF-16 offsets
→ deterministic three-valued policy evaluation
→ content-addressed evaluation Task
→ explicit human review
→ separate linked review Task
```


## Start here

Use these documents in order:

1. [`docs/HACKATHON_EXECUTION_RUNBOOK.md`](./docs/HACKATHON_EXECUTION_RUNBOOK.md) — event-day timeboxes, hard gates, submission freeze, fallback, and presentation script.
2. [`docs/EXECUTION_STEPS.md`](./docs/EXECUTION_STEPS.md) — shortest command sequence from checkout to MVP demo.
3. [`docs/PRELIMINARY_SETUP_RUNBOOK.md`](./docs/PRELIMINARY_SETUP_RUNBOOK.md) — workstation, Medplum, credentials, dependencies, and seed setup.
4. [`EXECUTION_RUNBOOK.md`](./EXECUTION_RUNBOOK.md) — detailed evaluation, Task lifecycle, negative paths, rehearsal, and go/no-go process.
5. [`docs/VSCODE_SETUP.md`](./docs/VSCODE_SETUP.md) — committed VS Code build tasks and debugger setup.
6. [`docs/AWS_DEPLOYMENT.md`](./docs/AWS_DEPLOYMENT.md) — optional ECS Fargate deployment after local validation.

Recommended MVP route:

```text
VS Code / local Next.js
→ synthetic Medplum
→ evaluation Task
→ idempotent rerun
→ linked human-review Task
```

## System boundary

The prototype:

- evaluates evidence against a **synthetic configured readiness policy**;
- uses a **mocked extractor** that returns predefined structured assertions;
- verifies that each proposed quotation occurs exactly once in the source note;
- records UTF-16 code-unit offsets, source version, reason codes, and hashes;
- preserves `Unknown` when evidence cannot be verified;
- creates a completed evaluation `Task` before human review;
- creates a separate linked review `Task` only after the reviewer acts;
- does **not** approve, deny, predict, or submit a prior-authorization request.

Source fidelity is not clinical truth. The deterministic verifier establishes that quoted text exists uniquely in the stored note; the structured interpretation remains reviewable.

## Capability status

| Capability | Repository status | Demo status requirement |
|---|---|---|
| Medplum resource retrieval and persistence | Implemented | Mark `[LIVE]` only after tenant execution succeeds |
| Evidence assembly | Mocked with predefined assertions | Keep `[MOCKED EXTRACTOR]` |
| Exact source verification | Implemented and structurally validated | Run full tests and live scenario |
| Three-valued policy evaluation | Implemented and structurally validated | Run full tests and live scenario |
| Content-addressed manifest | Implemented and structurally validated | Verify runtime hash and Task persistence |
| Evaluation Task idempotency | Implemented | Verify same input reuses the same Task |
| Human-review Task | Implemented | Verify separate `basedOn` relationship in Medplum |

The artifact-generation environment could not install the real npm dependency tree or execute a live Medplum tenant. See [`VALIDATION.md`](./VALIDATION.md) and complete the runbook before describing capabilities as operational.

## Primary synthetic scenario

The seeded demo uses:

- Patient: `Jane Doe`;
- active lumbar MRI `ServiceRequest`;
- CPT `72148`;
- inline UTF-8 `DocumentReference` note;
- synthetic policy version `lumbar-mri-demo-v1`.

Expected criterion results:

| Criterion | Internal status | Presentation label |
|---|---|---|
| Radicular symptoms | `met` | Satisfied |
| Conservative therapy of at least six weeks | `met` | Satisfied |
| Objective neurological deficit | `met` | Satisfied |

Expected primary result:

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

## FHIR resource lifecycle

```text
Patient/{patient-id}
        │
        ├── ServiceRequest/{service-request-id}
        └── DocumentReference/{document-reference-id}
                    │
                    ▼
          Task/{evaluation-task-id}
          status: completed
          businessStatus: ready
                    │
                    └── basedOn
                         ▼
          Task/{review-task-id}
          status: completed
          businessStatus: confirmed | corrected | rejected
```

The review Task does not exist until a human reviewer confirms, corrects, or rejects the assertions. The original evaluation Task is not mutated.

## Repository layout

```text
app/
  actions/
    runReadiness.ts       Server-side evaluation orchestration
    reviewReadiness.ts    Human decision recording
  page.tsx                Demo entry point
components/
  ReadinessDashboard.tsx  Manual trigger, evidence, hashes, and review UI
lib/
  audit.ts                Execution-manifest construction and hashing
  canonical.ts            Bounded deterministic JSON serialization
  evaluateApplicability.ts
  evaluateReadiness.ts    Three-valued policy evaluation
  extractorGateway.ts     Schema validation and exact-source verification
  fhirAudit.ts            Idempotent evaluation/review Task persistence
  medplum.ts              Server-only Medplum client
  policyRegistry.ts       Versioned synthetic policy registry
scripts/
  seed.ts                 Deterministic synthetic FHIR seeding
tests/
  *.test.ts               Policy, hashing, source, and extraction tests
types/
  readiness.ts            Typed domain contract
docs/
  ARCHITECTURE.md
  AWS_ARCHITECTURE.md
  AWS_DEPLOYMENT.md
  EXECUTION_STEPS.md      Shortest checkout-to-demo workflow
  HACKATHON_EXECUTION_RUNBOOK.md  Event-day operating plan
  PRELIMINARY_SETUP_RUNBOOK.md
  VSCODE_SETUP.md          VS Code build tasks, debugger, Docker, and AWS workflow
  DEMO_CONTRACT.md
  CLAIM_GUARDRAILS.md
.vscode/                   Shared build tasks, debugger configurations, and settings
14y-pa-readiness-agent.code-workspace
AGENTS.md                 Medplum/FHIR coding-agent guardrails
EXECUTION_RUNBOOK.md       Setup, verification, demo, recovery, and freeze
VALIDATION.md              Validation completed and environment limitations
```

## Prerequisites

Start with [`docs/PRELIMINARY_SETUP_RUNBOOK.md`](./docs/PRELIMINARY_SETUP_RUNBOOK.md), then use [`docs/PREREQUISITES_SETUP.md`](./docs/PREREQUISITES_SETUP.md) for detailed reference. The preliminary runbook establishes the workstation, synthetic Medplum project, credentials, dependency lock, seeded resources, reviewer identity, and local-versus-AWS demo path before execution verification.

- Node.js 22.18.0 or newer
- npm
- Git
- A Medplum project containing synthetic data only
- A Medplum `ClientApplication` permitted to read/write the synthetic `Patient`, `ServiceRequest`, `DocumentReference`, and `Task` resources

## Visual Studio Code build option

Open [`14y-pa-readiness-agent.code-workspace`](./14y-pa-readiness-agent.code-workspace), then use **Terminal → Run Build Task** or the VS Code build shortcut. The default task, **14Y: Build and Verify**, runs:

```bash
npm run typecheck
npm test
npm run build
```

Additional committed tasks cover dependency installation, synthetic Medplum seeding, the development server, Docker packaging, AWS CDK compilation, synthesis, and deployment. Run-and-debug configurations are included for the full Next.js stack, the seed script, and the current Vitest file.

See [`docs/VSCODE_SETUP.md`](./docs/VSCODE_SETUP.md) for setup, debugger behavior, AWS environment handling, and troubleshooting.

## Quick start

For the complete command-by-command sequence, follow [`docs/EXECUTION_STEPS.md`](./docs/EXECUTION_STEPS.md).

### 1. Configure the environment

```bash
cp .env.example .env.local
npm install
```

Set:

```env
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=<client-application-id>
MEDPLUM_CLIENT_SECRET=<client-application-secret>
GIT_COMMIT=<current-git-sha>
```

### 2. Seed synthetic FHIR resources

```bash
npm run seed
```

Copy the printed IDs into `.env.local`:

```env
DEMO_PATIENT_ID=<printed Patient ID>
DEMO_SERVICE_REQUEST_ID=<printed ServiceRequest ID>
DEMO_DOCUMENT_REFERENCE_ID=<printed DocumentReference ID>
```

Run the seed a second time and confirm that logical IDs remain stable.

### 3. Run all verification gates

```bash
npm run typecheck
npm test
npm run build
```

Do not present the workflow as live unless all three commands succeed.

### 4. Start the application

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo flow

1. Show the synthetic Patient, lumbar MRI `ServiceRequest`, and source `DocumentReference`.
2. Select **Run Readiness Check**.
3. Confirm applicability is `applicable` and overall status is `ready`.
4. Inspect each exact quotation, UTF-16 range, reason code, and document version.
5. Inspect source hash, policy hash, execution-manifest hash, and evaluation Task ID.
6. Run the same evaluation again and verify that the hash and evaluation Task ID are unchanged.
7. Select **Confirm assertions**.
8. Inspect the separate review Task and its `basedOn` reference to the evaluation Task.

## Domain status mapping

| Internal value | Presentation label |
|---|---|
| `met` | Satisfied |
| `not-met` | Not Satisfied |
| `unverified` | Unknown |
| `ready` | Ready |
| `incomplete` | Not Ready |
| `not-applicable` | Not Applicable |

## Deterministic invariants

- An unsupported quotation cannot be classified as source-verified.
- A quotation that occurs more than once fails closed as `AMBIGUOUS_SOURCE_MATCH`.
- A missing quotation fails closed as `QUOTE_NOT_FOUND`.
- An unverified quotation cannot independently satisfy a criterion.
- Identical recorded execution manifests produce the same SHA-256 fingerprint.
- Identical execution fingerprints reuse the same evaluation Task identifier.
- Human review creates a separate linked Task rather than rewriting the evaluation Task.

These invariants do not establish semantic or clinical correctness of AI-derived interpretations.

## Execution manifest

The manifest fingerprints material execution inputs including:

- Patient scope;
- `ServiceRequest` ID, version, and applicability fields;
- `DocumentReference` ID, version, attachment index, and source hash;
- policy key and policy hash;
- extractor mode and schema hash;
- verified assertions and extraction overrides;
- criterion results and applicability state;
- engine version.

A materially different input should produce a different manifest hash.

## Negative paths

The runbook covers:

- wrong CPT code;
- inactive request;
- missing request date;
- source quotation mismatch;
- duplicate source quotation;
- Patient scope mismatch.

The recommended live failure demonstration changes one source sentence while leaving the mocked assertion unchanged, producing `QUOTE_NOT_FOUND` and an `Unknown` / `unverified` criterion state.

## Security and demo constraints

- Synthetic data only.
- No browser-exposed Medplum client secret.
- Inline `text/plain; charset=utf-8` attachments only.
- One-megabyte source limit.
- No live payer submission.
- No autonomous clinical or coverage decision.
- The canonical serializer is bounded and deterministic; it is not presented as full RFC 8785 conformance.

## Documentation

- [`docs/PRELIMINARY_SETUP_RUNBOOK.md`](./docs/PRELIMINARY_SETUP_RUNBOOK.md) — ordered preliminary setup, stop conditions, setup record, and execution handoff
- [`docs/PREREQUISITES_SETUP.md`](./docs/PREREQUISITES_SETUP.md) — detailed workstation, Medplum, credentials, environment, and troubleshooting reference
- [`EXECUTION_RUNBOOK.md`](./EXECUTION_RUNBOOK.md) — authoritative setup, verification, rehearsal, recovery, and go/no-go process
- [`docs/DEMO_CONTRACT.md`](./docs/DEMO_CONTRACT.md) — primary scenario and expected outputs
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — component and trust-boundary overview
- [`docs/CLAIM_GUARDRAILS.md`](./docs/CLAIM_GUARDRAILS.md) — defensible product and demo wording
- [`VALIDATION.md`](./VALIDATION.md) — checks completed and environment limitations

## License and production use

This repository is a prototype scaffold. Before production use, add organization-specific authorization, security review, policy governance, data-retention controls, clinical validation, observability, incident response, and applicable regulatory controls.

## Deploy on AWS

The repository includes an AWS CDK deployment for a load-balanced ECS Fargate service. Medplum credentials and synthetic resource IDs are injected from AWS Secrets Manager; application logs are written to CloudWatch Logs.

```text
Application Load Balancer
        ↓
ECS Fargate / Next.js
        ↓ outbound HTTPS
Medplum FHIR API
```

Start with:

1. [`docs/AWS_ARCHITECTURE.md`](./docs/AWS_ARCHITECTURE.md)
2. [`docs/AWS_DEPLOYMENT.md`](./docs/AWS_DEPLOYMENT.md)

Minimal deployment sequence:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run seed

./scripts/aws-create-secret.sh
export MEDPLUM_SECRET_ARN=<printed-secret-arn>
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION="$AWS_REGION"
export PRIVATE_TASKS=false

npm run aws:deploy
```

The default `PRIVATE_TASKS=false` mode is a lower-cost synthetic demo configuration. Set `PRIVATE_TASKS=true` to place tasks in private subnets behind a NAT Gateway.

The AWS scaffold has not been deployed from this artifact-generation environment. Retain only verified `[LIVE]` claims after completing the local, container, CDK, and Medplum runtime checks.
