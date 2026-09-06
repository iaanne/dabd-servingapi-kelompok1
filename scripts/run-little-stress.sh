#!/usr/bin/env bash
# ============================================================
# TUGAS 1 (bagian stress/failure) - demonstrasi drop requests
#
# Server tunggal dijalankan dengan jumlah file descriptor
# dibatasi (simulasi resource server yang terbatas, layaknya
# container/VM RAM kecil). Saat file besar (10MB) + concurrency
# tinggi, server tidak sanggup membuka koneksi -> request DROP.
#
# Jalankan dari root repo:  bash scripts/run-little-stress.sh
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

PORT=3001
K6=./tools/k6
DURATION="${DURATION:-15s}"
CONCURRENCIES="${CONCURRENCIES:-100 300 600 1000}"
FD_LIMIT="${FD_LIMIT:-64}"   # batas file descriptor server (55 koneksi aktif max)
OUT=data/task1
mkdir -p "$OUT" data/raw

printf "== STRESS 10MB — FD limit server = %s ==\n" "$FD_LIMIT"

# Jalankan server dengan ulimit -n terbatas (simulasi resource kecil)
bash -c "ulimit -n $FD_LIMIT; LOG=0 PORT=$PORT node server/app.js" \
  > /tmp/dabd-stress-server.log 2>&1 &
SRV_PID=$!
cleanup() { kill "$SRV_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM
sleep 1

for C in $CONCURRENCIES; do
  printf "\n--- 10mb.bin | concurrency=%s ---\n" "$C"
  "$K6" run \
    --vus "$C" --duration "$DURATION" \
    -e BASE_URL="http://localhost:$PORT" -e FILE=10mb.bin \
    --summary-export "$OUT/stress-10mb-c${C}.json" \
    --summary-trend-stats="avg,p(90),p(95),p(99)" \
    loadtest/k6/script.js \
    | grep -E 'http_req_duration|http_reqs|http_req_failed|checks|errors' || true
done

echo "Selesai. Hasil stress: $OUT/stress-10mb-c*.json"