#!/usr/bin/env bash
# Apache Bench (ab): unduh file statis & cetak statistik + percentiles (p90, p95).
#
# Prasyarat: apache (menyediakan /usr/bin/ab). Install: sudo pacman -S apache
#
# Cara pakai:
#   ./run-ab.sh <url> <concurrency> <requests=500>
#   ./run-ab.sh http://localhost:3001/files/1mb.bin 50 300
#
# Output:
#   - stdout lengkap ab (mode, throughput, latency, tabel percentiles)
#   - data/raw/ab-<file>-c<c>.tsv   (salinan tabel percentiles untuk dianalisis)

URL="${1:?Usage: run-ab.sh <url> <concurrency> [requests]}" ; shift
C="${1:?butuh concurrency}" ; shift
N="${1:-500}" ; shift

NAME=$(basename "$(echo "$URL" | cut -d/ -f5-)" .bin)
OUT="data/raw/ab-${NAME}-c${C}"
mkdir -p data/raw

# -k        keep-alive (sustain banyak koneksi, sesuai uji beban real)
# -s 30     timeout per request 30 detik
# -n N      total request
# -c C      concurrency
ab -k -s 30 -n "$N" -c "$C" "$URL" | tee "$OUT.log"

# Ekstrak tabel percentiles menjadi TSV yang mudah diproses.
awk '/Percentage of the requests served/{flag=1; next} flag && NF>=2 && ($1 !~ /%/) {print $1"\t"$3} flag && /Complete requests/{exit}' "$OUT.log" \
  | head -30 > "$OUT-percentiles.tsv"

echo
echo "Percentiles TSV tersimpan: $OUT-percentiles.tsv"