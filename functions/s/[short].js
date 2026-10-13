/**
 * Cloudflare Pages Function: /s/:short
 * Shortlink redirection service powered by Cloudflare KV
 */

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const kv = env.CDN_KV;
  const short = params.short;

  if (!short) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  if (!kv) {
    return Response.redirect(new URL(`/assets/${short}`, request.url), 302);
  }

  try {
    // 1. Check direct shortlink or slug mapping
    let target = await kv.get(`shortlink:${short}`);
    if (!target) {
      const assetId = await kv.get(`slug:${short}`);
      if (assetId) {
        const metaJson = await kv.get(`asset:meta:${assetId}`);
        if (metaJson) {
          const meta = JSON.parse(metaJson);
          target = meta.path || `/raw/${meta.slug}`;
        }
      }
    }

    if (!target) {
      target = `/assets/${short}`;
    }

    // Resolve full target URL
    const destination = target.startsWith('http')
      ? target
      : new URL(target, request.url).toString();

    // Async increment hits counter without blocking response
    if (context.waitUntil) {
      context.waitUntil(
        (async () => {
          try {
            const currentHits = parseInt(await kv.get(`stats:hits:${short}`) || '0', 10);
            await kv.put(`stats:hits:${short}`, (currentHits + 1).toString());
          } catch {}
        })()
      );
    }

    return Response.redirect(destination, 302);

  } catch (err) {
    return Response.redirect(new URL('/', request.url), 302);
  }
}
