import { json, readJson, normalizePhone, sha256Hex, getPaymentSettings, getSocialIntegrationSettings } from '../../_lib/utils.js';
import { getOutboundEmailSettings } from '../../_lib/outbound-email.js';
import { gmailConnectionVerified } from '../../_lib/gmail-mailer.js';
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);

export async function onRequestPost({ request, env }) {
  const b=await readJson(request);
  const [payment,social,outbound]=await Promise.all([getPaymentSettings(env),getSocialIntegrationSettings(env),getOutboundEmailSettings(env)]);
  const gmail=social.gmail||{},fallbackKeys=[outbound.primaryProvider,'ses','lambda','mailchimp','mailersend','company'].filter((x,i,a)=>x&&x!=='gmail'&&a.indexOf(x)===i),emailOtpEnabled=!!(gmail.otpEnabled&&gmailConnectionVerified(gmail))||fallbackKeys.some(key=>outbound[key]?.enabled&&outbound[key]?.otpEnabled);
  const channel=clean(b.channel,20)|| (emailOtpEnabled?'email':(payment.whatsappOtpEnabled!==false?'whatsapp':'none'));
  let key='';
  if(channel==='email'){
    const email=clean(b.email||b.identifier,240).toLowerCase();
    if(!EMAIL_RE.test(email))return json({error:'Enter the same valid email address used during checkout.'},400);
    key=`email:${email}`;
  }else{
    const phone=normalizePhone(b.phone||b.identifier);
    if(!phone)return json({error:'Enter the WhatsApp number used during checkout.'},400);
    key=phone;
  }
  const otp=clean(b.otp,12);
  if(!/^\d{6}$/.test(otp))return json({error:'Enter the 6-digit verification code.'},400);
  const row=await env.DB.prepare("SELECT * FROM otp_challenges WHERE phone=? AND channel=? AND consumed=0 AND expires_at > CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1").bind(key,channel).first();
  if(!row)return json({error:'This verification code has expired or was not found. Request a new code and try again.'},400);
  if(row.attempts>=5)return json({error:'Too many incorrect attempts. Request a new verification code.'},429);
  const hash=await sha256Hex(`${key}:${otp}:${env.AUTOMATION_API_KEY||'otp-salt'}`);
  if(hash!==row.otp_hash){
    await env.DB.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=?').bind(row.id).run();
    return json({error:'The verification code is incorrect. Check the latest code and try again.'},400);
  }
  await env.DB.prepare('UPDATE otp_challenges SET consumed=1 WHERE id=?').bind(row.id).run();
  const token=crypto.randomUUID()+crypto.randomUUID();
  const tokenHash=await sha256Hex(token);
  await env.DB.prepare("INSERT INTO customer_sessions(phone,token_hash,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(key,tokenHash).run();
  return json({ok:true,token,channel});
}
