import { json } from '../../_lib/utils.js';
import { getPublicProducts } from '../../_lib/public-data.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';
export async function onRequestGet({ request, env, waitUntil, data }) {
  const page = new URL(request.url).searchParams.get('page') || '';
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:`products-dropbeat-v113:${page}`,ttl:120,load:async()=>json({ products: await getPublicProducts(env, page) }, 200, {
    'cache-control': 'public, max-age=120, stale-while-revalidate=300'
  })});
}
