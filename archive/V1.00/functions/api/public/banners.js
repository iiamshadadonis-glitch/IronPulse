import { json } from '../../_lib/utils.js';
import { getPublicBanners } from '../../_lib/public-data.js';
export async function onRequestGet({ env }) {
  return json({ banners: await getPublicBanners(env) }, 200, {
    'cache-control': 'public, max-age=10, stale-while-revalidate=30'
  });
}
