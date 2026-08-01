# 14Y PA Readiness Agent — Execution Runbook

## Purpose

Execute and demonstrate one reproducible prior-authorization evidence-readiness evaluation using synthetic FHIR data in Medplum.

Complete `docs/PRELIMINARY_SETUP_RUNBOOK.md` before using this runbook.

The runbook is the operational source of truth for:

- the seeded clinical scenario;
- the readiness policy and expected results;
- source-verification behavior;
- Medplum resource and Task lifecycle;
- reproducibility and idempotency checks;
- human-review recording;
- negative-path testing; and
- demo go/no-go decisions.

---

# 1. Demo Contract

## 1.1 Primary scenario

The primary demonstration uses:

- one synthetic `Patient`;
- one active lumbar MRI `ServiceRequest`;
- CPT `72148`;
- one linked clinical-note `DocumentReference`;
- one configured synthetic readiness policy;
- predefined structured evidence assertions from a mocked extractor.

## 1.2 Expected primary outcome

| Criterion | Expected internal status | Presentation label |
|---|---:|---|
| Radicular symptoms | `met` | Satisfied |
| Conservative therapy of at least 6 weeks | `met` | Satisfied |
| Objective neurological deficit | `met` | Satisfied |

Expected overall result:

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

## 1.3 Safety boundary

The prototype:

- uses synthetic data only;
- does not submit a prior-authorization request;
- does not approve or deny coverage;
- does not predict payer approval;
- verifies source fidelity, not clinical truth;
- requires human confirmation of AI-derived or mocked structured interpretations.

## 1.4 Canonical execution sequence

```text
Seed synthetic Patient, ServiceRequest, and DocumentReference
→ Validate patient scope and request applicability
→ Load predefined structured evidence assertions
→ Verify each quotation uniquely using UTF-16 code-unit offsets
→ Apply deterministic three-valued policy logic
→ Persist completed content-addressed evaluation Task
→ Repeat evaluation and reuse the same Task
→ Present assertions for human review
→ Record a separate linked review Task
```

---

# 2. Capability Status

Use these labels until every gate has been executed successfully in the target environment.

| Capability | Pre-gate status | Post-gate status |
|---|---|---|
| Medplum retrieval and persistence | Implemented; environment verification required | `[LIVE]` |
| Mocked evidence assembly | `[MOCKED EXTRACTOR]` | `[MOCKED EXTRACTOR]` |
| Source-fidelity verification | Structurally validated | `[LIVE]` |
| Three-valued policy evaluation | Structurally validated | `[LIVE]` |
| Content-addressed manifest | Structurally validated | `[LIVE]` |
| Evaluation Task idempotency | Requires tenant execution | `[LIVE]` |
| Separate human-review Task | Requires tenant execution | `[LIVE]` |

Do not retain a `[LIVE]` label in the deck unless the corresponding execution gate passes.

---

# 3. Required Environment

## 3.1 Local software

```bash
node --version
npm --version
git --version
```

Required Node version:

```text
Node.js 22.18.0 or newer
```

## 3.2 Medplum project

Use a Medplum project containing synthetic data only.

Create a `ClientApplication` with access to:

- read and write `Patient`;
- read and write `ServiceRequest`;
- read and write `DocumentReference`;
- read and write `Task`.

Do not use credentials connected to production clinical data.

## 3.3 Environment file

From the repository root:

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

Record the commit:

```bash
git rev-parse HEAD
```

---

# 4. Install and Verification Gates

## 4.1 Install dependencies

```bash
npm install
```

After the first clean installation, preserve the dependency graph:

```bash
git add package-lock.json
git commit -m "Freeze demo dependency graph"
```

Use `npm ci` for subsequent rehearsals.

## 4.2 Run required gates

Run in this order:

```bash
npm run typecheck
npm test
npm run build
```

Do not begin the live demo unless all three commands exit with status `0`.

## 4.3 Required test behaviors

The test suite must verify:

