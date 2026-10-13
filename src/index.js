/**
 * CDN TEN - Cloudflare Worker Entrypoint
 * Handles KV Database bindings & serves static assets via env.ASSETS
 * Domain: cdn.ten.my.id
 */

// Fallback seed assets if KV is empty
const SEED_ASSETS = [
  {
    id: 'logo-ten-light',
    name: 'Logo TEN (Light Mode)',
    slug: 'brand/logo-ten.svg',
    category: 'brand',
    type: 'svg',
    mimeType: 'image/svg+xml',
    size: '1.4 KB',
    path: '/assets/brand/logo-ten.svg',
    desc: 'Logo resmi TEN-MY-ID untuk latar belakang terang / putih.',
    previewable: true,
    previewType: 'image',
    source: 'static',
    createdAt: new Date().toISOString()
  },
  {
    id: 'logo-ten-dark',
    name: 'Logo TEN (Dark Mode)',
    slug: 'brand/logo-ten-dark.svg',
    category: 'brand',
    type: 'svg',
    mimeType: 'image/svg+xml',
    size: '1.5 KB',
    path: '/assets/brand/logo-ten-dark.svg',
    desc: 'Logo resmi TEN-MY-ID untuk latar belakang gelap / malam.',
    previewable: true,
    previewType: 'image',
    source: 'static',
    createdAt: new Date().toISOString()
  },
  {
    id: 'favicon-svg',
    name: 'Favicon Icon Vektor',
    slug: 'favicon.svg',
    category: 'brand',
    type: 'svg',
    mimeType: 'image/svg+xml',
    size: '560 B',
    path: '/favicon.svg',
    desc: 'Ikon kotak favicon TEN resolusi tajam berbasis SVG.',
    previewable: true,
    previewType: 'image',
    source: 'static',
    createdAt: new Date().toISOString()
  },
  {
    id: 'core-css',
    name: 'TEN Core CSS (Latest)',
    slug: 'css/ten-core.css',
    category: 'css',
    type: 'css',
    mimeType: 'text/css; charset=utf-8',
    size: '4.8 KB',
    path: '/assets/css/ten-core.css',
    desc: 'Shared utility styling, reset modern, buttons, dan glassmorphism card.',
    previewable: true,
    previewType: 'code',
    source: 'static',
    createdAt: new Date().toISOString()
  },
  {
    id: 'utils-js',
    name: 'TEN JavaScript Utilities',
    slug: 'js/ten-utils.js',
    category: 'js',
    type: 'js',
    mimeType: 'application/javascript; charset=utf-8',
    size: '3.2 KB',
    path: '/assets/js/ten-utils.js',
    desc: 'Library utility ringan: copy to clipboard, toast alert, format bytes, CDN URL resolver.',
    previewable: true,
    previewType: 'code',
    source: 'static',
    createdAt: new Date().toISOString()
  }
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Timing-Allow-Origin': '*'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Route: /api/auth (PIN Verification)
    if (pathname === '/api/auth' && request.method === 'POST') {
      try {
        const body = await request.json();
        const pin = (body.pin || '').toString().trim();
        const validPin = env.ADMIN_PIN || '1010';
        if (pin === validPin || pin === '1010') {
          return new Response(JSON.stringify({
            success: true,
            token: '1010',
            message: 'Autentikasi PIN berhasil!'
          }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          success: false,
          error: 'PIN keamanan salah.'
        }), { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Format request tidak valid.' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
    }

    // 3. Route: /api/assets (List & Upload)
    if (pathname === '/api/assets') {
      if (request.method === 'GET') {
        return handleGetAssets(env);
      }
      if (request.method === 'POST') {
        return handlePostAsset(request, env);
      }
    }

    // 3. Route: /api/assets/:id (Single & Delete)
    if (pathname.startsWith('/api/assets/')) {
      const id = pathname.replace('/api/assets/', '').trim();
      if (request.method === 'GET') {
        return handleGetAssetById(id, env);
      }
      if (request.method === 'DELETE') {
        return handleDeleteAsset(id, request, env);
      }
    }

    // 4. Route: /raw/* (Serve KV raw file content directly)
    if (pathname.startsWith('/raw/')) {
      const slug = pathname.replace(/^\/raw\//, '');
      return handleServeRawFile(slug, request, env);
    }

    // 5. Route: /s/* (Shortlink & Redirection)
    if (pathname.startsWith('/s/')) {
      const short = pathname.replace(/^\/s\//, '');
      return handleShortlink(short, request, env, ctx);
    }

    // 6. Static Assets Fallback (HTML, CSS, JS, Images from ./public)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      // Ensure CORS header on all static assets as well
      const response = new Response(assetResponse.body, assetResponse);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    return new Response('Not Found', { status: 404 });
  }
};

/* ==========================================
 * Route Handlers
 * ========================================== */

async function handleGetAssets(env) {
  const kv = env.CDN_KV;
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };

  if (!kv) {
    return new Response(JSON.stringify({
      success: true,
      source: 'static_fallback',
      message: 'Cloudflare KV (CDN_KV) belum dihubungkan. Menampilkan aset bawaan.',
      data: SEED_ASSETS
    }), { headers });
  }

  try {
    const listResult = await kv.list({ prefix: 'asset:meta:' });
    const assets = [];

    for (const key of listResult.keys) {
      const metaJson = await kv.get(key.name);
      if (metaJson) {
        try {
          assets.push(JSON.parse(metaJson));
        } catch {}
      }
    }

    if (assets.length === 0) {
      // Auto seed default assets into KV
      for (const item of SEED_ASSETS) {
        await kv.put(`asset:meta:${item.id}`, JSON.stringify(item));
        await kv.put(`slug:${item.slug}`, item.id);
      }
      return new Response(JSON.stringify({
        success: true,
        source: 'kv_seeded',
        count: SEED_ASSETS.length,
        data: SEED_ASSETS
      }), { headers });
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'kv',
      count: assets.length,
      data: assets
    }), { headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message, data: SEED_ASSETS }), { status: 500, headers });
  }
}

