#!/usr/bin/env bash
set -Eeuo pipefail

archive="${1:-}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 BACKUP_ARCHIVE" >&2; exit 2; }

verify_database_dump() {
  local dump="$1"
  if command -v pg_restore >/dev/null 2>&1; then
    pg_restore --list "$dump" >/dev/null
    return
  fi
  command -v docker >/dev/null 2>&1 || { echo "Missing pg_restore and docker" >&2; exit 1; }
  docker compose exec -T postgres pg_restore --list <"$dump" >/dev/null
}

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
tar -xzf "$archive" -C "$work_dir" database.dump uploads.tar.gz manifest.env SHA256SUMS
(
  cd "$work_dir"
  sha256sum -c SHA256SUMS
)
verify_database_dump "$work_dir/database.dump"

while IFS= read -r entry; do
  case "$entry" in
    /*|../*|*/../*|*/..) echo "Unsafe upload archive path: $entry" >&2; exit 1 ;;
  esac
done < <(tar -tzf "$work_dir/uploads.tar.gz")

echo "Backup verified: $archive"