- `anyOf` succeeds when one branch is satisfied and another is unknown;
- `allOf` becomes unknown when no branch fails but one is unknown;
- nested policy changes alter the policy hash;
- source changes alter the execution-manifest hash;
- policy changes alter the execution-manifest hash;
- `ServiceRequest` version changes alter the execution-manifest hash;
- extraction-state or schema changes alter the execution-manifest hash;
- applicability or failure-state changes alter the execution-manifest hash;
- missing quotations return `QUOTE_NOT_FOUND`;
- duplicate quotations return `AMBIGUOUS_SOURCE_MATCH`;
- omitted criteria remain unverified;
- duplicate criterion outputs fail closed;
- UTF-16 code-unit offsets correctly account for surrogate pairs.

## 4.4 Gate decision

### Pass

Proceed when:

- typecheck passes;
- tests pass;
- production build passes.

### Fail

Stop and repair before continuing when any gate fails.

---

# 5. Seed the Synthetic Medplum Tenant

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

Copy the returned IDs into `.env.local`.

Run the seed again:

```bash
npm run seed
```

Expected behavior:

- logical resource IDs remain stable;
- version IDs may increment because deterministic updates are applied;
- no duplicate logical resources are created.

## 5.1 Verify resources in Medplum

Confirm:

- Patient name is `Jane Doe`;
- the `ServiceRequest` is `active`;
- the requested procedure is CPT `72148`;
- `ServiceRequest.authoredOn` is present;
- the `DocumentReference` contains one inline `text/plain; charset=utf-8` attachment;
- the `ServiceRequest` and `DocumentReference` reference the same Patient;
- the clinical note can be read back;
- the source hash is present.

## 5.2 Stop conditions

Stop and repair if:

- duplicate demo identifiers are reported;
- any logical resource ID is missing;
- Patient references differ;
- the clinical note cannot be decoded;
- the source hash is absent.

---

# 6. Start the Application

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected initial state:

- Patient ID is prepopulated;
- `ServiceRequest` ID is prepopulated;
- `DocumentReference` ID is prepopulated;
- no browser-visible server credentials appear.

Restart the development server after changing `.env.local`.

---

# 7. Primary End-to-End Execution

## Step 1 — Show synthetic FHIR context

Open or identify:

- `Patient/{patient-id}`;
- `ServiceRequest/{service-request-id}`;
- `DocumentReference/{document-reference-id}`.

State aloud:

> This demonstration uses synthetic data and performs no payer submission.

## Step 2 — Run the readiness evaluation

Select:

```text
Run Readiness Check
```

Expected domain outcome:

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

Expected criteria:

| Criterion | Internal status | Reason |
|---|---|---|
| Radicular symptoms | `met` | `CRITERION_SATISFIED` |
| Conservative therapy ≥6 weeks | `met` | `CRITERION_SATISFIED` |
| Objective neurological deficit | `met` | `CRITERION_SATISFIED` |

## Step 3 — Inspect source-verifiable evidence

For each criterion, confirm the UI displays:

- exact source quotation;
- one unique source match;
- UTF-16 code-unit start and end offsets;
- reason code;
- `DocumentReference` logical ID;
- `DocumentReference` version ID;
- source-verification status.

State aloud:

> The system verifies that the quotation exists uniquely in the stored source. It does not independently prove that the clinical interpretation is correct.

## Step 4 — Inspect the evaluation evidence

Confirm the dashboard displays:

- source SHA-256;
- policy SHA-256;
- execution-manifest SHA-256;
- evaluation Task ID;
- overall readiness result;
- review status.

Open the evaluation `Task` in Medplum and confirm:

```text
status: completed
businessStatus: ready
focus: ServiceRequest/{service-request-id}
for: Patient/{patient-id}
```

Confirm the Task stores:

- execution-manifest hash;
- readiness result;
- policy version;
- source version;
- engine version;
- extraction mode;
- exception or failure state.

## Step 5 — Verify idempotency

Without changing any input or configuration, run the evaluation again.

Expected result:

```text
same execution-manifest hash
same evaluation Task ID
no duplicate evaluation Task
```

