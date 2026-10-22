import {invalidateConfiguration} from '../../_lib/configuration-cache-v1-57.js';
import { json, readJson, requireAdmin, getSiteSettings, setSetting, mergeSiteSettings } from '../../_lib/utils.js';
import { purgePublicEdgeCaches, DROPBEAT_PUBLIC_CACHE_ENTRIES } from '../../_lib/edge-response-cache.js';
export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  return json({ settings: await getSiteSettings(env) });
}
export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const {confirmation,expectedTheme,...body} = await readJson(request);
  const current = await getSiteSettings(env);
  const next = mergeSiteSettings({ ...current, ...body, updatedAt: new Date().toISOString() });
  if(next.frontendTheme!==current.frontendTheme){
    if(confirmation!=='confirm')return json({error:'Type confirm before publishing a new Frontend Theme.'},400);
    if(expectedTheme!==undefined&&expectedTheme!==current.frontendTheme)return json({error:'The active theme changed in another window. Reload before publishing.'},409);
  }
  await setSetting(env, 'site_settings', next);
  invalidateConfiguration();
  // Settings are embedded in both /site and the four standard bootstrap
  // responses. Remove those exact edge entries before returning so a saved
  // brand, colour or frontend theme is visible on the very next page load.
  await purgePublicEdgeCaches(request, DROPBEAT_PUBLIC_CACHE_ENTRIES.filter(entry =>
    entry.path === '/api/public/site' || entry.path === '/api/public/bootstrap' || entry.path === '/api/public/layout'
  ));
  return json({ ok: true, settings: next });
}
