#!/usr/bin/env bash
# PH-G — Verify a JSON backup can be parsed + dry-restored end to end.
# Usage:
#   ./scripts/restore-test.sh                # uses the most recent
#                                            # backup from Vercel Blob
#   ./scripts/restore-test.sh path/to/dump.json
#
# Requires:
#   • VYNE_ADMIN_TOKEN — admin session cookie value
#   • VYNE_BASE_URL    — defaults to https://vyne.vercel.app
#   • BACKUP_BLOB_TOKEN (only when fetching from Blob, not local file)
#
# Exits 0 on a clean dry-run (no errors), non-zero otherwise. Designed
# to be safe to run against prod — dryRun=1 means no writes happen.

set -euo pipefail

BASE_URL="${VYNE_BASE_URL:-https://vyne.vercel.app}"
DUMP_PATH="${1:-}"

if [[ -z "${DUMP_PATH}" ]]; then
  # Fetch the most recent dump from Vercel Blob if no path given. The
  # POST mode of /api/admin/backup returns the most recent downloadUrl.
  echo "→ No dump path passed; pulling most recent backup from /api/admin/backup..."
  if [[ -z "${VYNE_ADMIN_TOKEN:-}" ]]; then
    echo "ERROR: VYNE_ADMIN_TOKEN is required to fetch from prod." >&2
    exit 1
  fi
  DUMP_PATH=$(mktemp -t vyne-backup.XXXXXX.json)
  curl -sSL "${BASE_URL}/api/admin/backup" \
    -H "Cookie: vyne-token=${VYNE_ADMIN_TOKEN}" \
    -o "${DUMP_PATH}"
  echo "  wrote $(wc -c < "${DUMP_PATH}") bytes to ${DUMP_PATH}"
fi

if [[ ! -f "${DUMP_PATH}" ]]; then
  echo "ERROR: dump file not found: ${DUMP_PATH}" >&2
  exit 1
fi

echo "→ Dry-running restore against ${BASE_URL}/api/admin/restore?dryRun=1"
RESPONSE=$(curl -sSL -w "\nHTTP_STATUS=%{http_code}" \
  "${BASE_URL}/api/admin/restore?dryRun=1&targetOrgId=verify-org" \
  -H "Cookie: vyne-token=${VYNE_ADMIN_TOKEN:-system}" \
  -H "Content-Type: application/json" \
  --data-binary "@${DUMP_PATH}")

BODY=$(echo "${RESPONSE}" | sed '$d')
STATUS=$(echo "${RESPONSE}" | tail -n1 | sed 's/HTTP_STATUS=//')

echo "  HTTP ${STATUS}"
echo "${BODY}" | jq '{ok, dryRun, summary, errors_per_entity: [.perEntity[] | {entity, errors_count: (.errors | length)}]}'

# Bail if HTTP error.
if [[ "${STATUS}" != "200" ]]; then
  echo "FAIL: restore endpoint returned HTTP ${STATUS}" >&2
  exit 2
fi

# Bail if .ok is false.
if [[ "$(echo "${BODY}" | jq -r .ok)" != "true" ]]; then
  echo "FAIL: dry-restore reported errors:" >&2
  echo "${BODY}" | jq '.perEntity[] | select((.errors | length) > 0)' >&2
  exit 3
fi

ATTEMPTED=$(echo "${BODY}" | jq -r .summary.totalAttempted)
RESTORED=$(echo "${BODY}" | jq -r .summary.totalRestored)
echo "✓ Dry-restore PASSED: ${RESTORED}/${ATTEMPTED} rows parseable + restorable, 0 errors"
