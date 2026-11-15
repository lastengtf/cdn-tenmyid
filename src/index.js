/**
 * CDN TEN (cdn.ten.my.id) - Cloudflare Worker Entrypoint
 * Dedicated Personal Content Delivery Network
 * Powered by Cloudflare Workers & Cloudflare KV with Local Fallback
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
  'Timing-Allow-Origin': '*'
};

// In-memory store fallback for ultra-fast local dev and offline reliability
const memoryKV = new Map();

const kvStore = {
  async get(env, key, options = {}) {
    if (env && env.CDN_KV) {
      try {
        const val = await env.CDN_KV.get(key, options);
        if (val !== null && val !== undefined) return val;
      } catch (err) {
        // Fallback to local memory if local miniflare proxy drops
      }
    }
    return memoryKV.get(key) || null;
  },

  async put(env, key, value, options = {}) {
    memoryKV.set(key, value);
    if (env && env.CDN_KV) {
      try {
        await env.CDN_KV.put(key, value, options);
      } catch (err) {
        // Handled by memoryKV
      }
    }
  },

  async delete(env, key) {
    memoryKV.delete(key);
    if (env && env.CDN_KV) {
      try {
        await env.CDN_KV.delete(key);
      } catch (err) {
        // Handled by memoryKV
      }
    }
  },

  async list(env, options = {}) {
    const keysMap = new Map();
    const prefix = options.prefix || '';

    if (env && env.CDN_KV) {
      try {
        const res = await env.CDN_KV.list(options);
        if (res && res.keys) {
          for (const k of res.keys) {
            keysMap.set(k.name, k);
          }
        }
      } catch (err) {}
    }

    for (const k of memoryKV.keys()) {
      if (k.startsWith(prefix) && !keysMap.has(k)) {
        keysMap.set(k, { name: k });
      }
    }

    return { keys: Array.from(keysMap.values()) };
  }
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
      const subPath = pathname.replace('/api/assets/', '').trim();
      const parts = subPath.split('/');
      const assetId = decodeURIComponent(parts[0] || '');
      const action = parts[1] || '';

      if (action === 'compress') {
        if (request.method === 'POST' || request.method === 'PUT') {
          return handleUploadCompressedVariant(assetId, request, env);
        }
        if (request.method === 'DELETE') {
          return handleDeleteCompressedVariant(assetId, request, env);
        }
      }

      if (action === 'quality' && request.method === 'PUT') {
        return handleSwitchAssetQuality(assetId, request, env);
      }

      if (!action) {
        if (request.method === 'GET') {
          return handleGetAssetDetail(assetId, env);
        }
        if (request.method === 'PUT') {
          return handleUpdateAsset(assetId, request, env);
        }
        if (request.method === 'DELETE') {
          return handleDeleteAsset(assetId, request, env);
        }
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

    // 5. Static Portal Assets (/portal/*, /favicon.svg, /assets/*)
    if (pathname.startsWith('/portal/') || pathname === '/favicon.svg' || pathname.startsWith('/assets/')) {
      if (env.ASSETS) {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status !== 404) {
          return assetRes;
        }
      }
    }

    // 6. CDN File Serving: cdn.ten.my.id/<random_slug> or cdn.ten.my.id/<custom_path>
    const cdnResponse = await handleServeCdnAsset(cleanPath, request, env);
    if (cdnResponse) {
      return cdnResponse;
    }

    // 7. Fallback to ASSETS if any
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
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
  const cookieHeader = request.headers.get('Cookie') || '';

  // 1. Cek Cookie SSO TEN (ten_user / ten_sso dari login.ten.my.id)
  const tenUserMatch = cookieHeader.match(/(?:^|;\s*)ten_user=([^;]+)/);
  if (tenUserMatch) {
    try {
      let b = decodeURIComponent(tenUserMatch[1]).replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      const user = JSON.parse(atob(b));
      if (user && (user.id || user.username || user.email)) {
        return {
          token: 'ten_sso',
          email: user.email || user.username || 'admin@ten.my.id',
          name: user.name || user.username,
          user,
          isSso: true
        };
      }
    } catch {}
  }

  // 2. Cek Authorization Header (Bearer token)
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 3. Cek Cookie sesi lokal cdn_session
  if (!token) {
    const match = cookieHeader.match(/(?:^|;\s*)cdn_session=([^;]+)/);
    if (match) {
      token = match[1].trim();
    }
  }

  if (!token) return null;

  try {
    const sessionJson = await kvStore.get(env, `session:${token}`);
    if (sessionJson) {
      return { token, ...(typeof sessionJson === 'string' ? JSON.parse(sessionJson) : sessionJson) };
    }
  } catch {}

  return null;
}

async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    // Kredensial dibaca dari Cloudflare Dashboard (Variables and Secrets)
    const expectedEmail = (env.ADMIN_EMAIL || env.admin_email || env.EMAIL || env.email || 'admin@ten.my.id').trim().toLowerCase();
    const expectedPassword = (env.ADMIN_PASSWORD || env.admin_password || env.PASSWORD || env.password || 'password123').trim();

    if (email === expectedEmail && password === expectedPassword) {
      const token = crypto.randomUUID();
      const sessionData = {
        email,
        createdAt: new Date().toISOString()
      };

      await kvStore.put(env, `session:${token}`, JSON.stringify(sessionData), {
        expirationTtl: 2592000
      });

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
      email: session.email,
      name: session.name || session.email,
      user: session.user || { email: session.email }
    });
  }
  return jsonResponse({ authenticated: false });
}

async function handleLogout(request, env) {
  const session = await getAuthenticatedSession(request, env);
  if (session && !session.isSso) {
    await kvStore.delete(env, `session:${session.token}`);
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
  try {
    const listResult = await kvStore.list(env, { prefix: 'asset:meta:' });
    const assets = [];

    for (const key of listResult.keys) {
      const metaJson = await kvStore.get(env, key.name);
      if (metaJson) {
        try {
          assets.push(typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson);
        } catch {}
      }
    }

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
  const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
  if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

  return jsonResponse({ success: true, data: typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson });
}

async function handleUploadAsset(request, env) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let payload = {};
    let fileBuffer = null;
    let compressedBuffer = null;
    let compressedMeta = null;
    let activateCompressed = false;

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

      const compFile = formData.get('compressedFile');
      if (compFile && typeof compFile === 'object' && typeof compFile.arrayBuffer === 'function') {
        compressedBuffer = await compFile.arrayBuffer();
        const compQuality = parseFloat(formData.get('compressedQuality') || '0.8');
        const compMaxWidth = parseInt(formData.get('compressedMaxWidth') || '1920', 10);
        const compFormat = (formData.get('compressedFormat') || 'webp').trim();
        activateCompressed = formData.get('activateCompressed') === 'true';
        compressedMeta = {
          mimeType: compFile.type || `image/${compFormat}`,
          sizeBytes: compressedBuffer.byteLength,
          sizeFormatted: formatBytes(compressedBuffer.byteLength),
          quality: isNaN(compQuality) ? 0.8 : compQuality,
          maxWidth: isNaN(compMaxWidth) ? 1920 : compMaxWidth,
          format: compFormat,
          updatedAt: new Date().toISOString()
        };
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

    // 1. Generate unique random slug
    let randomSlug = payload.randomSlug ? sanitizeSlug(payload.randomSlug) : '';
    if (!randomSlug) {
      randomSlug = await generateUniqueSlug(env);
    } else {
      const existing = await kvStore.get(env, `slug:${randomSlug}`);
      if (existing) {
        return jsonResponse({ success: false, error: `Karakter acak '${randomSlug}' sudah digunakan. Silakan generate ulang.` }, 409);
      }
    }

    // 2. Validasi custom path (opsional)
    let cleanCustomPath = '';
    if (payload.customPath) {
      cleanCustomPath = sanitizeCustomPath(payload.customPath);
      if (cleanCustomPath === randomSlug) {
        cleanCustomPath = '';
      } else {
        const existingCustom = await kvStore.get(env, `slug:${cleanCustomPath}`);
        if (existingCustom) {
          return jsonResponse({ success: false, error: `Custom path '${cleanCustomPath}' sudah terpakai oleh aset lain.` }, 409);
        }
      }
    }

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
      activeQuality: (compressedBuffer && activateCompressed) ? 'compressed' : 'original',
      compressed: compressedMeta || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simpan file content dan metadata ke KV
    await kvStore.put(env, `asset:file:${assetId}`, fileBuffer);
    if (compressedBuffer) {
      await kvStore.put(env, `asset:file:${assetId}:compressed`, compressedBuffer);
    }
    await kvStore.put(env, `asset:meta:${assetId}`, JSON.stringify(metadata));

    // Simpan routing index
    await kvStore.put(env, `slug:${randomSlug}`, assetId);
    if (ext) {
      await kvStore.put(env, `slug:${randomSlug}.${ext}`, assetId);
    }
    if (cleanCustomPath) {
      await kvStore.put(env, `slug:${cleanCustomPath}`, assetId);
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
  try {
    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

    const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    const body = await request.json();

    const newName = (body.name || meta.name).trim();
    const newCategory = (body.category || meta.category).trim();
    const newCustomPath = body.customPath !== undefined ? sanitizeCustomPath(body.customPath) : meta.customPath;

    if (newCustomPath !== meta.customPath) {
      if (newCustomPath) {
        const existing = await kvStore.get(env, `slug:${newCustomPath}`);
        if (existing && existing !== assetId) {
          return jsonResponse({ success: false, error: `Custom path '${newCustomPath}' sudah digunakan aset lain.` }, 409);
        }
        await kvStore.put(env, `slug:${newCustomPath}`, assetId);
      }
      if (meta.customPath) {
        await kvStore.delete(env, `slug:${meta.customPath}`);
      }
    }

    const oldCustomPath = meta.customPath;
    meta.name = newName;
    meta.category = newCategory;
    meta.customPath = newCustomPath;
    if (body.activeQuality === 'original' || (body.activeQuality === 'compressed' && meta.compressed)) {
      meta.activeQuality = body.activeQuality;
    }
    meta.updatedAt = new Date().toISOString();

    await kvStore.put(env, `asset:meta:${assetId}`, JSON.stringify(meta));
    await purgeAssetCache(request, meta, oldCustomPath);

    return jsonResponse({
      success: true,
      message: 'Aset berhasil diperbarui.',
      data: meta
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal memperbarui aset: ' + err.message }, 500);
  }
}

async function handleUploadCompressedVariant(assetId, request, env) {
  try {
    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

    const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ success: false, error: 'Gunakan multipart/form-data untuk mengunggah versi kompres.' }, 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ success: false, error: 'File hasil kompres tidak ditemukan.' }, 400);
    }

    const fileBuffer = await file.arrayBuffer();
    const quality = parseFloat(formData.get('quality') || '0.8');
    const maxWidth = parseInt(formData.get('maxWidth') || '1920', 10);
    const format = (formData.get('format') || 'webp').trim();
    const activate = formData.get('activate') !== 'false';

    await kvStore.put(env, `asset:file:${assetId}:compressed`, fileBuffer);

    meta.compressed = {
      mimeType: file.type || `image/${format}`,
      sizeBytes: fileBuffer.byteLength,
      sizeFormatted: formatBytes(fileBuffer.byteLength),
      quality: isNaN(quality) ? 0.8 : quality,
      maxWidth: isNaN(maxWidth) ? 1920 : maxWidth,
      format,
      updatedAt: new Date().toISOString()
    };

    if (activate) {
      meta.activeQuality = 'compressed';
    }
    meta.updatedAt = new Date().toISOString();

    await kvStore.put(env, `asset:meta:${assetId}`, JSON.stringify(meta));
    await purgeAssetCache(request, meta);

    return jsonResponse({
      success: true,
      message: activate ? 'Versi kompres berhasil disimpan dan diaktifkan!' : 'Versi kompres berhasil disimpan.',
      data: meta
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal menyimpan versi kompres: ' + err.message }, 500);
  }
}

async function handleSwitchAssetQuality(assetId, request, env) {
  try {
    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

    const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    const body = await request.json();
    const activeQuality = body.activeQuality === 'compressed' ? 'compressed' : 'original';

    if (activeQuality === 'compressed' && !meta.compressed) {
      return jsonResponse({ success: false, error: 'Versi kompres belum dibuat untuk aset ini.' }, 400);
    }

    meta.activeQuality = activeQuality;
    meta.updatedAt = new Date().toISOString();

    await kvStore.put(env, `asset:meta:${assetId}`, JSON.stringify(meta));
    await purgeAssetCache(request, meta);

    return jsonResponse({
      success: true,
      message: `Kualitas aktif diubah ke ${activeQuality === 'compressed' ? 'Versi Kompres' : 'Original'}.`,
      data: meta
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal mengubah kualitas aktif: ' + err.message }, 500);
  }
}

async function handleDeleteCompressedVariant(assetId, request, env) {
  try {
    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    if (!metaJson) return jsonResponse({ success: false, error: 'Aset tidak ditemukan.' }, 404);

    const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    await kvStore.delete(env, `asset:file:${assetId}:compressed`);
    meta.compressed = null;
    meta.activeQuality = 'original';
    meta.updatedAt = new Date().toISOString();

    await kvStore.put(env, `asset:meta:${assetId}`, JSON.stringify(meta));
    await purgeAssetCache(request, meta);

    return jsonResponse({
      success: true,
      message: 'Versi kompres berhasil dihapus, kembali ke kualitas Original.',
      data: meta
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Gagal menghapus versi kompres: ' + err.message }, 500);
  }
}

async function purgeAssetCache(request, meta, extraPath = '') {
  try {
    if (typeof caches === 'undefined' || !caches.default) return;
    const paths = [];
    if (meta?.randomSlug) {
      paths.push(`/${meta.randomSlug}`);
      if (meta.extension) {
        paths.push(`/${meta.randomSlug}.${meta.extension}`);
      }
    }
    if (meta?.customPath) {
      paths.push(`/${meta.customPath}`);
    }
    if (extraPath && extraPath !== meta?.customPath) {
      paths.push(`/${extraPath}`);
    }
    await Promise.all(
      paths.map(p => {
        const targetUrl = new URL(p, request.url).toString();
        return caches.default.delete(new Request(targetUrl)).catch(() => {});
      })
    );
  } catch {}
}

async function handleDeleteAsset(assetId, env) {
  try {
    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    if (metaJson) {
      const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
      if (meta.randomSlug) {
        await kvStore.delete(env, `slug:${meta.randomSlug}`);
        if (meta.extension) {
          await kvStore.delete(env, `slug:${meta.randomSlug}.${meta.extension}`);
        }
      }
      if (meta.customPath) {
        await kvStore.delete(env, `slug:${meta.customPath}`);
      }
    }

    await kvStore.delete(env, `asset:file:${assetId}`);
    await kvStore.delete(env, `asset:file:${assetId}:compressed`);
    await kvStore.delete(env, `asset:meta:${assetId}`);

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
    const url = new URL(request.url);
    const queryQuality = url.searchParams.get('quality');
    const rangeHeader = request.headers.get('Range');
    const canUseEdgeCache =
      typeof caches !== 'undefined' &&
      caches.default &&
      request.method === 'GET' &&
      !queryQuality &&
      !rangeHeader;

    if (canUseEdgeCache) {
      try {
        const cached = await caches.default.match(request);
        if (cached) return cached;
      } catch {}
    }

    const assetId = await kvStore.get(env, `slug:${cleanPath}`);
    if (!assetId) return null;

    const metaJson = await kvStore.get(env, `asset:meta:${assetId}`);
    let meta = null;
    if (metaJson) {
      try {
        meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
      } catch {}
    }

    const requestedQuality =
      (queryQuality === 'original' || queryQuality === 'compressed')
        ? queryQuality
        : (meta?.activeQuality || 'original');
    const useCompressed = requestedQuality === 'compressed' && Boolean(meta?.compressed);

    let fileData = await kvStore.get(
      env,
      useCompressed ? `asset:file:${assetId}:compressed` : `asset:file:${assetId}`,
      { type: 'arrayBuffer' }
    );

    let servedQuality = useCompressed ? 'compressed' : 'original';
    if (!fileData && useCompressed) {
      fileData = await kvStore.get(env, `asset:file:${assetId}`, { type: 'arrayBuffer' });
      servedQuality = 'original';
    }

    if (!fileData) return null;

    let mimeType = 'application/octet-stream';
    let filename = cleanPath.split('/').pop() || 'file';

    if (meta) {
      mimeType = (servedQuality === 'compressed' && meta.compressed?.mimeType)
        ? meta.compressed.mimeType
        : (meta.mimeType || mimeType);
      filename = meta.fileName || filename;
    }

    // Convert string to buffer if stored as text
    let fileBuffer;
    if (typeof fileData === 'string') {
      fileBuffer = new TextEncoder().encode(fileData).buffer;
    } else if (fileData instanceof ArrayBuffer) {
      fileBuffer = fileData;
    } else if (fileData && fileData.buffer instanceof ArrayBuffer) {
      fileBuffer = fileData.buffer;
    } else {
      fileBuffer = new ArrayBuffer(0);
    }

    const totalBytes = fileBuffer.byteLength;
    const etag = `"${assetId}-${servedQuality}-${totalBytes}"`;
    const cacheControl = queryQuality
      ? 'no-store'
      : 'public, max-age=60, s-maxage=31536000';

    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'X-CDN-Quality': servedQuality,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': cacheControl
        }
      });
    }

    // HTTP Range Requests Support
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
            'Cache-Control': cacheControl,
            'ETag': etag,
            'X-CDN-Quality': servedQuality,
            'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
          }
        });
      }
    }

    const response = new Response(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': mimeType,
        'Content-Length': totalBytes.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControl,
        'ETag': etag,
        'X-CDN-Quality': servedQuality,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`
      }
    });

    if (canUseEdgeCache) {
      try {
        await caches.default.put(request, response.clone());
      } catch {}
    }

    return response;

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
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let slug = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      slug += chars[bytes[i] % chars.length];
    }
    const exists = await kvStore.get(env, `slug:${slug}`);
    if (!exists) {
      return slug;
    }
  }
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
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
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
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'avif': 'image/avif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'html': 'text/html; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'txt': 'text/plain; charset=utf-8',
    'woff2': 'font/woff2',
    'woff': 'font/woff',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
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
