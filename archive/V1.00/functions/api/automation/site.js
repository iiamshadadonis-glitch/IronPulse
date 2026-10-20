import { json, readJson, requireAutomation, getSiteSettings, setSetting, mergeSiteSettings } from '../../_lib/utils.js';
export async function onRequestGet({ request, env }) {
  try { await requireAutomation(request, env); } catch (e) { return json({ error: e.message }, 401); }
  return json({ settings: await getSiteSettings(env) });
}
export async function onRequestPost({ request, env }) {
  try { await requireAutomation(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const body = await readJson(request);
  const current = await getSiteSettings(env);
  const next = mergeSiteSettings({ ...current, ...body, updatedAt: new Date().toISOString() });
  await setSetting(env, 'site_settings', next);
  return json({ ok: true, settings: next });
}
