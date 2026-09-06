#!/usr/bin/env bash
# ============================================================
# Jalankan SEKALI untuk menyiapkan seluruh environment (non-sudo).
#   bash scripts/bootstrap.sh
#
# Yang dilakukan:
#   1. npm install server/ (express)
#   2. venv .venv + locust, pandas, matplotlib
#   3. download binary k6 -> tools/k6
#   4. generate dummy files
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/4] npm: server dependencies =="
(cd server && npm install --no-fund --no-audit)

echo "== [2/4] python venv: locust + pandas + matplotlib =="
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet locust pandas matplotlib

echo "== [3/4] k6 binary =="
if [[ ! -x tools/k6 ]]; then
  mkdir -p tools
  K6_VER=$(curl -s https://api.github.com/repos/grafana/k6/releases/latest | grep tag_name | cut -d'"' -f4)
  curl -sL "https://github.com/grafana/k6/releases/download/${K6_VER}/k6-${K6_VER}-linux-amd64.tar.gz" -o /tmp/k6.tgz
  tar xzf /tmp/k6.tgz -C /tmp
  cp "/tmp/k6-${K6_VER}-linux-amd64/k6" tools/k6
  chmod +x tools/k6
fi
./tools/k6 version

echo "== [4/4] generate dummy files =="
node dummy-files/generate.js

echo
echo "SELESAI. Lalu jalankan:  bash scripts/run-little.sh"
echo "(Untuk Apache Bench butuh sudo: lihat scripts/install-sudo.sh)"