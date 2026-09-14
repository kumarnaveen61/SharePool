#!/usr/bin/env bash
# Restores a SharePool database from a backup created by backup.sh.
#
# Usage: ./scripts/restore.sh path/to/backup.sql.gz
#
# WARNING: this drops and recreates the target database. Never run this
# against a production database without confirming the target first —
# there is no "are you sure" prompt beyond the one below on purpose,
# since the check that matters is a human reading DATABASE_URL before
# running this, not a script's confirmation dialog.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/restore.sh path/to/backup.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Load your .env first, e.g.:"
  echo "  export \$(cat .env | xargs) && ./scripts/restore.sh backups/foo.sql.gz"
  exit 1
fi

echo "About to restore into: $DATABASE_URL"
echo "This will DROP and recreate all tables in that database."
read -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring from $BACKUP_FILE ..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore complete."
