# 🌐 CDN TEN (`cdn.ten.my.id`)

[![Platform Status](https://img.shields.io/badge/CDN-Cloudflare%20Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://cdn.ten.my.id)
[![Database](https://img.shields.io/badge/Database-Cloudflare%20KV-f59e0b?style=for-the-badge&logo=cloudflare&logoColor=white)]()
[![Domain](https://img.shields.io/badge/Domain-cdn.ten.my.id-2563eb?style=for-the-badge)](https://cdn.ten.my.id)
[![CORS](https://img.shields.io/badge/CORS-Enabled%20(*)-10b981?style=for-the-badge)]()
[![HTTP/3](https://img.shields.io/badge/Protocol-HTTP%2F3%20%26%20Brotli-7c3aed?style=for-the-badge)]()

Infrastruktur Content Delivery Network (CDN) resmi untuk ekosistem **TEN-MY-ID**. Digunakan untuk hosting dan pengiriman aset statis (gambar, video, skrip JS, berkas CSS, font, berkas kode) serta penyimpanan dinamis berbasis **Cloudflare KV Database** dengan performa tinggi ke seluruh dunia.

---

## 🚀 Fitur Utama

- **Global Anycast Edge**: Didistribusikan langsung dari ratusan data center Cloudflare dengan latensi ultra-rendah.
- **Terintegrasi Cloudflare KV Database**:
  - Menyimpan metadata katalog aset secara dinamis.
  - Menyimpan konten berkas (CSS/JS/SVG/Text/Binary Base64) langsung di dalam KV storage.
  - Endpoint penyaji berkas langsung `/raw/*` dengan header CORS & caching otomatis.
  - Layanan tautan pendek / redirects via `/s/*`.
- **Dukungan CORS Penuh**: Header `Access-Control-Allow-Origin: *` otomatis aktif pada semua aset, memungkinkan pemanggilan lintas domain tanpa hambatan security browser.
- **Proteksi Akses PIN Keamanan (PIN: 1010)**: Saat mengakses dashboard `cdn.ten.my.id`, pengguna disambut oleh layar login keamanan modern yang mewajibkan input PIN `1010` untuk mengelola, mengupload, maupun menghapus aset CDN.
- **Portal Katalog Interaktif**: Mengunjungi `https://cdn.ten.my.id` membuka antarmuka modern untuk mencari aset, melihat preview, mengupload aset ke KV, dan menyalin format URL (Direct, HTML, Markdown, CSS) dalam 1-klik.
- **Caching Cerdas**: Aturan cache adaptif (`stale-while-revalidate` untuk aset dinamis dan `immutable` 1 tahun untuk versi tetap `/v1/`).
- **Alur Kerja Git Terotomatisasi**: Cukup push file baru ke repositori GitHub ini, Cloudflare Pages akan langsung mempublikasikannya secara instan.

---

## 📁 Struktur Direktori

```text
cdn-ten-my-id/
├── functions/                      # Cloudflare Pages Functions (Serverless & KV API)
│   ├── api/
│   │   └── assets/
│   │       ├── index.js            # GET /api/assets (List) & POST /api/assets (Upload ke KV)
│   │       └── [id].js             # GET /api/assets/:id & DELETE /api/assets/:id
│   ├── raw/
│   │   └── [[path]].js             # GET /raw/* (Sajikan file langsung dari KV)
│   └── s/
│       └── [short].js              # GET /s/* (Layanan Shortlink & Redirect dari KV)
├── public/                         # Direktori Static yang didistribusikan ke CDN
│   ├── _headers                    # Pengaturan CORS & Cache-Control Cloudflare
│   ├── _redirects                  # Pengaturan alias & redirect URL
│   ├── index.html                  # Antarmuka Web Portal CDN TEN
│   ├── favicon.svg                 # Favicon resmi
│   ├── portal/                     # Aset internal untuk antarmuka portal
│   │   ├── css/portal.css
│   │   └── js/portal.js
│   ├── assets/                     # Direktori Utama Aset Publik
│   │   ├── brand/                  # Logo vektor, maskot, icon kit TEN
│   │   ├── css/                    # Shared stylesheet (ten-core.css)
│   │   ├── js/                     # Shared JavaScript utility (ten-utils.js)
│   │   ├── images/                 # Gambar umum, ilustrasi, WebP/PNG
│   │   ├── fonts/                  # Web font kustom (WOFF2)
│   │   └── media/                  # Video & Audio pendek
│   └── v1/                         # Rilis aset versi tetap (Immutable)
│       ├── css/
│       └── js/
├── wrangler.toml                   # Konfigurasi KV binding & environment variables
├── plan-master.md                  # Dokumen Master Plan Proyek
├── instruksi.md                    # Catatan instruksi awal
└── README.md                       # Dokumentasi repositori
```

---

## 🔑 Pengaturan Cloudflare KV Database di Dashboard

Untuk mengaktifkan database KV pada Cloudflare Pages:

### 1. Buat KV Namespace
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **KV**.
2. Klik **Create a namespace**, beri nama misalnya: `CDN_KV_STORE`.
3. Klik **Add**.

### 2. Hubungkan KV Namespace ke Cloudflare Pages
1. Masuk ke project Pages Anda: `cdn-tenmyid`.
2. Buka tab **Settings** > **Functions**.
3. Gulir ke bagian **KV namespace bindings**, klik **Add binding**.
4. Masukkan:
   - **Variable name**: `CDN_KV` *(Wajib menggunakan nama ini)*
   - **KV namespace**: Pilih namespace yang dibuat tadi (`CDN_KV_STORE`).
5. Klik **Save**.

### 3. Tambahkan Environment Variable (API Key Keamanan)
1. Masih di tab **Settings** > **Environment variables**.
2. Klik **Add variable**:
   - **Variable name**: `ADMIN_API_KEY`
   - **Value**: Masukkan token rahasia Anda (contoh: `kuncirahasiaku-ten-2026`).
3. Klik **Save**.

---

## 💡 Contoh Penggunaan API & CDN

### 1. Mengambil Aset dari KV via Direct URL
```html
<!-- Konten yang tersimpan di KV disajikan via /raw/ -->
<link rel="stylesheet" href="https://cdn.ten.my.id/raw/css/custom.css">
<script src="https://cdn.ten.my.id/raw/js/app.js"></script>
```

### 2. Menggunakan CSS Inti TEN (Static Edge)
```html
<link rel="stylesheet" href="https://cdn.ten.my.id/assets/css/ten-core.css">
```

### 3. Mengupload Aset ke KV via cURL / REST API
```bash
curl -X POST https://cdn.ten.my.id/api/assets \
  -H "Authorization: Bearer kuncirahasiaku-ten-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Badge Stylesheet",
    "slug": "css/badge.css",
    "category": "css",
    "desc": "Komponen badge custom",
    "content": ".badge-custom { padding: 4px 8px; border-radius: 4px; }"
  }'
```

---

## ☁️ Panduan Deploy ke Cloudflare Pages

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Klik **Create application** > Tab **Pages** > **Connect to Git**.
3. Pilih repositori: `lastengtf/cdn-tenmyid`.
4. Konfigurasi build:
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `public`
5. Klik **Save and Deploy**.
6. **Hubungkan Custom Domain**:
   - Di halaman project Pages, buka tab **Custom domains**.
   - Klik **Set up a custom domain**.
   - Masukkan domain: `cdn.ten.my.id`.
   - Konfirmasi update DNS record (CNAME).

---

## 📄 Lisensi

Platform CDN TEN dikelola dan dilisensikan di bawah ekosistem **TEN-MY-ID**.
