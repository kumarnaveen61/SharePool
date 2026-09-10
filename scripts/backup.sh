#!/usr/bin/env bash
# Creates a timestamped, compressed backup of the SharePool database.
#
# Usage: ./scripts/backup.sh [output-directory]
#   Defaults to ./backups if no directory is given.
#
# Production notes (not implemented here, since this is a local script):
#   - Schedule this with cron, or better, use your hosting provider's
#     managed backup feature if using managed Postgres (RDS, Neon, Supabase,
#     etc. all have point-in-time recovery built in — prefer that over a
#     hand-rolled script wherever it's available).
#   - Store backups somewhere OTHER than the same machine/disk as the
#     database (S3, another region) — a backup on the same disk that dies
#     with the server isn't a backup.
#   - Set a retention policy (e.g. keep daily for 7 days, weekly for a
#     month) — this script keeps everything you run it with, so pair it
#     with a cleanup job or a lifecycle rule on the storage bucket.
#   - Periodically test restoring from a backup (see restore.sh) — an
#     untested backup is not a verified backup.

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$OUTPUT_DIR/sharepool_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Load your .env first, e.g.:"
  echo "  export \$(cat .env | xargs) && ./scripts/backup.sh"
  exit 1
fi

echo "Backing up database to $OUTPUT_FILE ..."
pg_dump "$DATABASE_URL" | gzip > "$OUTPUT_FILE"
echo "Done. $(du -h "$OUTPUT_FILE" | cut -f1) written."
