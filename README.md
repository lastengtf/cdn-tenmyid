# 🌐 CDN TEN (`cdn.ten.my.id`)

[![Platform Status](https://img.shields.io/badge/CDN-Cloudflare%20Workers-f38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://cdn.ten.my.id)
[![Database](https://img.shields.io/badge/Database-Cloudflare%20KV-f59e0b?style=for-the-badge&logo=cloudflare&logoColor=white)]()
[![Domain](https://img.shields.io/badge/Domain-cdn.ten.my.id-2563eb?style=for-the-badge)](https://cdn.ten.my.id)
[![CORS](https://img.shields.io/badge/CORS-Enabled%20(*)-10b981?style=for-the-badge)]()

Platform Personal Content Delivery Network (CDN) untuk kebutuhan digital pribadi pada domain **`cdn.ten.my.id`**. Berfungsi untuk menyimpan dan mendistribusikan resource content seperti gambar, video, berkas file/dokumen, script JavaScript, stylesheet CSS, dll., didukung oleh **Cloudflare Workers** dan **Cloudflare KV Database**.

---

## ⚡ Fitur Utama

1. **Autentikasi Email & Password Personal**:
   - Saat mengakses `cdn.ten.my.id`, pengguna diarahkan ke antarmuka login.
   - Login menggunakan **Email** dan **Password** yang diverifikasi terhadap environment variables di Dashboard Cloudflare (`ADMIN_EMAIL` & `ADMIN_PASSWORD`).
   - Setelah login berhasil, pengguna langsung masuk ke halaman admin untuk mengelola aset.

2. **Pengalamatan URL Fleksibel**:
   - **URL Acak (Random Slug)**: Setiap aset yang didaftarkan otomatis mendapatkan URL `cdn.ten.my.id/<random_code>` (karakter acak unik dan tidak boleh sama untuk setiap aset).
   - **Custom Path**: Pengguna dapat menambahkan path kustom sesuai kebutuhan (contoh: `cdn.ten.my.id/brand/logo.svg` atau `cdn.ten.my.id/css/app.css`).

3. **Kategori Aset**:
   - Pengorganisasian aset berdasarkan kategori rapi: `Gambar`, `Video`, `Script`, `CSS`, `Dokumen`, dan `Lainnya`.

4. **UI/UX Sederhana & Berfokus Fungsi**:
   - Antarmuka minimalis, bersih, bertema gelap modern.
   - Tanpa deskripsi atau elemen dekoratif yang tidak perlu, langsung fokus pada fungsi pencarian, upload, salin tautan, preview, edit, dan hapus.

5. **Performa & Kompatibilitas**:
   - **CORS Penuh**: Header `Access-Control-Allow-Origin: *` aktif pada semua aset publik.
   - **Media Streaming**: Mendukung HTTP Range Requests untuk pemutaran video dan audio tanpa jeda.
   - **Edge Caching**: Cache jangka panjang dengan `Cache-Control: public, max-age=31536000, immutable`.

---

## ⚙️ Konfigurasi Cloudflare & KV

### 1. KV Namespace
Konfigurasi pada `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CDN_KV"
id = "dce4b6259909484888bf22eb63dcf826"
```

### 2. Environment Variables di Cloudflare Dashboard
Buka **Cloudflare Dashboard** > **Workers & Pages** > Pilih Worker `cdn-tenmyid` > **Settings** > **Variables and Secrets**:
- `ADMIN_EMAIL`: Email administrator untuk login (misal: `admin@ten.my.id`)
- `ADMIN_PASSWORD`: Password administrator untuk login (misal: password rahasia Anda)

---

## 📁 Struktur Direktori

```text
cdn-ten-my-id/
├── public/                         # Antarmuka Admin & Static Assets
│   ├── _headers                    # Header HTTP & CORS
│   ├── _redirects                  # Pengaturan alias & redirect URL
│   ├── index.html                  # Halaman Login & Dashboard Admin CDN
│   ├── favicon.svg                 # Favicon resmi CDN TEN
│   └── portal/                     # Asset UI Dashboard
│       ├── css/portal.css          # Styling minimalis modern (Dark Theme)
│       └── js/portal.js            # Controller interaktif (Auth, Upload, CRUD, Copy)
├── src/
│   └── index.js                    # Cloudflare Worker: Auth, Routing KV, CDN Asset Serving
├── wrangler.toml                   # Konfigurasi Cloudflare Worker & KV Binding
├── package.json                    # Konfigurasi dependency & CLI scripts
├── instruksi.md                    # Catatan instruksi pengguna
├── plan-master.md                  # Master Plan teknis
└── README.md                       # Dokumentasi repositori
```

---

## 🚀 Alur Kerja & Deploy

Platform ini terhubung ke repositori GitHub:
`https://github.com/lastengtf/cdn-tenmyid`

### Menjalankan Lokal (Development)
```bash
npm install
npm run dev
```

### Deploy ke Cloudflare
```bash
npm run deploy
```
Atau cukup lakukan `git push origin main` jika dihubungkan dengan integrasi CI/CD Cloudflare.
