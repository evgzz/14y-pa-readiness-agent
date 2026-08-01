# Demo Contract

## Source of truth

The execution runbook and this contract control the demo. Slides must reflect the same scenario and Task lifecycle.

## Primary scenario

- Synthetic Patient: Jane Doe
- Active lumbar MRI ServiceRequest
- CPT 72148
- Authored date: 2026-02-01
- Linked inline UTF-8 DocumentReference
- Policy: lumbar-mri-demo-v1
- Extractor mode: mock

## Expected criteria

| Criterion | Expected status | Reason |
|---|---|---|
| Radicular symptoms | met | CRITERION_SATISFIED |
| Conservative therapy ≥6 weeks | met | CRITERION_SATISFIED |
| Objective neurological deficit | met | CRITERION_SATISFIED |

## Expected result

```text
applicability: applicable
overallStatus: ready
reviewStatus: pending
```

## Task lifecycle

1. Evaluation creates or reuses one completed evaluation Task identified by the execution-manifest hash.
2. Repeating the unchanged evaluation reuses the same Task.
3. Human review creates a separate completed review Task.
4. The review Task references the evaluation Task through `basedOn`.
5. The evaluation Task is never rewritten to store the review decision.

## Proof fields

The live demonstration must show:

- exact quotation;
- unique-match status;
- UTF-16 code-unit offsets;
- reason code;
- DocumentReference version;
- source hash;
- policy hash;
- execution-manifest hash;
- evaluation Task ID;
- review Task ID after human action.
