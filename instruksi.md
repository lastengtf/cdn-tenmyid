aku membuatuhkan sebuah platform yang untukku menyimpan resource conten seperti gambar, video, file, script, css, dll.

aku ingin menggunakan domain cdn.ten.my.id dan menggunakan github untuk menyimpan kode olatformnya dan akan menggunakan cloudflare untukmendeploykannya. untuk database aku ingin menggunakan KV dari cloudflare. 

aku ingin ui ux nya sederhana saja tanpa tampahan yang tidak perlu, jadi hanya fokus pada fungsinya saja. tidak perlu banyak deskrisptif yang ngak perlu.

platform ini diperuntukkan untuk kebutuhan digital personal pribadiku.

saat di akses akan membuka halaman login dan saat berhasil akan masuk ke halaman admin untuk mengelola paltfrom cdn ini.

nah setiap asset didaftarkan atau di hosting di paltform cdn ini akan menggunakan domain cdn.ten.my.id/ dengan karakterter acak dibelakangnya dan tidak boleh sama untuk setiap asset. kemudian bisa ditambahkan custom pathnya biar bisa sesuai kebutuhan. dan bisa ditambahkan kategorinya supaya rapi.

push ke github https://github.com/lastengtf/cdn-tenmyid

dan KV nya
"binding": "CDN_KV",
"id": "dce4b6259909484888bf22eb63dcf826"


untuk mengakses platformnya perlu login dengan email dan password. nah email dan password harus sesuai yang ada di variabel di dashboard claoudflare.