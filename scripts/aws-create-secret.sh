#!/usr/bin/env bash
set -euo pipefail

SECRET_NAME="${SECRET_NAME:-14y-pa-readiness-agent/medplum}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

required=(
  MEDPLUM_CLIENT_ID
  MEDPLUM_CLIENT_SECRET
  DEMO_PATIENT_ID
  DEMO_SERVICE_REQUEST_ID
  DEMO_DOCUMENT_REFERENCE_ID
)

for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

if [[ -z "${AWS_REGION}" ]]; then
  echo "Set AWS_REGION or AWS_DEFAULT_REGION." >&2
  exit 1
fi

SECRET_JSON="$({ node <<'NODE'
const required = [
  'MEDPLUM_CLIENT_ID',
  'MEDPLUM_CLIENT_SECRET',
  'DEMO_PATIENT_ID',
  'DEMO_SERVICE_REQUEST_ID',
  'DEMO_DOCUMENT_REFERENCE_ID',
];
const value = Object.fromEntries(required.map((key) => [key, process.env[key]]));
process.stdout.write(JSON.stringify(value));
NODE
} )"

if aws secretsmanager describe-secret \
  --secret-id "${SECRET_NAME}" \
  --region "${AWS_REGION}" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "${SECRET_NAME}" \
    --secret-string "${SECRET_JSON}" \
    --region "${AWS_REGION}" >/dev/null
  echo "Updated secret: ${SECRET_NAME}"
else
  aws secretsmanager create-secret \
    --name "${SECRET_NAME}" \
    --description "Medplum credentials and synthetic demo resource IDs for 14Y PA Readiness Agent" \
    --secret-string "${SECRET_JSON}" \
    --region "${AWS_REGION}" >/dev/null
  echo "Created secret: ${SECRET_NAME}"
fi

aws secretsmanager describe-secret \
  --secret-id "${SECRET_NAME}" \
  --query ARN \
  --output text \
  --region "${AWS_REGION}"