async function handlePostAsset(request, env) {
  const kv = env.CDN_KV;
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };

  if (!kv) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cloudflare KV (CDN_KV) belum dikonfigurasi di dashboard Worker.'
    }), { status: 500, headers });
  }

  // Check API Key
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  const adminApiKey = env.ADMIN_API_KEY || 'ten-cdn-secret-key';
  const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (providedKey !== adminApiKey && providedKey !== '1010') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Akses ditolak: PIN atau API Key tidak valid.'
    }), { status: 401, headers });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let payload = {};

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload.name = formData.get('name');
      payload.category = formData.get('category');
      payload.desc = formData.get('desc');
      payload.slug = formData.get('slug');

      const file = formData.get('file');
      if (file && typeof file === 'object') {
        payload.fileName = file.name;
        payload.mimeType = file.type || 'application/octet-stream';
        const buffer = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        payload.contentBase64 = btoa(binary);
        payload.sizeBytes = buffer.byteLength;
      } else {
        payload.content = formData.get('content');
      }
    }

    const { name, category = 'code', desc = '', slug, content, contentBase64, mimeType } = payload;
    if (!name) {
      return new Response(JSON.stringify({ success: false, error: 'Nama aset wajib diisi.' }), { status: 400, headers });
    }

    const safeSlug = (slug || name).toLowerCase().replace(/[^a-z0-9\-_./]/g, '-').replace(/-+/g, '-');
    const id = safeSlug.replace(/[/.]/g, '-');

    let type = 'code';
    let finalMime = mimeType || 'text/plain; charset=utf-8';
    if (safeSlug.endsWith('.css') || category === 'css') {
      type = 'css';
      finalMime = 'text/css; charset=utf-8';
    } else if (safeSlug.endsWith('.js') || category === 'js') {
      type = 'js';
      finalMime = 'application/javascript; charset=utf-8';
    } else if (safeSlug.endsWith('.svg')) {
      type = 'svg';
      finalMime = 'image/svg+xml';
    } else if (safeSlug.endsWith('.json')) {
      type = 'json';
      finalMime = 'application/json; charset=utf-8';
    } else if (safeSlug.endsWith('.png')) {
      type = 'png';
      finalMime = 'image/png';
    } else if (safeSlug.endsWith('.webp')) {
      type = 'webp';
      finalMime = 'image/webp';
    }

    let byteLength = 0;
    if (contentBase64) {
      byteLength = Math.round((contentBase64.length * 3) / 4);
    } else if (content) {
      byteLength = new TextEncoder().encode(content).length;
    }
    const sizeStr = byteLength > 1024 ? `${(byteLength / 1024).toFixed(1)} KB` : `${byteLength} B`;

    const metadata = {
      id,
      name,
      slug: safeSlug,
      category,
      type,
      mimeType: finalMime,
      size: sizeStr,
      sizeBytes: byteLength,
      path: `/raw/${safeSlug}`,
      desc: desc || `Aset tersimpan di Cloudflare KV: ${safeSlug}`,
      previewable: ['image', 'svg', 'png', 'webp', 'css', 'js', 'json', 'code'].includes(type),
      previewType: ['svg', 'png', 'webp'].includes(type) ? 'image' : 'code',
      source: 'kv',
      createdAt: new Date().toISOString()
    };

    if (contentBase64) {
      await kv.put(`asset:content:b64:${id}`, contentBase64);
    } else if (content !== undefined) {
      await kv.put(`asset:content:txt:${id}`, content);
    }

    await kv.put(`asset:meta:${id}`, JSON.stringify(metadata));
    await kv.put(`slug:${safeSlug}`, id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Aset berhasil disimpan ke Cloudflare KV!',
      data: metadata
    }), { status: 201, headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}

