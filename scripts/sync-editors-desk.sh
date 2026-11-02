#!/usr/bin/env bash
# Editor's Desk'in yeni sürümünü Berk'in deposundan alır.
#
# Berk'in deposundaki index.html bir claude.ai artifact gövdesidir (doctype/head yok).
# Bu betik onu tam bir sayfaya sarar ve claude-shim.js'i her şeyden önce yükler.
# data/ web klasörüne KOPYALANMAZ: yayınlanmamış veri /opt/desk-data altında durur ve
# content-service üzerinden girişle sunulur.
#
#   scripts/sync-editors-desk.sh                 # public/desk/index.html'i yeniler
#   scripts/sync-editors-desk.sh --data          # + /opt/desk-data
#   scripts/sync-editors-desk.sh --cron          # yalnız depo değiştiyse: index + veri + /var/www/admin/desk
#
# Ortam: DESK_REPO (/opt/presentation/nart-editors-desk), DESK_BRANCH (canli; yoksa main).
set -euo pipefail
SRC="${DESK_REPO:-/opt/presentation/nart-editors-desk}"
BRANCH="${DESK_BRANCH:-canli}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/desk/index.html"
LIVE=/var/www/admin/desk
DATA=/opt/desk-data
STATE="$ROOT/public/desk/.synced-commit"
MODE="${1:-}"

export GIT_SSH_COMMAND="ssh -o BatchMode=yes"
git -C "$SRC" fetch --quiet origin
git -C "$SRC" rev-parse --verify --quiet "origin/$BRANCH" >/dev/null || BRANCH=main
COMMIT="$(git -C "$SRC" rev-parse "origin/$BRANCH")"

if [[ "$MODE" == "--cron" && -f "$STATE" && "$(cat "$STATE")" == "$COMMIT" ]]; then
  exit 0
fi
git -C "$SRC" checkout --quiet --detach "$COMMIT"

{
  printf '<!doctype html><html lang="tr"><head><meta charset="utf-8">'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '<meta name="robots" content="noindex"><script src="claude-shim.js"></script></head><body>\n'
  cat "$SRC/index.html"
  printf '\n</body></html>\n'
} > "$OUT"
echo "$(date -Is) index.html ← $BRANCH $(git -C "$SRC" log -1 --format='%h %s' "$COMMIT")"

if [[ "$MODE" == "--data" || "$MODE" == "--cron" ]]; then
  install -d -m 755 "$DATA"
  for f in "$SRC"/data/*.json; do
    # Canlı veri dökümü (live-export.json) yalnız geçişte desk_import.py ile aktarılır.
    [[ "$(basename "$f")" == *export* ]] && continue
    install -m 644 "$f" "$DATA/"
    gzip -9 -k -f "$DATA/$(basename "$f")"
  done
  echo "$(date -Is) veri güncellendi: $DATA"
fi

if [[ "$MODE" == "--cron" ]]; then
  # Panel build'i beklemeden yayına al; bir sonraki panel build'i aynı dosyayı public/desk'ten taşır.
  if [[ -d "$LIVE" ]]; then
    install -m 644 "$OUT" "$LIVE/index.html.new" && mv "$LIVE/index.html.new" "$LIVE/index.html"
    echo "$(date -Is) yayında: $LIVE/index.html"
  fi
  echo "$COMMIT" > "$STATE"
fi
