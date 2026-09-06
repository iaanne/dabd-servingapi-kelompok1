# Tugas 2 — Bukti Amdahl's Law

**Rumus:** `Speedup (S) = 1 / ( (1-p) + p/N )`

---

## Metodologi

- **Arsitektur:** 3 server API (node1:3001, node2:3002, node3:3003) di belakang Nginx Load Balancer (:8080)
- **Tool:** k6 v0.54.0
- **File diuji:** 1MB dan 10MB
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

### File 1MB (1000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 1,375.75 | 1,510.97 | 131.85 | 11,868 |
| Tugas 2 (3 nodes + LB, :8080) | 1,301.47 | 1,418.26 | 129.76 | 11,679 |

### File 10MB (10000kb.bin)

| Skenario | p90 (ms) | p95 (ms) | Throughput (req/s) | Total Request |
|----------|----------|----------|---------------------|---------------|
| Tugas 1 (1 node, :3001) | 15,439.96 | 15,955.10 | 11.32 | 1,040 |
| Tugas 2 (3 nodes + LB, :8080) | 18,869.91 | 19,541.18 | 11.45 | 1,052 |

---

## Perhitungan Speedup

| File | T1 (1 node) | T2 (3 nodes) | Speedup = T2/T1 |
|------|-------------|--------------|-----------------|
| 1MB  | 131.85 req/s | 129.76 req/s | **0.98x** |
| 10MB | 11.32 req/s | 11.45 req/s | **1.01x** |

---

## Pembuktian Amdahl's Law

Rumus Amdahl: `S = 1 / ( (1-p) + p/N )`

Dengan N = 3 node:
- **Ideally (p = 100% paralel):** S = 3.0x
- **Realistis (p ≈ 0.5):** S = 1.5x
- **Hasil kita (p ≈ 0.01):** S ≈ 1.0x

Data menunjukkan speedup **hampir tidak ada peningkatan** (0.98x – 1.01x) meskipun ditambah 2 node lagi. Ini karena:

1. **Bagian serial (1-p) dominan**: Nginx sebagai gerbang pintu masuk tunggal memproses request secara berurutan (round-robin). Ini menjadi critical path.
2. **Bottleneck bukan CPU node**: Node-node API tidak jenuh — yang membatasi adalah koneksi/throughput dari satu titik masuk.
3. **Semua beban lewat 1 pintu**: k6 → Nginx → node. Semua request wajib antri di Nginx dulu, jadi menambah node tidak mempercepat bagian ini.

Hasil ini justru membuktikan bahwa ketika bagian serial (1-p) besar, penambahan prosesor (node) hampir tidak memberi speedup — persis seperti Amdahl's Law.

---

## Kesimpulan

Amdahl's Law terbukti: walaupun sistem diperkuat dari 1 node menjadi 3 node (paralel, p), performa total tetap terbatas karena adanya bagian serial (1-p) — yaitu Nginx yang menjadi gerbang pintu masuk tunggal yang berurutan. Speedup yang diperoleh hanya ~1.0x (bukan 3x ideal), menunjukkan bahwa bottleneck ada pada komponen serial, bukan pada node pemroses.
