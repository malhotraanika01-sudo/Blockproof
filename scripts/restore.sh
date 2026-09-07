#!/usr/bin/env bash
# BlockProof — database restore (pg_restore).
# Usage: bash scripts/restore.sh path/to/blockproof-YYYYMMDD-HHMMSS.dump
set -euo pipefail

FILE="${1:?Usage: bash scripts/restore.sh <dump-file>}"
CONTAINER="${PG_CONTAINER:-blockproof-postgres}"

[ -f "${FILE}" ] || { echo "No such file: ${FILE}"; exit 1; }

echo "Restoring ${FILE} into 'blockproof' (existing objects will be dropped) ..."
docker exec -i "${CONTAINER}" pg_restore -U blockproof -d blockproof --clean --if-exists --no-owner < "${FILE}"

echo "Restore complete."
