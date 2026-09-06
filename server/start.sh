#!/usr/bin/env bash
# Jalankan server API pada port tertentu (default 3001).
# Contoh: ./start.sh 3001
PORT="${1:-3001}"
export PORT
node app.js