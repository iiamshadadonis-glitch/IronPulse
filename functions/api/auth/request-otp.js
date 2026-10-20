import { json, readJson, normalizePhone, sha256Hex, getPaymentSettings, getSocialIntegrationSettings, getSiteSettings, sendWhatsAppText } from '../../_lib/utils.js';
import { sendConfiguredEmail, getOutboundEmailSettings } from '../../_lib/outbound-email.js';
import { brandedEmailHtml, brandHomeUrl } from '../../_lib/branded-email.js';
import { gmailConnectionVerified } from '../../_lib/gmail-mailer.js';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);

async function sendEmailOtp(env,site,to,otp,customerName=''){
  const brand=clean(site?.siteName,160)||'DropBeat Dance Studio';
  const subject=`${brand} - Order Verification Code`;
  const html=brandedEmailHtml({
    site,env,title:'Order Verification Code',eyebrow:'Secure Order Access',customerName:customerName||'Customer',
    introHtml:'<p style="margin:0">Use the verification code below to securely view your private order and payment information.</p>',
    summaryTitle:'Your Verification Code',summaryRows:[['Verification Code',otp],['Valid For','10 minutes']],
    bodyHtml:'<p style="margin:0">Enter this code only on the official Student Dashboard sign-in page. For your security, do not share the code with anyone.</p>',
    noteHtml:'If you did not request this verification code, you can safely ignore this email.',
    ctaLabel:'Open Student Dashboard',ctaUrl:`${brandHomeUrl(env)}/student-dashboard`
  });
  const text=`Your ${brand} order verification code is ${otp}. It is valid for 10 minutes. Do not share this code.`;
  return sendConfiguredEmail(env,{to,subject,html,text,fromName:brand},{purpose:'otp'});
}

export async function onRequestPost({ request, env }) {
  const b=await readJson(request);
  const [payment,social,site,outbound]=await Promise.all([getPaymentSettings(env),getSocialIntegrationSettings(env),getSiteSettings(env),getOutboundEmailSettings(env)]);
  const gmail=social.gmail||{},fallbackKeys=[outbound.primaryProvider,'ses','lambda','mailchimp','mailersend','company'].filter((x,i,a)=>x&&x!=='gmail'&&a.indexOf(x)===i);
  const emailOtpEnabled=!!(gmail.otpEnabled&&gmailConnectionVerified(gmail))||fallbackKeys.some(key=>outbound[key]?.enabled&&outbound[key]?.otpEnabled);
  const channel=emailOtpEnabled?'email':(payment.whatsappOtpEnabled!==false?'whatsapp':'none');
  if(channel==='none')return json({error:'Order verification is currently unavailable. Please use the Contact page and the admin will help you access your order.'},503);

  let key='',lookupValue='';
  if(channel==='email'){
    const email=clean(b.email||b.identifier,240).toLowerCase();
    if(!EMAIL_RE.test(email))return json({error:'Enter the same valid email address that you used during checkout.'},400);
    key=`email:${email}`;lookupValue=email;
  }else{
    const phone=normalizePhone(b.phone||b.identifier);
    if(!phone)return json({error:'Enter the WhatsApp number that you used during checkout.'},400);
    key=phone;lookupValue=phone;
  }

  const recent=await env.DB.prepare("SELECT COUNT(*) c FROM otp_challenges WHERE phone=? AND created_at > datetime('now','-1 hour')").bind(key).first().catch(()=>({c:0}));
  if((recent?.c||0)>=5)return json({error:'Too many verification codes were requested for this account. Please wait before trying again.'},429);

  // Do not reveal whether the account exists. A non-matching identity receives the
  // same public response, but no OTP message is sent.
  const account=channel==='email'
    ? await env.DB.prepare('SELECT id,customer_name FROM orders WHERE lower(customer_email)=? ORDER BY id DESC LIMIT 1').bind(lookupValue).first().catch(()=>null)
    : await env.DB.prepare('SELECT id,customer_name FROM orders WHERE customer_phone=? ORDER BY id DESC LIMIT 1').bind(lookupValue).first().catch(()=>null);
  const publicMessage=channel==='email'
    ? 'If an account is linked to this email address, a verification code has been sent. Please check your inbox and Spam folder.'
    : 'If an account is linked to this number, a verification code has been sent on WhatsApp.';
  if(!account)return json({ok:true,channel,message:publicMessage});

  const otp=String(Math.floor(100000+Math.random()*900000));
  const hash=await sha256Hex(`${key}:${otp}:${env.AUTOMATION_API_KEY||'otp-salt'}`);
  await env.DB.prepare("INSERT INTO otp_challenges(phone,otp_hash,channel,expires_at) VALUES(?,?,?,datetime('now','+10 minutes'))").bind(key,hash,channel).run();
  try{
    if(channel==='email')await sendEmailOtp(env,site,lookupValue,otp,account.customer_name||'');
    else {
      const brand=clean(site?.siteName,160)||'DropBeat Dance Studio';
      const sent=await sendWhatsAppText(env,lookupValue,`Your ${brand} verification code is ${otp}. It is valid for 10 minutes. Do not share this code.`);
      if(!sent?.ok)throw new Error('WhatsApp verification is not fully connected. Please use Contact to ask the admin for help.');
    }
  }catch(e){
    await env.DB.prepare('UPDATE otp_challenges SET consumed=1 WHERE phone=? AND consumed=0').bind(key).run().catch(()=>{});
    return json({error:e.message||'The verification code could not be sent. Please try again or contact the admin.'},503);
  }
  return json({ok:true,channel,message:publicMessage});
}
