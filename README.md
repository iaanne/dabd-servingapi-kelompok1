# DABD Serving API — Kelompok 1

Proyek praktikum **DABD (Desain Aplikasi Basis Data)** untuk membuktikan **Little's Law** (Tugas 1) dan **Amdahl's Law** (Tugas 2) melalui load testing API server file menggunakan **k6** di atas **Docker**.

---

## Daftar Isi

- [Tugas 1 — Little's Law](#tugas-1--littles-law)
- [Tugas 2 — Amdahl's Law](#tugas-2--amdahls-law)
- [Struktur Repository](#struktur-repository)
- [Cara Menjalankan](#cara-menjalankan)
- [Referensi](#referensi)

---

## Tugas 1 — Little's Law

**Rumus:** `Concurrency (L) = Throughput (λ) × Latency (W)`

### Arsitektur

```
   [k6]  ──►  http://localhost:3001 (1 server API, tanpa LB)
```

- 1 server Express (Node.js) di port `3001`
- Tanpa Load Balancer — semua beban ditangani 1 node
- File uji: `dummy-files/*.bin` (1KB, 10KB, 100KB, 1MB, 10MB)

### Hasil Benchmark

| Ukuran File | p90 (ms) | p95 (ms) | Throughput (req/s) | Error Rate | Total Request |
|-------------|----------|----------|---------------------|------------|---------------|
| 1KB         | 62.57    | 67.24    | 2,664.21            | 0.00%      | 239,780       |
| 10KB        | 73.60    | 89.63    | 2,364.32            | 0.00%      | 212,792       |
| 100KB       | 171.83   | 188.95   | 1,031.11            | 0.00%      | 92,804        |
| 1MB         | 1,375.75 | 1,510.97 | 131.85              | 0.00%      | 11,868        |
| 10MB        | 15,439.96| 15,955.10| 11.32               | 0.00%      | 1,040         |

### Pembuktian

Semakin besar file → Latency (W) membengkak → Concurrency (L) membesar → Throughput (λ) turun drastis. File 10MB mengalami penurunan throughput hingga **99.6%** dibanding file 1KB.

📄 Laporan lengkap: [`docs/little-law.md`](docs/little-law.md)

---

## Tugas 2 — Amdahl's Law

**Rumus:** `Speedup (S) = 1 / ( (1-p) + p/N )`

### Arsitektur

```
   [k6]  ──►  http://localhost:8080 (NGINX Load Balancer)
                        │ round-robin
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           node-1    node-2    node-3
            :3001     :3002     :3003
```

- 3 server Express (node1, node2, node3) masing-masing port `3001`, `3002`, `3003`
- Nginx Load Balancer di port `8080` (round-robin)

### Hasil Benchmark (Speedup = Tugas2 / Tugas1)

| File | T1 (1 node) | T2 (3 nodes + LB) | Speedup |
|------|-------------|-------------------|---------|
| 1kb  | 2,664.21 req/s | 3,008.13 req/s | **1.13x** |
| 10kb | 2,364.32 req/s | 2,704.45 req/s | **1.14x** |
| 100kb | 1,031.11 req/s | 859.87 req/s | **0.83x** |
| 1MB  | 131.85 req/s | 130.65 req/s | **0.99x** |
| 10MB | 11.32 req/s | 11.94 req/s | **1.06x** |

### Pembuktian

Dengan Nginx dituning (`proxy_buffering off`, keepalive), file kecil (1kb, 10kb) kini **lebih cepat** (+13–14%) karena 3 node memproses paralel. Namun speedup tetap jauh dari ideal 3x — pada file besar justru ~1.0x atau di bawah. Penyebab: workload I/O-bound (bukan CPU), 3 node berbagi satu mesin fisik, dan komponen **serial (1-p)** Nginx LB yang tetap membatasi — konsisten dengan Amdahl's Law.

📄 Laporan lengkap: [`docs/amdahls-law.md`](docs/amdahls-law.md)

---

## Struktur Repository

```
.
├── compose.yaml              # Tugas 1: single node (:3001)
├── compose-amdahl.yaml       # Tugas 2: 3 nodes + nginx LB (:8080)
├── nginx.conf                # Konfigurasi LB round-robin (streaming, keepalive)
├── server/
│   ├── app.js                # Express API (+ NODE_ID & /health)
│   ├── Dockerfile
│   └── Containerfile
├── dummy-files/
│   └── generate.js           # Generator file dummy (1kb-10000kb)
├── tests/
│   ├── little-law.js         # Skrip k6 Tugas 1
│   ├── amdahl-law.js         # Skrip k6 Tugas 2
│   ├── run-all.js            # Runner semua variasi user
│   ├── tugas1-*-vu*.json     # Hasil benchmark Tugas 1 (per VU)
│   └── tugas2-*-vu*.json     # Hasil benchmark Tugas 2 (per VU)
└── docs/
    ├── little-law.md         # Laporan Tugas 1
    └── amdahls-law.md        # Laporan Tugas 2
```

---

## Cara Menjalankan

### Persiapkan File Dummy (sekali saja)

```bash
cd dummy-files
node generate.js
```

### AUTO: Jalankan semua variasi user (disarankan)

Skrip `tests/run-all.js` menjalankan untuk **tiap tugas × 5 file × 5 level user (200, 400, 600, 800, 1000)** dengan durasi tetap (`DURATION`, default 5 menit).

**Langkah 1 — nyalakan server Tugas 1:**
```bash
docker compose down && docker compose up --build -d
```

**Langkah 2 — jalankan Little's Law (T1):**
```bash
# PowerShell
$env:TUGAS="1"; node tests/run-all.js

# bash (Linux/Mac)
TUGAS=1 node tests/run-all.js

# Jika k6 tidak ada di PATH Windows:
$env:K6_PATH="C:\Users\Acer\k6.exe"; node tests/run-all.js
```

**Langkah 3 — pindah ke server Tugas 2:**
```bash
docker compose down && docker compose -f compose-amdahl.yaml up --build -d
```

**Langkah 4 — jalankan Amdahl's Law (T2):**
```bash
$env:TUGAS="2"; node tests/run-all.js      # PowerShell
TUGAS=2 node tests/run-all.js              # bash
```

Opsional env runner:
- `TUGAS=both` → jalankan T1 & T2 sekaligus (default).
- `VUS_LIST=200,400,600,800,1000` → daftar user (kelipatan 200, max 1000).
- `FILES_LIST=1kb,10kb,100kb,1000kb,10000kb` → file yang diuji.
- `DURATION=5m` → durasi tetap tiap run (jangan diubah saat membandingkan).

Pada akhir run, ringkasan per VU (p90/p95/throughput) otomatis dicetak.

### MANUAL: satu skenario saja

```bash
# Tugas 1 (single node :3001)
& "C:\Users\Acer\k6.exe" run --env "BASE_URL=http://localhost:3001" --env "FILE_SIZE=1000kb" --env "VUS=400" --env "DURATION=5m" tests/little-law.js

# Tugas 2 (3 node + LB :8080)
& "C:\Users\Acer\k6.exe" run --env "BASE_URL=http://localhost:8080" --env "FILE_SIZE=1000kb" --env "VUS=400" --env "DURATION=5m" tests/amdahl-law.js
```

Parameter skrip k6: `FILE_SIZE` (`1kb–10000kb`), `VUS` (jumlah user), `DURATION` (durasi tes).

Hasil otomatis tersimpan di `tests/tugas1-{file}-vu{VUS}.json` dan `tests/tugas2-{file}-vu{VUS}.json`.

---

## Referensi

- **k6** — https://k6.io
- **Nginx Load Balancing** — https://nginx.org/en/docs/http/load_balancing.html
- **Little's Law** — https://en.wikipedia.org/wiki/Little%27s_law
- **Amdahl's Law** — https://en.wikipedia.org/wiki/Amdahl%27s_law