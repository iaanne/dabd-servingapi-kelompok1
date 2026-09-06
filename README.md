# DABD — API Serving File: Pembuktian Little's Law & Amdahl's Law

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![Nginx](https://img.shields.io/badge/Load%20Balancer-Nginx-009639?logo=nginx&logoColor=white)
![k6](https://img.shields.io/badge/Uji%20Beban-k6%20%E2%80%A2%20Locust%20%E2%80%A2%20ab-7D64FF)

Proyek uji beban untuk **API Serving File** dalam mata kuliah Big Data. Tujuannya **membuktikan dua hukum fundamental sistem terdistribusi** lewat eksperimen nyata:

1. **Little's Law** — `Concurrency (L) = Throughput (λ) × Latency (W)`
2. **Amdahl's Law** — `S(N) = 1 / ((1−p) + p/N)`

Repo ini berisi server API, generator file dummy, konfigurasi Nginx LB, 3 alat uji beban (k6, Locust, Apache Bench), script eksekusi, data hasil, analisis, dan dokumentasi lengkap.

---

## Anggota Kelompok 1

| Anggota   | Kontribusi | Deliverable |
|-----------|------------|-------------|
| **Ian**   | Tugas 1 · Little's Law | server + dummy files + matrix uji + `docs/little-law.md` |
| **Trisha**| Tugas 2 · Amdahl's Law | Nginx LB + klaster 3 node + `docs/amdahl-law.md` |
| **Evan**  | Alat uji beban | script k6/Locust/ab + perbandingan + `docs/tool-comparison.md` |
| **Alvin** | Analisis & dokumentasi | charts, `docs/report.md`, video demo, kelola repo |

---

## Arsitektur

### Tugas 1 — Little's Law (1 node, tanpa Load Balancer)

```
   [k6 / Locust / ab] ──► http://localhost:3001   (Express, single node)
                              │
                          dummy-files:
                          1kb → 100kb → 1mb → 10mb
```
Pengujian menembak **port aplikasi langsung** (tanpa LB). File besar → latency (W) membengkak → concurrency (L) melonjak → server drop requests.

### Tugas 2 — Amdahl's Law (multinode + LB)

```
   [k6] ──► http://localhost:8080  ──► Nginx Load Balancer (round-robin)
                                        │
                              ┌─────────┼─────────┐
                              ▼         ▼         ▼
                           :3001      :3002      :3003
                          node 1     node 2     node 3
```
Semua request melalui **satu pintu serial (Nginx)** → batas mutlak speedup walau node ditambah.

---

## Struktur Repository

```
dabd-servingapi-kelompok1/
├── README.md                     ← dokumen ini
├── docs/
│   ├── little-law.md             ← hasil & analisis Tugas 1
│   ├── amdahl-law.md             ← hasil & analisis Tugas 2
│   ├── tool-comparison.md        ← perbandingan 3 alat uji
│   └── report.md                 ← laporan final (Judul/Metodologi/Hasil/Kesimpulan)
├── server/                       ← API Serving File (Express 5)
│   ├── app.js
│   └── start.sh
├── dummy-files/                  ← generate.js + file 1KB/100KB/1MB/10MB
├── loadtest/
│   ├── locust/locustfile.py
│   ├── ab/run-ab.sh
│   └── k6/script.js
├── lb/nginx.conf                 ← konfigurasi Nginx 3 node (manual/referensi)
├── scripts/
│   ├── bootstrap.sh              ← setup env non-sudo (npm, venv+locust+pandas, k6)
│   ├── install-sudo.sh           ← sudo install apache(ab), ffmpeg, pandoc
│   ├── run-little.sh             ← jalankan matrix Tugas 1
│   ├── run-little-stress.sh      ← demonstrasi drop requests
│   ├── run-amdahl.sh             ← jalankan kluster N=1..3 (Tugas 2)
│   ├── analyze-little.py         ← verifikasi & chart Little's Law
│   └── analyze-amdahl.py         ← speedup, fit p, chart Amdahl
├── data/                         ← hasil uji (JSON k6, summary CSV per tugas)
└── results/charts/               ← chart PNG untuk laporan
```

---

## Quick Start

### 1) Setup environment (sekali)

```bash
bash scripts/bootstrap.sh                 # npm + venv(locust/pandas/matplotlib) + k6 + dummy files
sudo bash scripts/install-sudo.sh         # opsional: apache(→ab), ffmpeg, pandoc
```

### 2) Jalankan Tugas 1 — Little's Law

```bash
bash scripts/run-little.sh                # matrix 4 ukuran × 6 concurrency
bash scripts/run-little-stress.sh         # bukti drop requests (resource terbatas)
./.venv/bin/python scripts/analyze-little.py
```

### 3) Jalankan Tugas 2 — Amdahl's Law

```bash
bash scripts/run-amdahl.sh                # klaster N=1..3 + Nginx, file 10MB
./.venv/bin/python scripts/analyze-amdahl.py
```

### 4) Manual singkat per alat

```bash
# k6
./tools/k6 run --vus 100 --duration 20s -e BASE_URL=http://localhost:3001 -e FILE=10mb.bin \
  --summary-export data/raw/k6.json loadtest/k6/script.js

# Locust
LOCUST_FILE=10mb.bin ./.venv/bin/locust -f loadtest/locust/locustfile.py \
  --host http://localhost:3001 --headless -u 100 -r 10 -t 20s --csv data/raw/locust

# Apache Bench (butuh ab: sudo bash scripts/install-sudo.sh)
bash loadtest/ab/run-ab.sh http://localhost:3001/files/10mb.bin 100 300

# Server manual
PORT=3001 node server/app.js           # atau: bash server/start.sh 3001
```

---

## Hasil Ringkas

| Eksperimen | Temuan utama |
|---|---|
| **Little's Law** (24 skenario) | `L_calc / L_measured ≈ 0.99` → hukum terbukti. File 10MB + concurrency tinggi: latency p95 **13.9 s**, server drop hingga **99.96%** request saat resource dibatasi. |
| **Amdahl's Law** (N=1,2,3) | S(2) = 1.71×, S(3) = 2.14×; porsi paralel `p = 0.827` → batas mutlak **5.8×**; Nginx = bottleneck serial `(1−p) = 17.3%`. |

Detail & data lengkap: `docs/` · charts: `results/charts/` · data mentah: `data/`.

---

## Deliverable

1. **Link Repository** — https://github.com/iaanne/dabd-servingapi-kelompok1
2. **Video Demo** — rekaman proses: generate dummy → start server → serangan k6/Locust/ab → metrik (p90, p95), crash Tugas 1 & speedup Tugas 2.
3. **Laporan** — `docs/report.md` (+ export PDF via pandoc).

---

*Ditulis untuk penugasan DABD — Kelompok 1.*