Failure condition:

```text
identical manifest creates a different Task
```

Do not proceed until corrected.

## Step 6 — Record human review

Before review:

```text
reviewStatus: pending
```

Select:

```text
Confirm assertions
```

Use a valid synthetic reviewer reference, such as:

```text
Practitioner/demo-reviewer
```

Expected result:

```text
reviewStatus: confirmed
```

Verify a separate review `Task` exists with:

- `basedOn` referencing the evaluation Task;
- a distinct review identifier;
- `owner` referencing the reviewer;
- `businessStatus = confirmed`;
- review decision and timestamp.

Do not mutate the original evaluation Task.

---

# 8. Medplum Resource Lineage

Expected lineage:

```text
Patient/{patient-id}
        │
        ├── ServiceRequest/{service-request-id}
        │
        └── DocumentReference/{document-reference-id}
                    │
                    ▼
          Source-verification result
          UTF-16 offsets + reason codes
                    │
                    ▼
          Task/{evaluation-task-id}
          status: completed
          businessStatus: ready
                    │
                    └── basedOn
                         ▼
          Task/{review-task-id}
          businessStatus: confirmed
```

Before the human acts, the review Task does not yet exist.

---

# 9. Execution Manifest Contract

The execution manifest should include:

- Patient identifier and version where applicable;
- `ServiceRequest` identifier and version;
- `DocumentReference` identifier and version;
- source bytes hash;
- configured policy identifier and version;
- policy hash;
- extraction mode;
- extraction schema version;
- structured candidate assertions;
- source-verification outcomes;
- UTF-16 offsets;
- criterion results;
- applicability state;
- exception and failure state;
- engine version;
- Git commit;
- execution timestamp if excluded from deterministic hash input.

## 9.1 Hash invariant

Identical recorded inputs and deterministic configuration must yield:

- the same canonical manifest;
- the same execution-manifest hash;
- the same evaluation Task identifier.

A materially changed source, policy, resource version, extraction result, schema, applicability state, or engine version must produce a different manifest hash.

---

# 10. Negative-Path Rehearsal

Complete all negative-path checks before the final presentation. Restore the baseline seed after each test.

## A. Wrong CPT code

Change the procedure code from `72148`.

Expected:

```text
overallStatus: not-applicable
reason: CODE_MISMATCH
extractorMode: not-run
sourceHash: null
```

An evaluation Task should still be persisted.

## B. Inactive request

Set the `ServiceRequest` status to `revoked` or `completed`.

Expected:

```text
overallStatus: not-applicable
reason: REQUEST_NOT_ACTIVE
```

## C. Missing request date

Remove `ServiceRequest.authoredOn`.

Expected:

```text
overallStatus: unverified
applicability: unknown
reason: REQUEST_DATE_MISSING
```

## D. Source quotation mismatch

Change one sentence in the `DocumentReference` without changing the mocked assertion.

Expected:

```text
evidenceStatus: unverified
criterionStatus: unverified
reason: QUOTE_NOT_FOUND
```

## E. Duplicate source quotation

Repeat one quoted sentence in the clinical note.

Expected:

```text
evidenceStatus: ambiguous
criterionStatus: unverified
reason: AMBIGUOUS_SOURCE_MATCH
```

## F. Patient scope mismatch

Point the `DocumentReference` to a different synthetic Patient.

Expected:

```text
evaluation fails with Resource scope mismatch
no evaluation Task is created
```

## Restore baseline

```bash
npm run seed
```

Restart the application and rerun the primary path.

---

# 11. Recommended Live Negative Case

Use only one negative case during the presentation:

1. Change one source sentence.
2. Leave the predefined candidate assertion unchanged.
3. Run the readiness check.
4. Show `QUOTE_NOT_FOUND`.
5. Show the criterion fail closed to `Unknown` / `unverified`.
6. Restore the baseline before continuing.

This demonstrates the source-verification gate without adding a second complex policy scenario.

---

# 12. Deck Synchronization Checklist

