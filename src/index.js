/**
 * CDN TEN (cdn.ten.my.id) - Cloudflare Worker Entrypoint
 * Dedicated Personal Content Delivery Network
 * Powered by Cloudflare Workers & Cloudflare KV
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
  'Timing-Allow-Origin': '*'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Auth APIs
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (pathname === '/api/auth/me' && request.method === 'GET') {
      return handleAuthMe(request, env);
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      return handleLogout(request, env);
    }

    // 3. Asset Management APIs (Protected)
    if (pathname === '/api/assets') {
      const session = await getAuthenticatedSession(request, env);
      if (!session) {
        return jsonResponse({ success: false, error: 'Akses tidak sah. Silakan login terlebih dahulu.' }, 401);
      }
      if (request.method === 'GET') {
        return handleGetAssets(env);
      }
      if (request.method === 'POST') {
        return handleUploadAsset(request, env);
      }
    }

    if (pathname.startsWith('/api/assets/')) {
      const session = await getAuthenticatedSession(request, env);
      if (!session) {
        return jsonResponse({ success: false, error: 'Akses tidak sah. Silakan login terlebih dahulu.' }, 401);
      }
      const assetId = decodeURIComponent(pathname.replace('/api/assets/', '').trim());
      if (request.method === 'GET') {
        return handleGetAssetDetail(assetId, env);
      }
      if (request.method === 'PUT') {
        return handleUpdateAsset(assetId, request, env);
      }
      if (request.method === 'DELETE') {
        return handleDeleteAsset(assetId, env);
      }
    }

    // 4. UI Entry Points: /, /login, /admin
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    if (cleanPath === '' || cleanPath === 'login' || cleanPath === 'admin') {
      if (env.ASSETS) {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      }
      return new Response('CDN TEN UI', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // 5. CDN File Serving: cdn.ten.my.id/<random_slug> or cdn.ten.my.id/<custom_path>
    if (env.CDN_KV) {
      const cdnResponse = await handleServeCdnAsset(cleanPath, request, env);
      if (cdnResponse) {
        return cdnResponse;
      }
    }

    // 6. Static Portal Assets fallback (CSS, JS, favicon from ./public)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        const response = new Response(assetResponse.body, assetResponse);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
    }

    // 7. Not Found
    return new Response('404 - Aset tidak ditemukan di cdn.ten.my.id', {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};

/* =========================================================================
   Authentication Helpers & Handlers
   ========================================================================= */

async function getAuthenticatedSession(request, env) {
  // Check Authorization Bearer header
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // If not found in header, check cookie
  if (!token) {
    const cookieHeader = request.headers.get('Cookie') || '';
    const match = cookieHeader.match(/cdn_session=([^;]+)/);
    if (match) {
      token = match[1].trim();
    }
  }

  if (!token) return null;

  if (env.CDN_KV) {
    try {
      const sessionJson = await env.CDN_KV.get(`session:${token}`);
      if (sessionJson) {
        return { token, ...JSON.parse(sessionJson) };
      }
    } catch {}
  }

  return null;
}

