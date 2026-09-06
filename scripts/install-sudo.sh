#!/usr/bin/env bash
# ============================================================
# Install paket sistem yang butuh sudo (jalankan SEKALI):
#   sudo bash scripts/install-sudo.sh
#
# Yang diinstall:
#   apache  -> menyediakan /usr/bin/ab (Apache Bench)
#   ffmpeg  -> penggabungan video demo
#   pandoc  -> export laporan Markdown -> PDF
# ============================================================
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Jalankan dengan sudo: sudo bash scripts/install-sudo.sh"
  exit 1
fi

pacman -S --needed apache ffmpeg pandoc

echo
echo "Verifikasi:"
ab -V | head -1 || true
ffmpeg -version | head -1 || true
pandoc --version | head -1 || true