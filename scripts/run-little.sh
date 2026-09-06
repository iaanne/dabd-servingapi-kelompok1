#!/usr/bin/env bash
# ============================================================
# TUGAS 1 - Bukti Little's Law
#  1 server tunggal TANPA Load Balancer, tembak port langsung.
#  File dummy diunduh bertahap: 1KB -> 100KB -> 1MB -> 10MB
#  pada beberapa level concurrency.
#
# Prasyarat: node, tools/k6, server/ sudah npm install.
# Jalankan dari root repo:  bash scripts/run-little.sh
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

PORT=3001
BASE="http://localhost:3001"
K6=./tools/k6
DURATION="${DURATION:-20s}"
SIZES="${SIZES:-1kb.bin,100kb.bin,1mb.bin,10mb.bin}"
CONCURRENCIES="${CONCURRENCIES:-1 10 50 100 200 500}"
OUT=data/task1
mkdir -p "$OUT" data/raw

echo "== API node resolver =="
echo "PORT=$PORT  SIZES=$SIZES  CONCURRENCIES='$CONCURRENCIES'  DURATION=$DURATION"

cleanup() {
  [[ -n "${SRV_PID:-}" ]] && kill "$SRV_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

# --- mulai 1 server node -----------------------------------------------------
LOG=0 PORT=$PORT node server/app.js > /tmp/dabd-little-server.log 2>&1 &
SRV_PID=$!
echo "== server $BASE (pid $SRV_PID) dijalankan =="
sleep 1
curl -sf "$BASE/status" >/dev/null || { echo "GAGAL: server tidak jalan"; exit 1; }

# --- jalankan k6 untuk tiap (ukuran file, concurrency) ----------------------
i=0
for SIZE in ${SIZES//,/ }; do
  for C in $CONCURRENCIES; do
    i=$((i+1))
    printf "\n========================================\n"
    printf "  TEST %02d: size=%-8s concurrency=%s\n" "$i" "$SIZE" "$C"
    printf "========================================\n"
    "$K6" run \
      --vus "$C" --duration "$DURATION" \
      -e BASE_URL="$BASE" -e FILE="$SIZE" \
      --summary-export "$OUT/${SIZE%.bin}-c${C}.json" \
      --summary-trend-stats="avg,p(90),p(95),p(99)" \
      loadtest/k6/script.js \
      | grep -E 'http_req_duration|http_reqs|http_req_failed|iteration_duration|elapsed' || true
  done
done

echo
echo "== Selesai. Ringkasan Tugas 1 tersimpan di: $OUT/"
ls -1 "$OUT"