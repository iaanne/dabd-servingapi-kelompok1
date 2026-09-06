# Tugas 2 — Bukti Amdahl's Law

> **Anggota:** Trisha · **Arsitektur:** multinode (1–3 node) di belakang Nginx Load Balancer
> **Rumus:** `S(N) = 1 / ((1 − p) + p/N)` — di mana `p` = porsi paralel, `(1 − p)` = porsi serial

---

## 1. Arsitektur Uji

```
                Serial gateway (bottleneck!)
                     │
   Load Test Tool ───► http://localhost:8080   ── Nginx Load Balancer (round-robin)
   (k6, file 10mb)             │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                 :3001       :3002       :3003
                node 1      node 2      node 3   (API Serving File, Express)
```

- Semua request masuk lewat **satu pintu**: Nginx di `:8080` (porsi **serial**, `1 − p`).
- Pengerjaan file dipecah ke **N node** (porsi **paralel**, `p`).
- Semakin banyak node, `p/N` mengecil → speedup menuju batas `1/(1−p)`, **tidak pernah tak hingga**.

## 2. Metodologi

- 3 instance server `server/app.js` pada port `3001`, `3002`, `3003`.
- Konfigurasi Nginx round-robin dihasilkan dinamis: `scripts/run-amdahl.sh` membuat upstream dengan N node aktif untuk N = 1, 2, 3.
- File uji: `10mb.bin` (file besar → beban tinggi, porsi pemrosesan besar).
- Beban: k6, 200 VUs, durasi 25 s per skenario.
- **Speedup dihitung berbasis throughput:** `S(N) = λ(N) / λ(1)`.

## 3. Hasil

Dari `data/task2/summary.csv`:

| Node (N) | λ (req/s) | Latency avg (ms) | p90 (ms) | p95 (ms) | Speedup S(N) |
|----------|-----------|------------------|----------|----------|--------------|
| 1        |     47.0  |     4 148.7      | 4 466.6  | 5 777.9  |  1.000 |
| 2        |     80.2  |     2 432.3      | 4 464.0  | 4 535.0  |  1.706 |
| 3        |    100.4  |     1 943.8      | 4 488.1  | 4 665.5  |  2.136 |

### Analisis Amdahl

1. **Porsi paralel yang terfit:** dari `S(2)=1.706` diperoleh `p = 2(1 − 1/S(2)) = 0.827`.
2. **Batas mutlak speedup:** `1/(1−p) = 1/0.173 ≈ 5.80×`.
3. **Speedup jenuh:** menambah node ke-2 memberi kenaikan **71%**, node ke-3 hanya **+25%**. Bahkan jika node ditambah sampai tak hingga, sistem tidak akan melewati **5.8×** karena Nginx (pintu masuk tunggal) + overhead HTTP bersifat **serial** (`1 − p = 17.3%` dari waktu tiap request).
4. **p90/p95 nyaris konstan** antar node — antrean di gerbang Nginx mendominasi tail latency, bukan node backend.

Ini persis prediksi Amdahl: *"walaupun sistem diperkuat dengan memaralelkan porsi besar (p=0.83), performa total tetap berbatas karena bagian serial."*

## 4. Kesimpulan

- Amdahl's Law **terbukti**: speedup tidak linear terhadap jumlah node; hasil uji (S=1.71, 2.14) konsisten dengan kurva `S(N)=1/((1−0.827)+0.827/N)`.
- Nginx sebagai gerbang tunggal adalah **bottleneck serial** yang membatasi peningkatan skala.
- Tambahan node tidak lagi ekonomis setelah N=3 karena efisiensi marginal < 25%.

## 5. Reproduksi

```bash
# pastikan nginx terpasang (default sudah ada di sistem)
bash scripts/run-amdahl.sh                       # jalankan N=1,2,3 (file 10mb, 200 VU)
./.venv/bin/python scripts/analyze-amdahl.py     # hitung speedup & fit p, buat chart
```

- Konfigurasi Nginx lengkap 3 node: `lb/nginx.conf` (manual, round-robin).
- Chart: `results/charts/amdahl_speedup_vs_nodes.png` · Data: `data/task2/*.json`, `data/task2/summary.csv`