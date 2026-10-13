/**
 * Cloudflare Pages Function: /api/assets
 * Handles GET (list all assets from KV) and POST (store new asset metadata & content in KV)
 */

// Default fallback seed assets if KV is empty or not yet populated
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

export async function onRequestGet(context) {
  const { env } = context;
  const kv = env.CDN_KV;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };

  try {
    // If KV is not bound, return fallback seed assets
    if (!kv) {
      return new Response(JSON.stringify({
        success: true,
        source: 'static_fallback',
        message: 'Cloudflare KV (CDN_KV) belum dihubungkan. Menampilkan aset bawaan.',
        data: SEED_ASSETS
      }), { headers: corsHeaders });
    }

    // List all asset metadata keys from KV (prefix: "asset:meta:")
    const listResult = await kv.list({ prefix: 'asset:meta:' });
    const assets = [];

    for (const key of listResult.keys) {
      const metaJson = await kv.get(key.name);
      if (metaJson) {
        try {
          assets.push(JSON.parse(metaJson));
        } catch {
          // ignore corrupted json
        }
      }
    }

    // If KV is empty, seed it with the default assets automatically
    if (assets.length === 0) {
      for (const item of SEED_ASSETS) {
        await kv.put(`asset:meta:${item.id}`, JSON.stringify(item));
        await kv.put(`slug:${item.slug}`, item.id);
      }
      return new Response(JSON.stringify({
        success: true,
        source: 'kv_seeded',
        message: 'Berhasil menginisialisasi KV dengan aset bawaan.',
        data: SEED_ASSETS
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'kv',
      count: assets.length,
      data: assets
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: SEED_ASSETS
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.CDN_KV;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };

  // Preflight check
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!kv) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cloudflare KV (CDN_KV) belum dikonfigurasi di dashboard Cloudflare Pages.'
    }), { status: 500, headers: corsHeaders });
  }

  // Security: Check API Key (from env or header)
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  const adminApiKey = env.ADMIN_API_KEY || 'ten-cdn-secret-key';
  const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (providedKey !== adminApiKey) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Akses ditolak: API Key tidak valid. Silakan berikan x-api-key yang sah.'
    }), { status: 401, headers: corsHeaders });
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
        // Convert to base64 for KV storage
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

    const {
      name,
      category = 'code',
      desc = '',
      slug,
      content,
      contentBase64,
      mimeType,
      fileName
    } = payload;

    if (!name) {
      return new Response(JSON.stringify({ success: false, error: 'Nama aset (name) wajib diisi.' }), { status: 400, headers: corsHeaders });
    }

    // Generate sanitized ID and slug
    const safeSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9\-_./]/g, '-')
      .replace(/-+/g, '-');
    const id = safeSlug.replace(/[/.]/g, '-');

    // Infer type and MIME
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

    // Format human readable size
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

    // Store File Content in KV
    if (contentBase64) {
      await kv.put(`asset:content:b64:${id}`, contentBase64);
    } else if (content !== undefined) {
      await kv.put(`asset:content:txt:${id}`, content);
    }

    // Store Metadata and Slug mapping in KV
    await kv.put(`asset:meta:${id}`, JSON.stringify(metadata));
    await kv.put(`slug:${safeSlug}`, id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Aset berhasil disimpan ke Cloudflare KV!',
      data: metadata
    }), { status: 201, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