Before presenting, confirm the deck matches the execution state.

## Clinical scenario

- [ ] Deck uses the implemented `ready` primary path.
- [ ] Three-week PT and missing-imaging example is removed or clearly labeled as a negative-path illustration.
- [ ] Criteria match the current policy fixture.

## Resource model

- [ ] Patient is included.
- [ ] Applicability and scope validation are shown.
- [ ] `ServiceRequest`, `DocumentReference`, evaluation `Task`, and review `Task` lineage is correct.

## Verification claims

- [ ] Uses “UTF-16 code-unit offsets.”
- [ ] States that quotations must match exactly once.
- [ ] Distinguishes source fidelity from clinical correctness.
- [ ] Does not claim autonomous approval, denial, or submission.

## Task lifecycle

- [ ] Evaluation Task is created first.
- [ ] Review status is initially pending.
- [ ] Review Task is created only after human action.
- [ ] Review Task uses `basedOn` to reference the evaluation Task.
- [ ] Evaluation Task remains unchanged.

## Runtime proof

- [ ] Live resource IDs replace placeholders.
- [ ] Source hash is shown.
- [ ] Policy hash is shown.
- [ ] Execution hash is shown.
- [ ] `DocumentReference` version is shown.
- [ ] Evaluation Task ID is shown.
- [ ] Idempotent Task reuse is demonstrated.

## Capability labels

- [ ] `[LIVE]` appears only for capabilities that passed all gates.
- [ ] Extraction remains labeled `[MOCKED EXTRACTOR]`.

---

# 13. Five-Minute Demo Script

## 0:00–0:40 — Problem and system boundary

> Electronic prior authorization can move a request faster, but it does not prove that the supporting evidence is complete or source-verifiable. This prototype separates mocked or probabilistic extraction from deterministic source alignment, deterministic policy evaluation, and explicit human review.

Point to the safety boundary.

## 0:40–1:15 — Synthetic FHIR context

Show:

- Patient;
- lumbar MRI `ServiceRequest`;
- source `DocumentReference`.

State that no real PHI or PAS submission is used.

## 1:15–2:10 — Run readiness evaluation

Select **Run Readiness Check**.

Explain:

- scope and applicability are checked first;
- evidence assertions are predefined for the demo;
- quotations must match exactly once;
- policy rules use three-valued logic;
- the resulting overall status is `ready`.

## 2:10–3:00 — Source-verifiable evidence

Show:

- exact quotation;
- UTF-16 offset range;
- reason code;
- `DocumentReference` version.

State:

> Source fidelity is verified. Clinical meaning remains reviewable.

## 3:00–3:40 — Evaluation record and idempotency

Show:

- source hash;
- policy hash;
- execution-manifest hash;
- evaluation Task ID.

Run the evaluation again and show:

- same hash;
- same evaluation Task ID;
- no duplicate Task.

## 3:40–4:35 — Human review

Select **Confirm assertions**.

Show the separate review Task and its `basedOn` reference to the evaluation Task.

Explain that the original evaluation record is not rewritten.

## 4:35–5:00 — Close

> The result is not autonomous approval. It is a source-verifiable evidence-readiness artifact that sits before downstream prior-authorization packaging and makes human review more focused and reproducible.

---

# 14. Failure Recovery Matrix

| Failure | Likely cause | Recovery |
|---|---|---|
| Required Medplum environment variable missing | `.env.local` is incomplete | Populate values and restart |
| Client login fails | Wrong credentials, base URL, or ClientApplication state | Rotate credentials and test project access |
| Duplicate seed identifier | Existing duplicate synthetic resources | Delete or reconcile duplicates; do not select an arbitrary match |
| Dashboard fields blank | IDs missing or development server not restarted | Populate IDs and restart |
| Resource scope mismatch | Patient references differ | Re-seed or correct references |
| Unsupported attachment | Wrong type, URL attachment, or invalid Base64 | Use inline `text/plain; charset=utf-8` |
| Source exceeds limit | Note exceeds configured size limit | Reduce synthetic note size |
| `QUOTE_NOT_FOUND` on baseline | Source and fixture quotation differ | Restore seed or correct controlled assertion |
| `AMBIGUOUS_SOURCE_MATCH` on baseline | Quotation occurs more than once | Make source quotation unique |
| Review Task creation fails | Invalid reviewer reference | Use an existing synthetic Practitioner |
| Same input creates a different Task | Hash input changed or canonicalization is unstable | Compare manifest fields and serialization |
| Changed input reuses old Task | Manifest omitted a changed field | Stop demo and add the field plus regression test |
| Production build fails | Next.js environment or server/client boundary defect | Fix before presentation |

