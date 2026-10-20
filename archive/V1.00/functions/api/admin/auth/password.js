import { json, readJson, requireAdmin, parseCookies, sha256Hex } from '../../../_lib/utils.js';
async function hashPassword(password, salt) { return sha256Hex(`${salt}:${password}`); }
export async function onRequestPost({ request, env }) {
  let admin;
  try { admin = await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const body = await readJson(request);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (newPassword.length < 8) return json({ error: 'New password must be at least 8 characters.' }, 400);
  const user = await env.DB.prepare("SELECT * FROM admin_users WHERE email=? AND status='active'").bind(admin.email).first();
  if (!user) return json({ error: 'Password change is only available for local admin users.' }, 400);
  const currentHash = await hashPassword(currentPassword, user.salt);
  if (currentHash !== user.password_hash) return json({ error: 'Current password is incorrect.' }, 400);
  const salt = crypto.randomUUID();
  const nextHash = await hashPassword(newPassword, salt);
  await env.DB.prepare('UPDATE admin_users SET password_hash=?, salt=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(nextHash, salt, user.id).run();
  const token = parseCookies(request).uc_admin_session;
  if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash<>? AND user_id=?').bind(await sha256Hex(token), user.id).run();
  return json({ ok: true });
}
