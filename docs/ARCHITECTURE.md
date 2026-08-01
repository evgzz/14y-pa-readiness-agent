# Architecture

## Trust boundary

```text
Medplum FHIR resources
        ↓
Scope and applicability validation
        ↓
Mocked or probabilistic assertion proposal
        ↓
Deterministic schema and exact-source verification
        ↓
Deterministic three-valued policy evaluation
        ↓
Content-addressed evaluation Task
        ↓
Explicit human review
        ↓
Separate linked review Task
```

## Component responsibilities

| Component | Responsibility |
|---|---|
| Medplum | Synthetic FHIR resource storage, retrieval, and Task persistence |
| Extractor gateway | Typed assertion validation, complete-response checks, unique quote alignment |
| Policy registry | Versioned synthetic criteria and rule graph |
| Readiness evaluator | Criterion evaluation and three-valued rule execution |
| Audit manifest | Canonical execution inputs and SHA-256 fingerprint |
| FHIR audit layer | Idempotent evaluation and review Task creation |
| Dashboard | Manual evaluation trigger, proof display, and review action |

## Source fidelity versus clinical sufficiency

The source verifier establishes that a proposed quotation exists exactly once in the decoded note and records its UTF-16 range. It does not establish that the interpretation is clinically correct. Typed assertions are evaluated by deterministic policy rules and remain subject to human confirmation.

## Persistence model

Evaluation Tasks are addressed by execution-manifest hash. Review Tasks are addressed by a separate review hash and reference the evaluation through `basedOn`. This preserves the original evaluation evidence while recording a distinct human decision.
