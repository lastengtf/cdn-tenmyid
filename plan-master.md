# MASTER PLAN: PENGEMBANGAN PLATFORM CDN TEN (`cdn.ten.my.id`)

Dokumen ini merupakan panduan strategis dan teknis menyeluruh (Master Plan) untuk platform **CDN TEN** pada domain **`cdn.ten.my.id`**. Platform ini berfungsi sebagai infrastruktur penyedia hosting dan penyimpanan aset digital (gambar, video, script JS, stylesheet CSS, font, dokumen pribadi, dll.) yang terintegrasi dengan GitHub dan dideploy melalui Cloudflare.

---

## 1. Ringkasan Eksekutif & Tujuan

| Parameter | Keterangan |
| :--- | :--- |
| **Nama Platform** | CDN TEN |
| **Domain Utama** | `cdn.ten.my.id` |
| **Fungsi Utama** | Personal Content Delivery Network (CDN) & Asset Hosting |
| **Jenis Aset** | Gambar (PNG, JPG, WebP, SVG), Video (MP4, WebM), Script (JS), CSS, Font, Dokumen (PDF, ZIP, dll.) |
| **Target Pengguna** | Personal / Digital Pribadi |
| **Platform Hosting** | Cloudflare Workers with Static Assets (`main = "src/index.js"`) |
| **Database** | Cloudflare Workers KV (`CDN_KV`, ID: `dce4b6259909484888bf22eb63dcf826`) |
| **Autentikasi** | Login Email & Password sesuai environment variables Cloudflare (`ADMIN_EMAIL` & `ADMIN_PASSWORD`) |
| **Pola URL Aset** | URL Acak Unik (`cdn.ten.my.id/<random_slug>`) & Opsional Custom Path (`cdn.ten.my.id/<custom_path>`) |
| **Version Control** | GitHub: `https://github.com/lastengtf/cdn-tenmyid` |

---

## 2. Arsitektur Cloudflare KV Database & Routing

### 2.1. Skema Penyimpanan KV (Key-Value Schema):
1. **Metadata Aset (`asset:meta:<id>`)**:
   - Format: JSON Object
   - Field: `id`, `name`, `category`, `randomSlug`, `customPath`, `fileName`, `extension`, `mimeType`, `sizeBytes`, `sizeFormatted`, `createdAt`, `updatedAt`
2. **Konten Berkas (`asset:file:<id>`)**:
   - Menyimpan binary buffer (ArrayBuffer) atau konten teks berkas secara langsung di Cloudflare KV.
3. **Routing Karakter Acak (`slug:<random_slug>`)**:
   - Menghubungkan path acak unik (misal: `x8k2zp`) langsung ke ID aset di KV.
   - Juga dipetakan ke `slug:<random_slug>.<ext>` untuk fleksibilitas pemanggilan.
4. **Routing Custom Path (`slug:<custom_path>`)**:
   - Menghubungkan path kustom yang ditentukan pengguna (misal: `brand/logo.svg` atau `css/main.css`) ke ID aset di KV.
5. **Sesi Pengguna (`session:<token>`)**:
   - Menyimpan token autentikasi sesi pengelola setelah login berhasil.

### 2.2. Endpoint Serverless Worker (`src/index.js`):
- **`POST /api/auth/login`**: Memverifikasi email & password terhadap environment variables Cloudflare.
- **`GET /api/auth/me`**: Memeriksa status sesi aktif.
- **`POST /api/auth/logout`**: Mengakhiri sesi login.
- **`GET /api/assets`**: Mengambil daftar seluruh aset dari KV untuk dashboard admin.
- **`POST /api/assets`**: Mengunggah berkas baru atau kode langsung ke KV (otomatis membuat random slug unik).
- **`GET /api/assets/:id`**: Mengambil detail metadata 1 aset.
- **`PUT /api/assets/:id`**: Memperbarui nama, kategori, atau custom path aset di KV.
- **`DELETE /api/assets/:id`**: Menghapus file dan seluruh routing slug dari KV.
- **`GET /:slug`**: Menyajikan berkas mentah langsung dari KV dengan header `Content-Type`, `Access-Control-Allow-Origin: *`, `Cache-Control`, dan HTTP Range Requests.

---

## 3. Status Milestone Implementasi

- [x] **Analisis Persyaratan**: Mempelajari `instruksi.md` (Domain `cdn.ten.my.id`, binding KV `dce4b6259909484888bf22eb63dcf826`, login email & password, slug acak & custom path, UI sederhana).
- [x] **Konfigurasi Cloudflare & KV**: Update `wrangler.toml` dengan binding `CDN_KV` ID asli dan variabel autentikasi.
- [x] **Backend Cloudflare Worker (`src/index.js`)**: Implementasi engine CDN, autentikasi session, manajemen aset, dan serving file KV dengan CORS & streaming.
- [x] **Frontend Portal Minimalis (`public/index.html`, `portal.css`, `portal.js`)**: Antarmuka login dan dashboard admin responsif tanpa dekorasi berlebih, fokus pada fungsionalitas.
- [x] **Fitur Salin & Integrasi**: 1-klik copy URL acak, copy custom path, dan copy HTML embed tags (`<img>`, `<script>`, `<link>`, `<video>`).
- [x] **Dokumentasi & Git Sync**: Sinkronisasi seluruh perubahan ke GitHub `https://github.com/lastengtf/cdn-tenmyid`.
