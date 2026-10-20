import { json, readJson, requireAdmin, parseCookies, sha256Hex, getSetting, setSetting, getSiteSettings } from '../../../_lib/utils.js';
import { sendConfiguredEmail } from '../../../_lib/outbound-email.js';
import { brandedEmailHtml } from '../../../_lib/branded-email.js';
async function hashPassword(password, salt) { return sha256Hex(`${salt}:${password}`); }
async function currentUser(request, env) {
  const admin = await requireAdmin(request, env);
  const user = await env.DB.prepare("SELECT * FROM admin_users WHERE email=? AND status='active'").bind(admin.email).first();
  return { admin, user };
}
function makeCode() { return String(Math.floor(100000 + Math.random()*900000)); }
export async function onRequestGet({ request, env }) {
  try {
    const { admin, user } = await currentUser(request, env);
    const google = await getSetting(env, 'google_login_settings', { googleEmail:'' });
    const site = await getSiteSettings(env);
    return json({ email: user?.email || admin.email, role: admin.role || 'admin', displayName: String(site.adminDisplayName || user?.name || 'Admin').trim().slice(0,20) || 'Admin', googleEmail: google.googleEmail || '', cloudflareAccessEmail: request.headers.get('Cf-Access-Authenticated-User-Email') || '' });
  } catch(e) { return json({ error:e.message }, 401); }
}
export async function onRequestPost({ request, env }) {
  let ctx;
  try { ctx = await currentUser(request, env); } catch(e) { return json({ error:e.message }, 401); }
  const b = await readJson(request);
  if (b.action === 'update_admin_name') {
    const displayName = String(b.displayName || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!displayName) return json({ error:'Enter an admin display name.' }, 400);
    if (displayName.length > 20) return json({ error:'Admin display name must be 20 characters or fewer so it stays on one line.' }, 400);
    const site = await getSiteSettings(env);
    await setSetting(env, 'site_settings', { ...site, adminDisplayName: displayName, updatedAt:new Date().toISOString() });
    if (ctx.user?.id) await env.DB.prepare('UPDATE admin_users SET name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(displayName, ctx.user.id).run().catch(()=>{});
    return json({ ok:true, displayName, message:'Admin display name updated.' });
  }
  if (b.action === 'request_email_change') {
    const nextEmail = String(b.newEmail || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nextEmail)) return json({ error:'Enter a valid new email address.' }, 400);
    if (!ctx.user) return json({ error:'Email change is only available for local admin users.' }, 400);
    const code = makeCode();
    const codeHash = await sha256Hex(code);
    const expires = new Date(Date.now()+10*60*1000).toISOString();
    const result = await env.DB.prepare('INSERT INTO admin_email_change_requests(admin_user_id,new_email,code_hash,expires_at) VALUES(?,?,?,?) RETURNING id').bind(ctx.user.id,nextEmail,codeHash,expires).first();
    const site = await getSiteSettings(env);
    const brand = String(site.siteName || 'DropBeat Dance Studio').trim();
    const html = brandedEmailHtml({site,env,title:'Confirm your new admin email',eyebrow:'Security verification',introHtml:'<p>A request was made from the authenticated admin panel to use this email address for administrator login.</p>',summaryTitle:'Confirmation code',summaryRows:[['Code',code],['Expires in','10 minutes']],noteHtml:'If you did not request this change, do not share the code. Your current admin email remains unchanged.'});
    try {
      await sendConfiguredEmail(env,{to:nextEmail,subject:`${brand}: confirm your new admin email`,html,text:`Your ${brand} admin email confirmation code is ${code}. It expires in 10 minutes.`,fromName:brand},{purpose:'otp'});
    } catch (error) {
      await env.DB.prepare('DELETE FROM admin_email_change_requests WHERE id=?').bind(result?.id||0).run().catch(()=>{});
      return json({error:`Confirmation code was not sent: ${error.message || 'no email sender is connected'}. Connect and test an Email & OTP provider in Settings → Integrations, enable OTP sending, then try again.`},400);
    }
    return json({ ok:true, message:`A six-digit confirmation code was sent to ${nextEmail}. It expires in 10 minutes.` });
  }
  if (b.action === 'confirm_email_change') {
    if (!ctx.user) return json({ error:'Email change is only available for local admin users.' }, 400);
    const codeHash = await sha256Hex(String(b.code || '').trim());
    const row = await env.DB.prepare("SELECT * FROM admin_email_change_requests WHERE admin_user_id=? AND code_hash=? AND consumed=0 AND expires_at > CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1").bind(ctx.user.id, codeHash).first();
    if (!row) return json({ error:'Invalid or expired verification code.' }, 400);
    await env.DB.prepare('UPDATE admin_users SET email=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.new_email, ctx.user.id).run();
    await env.DB.prepare('UPDATE admin_email_change_requests SET consumed=1 WHERE id=?').bind(row.id).run();
    await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(ctx.user.id).run();
    return json({ ok:true, message:'Email updated. Please login again with the new email.' });
  }
  if (b.action === 'connect_google') {
    return json({ error:'Use Connect Google Account. You will be redirected to Google to choose and verify the account securely.' }, 400);
  }
  return json({ error:'Unknown security action.' }, 400);
}
