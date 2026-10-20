import { json, getSiteSettings } from '../../_lib/utils.js';
import { getPublicBanners, getPublicProducts, getPublicStories } from '../../_lib/public-data.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';

export async function onRequestGet({ request, env, waitUntil, data }) {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || 'home';
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:`bootstrap-dropbeat-v113:${page}`,ttl:120,load:async()=>{
    const includeBanners = page === 'home';
    const includeStories = page === 'home';
    const [settings, products, banners, stories] = await Promise.all([
      getSiteSettings(env),
      getPublicProducts(env, page),
      includeBanners ? getPublicBanners(env) : Promise.resolve([]),
      includeStories ? getPublicStories(env, 24) : Promise.resolve([])
    ]);
    return json({ settings, products, banners, stories }, 200, {
      'cache-control': 'public, max-age=120, stale-while-revalidate=300'
    });
  }});
}
