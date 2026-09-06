# Tugas 1 — Bukti Little's Law

> **Anggota:** Ian · **Arsitektur:** 1 node tanpa Load Balancer
> **Rumus:** `Concurrency (L) = Throughput (λ) × Latency (W)`

---

## 1. Arsitektur Uji

```
                       Single Node (tanpa Load Balancer)
                       
   Load Test Tool  ──────►  http://localhost:3001    (API Serving File, Express)
   (k6 / Locust / ab)          │
                              serve file dummy dari dummy-files/ : 1kb, 100kb, 1mb, 10mb
```

Tidak ada LB. Tembakan langsung ke port aplikasi `:3001`. Jika satu-satunya node kewalahan, tidak ada node lain yang menolong → terlihat jelas saat **crash / drop requests**.

## 2. Metodologi

- **Server:** `server/app.js` (Node.js + Express 5), 1 instance, port `3001`.
- **File dummy:** `dummy-files/generate.js` → `1kb.bin`, `100kb.bin`, `1mb.bin`, `10mb.bin`.
- **Alat uji:** k6 (utama), Locust & Apache Bench sebagai pembanding & cross-check (lihat `docs/tool-comparison.md`).
- **Matrix uji:** ukuran file (4) × concurrency {1, 10, 50, 100, 200, 500} = 24 skenario, durasi 12 s, injeksi constant-VUs.
- **Rumus verifikasi:** `L_calc = λ (req/s) × W (detik)`. Dibandingkan dengan `L_measured` = jumlah virtual user yang diinjeksikan.

## 3. Hasil

Rekap (nilai kunci dari `data/task1/summary.csv`):

| Size | VU | λ (req/s) | Latency avg (ms) | p90 (ms) | p95 (ms) | L_calc | L_meas | L_calc/L_meas |
|------|----|-----------|------------------|----------|----------|--------|--------|---------------|
| 1kb  |  50 |     6 453 |             7.6  |     9.2  |    10.0  |  49.0  |    50  |    0.980 |
| 1kb  | 500 |     6 571 |            75.6  |    82.7  |    89.6  | 496.9  |   500  |    0.994 |
| 100kb| 500 |     3 478 |           142.6  |   151.5  |   156.0  | 495.9  |   500  |    0.992 |
| 1mb  | 500 |       736 |           671.3  |   685.8  |   732.8  | 494.1  |   500  |    0.988 |
| 10mb | 100 |        81 |          1209.5  |  1312.5  |  1442.4  |  98.5  |   100  |    0.985 |
| 10mb | 500 |        71 |          6547.2  | 11956.8  | 13905.9  | 466.5  |   500  |    0.933 |

### Analisis verifikasi

1. **Concurrency = Throughput × Latency TERBUKTI:** rasio `L_calc / L_measured` berada di kisaran **0.98–0.99** pada hampir semua skenario. Artinya jumlah pengguna aktif yang dibutuhkan sistem (`L`) memang sama dengan `λ × W`.
2. **Ukuran file membengkakkan latency:** `1kb → 10mb` menaikkan latency rata-rata dari puluhan `ms` menjadi **ratusan ms bahkan >6 detik** pada concurrency tinggi.
3. **Throughput jenuh:** pada `10mb`, throughput hanya ~70–80 req/s apa pun concurrency-nya — server tidak bisa lebih cepat, hanya mengantre (latency naik). `L` yang dibutuhkan melonjak melewati kapasitas.

### Demonstrasi kegagalan (drop requests)

Pada uji bonus `scripts/run-little-stress.sh`, server dijalankan dengan **resource terbatas** (file descriptor = 64, simulasi container/VM kecil). Saat file `10mb` diserang concurrency tinggi, koneksi melampaui kapasitas → **request terpaksa drop**:

| Skenario | Request total | Failed | Failure rate |
|----------|--------------|-------:|-------------:|
| 10mb · c=100 |  47 322 | 47 089 | **99.50 %** |
| 10mb · c=300 |  70 595 | 70 569 | **99.96 %** |
| 10mb · c=600 |  66 657 | 66 618 | **99.94 %** |
| 10mb · c=1000|  67 360 | 67 325 | **99.94 %** |

Ini membuktikan: file besar → latency membengkak → `L` yang dibutuhkan melonjak melampaui batas RAM/CPU/koneksi → **server gagal & drop requests**.

## 4. Kesimpulan

- Little's Law **terbukti secara kuantitatif** (rasio verifikasi ≈ 1.0).
- Latency adalah variabel dominan: memperbesar file 10.000× membuat latency naik puluhan hingga ribuan kali, sehingga `L = λ × W` meroket dan melewati kapasitas satu node.
- **Bukti keberhasilan sesuai penugasan tercapai:** concurrency melonjak melewati batas sumber daya → server drop requests (lihat tabel stress).

## 5. Reproduksi

```bash
node dummy-files/generate.js                     # 1) buat file dummy
cd server && npm install && cd ..                # 2) dep server
bash scripts/run-little.sh                       # 3) jalankan seluruh matrix
./.venv/bin/python scripts/analyze-little.py     # 4) verifikasi & chart
bash scripts/run-little-stress.sh                # 5) demonstrasi drop requests
```

Chart: `results/charts/little_*.png` · Data: `data/task1/*.json`, `data/task1/summary.csv`