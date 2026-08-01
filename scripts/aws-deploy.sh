#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra/aws"
PRIVATE_TASKS="${PRIVATE_TASKS:-false}"
MEDPLUM_BASE_URL="${MEDPLUM_BASE_URL:-https://api.medplum.com/}"

if [[ -z "${MEDPLUM_SECRET_ARN:-}" ]]; then
  echo "Set MEDPLUM_SECRET_ARN to the Secrets Manager secret ARN." >&2
  exit 1
fi

if [[ ! -f "${ROOT_DIR}/package-lock.json" ]]; then
  echo "package-lock.json is required for a reproducible AWS build." >&2
  echo "Run npm install, verify the application, and commit the lockfile first." >&2
  exit 1
fi

npm --prefix "${INFRA_DIR}" install
npm --prefix "${INFRA_DIR}" run build

pushd "${INFRA_DIR}" >/dev/null
npx cdk bootstrap
GIT_COMMIT="${GIT_COMMIT:-$(git -C "${ROOT_DIR}" rev-parse HEAD 2>/dev/null || echo aws-deploy)}" \
  npx cdk deploy \
    --require-approval never \
    -c "medplumSecretArn=${MEDPLUM_SECRET_ARN}" \
    -c "privateTasks=${PRIVATE_TASKS}" \
    -c "medplumBaseUrl=${MEDPLUM_BASE_URL}"
popd >/dev/null
