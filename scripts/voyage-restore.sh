#!/usr/bin/env bash
set -Eeuo pipefail

archive="${1:-}"
force="${2:-}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 BACKUP_ARCHIVE --force" >&2; exit 2; }
[[ "$force" == "--force" ]] || { echo "Restore refused. Add --force after stopping Voyage services." >&2; exit 2; }
: "${DATABASE_URL:?DATABASE_URL is required}"

UPLOAD_DIR="${UPLOAD_DIR:-$HOME/.local/share/voyage-ai/uploads}"
BACKUP_DATABASE_USER="${BACKUP_DATABASE_USER:-voyage}"
BACKUP_DATABASE_NAME="${BACKUP_DATABASE_NAME:-voyage_ai}"
work_dir="$(mktemp -d)"
mkdir -p "$(dirname "$UPLOAD_DIR")"
staging_dir="$(mktemp -d "${UPLOAD_DIR}.restore.XXXXXX")"
trap 'rm -rf "$work_dir" "$staging_dir"' EXIT

"$(dirname "$0")/voyage-verify-backup.sh" "$archive"
tar -xzf "$archive" -C "$work_dir" database.dump uploads.tar.gz manifest.env SHA256SUMS
tar -xzf "$work_dir/uploads.tar.gz" -C "$staging_dir"

if command -v pg_restore >/dev/null 2>&1; then
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" \
    "$work_dir/database.dump"
else
  command -v docker >/dev/null 2>&1 || { echo "Missing pg_restore and docker" >&2; exit 1; }
  docker compose exec -T postgres pg_restore \
    --clean --if-exists --no-owner --no-privileges \
    --username="$BACKUP_DATABASE_USER" --dbname="$BACKUP_DATABASE_NAME" \
    <"$work_dir/database.dump"
fi

previous_uploads="${UPLOAD_DIR}.before-restore-$(date -u +%Y%m%dT%H%M%SZ)"
if [[ -d "$UPLOAD_DIR" ]]; then mv "$UPLOAD_DIR" "$previous_uploads"; fi
mv "$staging_dir" "$UPLOAD_DIR"
trap 'rm -rf "$work_dir"' EXIT

echo "Restore complete. Previous uploads: $previous_uploads"
