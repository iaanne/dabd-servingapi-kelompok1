# Tren Alat Uji Beban — Locust · Apache Bench (ab) · k6

> **Anggota:** Evan · Role: setup + script 3 tool & cross-check hasil Tugas 1/2
> Deliverable pendukung: laporan perbandingan & data validasi silang.

---

## 1. Instalasi

| Tool | Cara install | Butuh sudo? |
|------|--------------|-------------|
| **k6** | Binary statis dari GitHub releases → `tools/k6` | ✗ |
| **Locust** | `pip install locust` (venv `.venv`) | ✗ |
| **Apache Bench (ab)** | `sudo bash scripts/install-sudo.sh` (paket `apache`) | ✓ |

Semua via satu perintah: `bash scripts/bootstrap.sh` (+ `sudo bash scripts/install-sudo.sh` untuk ab).

## 2. Cara pakai di project ini

```bash
# k6 (utama, output JSON + p90/p95)
./tools/k6 run --vus 100 --duration 20s -e BASE_URL=http://localhost:3001 -e FILE=10mb.bin \
  --summary-export data/raw/k6.json loadtest/k6/script.js

# Locust (headless, CSV + p90/p95)
LOCUST_FILE=10mb.bin ./.venv/bin/locust -f loadtest/locust/locustfile.py \
  --host http://localhost:3001 --headless -u 100 -r 10 -t 20s --csv data/raw/locust

# Apache Bench (percentiles otomatis ke TSV)
bash loadtest/ab/run-ab.sh http://localhost:3001/files/10mb.bin 100 300
```

## 3. Tabel perbandingan

| Aspek | k6 | Locust | Apache Bench (ab) |
|-------|----|--------|-------------------|
| Bahasa skenario | JavaScript | Python | N/A (opsi CLI) |
| Distributed load | ada (k6-cloud/grafana) | ada (master-worker) | tidak |
| P90/P95 otomatis | ✓ (`summaryTrendStats`) | ✓ (laporan HTML & CSV) | ✓ (tabel "Percentage ... served") |
| Antrian/slow-start level | `ramping-vus`, `stages` | `spawn-rate` | `-c` langsung penuh |
| Report masif | grafik + JSON/CSV | HTML web + CSV | stdout + TSV (`-g`) |
| Cocok jadi *sumber* data utama | ✓ (dipakai di sini) | ✓ (cross-check) | ✓ (cross-check) |
| Beban ke mesin uji | ringan | sedang | paling ringan |

## 4. Catatan hasil cross-check (Tugas 1 & 2)

Status: **draf** — isi kolom ini dengan hasil run ulang memakai tool kedua.
Contoh metrik yang wajib dibandingkan: `λ (req/s)`, latency avg, `p90`, `p95`, failure rate.

| Skenario | k6 | Locust | ab | Rata-rata | Deviasi |
|----------|----|--------|----|-----------|---------|
| Tugas1 · 1mb · c=50  | 679.4 rps | (_isi_) | (_isi_) | - | - |
| Tugas1 · 10mb · c=100| 81.5 rps  | (_isi_) | (_isi_) | - | - |
| Tugas2 · N=3 · 10mb  | 100.4 rps | (_isi_) | (_isi_) | - | - |

> **Prinsip validasi:** angka antar-tool tidak perlu sama persis (parameter timeout, keep-alive, ukuran koneksi berbeda) — yang penting **tren & orde besarnya konsisten** agar konklusi Little/Amdahl tidak bergantung pada satu alat.

## 5. Kesimpulan (sementara)

k6 paling efisien untuk menjalankan banyak kombinasi (skenario bervariasi + JSON otomatis). Locust unggul untuk visualisasi web live & skenario pythonic. ab sangat ringan dan pas untuk verifikasi cepat serta otomatisasi CI.