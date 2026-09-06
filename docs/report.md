# LAPORAN

## Judul
**Pembuktian Little's Law dan Amdahl's Law pada API Serving File dengan Pengujian Beban**
— *Studi kasus klaster API server statis (Node.js + Express) dengan Nginx Load Balancer*

**Kelompok 1 · DABD (API Serving File)**
**Anggota:** Ian · Trisha · Evan · Alvin
**Deliverable:** [Link repository](https://github.com/iaanne/dabd-servingapi-kelompok1) · Video demo · Laporan ini

---

## Metodologi

### Arsitektur
1. **Tugas 1 (Little's Law):** 1 server API (`server/app.js`, Express 5) di `:3001`, **tanpa load balancer**. Pengujian menembak port aplikasi langsung.
2. **Tugas 2 (Amdahl's Law):** 3 server API di `:3001–:3003` di belakang **Nginx load balancer** `:8080` (round-robin). Pengujian menembak port LB.

### File dummy
Dibangkitkan acak (`dummy-files/generate.js`): `1kb.bin`, `100kb.bin`, `1mb.bin`, `10mb.bin`.

### Alat uji & parameter
| Alat | Peran | Parameter |
|------|-------|-----------|
| k6 | sumber data utama | constant-VUs; durasi 12–25 s; 1KB→10MB; concurrency {1,10,50,100,200,500} |
| Locust, Apache Bench (ab) | cross-check & perbandingan tool | lihat `docs/tool-comparison.md` |

### Rumus yang diuji
- **Little:** `Concurrency L = λ × W` (λ = throughput req/s, W = latency) — verifikasi `L_calc` vs `L_measured`.
- **Amdahl:** `S(N) = 1 / ((1−p) + p/N)` — speedup throughput terhadap basis N=1, fit porsi paralel `p`.

---

## Hasil (p90, p95)

### Tugas 1 — Little's Law (1 node, tanpa LB)

Rekap matrix penuh: `data/task1/summary.csv`. Contoh:

| Size | VU | λ (req/s) | Latency avg | **p90** | **p95** | L_calc | L_meas | L_calc/L_meas |
|------|----|-----------|-------------|---------|---------|--------|--------|---------------|
| 1kb   | 500 | 6 571 | 75.6 ms  | 82.7 ms  | 89.6 ms  | 496.9 | 500 | 0.994 |
| 100kb | 500 | 3 478 | 142.6 ms | 151.5 ms | 156.0 ms | 495.9 | 500 | 0.992 |
| 1mb   | 500 |   736 | 671.3 ms | 685.8 ms | 732.8 ms | 494.1 | 500 | 0.988 |
| 10mb  | 100 |    81 | 1 209.5 ms | 1 312.5 ms | 1 442.4 ms | 98.5 | 100 | 0.985 |
| 10mb  | 500 |    71 | 6 547.2 ms | 11 956.8 ms | 13 905.9 ms | 466.5 | 500 | 0.933 |

Verifikasi: rasio `L_calc/L_measured ≈ 0.98–0.99` → **Little's Law terbukti**.
Pembengkakan: file 1KB→10MB menaikkan latency (p90) dari ~0.7 ms menjadi ~12 **detik** (10mb/c=500).

**Demonstrasi kegagalan (drop requests)** — server dibatasi resource (FD=64), file 10MB:

| Concurrency | Failure rate | Request drop |
|-------------|--------------|--------------|
| 100  | **99.50 %** | 47 089 / 47 322 |
| 300  | **99.96 %** | 70 569 / 70 595 |
| 600  | **99.94 %** | 66 618 / 66 657 |
| 1000 | **99.94 %** | 67 325 / 67 360 |

### Tugas 2 — Amdahl's Law (multinode + Nginx LB, file 10MB, 200 VU)

| Node (N) | λ (req/s) | Latency avg | **p90** | **p95** | Speedup |
|----------|-----------|-------------|---------|---------|---------|
| 1 | 47.0 | 4 148.7 ms | 4 466.6 ms | 5 777.9 ms | 1.000 |
| 2 | 80.2 | 2 432.3 ms | 4 464.0 ms | 4 535.0 ms | 1.706 |
| 3 | 100.4 | 1 943.8 ms | 4 488.1 ms | 4 665.5 ms | **2.136** |

Hasil fit: **porsi paralel p = 0.827** → batas mutlak speedup `1/(1−p) ≈ 5.80×`.
Tambahan node ke-2: +71%, node ke-3: hanya +25% → **speedup jenuh** akibat bagian serial (Nginx gerbang tunggal).

---

## Kesimpulan

1. **Little's Law TERBUKTI** (Tugas 1): pada 24 skenario, `Concurrency = Throughput × Latency` terverifikasi dengan rasio hampir 1.0. File semakin besar → latency (p90/p95) membengkak berlipat-lipat → kebutuhan concurrency (`L`) melonjak → saat melewati batas resource server, request **drop** (failure rate hingga 99.96%).
2. **Amdahl's Law TERBUKTI** (Tugas 2): menambah node dari 1→2→3 hanya memberi speedup 1.71× dan 2.14× (tidak linear), selaras kurva `S(N)=1/((1−0.827)+0.827/N)`. Batas mutlaknya ±5.8× karena **Nginx sebagai gerbang masuk tunggal adalah bagian serial (1−p)** yang tidak mungkin diparalelkan.
3. **Implikasi desain:** sistem harus dirancang agar tidak ada titik serial tunggal; perbaikan terbesar justru pada menghapus/melebarkan bottleneck Nginx (mis. sharding DNS, beberapa LB), bukan menambah node backend secara membabi buta.

---
*Semua nilai p90/p95 dari keluaran k6 (`--summary-export`); data mentah di `data/`; script reproduksi di `scripts/`.*