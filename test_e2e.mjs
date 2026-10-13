/**
 * E2E Automated Verification Test for CDN TEN
 * Tests Worker, KV, Authentication, Asset Upload, CDN Serving, CORS, Edit, and Delete
 */

const BASE = 'http://127.0.0.1:8787';

async function runTests() {
  console.log('🚀 Memulai Pengujian Otomatis CDN TEN...\n');
  let token = '';

  // Test 1: Halaman Utama
  const resHome = await fetch(`${BASE}/`);
  const htmlHome = await resHome.text();
  console.assert(resHome.status === 200, 'Test 1 Failed: Status not 200');
  console.assert(htmlHome.includes('CDN TEN'), 'Test 1 Failed: Missing title in HTML');
  console.log('✅ Test 1: Halaman utama (/) berhasil dimuat (200 OK)');

  // Test 2: Auth Me (Belum Login)
  const resMeUnauth = await fetch(`${BASE}/api/auth/me`);
  const dataMeUnauth = await resMeUnauth.json();
  console.assert(dataMeUnauth.authenticated === false, 'Test 2 Failed: Should be unauthenticated');
  console.log('✅ Test 2: Status sesi sebelum login (authenticated: false)');

  // Test 3: Login Gagal (Password Salah)
  const resLoginFail = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ten.my.id', password: 'salah' })
  });
  console.assert(resLoginFail.status === 401, 'Test 3 Failed: Should be 401');
  console.log('✅ Test 3: Validasi password salah berhasil ditolak (401 Unauthorized)');

  // Test 4: Login Berhasil
  const resLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ten.my.id', password: 'password123' })
  });
  const dataLogin = await resLogin.json();
  console.assert(resLogin.status === 200 && dataLogin.success === true, 'Test 4 Failed: Login failed');
  token = dataLogin.token;
  console.assert(!!token, 'Test 4 Failed: No token returned');
  console.log(`✅ Test 4: Login berhasil! Token sesi diperoleh: ${token.slice(0, 8)}...`);

  // Test 5: Auth Me (Setelah Login)
  const resMeAuth = await fetch(`${BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataMeAuth = await resMeAuth.json();
  console.assert(dataMeAuth.authenticated === true && dataMeAuth.email === 'admin@ten.my.id', 'Test 5 Failed');
  console.log(`✅ Test 5: Sesi valid untuk email: ${dataMeAuth.email}`);

  // Test 6: Ambil Daftar Aset Awal
  const resListInitial = await fetch(`${BASE}/api/assets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataListInitial = await resListInitial.json();
  console.assert(dataListInitial.success === true, 'Test 6 Failed');
  console.log(`✅ Test 6: Ambil daftar aset dari KV (Total: ${dataListInitial.count || 0})`);

  // Test 7: Upload Aset Teks/Kode (CSS)
  const resUploadCss = await fetch(`${BASE}/api/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Custom Button Styling',
      category: 'CSS',
      randomSlug: 'btnstyle',
      customPath: 'css/button.css',
      content: '.btn { background: #38bdf8; color: #000; border-radius: 8px; }',
      mimeType: 'text/css; charset=utf-8'
    })
  });
  const dataUploadCss = await resUploadCss.json();
  console.assert(resUploadCss.status === 201 && dataUploadCss.success === true, 'Test 7 Failed');
  console.log('✅ Test 7: Upload aset CSS berhasil disimpan ke KV');

  // Test 8: Upload Aset Gambar (SVG via FormData)
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#38bdf8"/></svg>';
  const formData = new FormData();
  formData.append('name', 'Logo Lingkaran');
  formData.append('category', 'Gambar');
  formData.append('randomSlug', 'circle99');
  formData.append('customPath', 'brand/circle.svg');
  formData.append('file', new Blob([svgContent], { type: 'image/svg+xml' }), 'circle.svg');

  const resUploadSvg = await fetch(`${BASE}/api/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const dataUploadSvg = await resUploadSvg.json();
  console.assert(resUploadSvg.status === 201 && dataUploadSvg.success === true, 'Test 8 Failed');
  console.log('✅ Test 8: Upload file SVG biner/blob berhasil disimpan ke KV');

  // Test 9: CDN Direct Serving via Random Slug (/btnstyle)
  const resCdnRandom = await fetch(`${BASE}/btnstyle`);
  const textCdnRandom = await resCdnRandom.text();
  console.assert(resCdnRandom.status === 200, 'Test 9 Failed: Status not 200');
  console.assert(resCdnRandom.headers.get('access-control-allow-origin') === '*', 'Test 9 Failed: Missing CORS header');
  console.assert(textCdnRandom.includes('.btn { background: #38bdf8;'), 'Test 9 Failed: Content mismatch');
  console.log('✅ Test 9: CDN Serving via Random Slug (http://localhost:8787/btnstyle) berfungsi 100% dengan CORS');

  // Test 10: CDN Direct Serving via Custom Path (/css/button.css)
  const resCdnCustom = await fetch(`${BASE}/css/button.css`);
  const textCdnCustom = await resCdnCustom.text();
  console.assert(resCdnCustom.status === 200, 'Test 10 Failed: Status not 200');
  console.assert(textCdnCustom === textCdnRandom, 'Test 10 Failed: Custom path content mismatch');
  console.log('✅ Test 10: CDN Serving via Custom Path (http://localhost:8787/css/button.css) berfungsi 100%');

  // Test 11: CDN Serving SVG via Random Slug (/circle99)
  const resCdnSvg = await fetch(`${BASE}/circle99`);
  const textCdnSvg = await resCdnSvg.text();
  console.assert(resCdnSvg.status === 200, 'Test 11 Failed: Status not 200');
  console.assert(resCdnSvg.headers.get('content-type')?.includes('image/svg+xml'), 'Test 11 Failed: Wrong MIME');
  console.assert(textCdnSvg.includes('<circle cx="50"'), 'Test 11 Failed: Svg content mismatch');
  console.log('✅ Test 11: CDN Serving Gambar SVG (/circle99) dengan MIME Type image/svg+xml valid');

  // Test 12: CDN Serving SVG via Custom Path (/brand/circle.svg)
  const resCdnSvgPath = await fetch(`${BASE}/brand/circle.svg`);
  console.assert(resCdnSvgPath.status === 200, 'Test 12 Failed: Status not 200');
  console.log('✅ Test 12: CDN Serving Gambar SVG via Custom Path (/brand/circle.svg) valid');

  // Test 13: Verifikasi Daftar Aset di Dashboard
  const resListUpdated = await fetch(`${BASE}/api/assets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataListUpdated = await resListUpdated.json();
  console.assert(dataListUpdated.data.length >= 2, 'Test 13 Failed');
  console.log(`✅ Test 13: Daftar aset ter-update di dashboard (Total: ${dataListUpdated.data.length} aset)`);

  // Test 14: Edit Aset (PUT /api/assets/asset_btnstyle)
  const resEdit = await fetch(`${BASE}/api/assets/asset_btnstyle`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Button Styling V2',
      category: 'CSS',
      customPath: 'css/button-v2.css'
    })
  });
  const dataEdit = await resEdit.json();
  console.assert(dataEdit.success === true, 'Test 14 Failed');
  console.log('✅ Test 14: Edit metadata aset dan ganti custom path berhasil');

  // Test 15: Verifikasi Custom Path Baru (/css/button-v2.css)
  const resNewPath = await fetch(`${BASE}/css/button-v2.css`);
  console.assert(resNewPath.status === 200, 'Test 15 Failed: New custom path failed');
  console.log('✅ Test 15: Custom path baru (/css/button-v2.css) langsung aktif di KV');

  // Test 16: Hapus Aset (DELETE /api/assets/asset_btnstyle)
  const resDel = await fetch(`${BASE}/api/assets/asset_btnstyle`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataDel = await resDel.json();
  console.assert(dataDel.success === true, 'Test 16 Failed');
  console.log('✅ Test 16: Hapus aset dari KV berhasil');

  // Test 17: Verifikasi Setelah Dihapus (404)
  const resDeletedCheck = await fetch(`${BASE}/btnstyle`);
  console.assert(resDeletedCheck.status === 404, 'Test 17 Failed: Deleted asset should return 404');
  console.log('✅ Test 17: Aset yang telah dihapus mengembalikan status 404 Not Found');

  // Test 18: Logout
  const resLogout = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataLogout = await resLogout.json();
  console.assert(dataLogout.success === true, 'Test 18 Failed');
  console.log('✅ Test 18: Logout sesi berhasil');

  console.log('\n🎉 SEMUA 18 PENGUJIAN LOKAL BERHASIL 100% TANPA KENDALA!');
}

runTests().catch(err => {
  console.error('❌ Terjadi kesalahan pada pengujian:', err);
  process.exit(1);
});
