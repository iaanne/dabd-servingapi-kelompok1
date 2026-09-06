# Tugas 2 — Bukti Amdahl's Law

**Rumus:** `Speedup (S) = 1 / ( (1-p) + p/N )`

---

## Metodologi

- **Arsitektur:** 3 server API (node1:3001, node2:3002, node3:3003) di belakang Nginx Load Balancer (:8080)
- **Tool:** k6 v0.54.0
- **File diuji:** 1kb, 10kb, 100kb, 1MB, dan 10MB
- **Concurrency:** ramp-up 1 → 50 → 100 → 200 VU, durasi 90 detik
- **Target:** `http://localhost:8080` (lewat Nginx, bukan langsung ke node)
- **Pengaturan Nginx:** `proxy_buffering off` (streaming realtime), keepalive ke upstream, `worker_processes auto`, `worker_connections 8192`

```
   [k6]  ──►  http://localhost:8080 (NGINX LB)
                        │ round-robin
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           node-1    node-2    node-3
```

---

## Hasil Benchmark

### File 1kb (1kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 62.57 | 67.24 | 2,664.21 | 239,780 |
| Tugas 2 (3 nodes + LB, :8080) | 58.59 | 73.35 | 3,008.13 | 270,735 |

### File 10kb (10kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 73.60 | 89.63 | 2,364.32 | 212,792 |
| Tugas 2 (3 nodes + LB, :8080) | 65.09 | 76.29 | 2,704.45 | 243,401 |

### File 100kb (100kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 171.83 | 188.95 | 1,031.11 | 92,804 |
| Tugas 2 (3 nodes + LB, :8080) | 212.10 | 244.54 | 859.87 | 77,391 |

### File 1MB (1000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 1,375.75 | 1,510.97 | 131.85 | 11,868 |
| Tugas 2 (3 nodes + LB, :8080) | 1,296.89 | 1,411.16 | 130.65 | 11,760 |

### File 10MB (10000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 15,439.96 | 15,955.10 | 11.32 | 1,040 |
| Tugas 2 (3 nodes + LB, :8080) | 15,697.83 | 16,335.40 | 11.94 | 1,093 |

---

## Perhitungan Speedup

| File | T1 (1 node) | T2 (3 nodes + LB) | Speedup = T2/T1 |
|------|-------------|-------------------|-----------------|
| 1kb  | 2,664.21 req/s | 3,008.13 req/s | **1.13x** |
| 10kb | 2,364.32 req/s | 2,704.45 req/s | **1.14x** |
| 100kb | 1,031.11 req/s | 859.87 req/s | **0.83x** |
| 1MB  | 131.85 req/s | 130.65 req/s | **0.99x** |
| 10MB | 11.32 req/s | 11.94 req/s | **1.06x** |

---

## Pembuktian Amdahl's Law

Rumus Amdahl: `S = 1 / ( (1-p) + p/N )`

Dengan N = 3 node:
- **Ideally (p = 100% paralel):** S = 3.0x
- **Realistis (p ≈ 0.5):** S = 1.5x
- **Hasil kita (p kecil):** S ≈ 0.83x – 1.14x

Setelah Nginx dituning (streaming, bukan buffering penuh), performa multi-node membaik: untuk file
kecil (1kb, 10kb) LB kini **lebih cepat** dari single node (+13–14%) karena 3 node memproses paralel.
Begitu pula 10MB sedikit naik (1.06x) dan latensi p90 membaik pada 1MB (1,376 → 1,297 ms).

Namun speedup **tetap jauh dari ideal 3x**. Pada file 100kb throughput bahkan masih di bawah baseline
(0.83x). Ini karena:

1. **Bagian serial (1-p) tetap ada**: semua request wajib melewati satu pintu masuk Nginx (walaupun
   sudah streaming, hop full-duplex node↔LB tetap menambah beban).
2. **3 node jalan di MESIN yang sama**: mereka berbagi CPU/disk/memori satu laptop — bukan paralelisme
   hardware sesungguhnya, sehingga kapasitas I/O total tidak bertambah.
3. **Workload I/O-bound**: `res.sendFile` memakai kernel `sendfile`, sangat ringan untuk CPU. Node pun
   tidak benar-benar jenuh, jadi menambah node tidak menghilangkan bottleneck.

Speedup 1.13–1.14x pada file kecil menunjukkan manfaat paralelisme nyata saat request pendek; namun
hasil jauh di bawah 3x tetap membuktikan bahwa performa total dibatasi oleh bagian serial (1-p) —
persis seperti Amdahl's Law.

---

## Kesimpulan

Amdahl's Law terbukti. Menambah node dari 1 menjadi 3 memang memberi sedikit kecepatan pada request
ringan (1.13–1.14x), tapi jauh dari ideal 3x karena (1) kompetisi resource pada mesin fisik yang sama,
(2) workload yang tidak CPU-bound, dan (3) komponen serial (Nginx LB) yang tetap membatasi. Penambahan
node tidak sekadar menumpuk hardware — benefit paralelisasi dibatasi oleh bagian yang tidak bisa
diparalelkan.