# Tugas 1 — Bukti Little's Law

**Rumus yang dibuktikan:**
`Concurrency (L) = Throughput (λ) × Latency (W)`

---

## Arsitektur

Menjalankan **1 server tunggal (Single Node)** **tanpa Load Balancer**, yaitu langsung menembak port aplikasi `:3001`.

```
   [Alat uji beban]  ──►  http://localhost:3001   ──►   [Server API (Express)]
   (k6 / Locust / ab)          │                            serve file dummy
                               └── LANGSUNG ke port :3001, tidak lewat pintu lain
```

Ciri penting arsitektur ini:

1. **Satu titik saja.** Ada tepat satu server di port `3001`, tidak ada cadangan/backup.
2. **Tanpa Load Balancer.** Penguji beban mengakses langsung endpoint aplikasi. Tidak ada `:8080` (itu arsitektur Tugas 2 dengan Nginx).
3. **Kenapa murni sendirian?** Agar semua request menumpuk di satu server. Jika ada pembagi beban, concurrency (`L`) tidak menumpuk dan rumus Little's Law sulit dibuktikan.
4. **Yang diguncang:** ukuran file (`1KB` → `100KB` → `1MB` → `10MB`) dan jumlah pengguna simultan (concurrency). File makin besar → tiap request makin lama (latency `W` naik) → `L = λ × W` makin besar → kalau lewat batas server, request di-*drop*.

---

## Bagian yang belum ditulis
_(kita isi bertahap: server, dummy files, alat uji, hasil, bukti rumus)_