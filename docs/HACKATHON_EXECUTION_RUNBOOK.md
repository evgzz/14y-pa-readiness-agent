# 14Y PA Readiness Agent — Hackathon Execution Runbook

## Purpose

Build, verify, submit, and present one narrow Medplum-native MVP during the YC × Medplum Agentic Healthcare Hackathon.

This runbook is optimized for the official event schedule:

| Time | Official event milestone |
|---|---|
| 9:00 AM | Doors open and breakfast |
| 10:00 AM | Opening remarks and sponsor introductions |
| 12:30 PM | Lunch |
| 3:00 PM | Sponsor workshops and office hours |
| 5:00 PM | Submissions close |
| 6:00 PM | Dinner and presentations |
| 7:00 PM | Awards |

The operating principle is:

> Deep, visible Medplum usage is more valuable than several shallow sponsor integrations.

---

# 1. MVP Contract

## 1.1 Single proof chain

The MVP must demonstrate:

```text
Synthetic Patient
+ active lumbar MRI ServiceRequest
+ clinical-note DocumentReference
→ validate Patient scope and request applicability
→ load predefined structured evidence assertions
→ verify each source quotation exactly once
→ calculate deterministic three-valued readiness
→ persist a content-addressed evaluation Task
→ rerun identical input and reuse the same Task
→ record human confirmation in a separate linked review Task
```

## 1.2 Expected primary result

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

Expected criterion results:

| Criterion | Internal status |
|---|---|
| Radicular symptoms | `met` |
| Conservative therapy of at least six weeks | `met` |
| Objective neurological deficit | `met` |

## 1.3 Safety boundary

The application:

- uses synthetic data only;
- uses predefined assertions from a mocked extractor;
- verifies source fidelity, not clinical truth;
- does not approve or deny coverage;
- does not predict payer approval;
- does not submit PAS or X12 transactions;
- requires explicit human review.

---

# 2. Scope Discipline

## P0 — Required for submission

1. Synthetic FHIR resources in Medplum.
2. Patient-scope and applicability validation.
3. Exact unique quotation matching.
4. UTF-16 code-unit offsets.
5. Three-valued readiness evaluation.
6. Source, policy, and execution hashes.
7. Completed evaluation `Task`.
8. Identical rerun reuses the evaluation `Task`.
9. Human action creates a separate review `Task`.
10. One fail-closed `QUOTE_NOT_FOUND` example.
11. Five-minute live demonstration.
12. Recorded or screenshot fallback.

## P1 — Add only after P0 is frozen

- FHIR server-side `$validate` for generated Tasks;
- copyable Medplum resource links;
- downloadable execution manifest;
- elapsed-time display;
- one polished negative-path toggle;
- corrected-assertion review UI.

## P2 — Explicitly defer

- AWS deployment;
- live LLM extraction;
- CopilotKit chat;
- Deepgram voice;
- Stedi eligibility;
- live payer policy ingestion;
- PAS or X12 submission;
- multi-patient search;
- production authentication;
- production PHI.

Do not start a P1 or P2 item while any P0 gate is failing.

---

# 3. Official Resource Strategy

The event provides:

- Medplum documentation;
- guidance for building on Medplum with AI coding assistants;
- Medplum Discord and hackathon support channel;
- Stedi test mode;
- Deepgram developer credits and tools;
- a Medplum getting-started video.

Use them as follows:

| Resource | MVP use |
|---|---|
| Medplum documentation | Source of truth for FHIR and SDK patterns |
| AI coding guidance | Rule file, strict typing, tests, build, validation |
| Discord / office hours | Resolve one specific blocker |
| Stedi test mode | Stretch only; not part of core proof |
| Deepgram | Defer unless the core workflow is already frozen |
| Getting-started video | Environment recovery or onboarding |

The official Medplum guidance requires treating AI-generated code as draft output, grounding work in Medplum code and documentation, using FHIR R4 types, running typecheck/tests/build, and performing server-side validation where practical.

---

