# Tugas 1 — Bukti Little's Law

**Rumus:** `Concurrency (L) = Throughput (λ) × Latency (W)`

---

## Metodologi

- **Arsitektur:** 1 server Express (port 3001), tanpa Load Balancer
- **Tool:** k6 v0.54.0
- **File diuji:** 1KB, 100KB, 1MB, 10MB, 100MB
- **Concurrency:** ramp-up 1 → 50 → 100 → 200 VU, durasi 90 detik

---

## Hasil

| Ukuran File | p90 (ms) | p95 (ms) | Throughput (req/s) | Error Rate | Total Request |
|-------------|----------|----------|---------------------|------------|---------------|
| 1KB         | 62.16    | 66.77    | 2,750.25            | 0.00%      | 247,533       |
| 100KB       | 213.82   | 237.00   | 891.86              | 0.00%      | 80,268        |
| 1MB         | 1,310.24 | 1,416.50 | 128.05              | 0.00%      | 11,525        |
| 10MB        | 17,052.83| 17,791.61| 10.64               | 0.00%      | 980           |
| 100MB       | 60,417.25| 60,884.88| 1.06                | 93.70%     | 127           |

---

## Pembuktian Little's Law

Rumus `L = λ × W` terbukti dari data:

- **File kecil (1KB):** Latency rendah (34ms avg) → Throughput tinggi (2,750 req/s) → Server stabil, error 0%
- **File sedang (100KB-1MB):** Latency meningkat proportionally → Throughput turun drastis → Server masih mampu
- **File besar (10MB):** Latency sudah sangat tinggi (17 detik p90) → Throughput hanya 10 req/s → Server mulai terbatas
- **File sangat besar (100MB):** Latency mencapai 60 detik → Throughput hanya 1 req/s → **93.7% error (timeout)**

Semakin besar file → Latency (W) membengkak → Concurrency (L) melebihi kapasitas RAM/CPU → server drop request.

---

## Kesimpulan

Little's Law terbukti: pada single node tanpa LB, memperbesar ukuran file memaksa latency naik secara signifikan, yang otomatis membengkakkan concurrency hingga server kehabisan resource. Pada file 100MB, server benar-benar tidak mampu melayani 200 concurrent user — 93.7% request mengalami timeout. Ini membuktikan bahwa `L = λ × W` berlaku dan server tunggal punya batas mutlak.
