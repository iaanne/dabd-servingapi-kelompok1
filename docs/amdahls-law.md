# Tugas 2 — Bukti Amdahl's Law

**Rumus:** `Speedup (S) = 1 / ( (1-p) + p/N )`

---

## Metodologi

- **Arsitektur:** 3 server API (node1:3001, node2:3002, node3:3003) di belakang Nginx Load Balancer (:8080)
- **Tool:** k6 v0.54.0
- **File diuji:** 1kb, 10kb, 100kb, 1MB, dan 10MB
- **Concurrency:** ramp-up 1 → 50 → 100 → 200 VU, durasi 90 detik
- **Target:** `http://localhost:8080` (lewat Nginx, bukan langsung ke node)

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
| Tugas 2 (3 nodes + LB, :8080) | 58.48 | 66.46 | 2,915.29 | 262,389 |

### File 10kb (10kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 73.60 | 89.63 | 2,364.32 | 212,792 |
| Tugas 2 (3 nodes + LB, :8080) | 86.52 | 99.07 | 1,931.53 | 173,840 |

### File 100kb (100kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 171.83 | 188.95 | 1,031.11 | 92,804 |
| Tugas 2 (3 nodes + LB, :8080) | 261.48 | 285.13 | 698.96 | 62,909 |

### File 1MB (1000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 1,375.75 | 1,510.97 | 131.85 | 11,868 |
| Tugas 2 (3 nodes + LB, :8080) | 1,625.48 | 1,839.96 | 106.08 | 9,548 |

### File 10MB (10000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 15,439.96 | 15,955.10 | 11.32 | 1,040 |
| Tugas 2 (3 nodes + LB, :8080) | 21,068.08 | 21,783.15 | 9.35 | 870 |

---

## Perhitungan Speedup

| File | T1 (1 node) | T2 (3 nodes + LB) | Speedup = T2/T1 |
|------|-------------|-------------------|-----------------|
| 1kb  | 2,664.21 req/s | 2,915.29 req/s | **1.09x** |
| 10kb | 2,364.32 req/s | 1,931.53 req/s | **0.82x** |
| 100kb | 1,031.11 req/s | 698.96 req/s | **0.68x** |
| 1MB  | 131.85 req/s | 106.08 req/s | **0.80x** |
| 10MB | 11.32 req/s | 9.35 req/s | **0.83x** |

---

## Pembuktian Amdahl's Law

Rumus Amdahl: `S = 1 / ( (1-p) + p/N )`

Dengan N = 3 node:
- **Ideally (p = 100% paralel):** S = 3.0x
- **Realistis (p ≈ 0.5):** S = 1.5x
- **Hasil kita (p ≈ 0):** S ≈ 1.0x

Data menunjukkan speedup **hampir tidak ada peningkatan** (0.68x – 1.09x) meskipun ditambah 2 node lagi. Ini karena:

1. **Bagian serial (1-p) dominan**: Nginx sebagai gerbang pintu masuk tunggal memproses request secara berurutan (round-robin). Ini menjadi critical path.
2. **Bottleneck bukan CPU node**: Node-node API tidak jenuh — yang membatasi adalah koneksi/throughput dari satu titik masuk.
3. **Semua beban lewat 1 pintu**: k6 → Nginx → node. Semua request wajib antri di Nginx dulu, jadi menambah node tidak mempercepat bagian ini.
4. **Ukuran file besar = overhead LB makin terasa**: Pada request kecil (1kb) LB sedikit membantu (1.09x) karena node paralel bisa proses lebih cepat. Namun makin besar file-nya, bagian serial (memindahkan data lewat satu pintu) makin dominan sehingga throughput justru turun di bawah baseline (0.68x–0.83x).

Hasil ini justru membuktikan bahwa ketika bagian serial (1-p) besar, penambahan prosesor (node) hampir tidak memberi speedup — persis seperti Amdahl's Law.

---

## Kesimpulan

Amdahl's Law terbukti: walaupun sistem diperkuat dari 1 node menjadi 3 node (paralel, p), performa total tetap terbatas karena adanya bagian serial (1-p) — yaitu Nginx yang menjadi gerbang pintu masuk tunggal yang berurutan. Speedup yang diperoleh hanya ~1.0x atau bahkan di bawah dalam kondisi file besar (bukan 3x ideal), menunjukkan bahwa bottleneck ada pada komponen serial, bukan pada node pemroses.