# 4. Pre-Event Exit Criteria

Complete before the 10:00 AM opening remarks when possible.

## 4.1 Workstation

```bash
node --version
npm --version
git --version
npm ping
curl -I https://api.medplum.com/
```

Required:

```text
Node.js >= 22.18.0
npm registry reachable
Medplum API reachable
```

## 4.2 Repository

```bash
cd 14y-pa-readiness-agent
code 14y-pa-readiness-agent.code-workspace
git status --short
git rev-parse HEAD
```

## 4.3 Environment

```bash
cp .env.example .env.local
```

Populate:

```env
MEDPLUM_BASE_URL=https://api.medplum.com/
MEDPLUM_CLIENT_ID=<synthetic-project-client-id>
MEDPLUM_CLIENT_SECRET=<synthetic-project-client-secret>

DEMO_PATIENT_ID=
DEMO_SERVICE_REQUEST_ID=
DEMO_DOCUMENT_REFERENCE_ID=

GIT_COMMIT=<current-commit>
```

Verify:

```bash
git check-ignore .env.local
```

Expected:

```text
.env.local
```

## 4.4 Dependencies

```bash
npm install
npm ls --depth=0
```

Commit the lock file when it changes intentionally:

```bash
git add package-lock.json
git commit -m "Freeze hackathon dependency graph"
```

## 4.5 Synthetic Medplum project

The server-to-server `ClientApplication` must be able to search, read, create, and update:

- `Patient`;
- `ServiceRequest`;
- `DocumentReference`;
- `Task`;
- `Practitioner` when needed.

No production project, credential, or record may be used.

## 4.6 Seed

```bash
npm run seed
```

Copy the returned resource IDs into `.env.local`, then run:

```bash
npm run seed
```

Pass condition:

- same logical IDs;
- no duplicate logical resources;
- source hash returned;
- valid synthetic reviewer exists.

## 4.7 Baseline gates

```bash
npm run typecheck
npm test
npm run build
```

Pass condition:

```text
all exit codes = 0
```

---

# 5. Agentic Engineering Rules

Maintain an `AGENTS.md` file at the repository root with these controls:

```md
# Agent Rules

- Medplum documentation and code are the source of truth.
- Use FHIR R4 only.
- Type FHIR resources with @medplum/fhirtypes.
- Reuse @medplum/core helpers.
- Do not invent FHIR fields, search parameters, operations, or clinical codes.
- Prefer conditional create or update keyed by identifier.
- Never use search-then-create for an idempotency requirement.
- Never expose MEDPLUM_CLIENT_SECRET to browser code.
- Use synthetic data only.
- Run typecheck, tests, and production build after every material change.
- Re-read the relevant Medplum documentation after context switches.
```

Development rhythm:

```text
read relevant Medplum docs
→ state the implementation plan
→ make one bounded change
→ typecheck
→ test
→ compare against docs
→ commit
```

Use a new coding-agent thread after each major feature or blocker to reduce context drift.

---

# 6. Hackathon Timeboxed Plan

## 9:00–10:00 — Environment recovery

Objective: establish a known-good local baseline before opening remarks.

