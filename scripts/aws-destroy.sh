#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra/aws"

if [[ -z "${MEDPLUM_SECRET_ARN:-}" ]]; then
  echo "Set MEDPLUM_SECRET_ARN to the same ARN used for deployment." >&2
  exit 1
fi

pushd "${INFRA_DIR}" >/dev/null
npx cdk destroy \
  --force \
  -c "medplumSecretArn=${MEDPLUM_SECRET_ARN}" \
  -c "privateTasks=${PRIVATE_TASKS:-false}" \
  -c "medplumBaseUrl=${MEDPLUM_BASE_URL:-https://api.medplum.com/}"
popd >/dev/null
