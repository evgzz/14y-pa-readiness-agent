# Agent Rules for 14Y PA Readiness Agent

## Documentation is the source of truth

- Read the relevant Medplum documentation and code before implementing a Medplum or FHIR pattern.
- Re-read the relevant source after a context switch, summary, or major design change.
- Prefer real Medplum patterns over generic FHIR examples.

## Core constraints

- Use FHIR R4 only.
- Type FHIR resources with `@medplum/fhirtypes`.
- Reuse `@medplum/core` helpers.
- Do not invent fields, search parameters, operations, or clinical codes.
- Prefer conditional create or update keyed by `identifier`.
- Do not use search-then-create for idempotent writes.
- Never expose `MEDPLUM_CLIENT_SECRET` to browser code.
- Use synthetic data only.
- Preserve `Unknown` when evidence cannot be verified.
- Treat quotation matching as source fidelity, not clinical truth.
- Do not add autonomous approval, denial, prediction, or PAS submission.

## Verification

Before accepting a material change:

```bash
npm run typecheck
npm test
npm run build
```

For FHIR resources, use server-side `$validate` when practical after the core workflow passes.

## Scope discipline

P0:

- Medplum resources
- applicability and scope
- source verification
- deterministic readiness
- evaluation Task
- idempotency
- review Task
- one fail-closed negative case

Do not start AWS, voice, Stedi, live LLM extraction, or PAS submission while P0 is incomplete.
