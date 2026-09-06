# Tugas 1 — Bukti Little's Law

**Rumus:** `Concurrency (L) = Throughput (λ) × Latency (W)`

---

## Metodologi

- **Arsitektur:** 1 server Express (port 3001), tanpa Load Balancer
- **Tool:** k6 v0.54.0
- **File diuji:** 1KB, 10KB, 100KB, 1MB, 10MB
- **Concurrency:** ramp-up 1 → 50 → 100 → 200 VU, durasi 90 detik

---

## Hasil

| Ukuran File | p90 (ms) | p95 (ms) | Throughput (req/s) | Error Rate | Total Request |
|-------------|----------|----------|---------------------|------------|---------------|
| 1KB         | 62.57    | 67.24    | 2,664.21            | 0.00%      | 239,780       |
| 10KB        | 73.60    | 89.63    | 2,364.32            | 0.00%      | 212,792       |
| 100KB       | 171.83   | 188.95   | 1,031.11            | 0.00%      | 92,804        |
| 1MB         | 1,375.75 | 1,510.97 | 131.85              | 0.00%      | 11,868        |
| 10MB        | 15,439.96| 15,955.10| 11.32               | 0.00%      | 1,040         |

---

## Pembuktian Little's Law

Rumus `L = λ × W` terbukti dari data:

- **File kecil (1KB):** Latency rendah (35ms avg) → Throughput tinggi (2,664 req/s) → Server stabil
- **File sedang (10KB-100KB):** Latency meningkat → Throughput turun proporsional
- **File besar (1MB):** Latency sudah signifikan (1.3 detik p90) → Throughput turun ke 131 req/s
- **File sangat besar (10MB):** Latency mencapai 15 detik p90 → Throughput hanya 11 req/s

Semakin besar file → Latency (W) membengkak → Concurrency (L) membesar → Throughput (λ) turun drastis.

---

## Kesimpulan

Little's Law terbukti: pada single node tanpa LB, memperbesar ukuran file memaksa latency naik secara signifikan, yang otomatis membengkakkan concurrency hingga server kehabisan resource. File 10MB mengalami penurunan throughput hingga 99.6% dibanding file 1KB (2,664 → 11 req/s). Ini membuktikan bahwa `L = λ × W` berlaku dan server tunggal punya batas mutlak.