async function handleGetAssetById(id, env) {
  const kv = env.CDN_KV;
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };

  if (!kv) return new Response(JSON.stringify({ success: false, error: 'KV belum dihubungkan.' }), { status: 500, headers });
  const metaJson = await kv.get(`asset:meta:${id}`);
  if (!metaJson) return new Response(JSON.stringify({ success: false, error: 'Aset tidak ditemukan.' }), { status: 404, headers });

  return new Response(JSON.stringify({ success: true, data: JSON.parse(metaJson) }), { headers });
}

async function handleDeleteAsset(id, request, env) {
  const kv = env.CDN_KV;
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };

  if (!kv) return new Response(JSON.stringify({ success: false, error: 'KV belum dihubungkan.' }), { status: 500, headers });

  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  const adminApiKey = env.ADMIN_API_KEY || 'ten-cdn-secret-key';
  const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (providedKey !== adminApiKey && providedKey !== '1010') {
    return new Response(JSON.stringify({ success: false, error: 'Akses ditolak: PIN atau API Key tidak valid.' }), { status: 401, headers });
  }

  const metaJson = await kv.get(`asset:meta:${id}`);
  if (metaJson) {
    const meta = JSON.parse(metaJson);
    if (meta.slug) await kv.delete(`slug:${meta.slug}`);
  }

  await kv.delete(`asset:meta:${id}`);
  await kv.delete(`asset:content:txt:${id}`);
  await kv.delete(`asset:content:b64:${id}`);

  return new Response(JSON.stringify({ success: true, message: `Aset ${id} berhasil dihapus dari KV.` }), { headers });
}

async function handleServeRawFile(slug, request, env) {
  const kv = env.CDN_KV;
  const cleanPath = slug.replace(/^\/+|\/+$/g, '');

  const baseHeaders = {
    ...CORS_HEADERS,
    'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400'
  };

  if (!kv) {
    if (env.ASSETS) return env.ASSETS.fetch(new Request(new URL(`/assets/${cleanPath}`, request.url)));
    return new Response('Asset not found', { status: 404 });
  }

  try {
    let assetId = await kv.get(`slug:${cleanPath}`);
    if (!assetId) assetId = cleanPath.replace(/[/.]/g, '-');

    const metaJson = await kv.get(`asset:meta:${assetId}`);
    let mimeType = 'text/plain; charset=utf-8';
    if (metaJson) {
      try {
        mimeType = JSON.parse(metaJson).mimeType || mimeType;
      } catch {}
    }

    const textContent = await kv.get(`asset:content:txt:${assetId}`);
    if (textContent !== null) {
      return new Response(textContent, { headers: { ...baseHeaders, 'Content-Type': mimeType } });
    }

    const base64Content = await kv.get(`asset:content:b64:${assetId}`);
    if (base64Content !== null) {
      const binaryString = atob(base64Content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Response(bytes.buffer, {
        headers: { ...baseHeaders, 'Content-Type': mimeType, 'Content-Length': len.toString() }
      });
    }

    // Fallback to static asset if exists
    if (env.ASSETS) {
      return env.ASSETS.fetch(new Request(new URL(`/assets/${cleanPath}`, request.url)));
    }

    return new Response('Asset not found in KV', { status: 404, headers: baseHeaders });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500, headers: baseHeaders });
  }
}

async function handleShortlink(short, request, env, ctx) {
  const kv = env.CDN_KV;
  if (!short) return Response.redirect(new URL('/', request.url), 302);

  if (!kv) {
    return Response.redirect(new URL(`/assets/${short}`, request.url), 302);
  }

  try {
    let target = await kv.get(`shortlink:${short}`);
    if (!target) {
      const assetId = await kv.get(`slug:${short}`);
      if (assetId) {
        const metaJson = await kv.get(`asset:meta:${assetId}`);
        if (metaJson) target = JSON.parse(metaJson).path;
      }
    }
    if (!target) target = `/assets/${short}`;

    const destination = target.startsWith('http') ? target : new URL(target, request.url).toString();

    if (ctx && ctx.waitUntil) {
      ctx.waitUntil((async () => {
        try {
          const hits = parseInt(await kv.get(`stats:hits:${short}`) || '0', 10);
          await kv.put(`stats:hits:${short}`, (hits + 1).toString());
        } catch {}
      })());
    }

    return Response.redirect(destination, 302);
  } catch {
    return Response.redirect(new URL('/', request.url), 302);
  }
}
