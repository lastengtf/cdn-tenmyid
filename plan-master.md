# MASTER PLAN: PENGEMBANGAN PLATFORM CDN TEN (`cdn.ten.my.id`)

Dokumen ini merupakan panduan strategis dan teknis menyeluruh (Master Plan) untuk pembangunan platform **CDN TEN** yang beralamat di **`cdn.ten.my.id`**. Platform ini berfungsi sebagai infrastruktur penyedia hosting aset digital (gambar, video, kode script JS, stylesheet CSS, font, dokumen publik, dll.) yang terintegrasi dengan GitHub dan dideploy melalui Cloudflare.

---

## 1. Ringkasan Eksekutif & Tujuan

| Parameter | Keterangan |
| :--- | :--- |
| **Nama Platform** | CDN TEN |
| **Domain Utama** | `cdn.ten.my.id` |
| **Fungsi Utama** | Content Delivery Network (CDN) untuk hosting aset statis & media publik |
| **Jenis Aset** | Gambar (SVG, WebP, PNG, JPG), Video/Audio, Stylesheet (CSS), Script (JS), Web Fonts (WOFF2), Dokumen publik |
| **Target Pengguna** | Ekosistem internal web TEN-MY-ID, aplikasi web mitra, serta publik |
| **Platform Hosting** | Cloudflare Pages / Cloudflare Edge Network |
| **Version Control & CI/CD** | GitHub: `https://github.com/lastengtf/cdn-tenmyid` -> Auto-deploy via Cloudflare Pages |

---

## 6. Roadmap & Tahapan Implementasi

Rencana implementasi dibagi menjadi 6 tahap terstruktur:

### Tahap 1: Persiapan & Master Plan
- [x] Analisis kebutuhan dari `instruksi.md`.
- [x] Pembuatan dokumen panduan teknis `plan-master.md`.
- [x] Penentuan repositori tujuan: `https://github.com/lastengtf/cdn-tenmyid`.

### Tahap 2: Pembentukan Struktur Fondasi & File Konfigurasi
- [x] Membuat direktori `public/` dengan subfolder `assets/`, `portal/`, `v1/`.
- [x] Membuat file konfigurasi Cloudflare: `public/_headers` dan `public/_redirects`.
- [x] Menyiapkan `.gitignore` dan `README.md` komprehensif.

### Tahap 3: Pembuatan Antarmuka Portal CDN (`public/index.html` dkk.)
- [x] Menyusun struktur semantik HTML di `public/index.html`.
- [x] Mendesain gaya visual premium di `public/portal/css/portal.css` (tema gelap modern, palet warna elegan, responsif mobile/desktop).
- [x] Mengembangkan script interaktif di `public/portal/js/portal.js` (search filter, copy snippet modal, preview drawer).

### Tahap 4: Inisiasi Aset Sampel & Library Dasar
- [x] Menambahkan aset logo/branding TEN resmi (format SVG/PNG).
- [x] Menambahkan berkas CSS dasar `ten-core.css` untuk utilitas umum.
- [x] Menambahkan berkas JavaScript utilitas `ten-utils.js`.
- [x] Menyiapkan direktori aset gambar, font, dan media dengan file `.gitkeep`.

### Tahap 5: Verifikasi Lokal & Uji Fungsionalitas
- [x] Memeriksa validitas kode HTML, CSS, dan JS.
- [x] Memastikan fitur copy snippet menghasilkan URL yang tepat sesuai format `cdn.ten.my.id`.

### Tahap 6: Deployment ke GitHub & Konfigurasi Cloudflare
- [ ] Inisialisasi Git dan commit seluruh file proyek.
- [ ] Menghubungkan remote repository `https://github.com/lastengtf/cdn-tenmyid`.
- [ ] Push ke branch `main` GitHub repository.
- [ ] Hubungkan repositori ke **Cloudflare Pages** (Build output: `public`).
- [ ] Pasang custom domain `cdn.ten.my.id`.

---

## 7. Standar Operasional Prosedur (SOP) Penambahan Aset Baru

Untuk memastikan repositori tetap bersih dan rapi di masa mendatang, seluruh aset baru wajib mengikuti aturan berikut:

1. **Konvensi Penamaan File**:
   - Selalu gunakan huruf kecil (*lowercase*) dan tanda hubung (*kebab-case*).
   - Contoh yang benar: `banner-hero-2026.webp`, `logo-ten-white.svg`, `button-styles.css`.
   - Hindari spasi, simbol aneh, dan huruf kapital.
2. **Format & Optimasi File**:
   - **Gambar**: Utamakan format WebP atau SVG vektor. Kompresi gambar raster sebelum di-push (target ukuran < 300 KB untuk gambar umum).
   - **Video**: Utamakan format MP4/WebM terkompresi H.264/AV1. Untuk video berukuran > 25MB, disarankan menggunakan Cloudflare Stream atau Cloudflare R2 terpisah.
   - **Font**: Gunakan format WOFF2 (lebih hemat bandwidth dibanding TTF/OTF).
3. **Versioning Aset Krusial**:
   - Bila melakukan update besar pada file script atau CSS yang sudah digunakan di banyak website, buat file baru dengan nomor versi (misal: `ten-core-v2.css` atau letakkan di `v1/css/`) untuk mencegah efek samping *breaking changes* di situs pengguna.

---

## 8. Kesimpulan & Langkah Selanjutnya

Master Plan ini siap dieksekusi secara bertahap mulai dari **Tahap 2** (pembuatan struktur file & konfigurasi Cloudflare) hingga **Tahap 4** (UI Portal & Aset Awal). Setelah seluruh berkas siap, sistem dapat langsung di-push ke GitHub dan dideploy ke Cloudflare untuk domain `cdn.ten.my.id`.
