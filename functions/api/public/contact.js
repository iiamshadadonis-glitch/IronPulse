import { json, readJson, normalizePhone, sendWhatsAppText } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { contactContext } from '../../_lib/contact-context.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
function clean(v,max=2000){return String(v??'').trim().slice(0,max);}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const context = contactContext(request,body);
  if (String(body.website_url || body.company_website || '').trim()) return json({ ok:true, lead_id:null });

  const name = clean(body.name,160);
  const rawPhone = clean(body.phone,30);
  const countryCode = clean(body.country_code || '91',6).replace(/\D/g,'') || '91';
  const email = clean(body.email,220).toLowerCase();
  const message = clean(body.message,5000);
  const visitorId = clean(body.visitor_id,80);
  const sourceDetail = clean(body.source_detail,300);

  if(!name)return json({error:'Please enter your name.'},400);
  if(!rawPhone)return json({error:'Please enter your WhatsApp number.'},400);
  if(!/^\d+$/.test(rawPhone))return json({error:'WhatsApp number can contain numbers only.'},400);
  if(countryCode==='91' && rawPhone.length!==10)return json({error:'For +91 India, enter exactly 10 digits for the WhatsApp number.'},400);
  if(countryCode!=='91' && (rawPhone.length<6 || rawPhone.length>10))return json({error:'Enter a valid WhatsApp number using 6 to 10 digits.'},400);
  if(!email||!EMAIL_RE.test(email))return json({error:'Please enter a valid email address in the format name@domain.com, for example name@gmail.com.'},400);
  if(message.length<3)return json({error:'Please enter a short message so our team can understand your enquiry.'},400);

  const phone = countryCode==='91' ? normalizePhone(rawPhone) : `${countryCode}${rawPhone}`;
  const merged=await mergeLeadSubmission(env,{name,phone,email,message,visitor_id:visitorId,source_detail:sourceDetail,...context},{submissionType:'contact',source:'website'});
  const adminNumber = env.WHATSAPP_ADMIN_NUMBER || '9193919375';
  const mergeNote=merged.duplicate?`\nExisting client matched by: ${merged.matched_by}`:'';
  await sendWhatsAppText(env, adminNumber, `DropBeat Dance Studio lead\nName: ${name}\nPhone: +${phone}\nEmail: ${email}\nMessage: ${message}${mergeNote}`).catch(()=>{});
  return json({ ok:true, lead_id: merged.lead.id, duplicate:merged.duplicate, matched_by:merged.matched_by, message:merged.duplicate?'Your enquiry was added to your existing profile.':'Your enquiry was received.' });
}
