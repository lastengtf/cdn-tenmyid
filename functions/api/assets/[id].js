/**
 * Cloudflare Pages Function: /api/assets/:id
 * Handles GET (fetch single metadata) and DELETE (remove from KV)
 */

export async function onRequestGet(context) {
  const { params, env } = context;
  const kv = env.CDN_KV;
  const id = params.id;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (!kv) {
    return new Response(JSON.stringify({ success: false, error: 'KV belum dihubungkan.' }), { status: 500, headers: corsHeaders });
  }

  const metaJson = await kv.get(`asset:meta:${id}`);
  if (!metaJson) {
    return new Response(JSON.stringify({ success: false, error: 'Aset tidak ditemukan di KV.' }), { status: 404, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true, data: JSON.parse(metaJson) }), { headers: corsHeaders });
}

export async function onRequestDelete(context) {
  const { request, params, env } = context;
  const kv = env.CDN_KV;
  const id = params.id;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (!kv) {
    return new Response(JSON.stringify({ success: false, error: 'KV belum dihubungkan.' }), { status: 500, headers: corsHeaders });
  }

  // Security: Check API Key
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
  const adminApiKey = env.ADMIN_API_KEY || 'ten-cdn-secret-key';
  const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (providedKey !== adminApiKey) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Akses ditolak: API Key tidak valid.'
    }), { status: 401, headers: corsHeaders });
  }

  const metaJson = await kv.get(`asset:meta:${id}`);
  if (metaJson) {
    const meta = JSON.parse(metaJson);
    if (meta.slug) {
      await kv.delete(`slug:${meta.slug}`);
    }
  }

  await kv.delete(`asset:meta:${id}`);
  await kv.delete(`asset:content:txt:${id}`);
  await kv.delete(`asset:content:b64:${id}`);

  return new Response(JSON.stringify({
    success: true,
    message: `Aset ${id} berhasil dihapus dari Cloudflare KV.`
  }), { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  });
}
