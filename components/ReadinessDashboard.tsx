'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { runReadiness } from '@/app/actions/runReadiness';
import { reviewReadiness } from '@/app/actions/reviewReadiness';
import type { ReadinessResult, ReviewStatus } from '@/types/readiness';

interface Props {
  defaults: {
    patientId: string;
    serviceRequestId: string;
    documentReferenceId: string;
  };
}

function statusClass(status: ReadinessResult['status']): string {
  switch (status) {
    case 'ready':
      return 'status ready';
    case 'incomplete':
      return 'status incomplete';
    case 'not-applicable':
      return 'status neutral';
    default:
      return 'status unverified';
  }
}

export function ReadinessDashboard({ defaults }: Props) {
  const [patientId, setPatientId] = useState(defaults.patientId);
  const [serviceRequestId, setServiceRequestId] = useState(
    defaults.serviceRequestId,
  );
  const [documentReferenceId, setDocumentReferenceId] = useState(
    defaults.documentReferenceId,
  );
  const [reviewerReference, setReviewerReference] = useState(
    'Practitioner/demo-reviewer',
  );
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('pending');
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runEvaluation() {
    setError(null);
    startTransition(async () => {
      try {
        const nextResult = await runReadiness({
          patientId,
          serviceRequestId,
          documentReferenceId,
        });
        setResult(nextResult);
        setReviewStatus(nextResult.reviewStatus);
        setReviewTaskId(null);
      } catch (caught) {
        setResult(null);
        setError(caught instanceof Error ? caught.message : 'Evaluation failed.');
      }
    });
  }

  function submitReview(decision: 'confirmed' | 'rejected') {
    if (!result?.evaluationTaskId) {
      setError('No evaluation Task is available for review.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const review = await reviewReadiness({
          evaluationTaskId: result.evaluationTaskId,
          decision,
          reviewerReference,
        });
        setReviewStatus(review.reviewStatus);
        setReviewTaskId(review.reviewTaskId ?? null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Review failed.');
      }
    });
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">14Y Systems</p>
          <h1>PA Readiness Agent</h1>
          <p className="subtitle">
            Source-verifiable evidence readiness with deterministic policy logic
            and explicit human review.
          </p>
        </div>
        <div className="boundary">
          <strong>Safety boundary</strong>
          <span>Extraction is mocked or probabilistic. No autonomous approval, denial, or PA submission.</span>
        </div>
      </section>

      <section className="panel inputs">
        <label>
          Patient ID
          <input value={patientId} onChange={(e: ChangeEvent<HTMLInputElement>) => setPatientId(e.target.value)} />
        </label>
        <label>
          ServiceRequest ID
          <input
            value={serviceRequestId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setServiceRequestId(e.target.value)}
          />
        </label>
        <label>
          DocumentReference ID
          <input
            value={documentReferenceId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDocumentReferenceId(e.target.value)}
          />
        </label>
        <button onClick={runEvaluation} disabled={isPending}>
          {isPending ? 'Running…' : 'Run Readiness Check'}
        </button>
      </section>

      {error && <section className="panel error">{error}</section>}

      {result && (
        <>
          <section className="panel resultHeader">
            <div>
              <p className="eyebrow">Evaluation outcome</p>
              <h2>{result.policy.policyVersion}</h2>
              <p>
                Applicability: <strong>{result.applicability.status}</strong>{' '}
                ({result.applicability.reasons.join(', ')})
              </p>
            </div>
            <span className={statusClass(result.status)}>{result.status}</span>
          </section>

          <section className="criteriaGrid">
            {result.criteria.map((criterion) => (
              <article className="panel criterion" key={criterion.id}>
                <div className="criterionTop">
                  <h3>{criterion.label}</h3>
                  <span className={`criterionStatus ${criterion.status}`}>
                    {criterion.status}
                  </span>
                </div>
                <code>{criterion.reasonCode}</code>
                {criterion.evidence && (
                  <blockquote>
                    “{criterion.evidence.quote}”
                    <small>
                      UTF-16 offsets [{criterion.evidence.startCodeUnit}, {' '}
                      {criterion.evidence.endCodeUnit}) · Document v
                      {criterion.evidence.documentVersionId ?? 'unknown'}
                    </small>
                  </blockquote>
                )}
              </article>
            ))}
          </section>

          <section className="panel audit">
            <h3>Content-addressed evaluation evidence</h3>
            <dl>
              <div>
                <dt>Execution manifest</dt>
                <dd>{result.fingerprints.executionManifestHash}</dd>
              </div>
              <div>
                <dt>Policy hash</dt>
                <dd>{result.fingerprints.policyHash}</dd>
              </div>
              <div>
                <dt>Source hash</dt>
                <dd>{result.fingerprints.sourceHash ?? 'not run'}</dd>
              </div>
              <div>
                <dt>Evaluation Task</dt>
                <dd>{result.evaluationTaskId ?? 'not persisted'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel review">
            <div>
              <p className="eyebrow">Human confirmation</p>
              <h3>Structured assertions require human review</h3>
              <p>
                Review status: <strong>{reviewStatus}</strong>
              </p>
              {reviewTaskId && (
                <p>
                  Review Task: <strong>{reviewTaskId}</strong>
                </p>
              )}
            </div>
            <label>
              Reviewer reference
              <input
                value={reviewerReference}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReviewerReference(e.target.value)}
              />
            </label>
            <div className="reviewButtons">
              <button
                className="secondary"
                disabled={isPending || reviewStatus !== 'pending'}
                onClick={() => submitReview('rejected')}
              >
                Reject
              </button>
              <button
                disabled={isPending || reviewStatus !== 'pending'}
                onClick={() => submitReview('confirmed')}
              >
                Confirm assertions
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
