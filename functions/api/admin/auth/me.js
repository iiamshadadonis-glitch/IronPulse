import { json, requireAdmin, isTransientDatabaseError } from '../../../_lib/utils.js';
import { ensureAuthSchema } from '../../../_lib/auth-schema.js';
export async function onRequestGet({ request, env }) {
  try {
    await ensureAuthSchema(env);
    const user = await requireAdmin(request, env);
    return json({ ok: true, user });
  } catch (e) {
    if (isTransientDatabaseError(e)) return json({ ok:false, error:'The admin database is temporarily busy. Your login session has not been cleared. Please retry.' },503);
    const message=String(e?.message||'Admin login required');
    const status=/admin login required|unauthorized|session expired/i.test(message)?401:500;
    return json({ ok: false, error: message }, status);
  }
}
