#!/usr/bin/env bash
# BlockProof — database backup (pg_dump). Rubric: backup/restore with PostgreSQL tools.
# Usage: bash scripts/backup.sh [output_dir]
set -euo pipefail

OUT_DIR="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${OUT_DIR}/blockproof-${STAMP}.dump"
CONTAINER="${PG_CONTAINER:-blockproof-postgres}"

mkdir -p "${OUT_DIR}"

echo "Dumping database 'blockproof' from container ${CONTAINER} ..."
docker exec -t "${CONTAINER}" pg_dump -U blockproof -d blockproof -F c -Z 6 > "${FILE}"

echo "Backup written: ${FILE}"
ls -lh "${FILE}"
