# Tugas 2 — Bukti Amdahl's Law

**Topik:** Buktikan Amdahl's Law (multinode + Load Balancer)

## Arsitektur

Menjalankan **3 server API (Multi Node)** di belakang **Nginx Load Balancer**.

```
                         CLIENT (k6 / Locust / ab)
                            │
                            ▼ (port 8080)
                     ┌─────────────┐
                     │    NGINX    │
                     │ LOAD BALANCER│
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
           NODE 1        NODE 2        NODE 3
           API           API           API
      (port 3001)   (port 3002)   (port 3003)
```

## Fungsi Masing-Masing Service

1. **node1, node2, node3**: Menjalankan aplikasi Node.js yang berfungsi sebagai *API Serving File*. Aplikasi disiapkan membaca direktori `dummy-files` (ro). Setiap node diberikan variabel `NODE_ID` agar dapat dibedakan.
2. **nginx**: Berperan sebagai Reverse Proxy dan Load Balancer yang akan mendistribusikan *incoming request* dari port `8080` ke ketiga API secara *round-robin*.

## Cara Menjalankan Sistem

1. Pastikan Docker dan Docker Compose telah terinstall.
2. Jalankan perintah berikut di root folder:
   ```bash
   docker compose up --build -d
   ```
3. Tunggu hingga semua container menyala.

## Cara Mengecek Health (Smoke Test)

* **Melalui Load Balancer (Nginx):**
  Akses `http://localhost:8080/health` berulang kali. Respons seharusnya berganti-ganti, misalnya:
  - `{"status":"ok","node":"node-1"}`
  - `{"status":"ok","node":"node-2"}`
  - `{"status":"ok","node":"node-3"}`
* **Melalui Node Langsung (Bypass Nginx):**
  - Node 1: `http://localhost:3001/health`
  - Node 2: `http://localhost:3002/health`
  - Node 3: `http://localhost:3003/health`

## Endpoint Utama

* `GET /`: Menampilkan informasi API dan daftar file (mengandung nama `node`).
* `GET /health`: Endpoint *health check* API (mengandung nama `node`).
* `GET /files/:name`: Mengunduh file dari folder `dummy-files`. (misal: `/files/10mb.bin`).
* `GET /status`: Melihat status resource process memori/CPU server.

## Cara Anggota Kelompok Lain Melakukan Benchmark Nantinya

Nantinya, anggota kelompok lain yang melakukan benchmark dapat langsung mengarahkan alat ujinya (misal *k6*) ke:

```
http://localhost:8080/files/10mb.bin
```

Ini akan menguji throughput dari Load Balancer yang meneruskan load/beban ke `node1`, `node2`, dan `node3`. 
Anggota yang melakukan uji coba bisa mengubah jumlah node di `compose.yaml` menjadi 1, 2, atau 3 untuk mendapatkan data *speedup* sesuai teori **Amdahl's Law**.