---

# 15. Code-Freeze Checklist

Run from a clean checkout:

```bash
rm -rf node_modules .next
npm ci
npm run typecheck
npm test
npm run build
npm run seed
npm run dev
```

Confirm:

- primary readiness path succeeds;
- exact quotations and UTF-16 offsets are visible;
- evaluation Task is persisted;
- repeated evaluation is idempotent;
- review Task is created after human action;
- both Tasks are visible in Medplum;
- no server credential is exposed to the browser;
- no real PHI is present;
- the deck contains actual live identifiers and hashes;
- there are no uncommitted source changes.

```bash
git status --short
git rev-parse HEAD
```

Tag the frozen revision:

```bash
git tag demo-freeze-v0.2.0
git show --stat --oneline demo-freeze-v0.2.0
```

Capture in the presenter notes:

- Git commit;
- Patient ID;
- `ServiceRequest` ID and version;
- `DocumentReference` ID and version;
- source hash;
- policy hash;
- execution-manifest hash;
- evaluation Task ID;
- review Task ID.

---

# 16. Go / No-Go Decision

## Go

Proceed only when:

- dependency installation succeeds;
- typecheck passes;
- tests pass;
- production build passes;
- baseline seed is restored;
- primary result is `ready`;
- source quotations and UTF-16 offsets are reproducible;
- evaluation Task is verified in Medplum;
- identical rerun reuses the same evaluation Task;
- separate review Task is verified;
- the deck uses actual live values;
- the five-minute rehearsal succeeds twice from a fresh browser session.

## No-Go

Do not present the workflow as operational when:

- build, typecheck, or tests fail;
- live Medplum persistence has not been verified;
- source quotations cannot be reproduced;
- duplicate quotation handling is not fail-closed;
- changed execution state reuses an old evaluation Task;
- review is described as completed without a separate linked review Task;
- real patient information is present;
- placeholders remain on the live-proof slide;
- the prototype is described as autonomous approval or PAS submission.

---

# 17. Effort Estimate

## Base execution

| Workstream | Estimated effort |
|---|---:|
| Freeze scenario and contract | 0.5 hour |
| Install, typecheck, test, and build | 1–2 hours |
| Configure and seed Medplum | 0.5–1 hour |
| Align applicability and Task lifecycle | 1–1.5 hours |
| Verify source matching and manifest | 1–1.5 hours |
| Confirm idempotency and human review | 0.5–1 hour |
| Negative-path rehearsal | 0.75–1.25 hours |
| Deck synchronization and screenshots | 0.5–0.75 hour |
| Two rehearsals and freeze | 0.75–1 hour |

**Expected total:** 7–10 hours.

## Contingency

Reserve an additional 2–3 hours for:

- npm or Node version problems;
- Medplum permissions or authentication;
- FHIR Task validation errors;
- invalid reviewer references;
- unstable manifest canonicalization;
- Next.js build or server/client boundary defects.

---

# 18. Final Demonstration Standard

The minimum defensible proof is:

```text
Real synthetic Medplum resources
→ applicability and scope validation
→ mocked structured evidence assertions
→ unique exact source verification with UTF-16 offsets
→ deterministic ready result
→ completed content-addressed evaluation Task
→ identical rerun reuses the same Task
→ human confirmation creates a separate linked review Task
```

Do not expand into live LLM extraction or downstream PAS submission until this sequence is stable.
