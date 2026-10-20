import { json } from '../../_lib/utils.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';

export async function onRequestGet({ request, env, waitUntil, data }) {
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:'studio-gallery-v150',ttl:120,load:async()=>{
  try {
    const result = await env.DB.prepare(
      'SELECT id,image_url,alt_text,sort_order FROM studio_gallery_images WHERE visible=1 ORDER BY sort_order,id LIMIT 12'
    ).all();
    return json({ images:result.results || [] }, 200, {
      'cache-control':'public, max-age=120'
    });
  } catch (error) {
    // Keep the existing purple theme image as a safe fallback during the first
    // request of an older deployment while its additive table is being created.
    return json({ images:[], fallback:true }, 200, {
      'cache-control':'no-store, max-age=0, must-revalidate'
    });
  }
  }});
}
