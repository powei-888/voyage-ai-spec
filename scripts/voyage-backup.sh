#!/usr/bin/env bash
set -Eeuo pipefail

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require_command sha256sum
require_command tar

: "${DATABASE_URL:?DATABASE_URL is required}"
UPLOAD_DIR="${UPLOAD_DIR:-$HOME/.local/share/voyage-ai/uploads}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/.local/share/voyage-ai/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DATABASE_USER="${BACKUP_DATABASE_USER:-voyage}"
BACKUP_DATABASE_NAME="${BACKUP_DATABASE_NAME:-voyage_ai}"

dump_database() {
  local target="$1"
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --format=custom --no-owner --no-privileges --file="$target" "$DATABASE_URL"
    return
  fi
  require_command docker
  docker compose exec -T postgres pg_dump \
    --username="$BACKUP_DATABASE_USER" \
    --dbname="$BACKUP_DATABASE_NAME" \
    --format=custom --no-owner --no-privileges >"$target"
}

mkdir -p "$UPLOAD_DIR" "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
work_dir="$(mktemp -d "$BACKUP_DIR/.backup.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="voyage-ai-$timestamp.tar.gz"
archive_path="$BACKUP_DIR/$archive_name"

dump_database "$work_dir/database.dump"
tar -C "$UPLOAD_DIR" -czf "$work_dir/uploads.tar.gz" .
cat >"$work_dir/manifest.env" <<EOF
VOYAGE_BACKUP_VERSION=1
CREATED_AT=$timestamp
DATABASE_FORMAT=postgresql-custom
UPLOAD_FORMAT=tar-gzip
EOF

(
  cd "$work_dir"
  sha256sum database.dump uploads.tar.gz manifest.env > SHA256SUMS
  tar -czf bundle.tar.gz database.dump uploads.tar.gz manifest.env SHA256SUMS
)
tar -tzf "$work_dir/bundle.tar.gz" >/dev/null
chmod 600 "$work_dir/bundle.tar.gz"
mv "$work_dir/bundle.tar.gz" "$archive_path"

if [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] && (( BACKUP_RETENTION_DAYS > 0 )); then
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'voyage-ai-*.tar.gz' \
    -mtime "+$BACKUP_RETENTION_DAYS" -delete
fi

echo "$archive_path"
