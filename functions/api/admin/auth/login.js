import { json, readJson, sha256Hex, cookieHeader, withD1Retry, isTransientDatabaseError } from '../../../_lib/utils.js';
import {APP_SESSION_SECONDS} from '../../../_lib/app-session-v1-58.js';
import { ensureAuthSchema } from '../../../_lib/auth-schema.js';

function defaultEmail(env) {
  return String(env.ADMIN_LOGIN_EMAIL || env.DEFAULT_ADMIN_EMAIL || 'admin@dropbeat-dance-studio.local').trim().toLowerCase();
}
function defaultPassword(env) {
  return String(env.ADMIN_LOGIN_PASSWORD || env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe@123');
}
async function hashPassword(password, salt) {
  return sha256Hex(`${salt}:${password}`);
}
async function createFirstAdminIfNeeded(env, email, password) {
  const row = await withD1Retry(() => env.DB.prepare("SELECT COUNT(*) c FROM admin_users WHERE status='active'").first());
  if ((row?.c || 0) > 0) return;
  if (email !== defaultEmail(env) || password !== defaultPassword(env)) return;
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  await withD1Retry(() => env.DB.prepare('INSERT INTO admin_users(email,name,password_hash,salt,role,status) VALUES(?,?,?,?,?,?)')
    .bind(email, 'DropBeat Dance Studio Admin', passwordHash, salt, 'admin', 'active').run());
}
export async function onRequestPost({ request, env }) {
  try {
    await ensureAuthSchema(env);
    const body = await readJson(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return json({ error: 'Email and password are required.' }, 400);
    await createFirstAdminIfNeeded(env, email, password);
    const user = await withD1Retry(() => env.DB.prepare("SELECT * FROM admin_users WHERE email=? AND status='active'").bind(email).first());
    if (!user) return json({ error: 'Invalid admin login details.' }, 401);
    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.password_hash) return json({ error: 'Invalid admin login details.' }, 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    const expires = new Date(Date.now() + APP_SESSION_SECONDS * 1000);
    await withD1Retry(() => env.DB.prepare('INSERT INTO admin_sessions(user_id,token_hash,expires_at) VALUES(?,?,?)').bind(user.id, tokenHash, expires.toISOString()).run());
    return json({ ok: true, email: user.email, role: user.role || 'admin' }, 200, {
      'set-cookie': cookieHeader('uc_admin_session', token, { maxAge: APP_SESSION_SECONDS, expires })
    });
  } catch (error) {
    if (isTransientDatabaseError(error)) return json({ ok:false, error: 'The admin database is temporarily busy. Please wait a moment and try Login again.' }, 503);
    // Always return JSON to the login screen. Previously an unexpected D1/schema
    // exception became Cloudflare's HTML 500 page, so the UI could only say the
    // unhelpful generic text “Login failed”.
    console.error('Admin login error:', error);
    return json({ ok:false, error: `Admin login could not be completed: ${String(error?.message || error || 'Unknown server error')}` }, 500);
  }
}