Run:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run seed
npm run dev
```

In a second terminal:

```bash
curl -i http://localhost:3000/api/health
```

Pass condition:

- app loads;
- credentials work;
- seed works;
- health endpoint succeeds;
- no secret appears in browser developer tools.

Stop condition:

- dependency installation fails;
- Medplum authentication fails;
- production build fails.

Escalation:

- use the Medplum Discord hackathon channel for a narrowly stated blocker;
- include the error, affected resource, command, expected behavior, and attempted fixes.

---

## 10:00–11:00 — Resource retrieval and applicability

Objective: retrieve the three Medplum resources and reject invalid scope before extraction.

Required checks:

1. `Patient/{id}` exists.
2. `ServiceRequest/{id}` exists.
3. `DocumentReference/{id}` exists.
4. Request status is `active`.
5. CPT is `72148`.
6. `authoredOn` is present.
7. Patient references match.
8. Source attachment is readable UTF-8 text.

Expected invalid outcomes:

| Condition | Result |
|---|---|
| Wrong CPT | `not-applicable` / `CODE_MISMATCH` |
| Inactive request | `not-applicable` / `REQUEST_NOT_ACTIVE` |
| Missing request date | `unverified` / `REQUEST_DATE_MISSING` |
| Patient mismatch | fail before persistence |

Checkpoint:

```bash
npm run typecheck
npm test
git add .
git commit -m "Verify scoped Medplum resource retrieval"
```

---

## 11:00–12:00 — Source verification and readiness

Objective: produce the primary `ready` result.

For each predefined assertion:

1. Decode the source note.
2. Search for the exact quotation.
3. Require exactly one match.
4. Record UTF-16 start and end offsets.
5. Attach the source logical ID and version.
6. Return a fail-closed reason otherwise.

Expected source outcomes:

| Match count | Result |
|---:|---|
| 1 | verified |
| 0 | `QUOTE_NOT_FOUND` |
| >1 | `AMBIGUOUS_SOURCE_MATCH` |

Apply deterministic three-valued policy logic:

```text
met
not-met
unverified
```

Expected primary result:

```text
applicable
ready
three criteria met
```

Checkpoint:

```bash
npm run typecheck
npm test
git add .
git commit -m "Complete deterministic source and readiness evaluation"
```

---

## 12:00–12:30 — Evaluation Task

Objective: persist one content-addressed evaluation record before lunch.

The evaluation `Task` must include:

```text
status: completed
businessStatus: ready
focus: ServiceRequest/{id}
for: Patient/{id}
```

Persist or reference:

- source hash;
- policy hash;
- execution-manifest hash;
- source version;
- policy version;
- engine version;
- extraction mode;
- applicability state;
- criterion outcomes;
- exception state.

Pass condition:

- evaluation Task can be opened in Medplum;
- Task identifier derives from or uniquely maps to the manifest hash.

Lunch checkpoint:

> Do not add a new integration if the completed evaluation Task is not visible in Medplum.

---

## 12:30–1:15 — Idempotency

Objective: prove reproducibility.

Without modifying data or code:

1. Run the readiness evaluation.
2. Record manifest hash and Task ID.
3. Run the same evaluation again.
4. Compare results.

Expected:

```text
same execution-manifest hash
same evaluation Task ID
no duplicate evaluation Task
```

Fail condition:

```text
identical inputs create a second evaluation Task
```

Required response:

- stop;
- compare canonical manifest inputs;
- inspect serialization stability;
- verify every material version is represented;
- use conditional create keyed by identifier;
- add a regression test.

Checkpoint:

```bash
npm run typecheck
npm test
git add .
git commit -m "Prove evaluation Task idempotency"
```

---

## 1:15–2:00 — Human review Task

Objective: create a separate human decision record.

Before review:

```text
reviewStatus: pending
review Task: absent
```

Select:

```text
Confirm assertions
```

Expected review Task:

```text
basedOn: Task/{evaluation-task-id}
owner: Practitioner/{synthetic-reviewer-id}
businessStatus: confirmed
distinct identifier
decision timestamp
```

Invariant:

```text
evaluation Task is not mutated
```

Checkpoint:

```bash
npm run typecheck
npm test
git add .
git commit -m "Record linked human review Task"
```

---

## 2:00–2:40 — UI proof surface

Objective: make the technical proof visible without opening source code.

The primary screen must show:

- Patient name;
- requested service and code;
- applicability;
- overall readiness;
- criterion status;
- exact quotation;
- UTF-16 offset range;
- source version;
- reason code;
- source hash;
- policy hash;
- execution hash;
- evaluation Task ID;
- review status;
- review Task ID after action.

Do not show:

- credentials;
- production-style PHI;
- raw internal errors;
- unsupported autonomous claims;
- live PAS submission controls.

---

## 2:40–3:00 — Office-hours preparation

Prepare one concise question only when a blocker remains.

Template:

```text
We are using Medplum FHIR R4 Task resources for a content-addressed
evaluation and a separate human review. We expect identical manifests
to reuse the same evaluation Task. Current behavior is <actual>.
We tried <attempts>. Is <proposed Medplum pattern> the recommended
conditional-write approach?
```

Bring:

- minimal code excerpt;
- exact error;
- resource JSON with secrets removed;
- expected versus actual result.

---

## 3:00–3:30 — Workshop or final blocker removal

Use office hours for:

- correct Task modeling;
- conditional create or update;
- ClientApplication permissions;
- server-side `$validate`;
- SDK method selection.

Do not use this window to redesign the product.

At 3:30 PM, invoke feature freeze.

---

## 3:30–4:00 — Negative-path proof

Use exactly one live negative case.

Procedure:

1. Change one controlled source sentence.
2. Leave the predefined quotation unchanged.
3. Run readiness.
4. Show `QUOTE_NOT_FOUND`.
5. Show criterion status `unverified`.
6. Explain that the policy fails closed to `Unknown`.
7. Restore baseline.

```bash
npm run seed
```

Re-run the primary flow after restoration.

---

## 4:00–4:20 — Clean verification

From a clean state:

```bash
rm -rf .next
npm run typecheck
npm test
npm run build
npm run seed
npm run dev
```

Verify:

- primary result is `ready`;
- evaluation Task is persisted;
- identical rerun is idempotent;
- review Task is separate and linked;
- negative-path baseline is restored;
- no placeholder IDs remain on the demo screen.

Optional server validation after P0 passes:

- submit evaluation Task to `$validate`;
- submit review Task to `$validate`;
- retain the returned `OperationOutcome`.

---

## 4:20–4:35 — Capture fallback evidence

Capture:

1. resource overview;
2. readiness result;
3. exact quotation and offsets;
4. hashes and evaluation Task ID;
5. identical rerun proof;
6. linked review Task;
7. `QUOTE_NOT_FOUND` proof.

Produce either:

- a 60–90 second recording; or
- seven ordered screenshots.

Verify that no secret is visible.

---

## 4:35–4:45 — Freeze source

```bash
git status --short
git rev-parse HEAD
git tag demo-freeze-v1
git show --stat --oneline demo-freeze-v1
```

Record privately:

```text
Git commit:
Patient ID:
ServiceRequest ID and version:
DocumentReference ID and version:
Source hash:
Policy hash:
Execution hash:
Evaluation Task ID:
Review Task ID:
```

Do not record the client secret.

---

## 4:45–5:00 — Submit

Submission closes at 5:00 PM.

Submit by 4:45 PM when possible.

Before submission:

- confirm project title;
- confirm concise problem statement;
- confirm demo URL or video opens;
- confirm repository access is correct;
- confirm no production data is included;
- confirm claims match the actual build;
- save proof that the form was accepted.

No feature work after submission unless required to preserve the presentation.

---

## 5:00–6:00 — Presentation preparation

1. Close unnecessary applications.
2. Disable notifications.
3. Open the exact Medplum resources in tabs.
4. Open the application in a fresh browser session.
5. Restore the baseline seed.
6. Run the primary flow once.
7. Rehearse the five-minute script three times.
8. Keep the fallback recording immediately accessible.

Do not change code unless the live path is broken.

---

# 7. Five-Minute Presentation Script

## 0:00–0:30 — Problem

> Prior-authorization automation can move incomplete evidence faster. We add a verification layer before downstream submission so reviewers can see whether the supporting evidence is present, source-aligned, and reproducible.

## 0:30–1:00 — Medplum data

Show:

- synthetic Patient;
- active lumbar MRI `ServiceRequest`;
- clinical-note `DocumentReference`.

> These are real FHIR resources stored in Medplum. The demonstration uses no real patient data and performs no payer submission.

## 1:00–1:50 — Run readiness

Select **Run Readiness Check**.

Show:

```text
Applicable
Ready
3 of 3 criteria satisfied
```

Explain:

- Patient scope is checked;
- request applicability is checked;
- the evidence assertions are predefined for the demo;
- policy evaluation is deterministic.

## 1:50–2:40 — Source fidelity

Open one evidence card.

Show:

- exact quotation;
- unique-match status;
- UTF-16 offsets;
- source resource version;
- reason code.

> The proposed interpretation may come from an agent, but the verifier independently proves whether the quoted text exists exactly once in the stored source.

## 2:40–3:30 — Reproducibility

Show:

- source hash;
- policy hash;
- execution hash;
- evaluation Task ID.

Run the evaluation again.

> Identical inputs produce the same manifest and reuse the same evaluation Task.

## 3:30–4:15 — Human review

Select **Confirm assertions**.

Show:

- new review Task;
- `basedOn` reference;
- reviewer owner;
- confirmed status.

> The human decision is a separate linked FHIR record. The original evaluation record is not rewritten.

## 4:15–4:40 — Fail closed

Show the prepared `QUOTE_NOT_FOUND` example.

> When the source quotation cannot be reproduced, the criterion becomes Unknown rather than being silently accepted.

## 4:40–5:00 — Close

> This is not autonomous authorization. It is a source-verifiable readiness layer that makes downstream prior-authorization work more focused, reproducible, and reviewable.

---

# 8. Go / No-Go

## Go live

Present the live workflow when:

- typecheck passes;
- tests pass;
- production build passes;
- synthetic seed is restored;
- readiness result is `ready`;
- exact quotation and offsets are reproducible;
- evaluation Task is visible in Medplum;
- identical rerun reuses the Task;
- separate review Task is visible;
- rehearsal succeeds twice from a fresh browser.

## Use fallback recording

Use the recording when:

- venue network is unstable;
- Medplum authentication is unreliable;
- resource pages load inconsistently;
- screen sharing degrades the application;
- any live step has failed during the final rehearsal.

## Remove a feature from the presentation

Remove it when:

- it has not passed end to end;
- it requires a manual repair during the demo;
- it introduces a new external dependency after 3:30 PM;
- it cannot be explained in one sentence;
- the deck overstates what the implementation does.

## No-go claims

Never claim:

- payer approval;
- payer denial;
- approval prediction;
- autonomous clinical decision-making;
- live PAS submission;
- immutable or audit-proof records;
- clinical truth from quotation matching;
- production readiness.

---

# 9. Failure Recovery

| Failure | Response |
|---|---|
| `npm ci` fails | Repair Node, registry, lock-file, proxy, or certificate issue; do not bypass |
| Typecheck fails | Correct FHIR R4 typing; do not cast away the error |
| Tests fail | Restore last passing commit; remove nonessential changes |
| Build fails | Fix production boundary; development-mode success is insufficient |
| Medplum login fails | Recheck base URL, ClientApplication, secret, and project permissions |
| Seed duplicates resources | Reconcile synthetic identifiers; never select an arbitrary duplicate |
| Patient scope mismatch | Restore deterministic seed |
| Baseline quote not found | Restore controlled source text and fixture |
| Baseline quote ambiguous | Make the quotation unique |
| Same input creates new Task | Fix conditional persistence and canonical hash inputs |
| Changed input reuses old Task | Add the omitted material field to the manifest |
| Review Task fails | Verify synthetic reviewer and Task permissions |
| Secret visible in browser | Stop, rotate secret, and repair server-only boundary |
| Live demo unstable | Switch immediately to fallback recording |

---

# 10. Final Definition of Done

The MVP is complete only when this proof works:

```text
real synthetic Medplum resources
→ request applicability and scope validation
→ mocked evidence assertions
→ exact unique source verification
→ UTF-16 offsets and source version
→ deterministic ready result
→ completed content-addressed evaluation Task
→ identical rerun reuses the same Task
→ human confirmation creates a separate linked review Task
→ missing quotation fails closed to Unknown
```

Everything else is a stretch feature.
