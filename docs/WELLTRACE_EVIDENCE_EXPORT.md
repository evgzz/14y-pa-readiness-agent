# WellTrace Evidence Export

This repository can emit a non-PHI evidence bundle for WellTrace using the **actual readiness engine code** pinned at commit `b054618be3b135006afb15dadb40d45648982fc4`.

The export workflow deliberately separates the exporter change from the system under test:

```text
bridge branch
  exporter + workflow
        |
        v
separate checkout of pinned SUT commit b054618...
        |
        v
npm test on pinned SUT
        |
        v
actual evaluateCriteria / deriveOverallStatus execution
        |
        v
self-hashed WT-PA-REAL-AGENT-RUN-1.0.0 bundle
```

The current evidence cases are synthetic/non-PHI and exercise the readiness engine's three native decision states:

- `PA-REAL-ENGINE-READY-001` → `ready`
- `PA-REAL-ENGINE-INCOMPLETE-001` → `incomplete`
- `PA-REAL-ENGINE-UNVERIFIED-001` → `unverified`

The generated artifact is `welltrace-pa-real-engine-evidence/pa-real-engine-run.json`.

## Claim boundary

This demonstrates execution of the actual readiness-engine implementation, policy registry, canonical hashing utilities, and pinned dependency/test environment. It does **not** demonstrate:

- live Medplum retrieval or Task persistence;
- live payer execution;
- CRD/DTR/PAS `$submit` or `$inquire`;
- LLM-backed extraction (the pinned app currently uses its mock extractor path);
- clinical validity;
- production readiness.

Those require separate evidence. The purpose of this export is to establish the first auditable cross-repository WellTrace SUT execution without overstating the current application.