import { json, parseCookies, sha256Hex, cookieHeader } from '../../../_lib/utils.js';
import { ensureAuthSchema } from '../../../_lib/auth-schema.js';
export async function onRequestPost({ request, env }) {
  await ensureAuthSchema(env).catch(()=>{});
  const token = parseCookies(request).uc_admin_session;
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB?.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(tokenHash).run().catch(()=>{});
  }
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('uc_admin_session', '', { maxAge: 0 }) });
}
