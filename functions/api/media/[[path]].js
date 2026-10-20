import { base64ToArrayBuffer, ensureMediaTable } from '../../_lib/media.js';

export async function onRequestGet({ request, params, env, waitUntil }) {
  // Uploaded media URLs contain a UUID and are immutable. Cache the generated
  // response at the Cloudflare edge so repeat requests do not need to read D1.
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  await ensureMediaTable(env);
  const rawPath = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const idMatch = String(rawPath).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const id = idMatch ? idMatch[0] : rawPath;
  if (!id) return new Response('Not found', { status: 404 });

  const asset = await env.DB.prepare('SELECT * FROM media_assets WHERE id=? OR object_key=? OR public_url=?').bind(id, rawPath, `/api/media/${rawPath}`).first();
  if (!asset) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', asset.content_type || 'application/octet-stream');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('etag', `"uc-media-${asset.id}"`);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-urgent-casting-storage', 'd1-pages-no-r2');
  const response = new Response(base64ToArrayBuffer(asset.data_base64), { headers });
  if (typeof waitUntil === 'function') waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
