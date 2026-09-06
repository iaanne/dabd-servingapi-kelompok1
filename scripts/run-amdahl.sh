#!/usr/bin/env bash
# ============================================================
# TUGAS 2 - Bukti Amdahl's Law
#  Kluster: beberapa node API (3001..300N) di belakang Nginx
#  Load Balancer di :8080. File besar 10MB digunakan.
#  Diukur speedup saat N = 1, 2, 3 (node aktif).
#
# Prasyarat: node, nginx (sudah terpasang), tools/k6.
# Jalankan dari root repo:  bash scripts/run-amdahl.sh
#
# NOTE: nginx dijalankan non-root dengan prefix temp (/tmp/dabd-nginx).
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

LBPORT=8080
LBURL="http://localhost:8080"
K6=./tools/k6
DURATION="${DURATION:-30s}"
FILE="${FILE:-10mb.bin}"
MAX_N="${MAX_N:-3}"
START_PORT=3001
OUT="$PWD/data/task2"
NGINX_BIN="$(command -v nginx || echo /usr/sbin/nginx)"
NGINX_PREFIX="/tmp/dabd-nginx"
N_NODES=0
NODE_PIDS=()
mkdir -p "$OUT/nginx" "$NGINX_PREFIX" data/raw

echo "== KLUSTER resolver =="
echo "LB=$LBURL  FILE=$FILE  NODE_AKTIF=1..$MAX_N  DURATION=$DURATION"

cleanup() {
  for pid in "${NODE_PIDS[@]:-}"; do kill "$pid" 2>/dev/null; done
  if [[ -f /tmp/dabd-nginx.pid ]]; then
    "$NGINX_BIN" -c "$OUT/nginx/nginx-$N_NODES.conf" -p "$NGINX_PREFIX/" -s stop 2>/dev/null || true
    rm -f /tmp/dabd-nginx.pid
  fi
}
trap cleanup EXIT INT TERM

# --- jalankan N node server di port berurutan --------------------------------
start_nodes() {
  local n=$1
  NODE_PIDS=()
  for ((p=START_PORT; p<START_PORT+n; p++)); do
    LOG=0 PORT=$p node server/app.js > "/tmp/dabd-node-$p.log" 2>&1 &
    NODE_PIDS+=("$!")
  done
  sleep 1
  for ((p=START_PORT; p<START_PORT+n; p++)); do
    curl -sf "http://localhost:$p/status" >/dev/null || { echo "node $p gagal"; exit 1; }
  done
  echo "  node aktif: $(seq -s, $START_PORT $((START_PORT+n-1)))"
}

# --- bangun konfigurasi nginx untuk n node aktif ------------------------------
write_nginx_conf() {
  local n=$1
  local conf="$OUT/nginx/nginx-$n.conf" RUNDIR="/tmp/dabd-nginx"
  {
    echo "worker_processes auto;"
    echo "pid /tmp/dabd-nginx-$n.pid;"
    echo "error_log /tmp/dabd-nginx-$n-error.log warn;"
    echo "events { worker_connections 4096; }"
    echo "http {"
    echo "  client_body_temp_path $RUNDIR/body;"
    echo "  proxy_temp_path $RUNDIR/proxy;"
    echo "  access_log $RUNDIR/access-$n.log;"
    echo "  upstream app_servers {"
    for ((p=START_PORT; p<START_PORT+n; p++)); do
      echo "    server 127.0.0.1:$p;"
    done
    echo "  }"
    echo "  server {"
    echo "    listen $LBPORT;"
    echo "    proxy_read_timeout 60s;"
    echo "    location / { proxy_pass http://app_servers; }"
    echo "  }"
    echo "}"
  } > "$conf"
  echo "  nginx conf: $conf"
}

# --- test untuk N node --------------------------------------------------------
start_nginx() {
  local n=$1
  local conf="$OUT/nginx/nginx-$n.conf"
  mkdir -p /tmp/dabd-nginx/body /tmp/dabd-nginx/proxy
  rm -f "/tmp/dabd-nginx-$n.pid"
  "$NGINX_BIN" -c "$conf" -p "$NGINX_PREFIX/" -t 2>&1 | tail -1
  "$NGINX_BIN" -c "$conf" -p "$NGINX_PREFIX/"
  sleep 1
  curl -sf -o /dev/null "$LBURL/files/$FILE" || { echo "GAGAL: LB tidak merespons"; exit 1; }
  echo "  LB aktif: $LBURL"
}

NODE_PIDS=()
for N in $(seq 1 "$MAX_N"); do
  start_nodes "$N"
  write_nginx_conf "$N"
  start_nginx "$N"

  printf "\n----------------------------------------\n"
  printf "  TEST 10MB via LB  [N=$N node]\n"
  printf "----------------------------------------\n"
  "$K6" run \
    --vus 200 --duration "$DURATION" \
    -e BASE_URL="$LBURL" -e FILE="$FILE" \
    --summary-export "$OUT/n${N}-c200.json" \
    --summary-trend-stats="avg,p(90),p(95),p(99)" \
    loadtest/k6/script.js \
    | grep -E 'http_req_duration|http_reqs|http_req_failed' || true

  "$NGINX_BIN" -c "$OUT/nginx/nginx-$N.conf" -p "$NGINX_PREFIX/" -s stop 2>/dev/null || true
  rm -f "/tmp/dabd-nginx-$N.pid"
  N_NODES=$N # untuk cleanup
done

echo
echo "== Selesai. Ringkasan Tugas 2 tersimpan di: $OUT/"
ls -1 "$OUT"/*.json 2>/dev/null