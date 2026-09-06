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
| 1kb  | 2,664.21 req/s | 2,915.29 req/s | **1.09x** |
| 10kb | 2,364.32 req/s | 1,931.53 req/s | **0.82x** |
| 100kb | 1,031.11 req/s | 698.96 req/s | **0.68x** |
| 1MB  | 131.85 req/s | 106.08 req/s | **0.80x** |
| 10MB | 11.32 req/s | 9.35 req/s | **0.83x** |

### Pembuktian

Speedup hampir tidak meningkat (0.68x – 1.09x) meskipun node ditambah dari 1 menjadi 3. Nginx sebagai bagian **serial (1-p)** menjadi bottleneck — semua request wajib melewati satu pintu masuk, sehingga penambahan node paralel tidak memberi speedup menuju 3x ideal.

📄 Laporan lengkap: [`docs/amdahls-law.md`](docs/amdahls-law.md)

---

## Struktur Repository

```
.
├── compose.yaml              # Tugas 1: single node (:3001)
├── compose-amdahl.yaml       # Tugas 2: 3 nodes + nginx LB (:8080)
├── nginx.conf                # Konfigurasi LB round-robin
├── server/
│   ├── app.js                # Express API (+ NODE_ID & /health)
│   ├── Dockerfile
│   └── Containerfile
├── dummy-files/
│   └── generate.js           # Generator file dummy (1kb-10000kb)
├── tests/
│   ├── little-law.js         # Skrip k6 Tugas 1
│   ├── amdahl-law.js         # Skrip k6 Tugas 2
│   ├── tugas1-*.json         # Hasil benchmark Tugas 1
│   └── tugas2-*.json         # Hasil benchmark Tugas 2
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

### Tugas 1 — Single Node

```bash
docker compose up --build -d        # API di :3001
& "C:\Users\Acer\k6.exe" run --env "BASE_URL=http://localhost:3001" --env "FILE_SIZE=10mb" tests/little-law.js
```

### Tugas 2 — Multi Node + Nginx LB

```bash
docker compose down                 # stop Tugas 1
docker compose -f compose-amdahl.yaml up --build -d   # LB di :8080
& "C:\Users\Acer\k6.exe" run --env "BASE_URL=http://localhost:8080" --env "FILE_SIZE=10mb" tests/amdahl-law.js
```

Parameter `--env FILE_SIZE` mendukung: `1kb`, `10kb`, `100kb`, `1000kb`, `10000kb`.

---

## Referensi

- **k6** — https://k6.io
- **Nginx Load Balancing** — https://nginx.org/en/docs/http/load_balancing.html
- **Little's Law** — https://en.wikipedia.org/wiki/Little%27s_law
- **Amdahl's Law** — https://en.wikipedia.org/wiki/Amdahl%27s_law