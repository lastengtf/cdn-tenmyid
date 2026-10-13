# 🌐 CDN TEN (`cdn.ten.my.id`)

[![Platform Status](https://img.shields.io/badge/CDN-Cloudflare%20Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://cdn.ten.my.id)
[![Domain](https://img.shields.io/badge/Domain-cdn.ten.my.id-2563eb?style=for-the-badge)](https://cdn.ten.my.id)
[![CORS](https://img.shields.io/badge/CORS-Enabled%20(*)-10b981?style=for-the-badge)]()
[![HTTP/3](https://img.shields.io/badge/Protocol-HTTP%2F3%20%26%20Brotli-7c3aed?style=for-the-badge)]()

Infrastruktur Content Delivery Network (CDN) resmi untuk ekosistem **TEN-MY-ID**. Digunakan untuk hosting dan pengiriman aset statis (gambar, video, skrip JS, berkas CSS, font, dan berkas kode) dengan performa tinggi ke seluruh dunia melalui jaringan Cloudflare Edge.

---

## 🚀 Fitur Utama

- **Global Anycast Edge**: Didistribusikan langsung dari ratusan data center Cloudflare dengan latensi ultra-rendah.
- **Dukungan CORS Penuh**: Header `Access-Control-Allow-Origin: *` otomatis aktif pada semua aset, memungkinkan pemanggilan lintas domain tanpa hambatan security browser.
- **Portal Katalog Interaktif**: Mengunjungi `https://cdn.ten.my.id` membuka antarmuka modern untuk mencari aset, melihat preview, dan menyalin format URL (Direct, HTML, Markdown, CSS) dalam 1-klik.
- **Caching Cerdas**: Aturan cache adaptif (`stale-while-revalidate` untuk aset dinamis dan `immutable` 1 tahun untuk versi tetap `/v1/`).
- **Alur Kerja Git Terotomatisasi**: Cukup push file baru ke repositori GitHub ini, Cloudflare Pages akan langsung mempublikasikannya secara instan.

---

## 📁 Struktur Direktori

```text
cdn-ten-my-id/
├── public/                         # Direktori yang didistribusikan ke CDN
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
├── plan-master.md                  # Dokumen Master Plan Proyek
├── instruksi.md                    # Catatan instruksi awal
└── README.md                       # Dokumentasi repositori
```

---

## 💡 Contoh Penggunaan

### 1. Menggunakan CSS Inti TEN
```html
<link rel="stylesheet" href="https://cdn.ten.my.id/assets/css/ten-core.css">
```

### 2. Menggunakan JavaScript Utility TEN
```html
<script src="https://cdn.ten.my.id/assets/js/ten-utils.js"></script>
```

### 3. Menyematkan Logo TEN Resmi
```html
<!-- Light Background -->
<img src="https://cdn.ten.my.id/assets/brand/logo-ten.svg" alt="TEN" width="160">

<!-- Dark Background -->
<img src="https://cdn.ten.my.id/assets/brand/logo-ten-dark.svg" alt="TEN" width="160">
```

---

## 📋 SOP Menambahkan Aset Baru

1. **Simpan file pada folder yang sesuai** di dalam `public/assets/`.
2. **Gunakan format penamaan kebab-case** (huruf kecil semua dipisah tanda hubung):
   - Contoh benar: `banner-promo-2026.webp`, `icon-check.svg`.
   - Hindari spasi dan huruf kapital.
3. **Optimasi ukuran file** sebelum commit (gunakan format WebP untuk gambar, WOFF2 untuk font, dan minify file CSS/JS).
4. **Bila ingin ditampilkan di katalog portal**: Daftarkan file baru ke dalam array `assets` di file `public/portal/js/portal.js`.
5. **Commit dan Push ke GitHub**:
   ```bash
   git add .
   git commit -m "feat: tambah asset [nama-file]"
   git push origin main
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
