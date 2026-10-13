/**
 * Cloudflare Pages Function: /raw/*
 * Directly serves file content stored in Cloudflare KV with correct MIME, CORS, and Caching.
 * Matches: /raw/:slug or nested paths like /raw/css/custom.css
 */

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const kv = env.CDN_KV;

  // Resolve path from params
  const rawPath = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const cleanPath = rawPath.replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    return new Response('File path parameter is required', { status: 400 });
  }

  // Base CORS & Cache headers
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Timing-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400'
  };

  if (!kv) {
    // If KV not available, try redirecting to static asset
    return Response.redirect(new URL(`/assets/${cleanPath}`, request.url), 302);
  }

  try {
    // 1. Resolve ID from slug mapping or directly by ID
    let assetId = await kv.get(`slug:${cleanPath}`);
    if (!assetId) {
      assetId = cleanPath.replace(/[/.]/g, '-');
    }

    // 2. Fetch Metadata
    const metaJson = await kv.get(`asset:meta:${assetId}`);
    let metadata = null;
    if (metaJson) {
      try {
        metadata = JSON.parse(metaJson);
      } catch {}
    }

    const mimeType = metadata?.mimeType || inferMimeType(cleanPath);

    // 3. Try Text Content first
    const textContent = await kv.get(`asset:content:txt:${assetId}`);
    if (textContent !== null) {
      return new Response(textContent, {
        headers: {
          ...baseHeaders,
          'Content-Type': mimeType
        }
      });
    }

    // 4. Try Base64 / Binary Content
    const base64Content = await kv.get(`asset:content:b64:${assetId}`);
    if (base64Content !== null) {
      const binaryString = atob(base64Content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Response(bytes.buffer, {
        headers: {
          ...baseHeaders,
          'Content-Type': mimeType,
          'Content-Length': len.toString()
        }
      });
    }

    // 5. If not found in KV, fallback to static /assets path
    return Response.redirect(new URL(`/assets/${cleanPath}`, request.url), 302);

  } catch (err) {
    return new Response(`Error serving asset: ${err.message}`, { status: 500, headers: baseHeaders });
  }
}

function inferMimeType(path) {
  const p = path.toLowerCase();
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.woff2')) return 'font/woff2';
  if (p.endsWith('.woff')) return 'font/woff';
  if (p.endsWith('.ttf')) return 'font/ttf';
  if (p.endsWith('.mp4')) return 'video/mp4';
  if (p.endsWith('.mp3')) return 'audio/mpeg';
  return 'text/plain; charset=utf-8';
}
