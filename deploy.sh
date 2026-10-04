#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "Build/deploy başarısız (satır $LINENO)." >&2' ERR
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR=/var/www/admin
cd "$PROJECT_DIR"

command -v npm >/dev/null
command -v rsync >/dev/null
if [[ ! -d "$DEPLOY_DIR" || ! -w "$DEPLOY_DIR" ]]; then
  echo "$DEPLOY_DIR mevcut ve yazılabilir olmalı. Gerekirse sudo ile çalıştırın." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi

echo 'Production build alınıyor...'
VITE_POSTBUILD_DEPLOY=false npm run build
test -s dist/index.html

echo "Dosyalar $DEPLOY_DIR dizinine aktarılıyor..."
# Önce asset dosyalarını, en son giriş sayfasını yayınla.
# Açık tarayıcı oturumları için eski hash'li asset dosyalarını koru.
rsync -a --exclude=/index.html dist/ "$DEPLOY_DIR/"
rsync -a dist/index.html "$DEPLOY_DIR/"
cmp dist/index.html "$DEPLOY_DIR/index.html"
echo "Build ve deploy tamamlandı: $DEPLOY_DIR (/admin/)"