async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    const expectedEmail = (env.ADMIN_EMAIL || 'admin@ten.my.id').trim().toLowerCase();
    const expectedPassword = (env.ADMIN_PASSWORD || 'password123').trim();

    if (email === expectedEmail && password === expectedPassword) {
      const token = crypto.randomUUID();
      const sessionData = {
        email,
        createdAt: new Date().toISOString()
      };

      if (env.CDN_KV) {
        // Save session valid for 30 days (2592000 seconds)
        await env.CDN_KV.put(`session:${token}`, JSON.stringify(sessionData), {
          expirationTtl: 2592000
        });
      }

      const headers = new Headers(CORS_HEADERS);
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.set('Set-Cookie', `cdn_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Login berhasil!',
        token,
        email
      }), { status: 200, headers });
    }

    return jsonResponse({
      success: false,
      error: 'Email atau password salah. Pastikan sesuai variabel di dashboard Cloudflare.'
    }, 401);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Format permintaan tidak valid: ' + err.message }, 400);
  }
}

async function handleAuthMe(request, env) {
  const session = await getAuthenticatedSession(request, env);
  if (session) {
    return jsonResponse({
      authenticated: true,
      email: session.email
    });
  }
  return jsonResponse({ authenticated: false });
}

async function handleLogout(request, env) {
  const session = await getAuthenticatedSession(request, env);
  if (session && env.CDN_KV) {
    try {
      await env.CDN_KV.delete(`session:${session.token}`);
    } catch {}
  }

  const headers = new Headers(CORS_HEADERS);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Set-Cookie', 'cdn_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

  return new Response(JSON.stringify({ success: true, message: 'Berhasil logout.' }), { headers });
}

/* =========================================================================
   Asset Management Handlers
   ========================================================================= */

async function handleGetAssets(env) {
  if (!env.CDN_KV) {
    return jsonResponse({ success: false, error: 'Cloudflare KV (CDN_KV) belum terhubung.' }, 500);
  }

  try {
    const listResult = await env.CDN_KV.list({ prefix: 'asset:meta:' });
    const assets = [];

    for (const key of listResult.keys) {
      const metaJson = await env.CDN_KV.get(key.name);
      if (metaJson) {
        try {
          assets.push(JSON.parse(metaJson));
        } catch {}
      }
    }

    // Urutkan dari yang terbaru
    assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return jsonResponse({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal mengambil aset: ' + err.message }, 500);
  }
}

async function handleGetAssetDetail(assetId, env) {
  if (!env.CDN_KV) return jsonResponse({ success: false, error: 'KV belum terhubung.' }, 500);

  const metaJson = await env.CDN_KV.get(`asset:meta:${assetId}`);
  if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

  return jsonResponse({ success: true, data: JSON.parse(metaJson) });
}

async function handleUploadAsset(request, env) {
  if (!env.CDN_KV) {
    return jsonResponse({ success: false, error: 'Cloudflare KV (CDN_KV) belum terhubung.' }, 500);
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let payload = {};
    let fileBuffer = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      payload.name = (formData.get('name') || '').trim();
      payload.category = (formData.get('category') || 'Lainnya').trim();
      payload.customPath = (formData.get('customPath') || '').trim();
      payload.randomSlug = (formData.get('randomSlug') || '').trim();

      const file = formData.get('file');
      if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
        payload.fileName = file.name;
        payload.mimeType = file.type || getMimeTypeByExt(file.name);
        fileBuffer = await file.arrayBuffer();
        payload.sizeBytes = fileBuffer.byteLength;
      } else {
        const textContent = formData.get('content') || '';
        fileBuffer = new TextEncoder().encode(textContent).buffer;
        payload.sizeBytes = fileBuffer.byteLength;
        payload.mimeType = formData.get('mimeType') || 'text/plain; charset=utf-8';
      }
    } else if (contentType.includes('application/json')) {
      payload = await request.json();
      const content = payload.content || '';
      fileBuffer = new TextEncoder().encode(content).buffer;
      payload.sizeBytes = fileBuffer.byteLength;
      payload.mimeType = payload.mimeType || 'text/plain; charset=utf-8';
    } else {
      return jsonResponse({ success: false, error: 'Format permintaan tidak didukung.' }, 400);
    }

    if (!payload.name) {
      payload.name = payload.fileName || 'Untitled Asset';
    }

    // 1. Generate unique random slug (6-8 karakter acak)
    let randomSlug = payload.randomSlug ? sanitizeSlug(payload.randomSlug) : '';
    if (!randomSlug) {
      randomSlug = await generateUniqueSlug(env);
    } else {
      // Verifikasi apakah slug acak sudah terpakai
      const existing = await env.CDN_KV.get(`slug:${randomSlug}`);
      if (existing) {
        return jsonResponse({ success: false, error: `Karakter acak '${randomSlug}' sudah digunakan. Silakan generate ulang.` }, 409);
      }
    }

    // 2. Validasi custom path (opsional)
    let cleanCustomPath = '';
    if (payload.customPath) {
      cleanCustomPath = sanitizeCustomPath(payload.customPath);
      if (cleanCustomPath === randomSlug) {
        cleanCustomPath = ''; // Hindari duplikasi jika sama dengan random slug
      } else {
        const existingCustom = await env.CDN_KV.get(`slug:${cleanCustomPath}`);
        if (existingCustom) {
          return jsonResponse({ success: false, error: `Custom path '${cleanCustomPath}' sudah terpakai oleh aset lain.` }, 409);
        }
      }
    }

    // Tentukan ekstensi file
    const ext = getExtension(payload.fileName || cleanCustomPath || payload.name || '');
    const assetId = `asset_${randomSlug}`;

    const metadata = {
      id: assetId,
      name: payload.name,
      category: payload.category || 'Lainnya',
      randomSlug,
      customPath: cleanCustomPath,
      fileName: payload.fileName || (cleanCustomPath ? cleanCustomPath.split('/').pop() : `${randomSlug}${ext ? '.' + ext : ''}`),
      extension: ext,
      mimeType: payload.mimeType || getMimeTypeByExt(ext),
      sizeBytes: payload.sizeBytes || 0,
      sizeFormatted: formatBytes(payload.sizeBytes || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simpan file content sebagai binary ArrayBuffer langsung ke KV
    await env.CDN_KV.put(`asset:file:${assetId}`, fileBuffer);

    // Simpan metadata JSON ke KV
    await env.CDN_KV.put(`asset:meta:${assetId}`, JSON.stringify(metadata));

    // Simpan routing index
    await env.CDN_KV.put(`slug:${randomSlug}`, assetId);
    if (ext) {
      await env.CDN_KV.put(`slug:${randomSlug}.${ext}`, assetId);
    }
    if (cleanCustomPath) {
      await env.CDN_KV.put(`slug:${cleanCustomPath}`, assetId);
    }

    return jsonResponse({
      success: true,
      message: 'Aset berhasil diunggah ke CDN!',
      data: metadata
    }, 201);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal mengunggah aset: ' + err.message }, 500);
  }
}

async function handleUpdateAsset(assetId, request, env) {
  if (!env.CDN_KV) return jsonResponse({ success: false, error: 'KV belum terhubung.' }, 500);

  try {
    const metaJson = await env.CDN_KV.get(`asset:meta:${assetId}`);
    if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

    const meta = JSON.parse(metaJson);
    const body = await request.json();

    const newName = (body.name || meta.name).trim();
    const newCategory = (body.category || meta.category).trim();
    const newCustomPath = body.customPath !== undefined ? sanitizeCustomPath(body.customPath) : meta.customPath;

    // Jika custom path berubah
    if (newCustomPath !== meta.customPath) {
      if (newCustomPath) {
        // Cek collision
        const existing = await env.CDN_KV.get(`slug:${newCustomPath}`);
        if (existing && existing !== assetId) {
          return jsonResponse({ success: false, error: `Custom path '${newCustomPath}' sudah digunakan aset lain.` }, 409);
        }
        await env.CDN_KV.put(`slug:${newCustomPath}`, assetId);
      }
      // Hapus mapping custom path lama
      if (meta.customPath) {
        await env.CDN_KV.delete(`slug:${meta.customPath}`);
      }
    }

    meta.name = newName;
    meta.category = newCategory;
    meta.customPath = newCustomPath;
    meta.updatedAt = new Date().toISOString();

    await env.CDN_KV.put(`asset:meta:${assetId}`, JSON.stringify(meta));

    return jsonResponse({
      success: true,
      message: 'Aset berhasil diperbarui.',
      data: meta
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal memperbarui aset: ' + err.message }, 500);
  }
}

async function handleDeleteAsset(assetId, env) {
  if (!env.CDN_KV) return jsonResponse({ success: false, error: 'KV belum terhubung.' }, 500);

  try {
    const metaJson = await env.CDN_KV.get(`asset:meta:${assetId}`);
    if (metaJson) {
      const meta = JSON.parse(metaJson);
      // Hapus routing slug acak
      if (meta.randomSlug) {
        await env.CDN_KV.delete(`slug:${meta.randomSlug}`);
        if (meta.extension) {
          await env.CDN_KV.delete(`slug:${meta.randomSlug}.${meta.extension}`);
        }
      }
      // Hapus routing custom path
      if (meta.customPath) {
        await env.CDN_KV.delete(`slug:${meta.customPath}`);
      }
    }

    // Hapus file content dan metadata
    await env.CDN_KV.delete(`asset:file:${assetId}`);
    await env.CDN_KV.delete(`asset:meta:${assetId}`);

    return jsonResponse({
      success: true,
      message: 'Aset berhasil dihapus dari CDN.'
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal menghapus aset: ' + err.message }, 500);
  }
}

/* =========================================================================
   CDN Asset Serving Engine
   ========================================================================= */

async function handleServeCdnAsset(cleanPath, request, env) {
  try {
    const assetId = await env.CDN_KV.get(`slug:${cleanPath}`);
    if (!assetId) return null;

    // Ambil metadata & file buffer
    const [metaJson, fileBuffer] = await Promise.all([
      env.CDN_KV.get(`asset:meta:${assetId}`),
      env.CDN_KV.get(`asset:file:${assetId}`, { type: 'arrayBuffer' })
    ]);

    if (!fileBuffer) return null;

    let mimeType = 'application/octet-stream';
    let filename = cleanPath.split('/').pop() || 'file';

    if (metaJson) {
      try {
        const meta = JSON.parse(metaJson);
        mimeType = meta.mimeType || mimeType;
        filename = meta.fileName || filename;
      } catch {}
    }

    const totalBytes = fileBuffer.byteLength;
    const etag = `"${assetId}-${totalBytes}"`;

    // Cek cache validation (If-None-Match)
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    // Range Request Support (video & media streaming)
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace('bytes=', '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalBytes - 1;

      if (!isNaN(start) && start < totalBytes) {
        const chunkEnd = Math.min(end, totalBytes - 1);
        const chunkSize = (chunkEnd - start) + 1;
        const chunk = fileBuffer.slice(start, chunkEnd + 1);

        return new Response(chunk, {
          status: 206,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': mimeType,
            'Content-Range': `bytes ${start}-${chunkEnd}/${totalBytes}`,
            'Content-Length': chunkSize.toString(),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': etag,
            'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
          }
        });
      }
    }

    // Standard Response
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': mimeType,
        'Content-Length': totalBytes.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
      }
    });

  } catch (err) {
    console.error('Error serving CDN asset:', err);
    return null;
  }
}

/* =========================================================================
   Utility Helpers
   ========================================================================= */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function generateUniqueSlug(env, length = 7) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Hilangkan huruf/angka ambigu seperti l, 1, 0, o
  for (let attempt = 0; attempt < 10; attempt++) {
    let slug = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      slug += chars[bytes[i] % chars.length];
    }
    // Pastikan tidak ada collision di KV
    const exists = await env.CDN_KV.get(`slug:${slug}`);
    if (!exists) {
      return slug;
    }
  }
  // Fallback timestamp hex jika looping collision
  return Date.now().toString(36).slice(-length);
}

function sanitizeSlug(slug) {
  return (slug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 32);
}

function sanitizeCustomPath(path) {
  return (path || '')
    .trim()
    .replace(/^\/+|\/+$/g, '') // Hapus leading dan trailing slash
    .replace(/\/+/g, '/')      // Hapus double slash
    .replace(/[^a-zA-Z0-9\-_.//]/g, '');
}

function getExtension(filename) {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop().toLowerCase();
  }
  return '';
}

function getMimeTypeByExt(extOrFile) {
  const ext = extOrFile.includes('.') ? getExtension(extOrFile) : extOrFile.toLowerCase();
  const map = {
    // Gambar
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'avif': 'image/avif',
    // Video & Audio
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    // Code & Styles
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'html': 'text/html; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'txt': 'text/plain; charset=utf-8',
    // Fonts
    'woff2': 'font/woff2',
    'woff': 'font/woff',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    // Dokumen & Archive
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'gz': 'application/gzip',
    'tar': 'application/x-tar'
  };
  return map[ext] || 'application/octet-stream';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
