import { json, readJson, normalizePhone, sendWhatsAppText } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { contactContext } from '../../_lib/contact-context.js';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const TYPES={
  cancellation:'Cancel Subscription',
  pause:'Pause Subscription',
  restart:'Restart Subscription',
  invoice:'Invoice',
  statement:'Payment Statement',
  support:'Payment / Subscription Support'
};
function requestId(){return `REQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}

export async function onRequestPost({request,env}){
  const b=await readJson(request);
  const context=contactContext(request,b);
  if(String(b.website_url||'').trim())return json({ok:true});
  const name=clean(b.name,160),rawPhone=clean(b.phone,30),cc=clean(b.country_code||'91',6).replace(/\D/g,'')||'91',email=clean(b.email,220).toLowerCase(),type=clean(b.request_type,40).toLowerCase();
  if(!name)return json({error:'Please enter your name.'},400);
  if(!rawPhone||!/^[0-9]+$/.test(rawPhone))return json({error:'Please enter a valid WhatsApp number using numbers only.'},400);
  if(cc==='91'&&rawPhone.length!==10)return json({error:'For +91 India, enter exactly 10 digits without the country code.'},400);
  if(cc!=='91'&&(rawPhone.length<6||rawPhone.length>12))return json({error:'Please enter a valid WhatsApp number.'},400);
  if(!EMAIL_RE.test(email))return json({error:'Please enter a valid email address.'},400);
  if(!TYPES[type])return json({error:'Please choose what you are requesting.'},400);
  const pauseMonths=type==='pause'?Math.max(0,Math.min(24,Number(b.pause_months||0))):0,pauseUntil=type==='pause'?clean(b.pause_until,20):'';
  if(type==='pause'&&!pauseMonths&&!pauseUntil)return json({error:'Choose a pause duration or preferred resume date.'},400);
  const statementPeriod=type==='statement'?clean(b.statement_period,30):'',statementFrom=type==='statement'?clean(b.statement_from,20):'',statementTo=type==='statement'?clean(b.statement_to,20):'';
  if(type==='statement'&&statementPeriod==='custom'&&(!statementFrom||!statementTo))return json({error:'Choose both From and To dates for a custom statement period.'},400);
  if(statementFrom&&statementTo&&statementFrom>statementTo)return json({error:'Statement From date cannot be after To date.'},400);
  const phone=cc==='91'?normalizePhone(rawPhone):`${cc}${rawPhone}`,message=clean(b.message,5000),visitorId=clean(b.visitor_id,80);
  const requestSummary=[TYPES[type],type==='pause'&&pauseMonths?`${pauseMonths} month${pauseMonths===1?'':'s'}`:'',type==='pause'&&pauseUntil?`resume around ${pauseUntil}`:'',type==='statement'&&statementPeriod?`statement period ${statementPeriod}`:'',message].filter(Boolean).join(' • ');
  const merged=await mergeLeadSubmission(env,{name,phone,email,message:requestSummary,visitor_id:visitorId,source_detail:'/requests',...context},{submissionType:'request',source:'website'});
  const rid=requestId();
  await env.DB.prepare(`INSERT INTO service_requests(request_id,lead_id,customer_name,customer_phone,customer_email,request_type,request_label,pause_months,pause_until,statement_period,statement_from,statement_to,message,status,source)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'new','website')`).bind(rid,merged.lead.id,name,phone,email,type,TYPES[type],pauseMonths||null,pauseUntil||null,statementPeriod||null,statementFrom||null,statementTo||null,message||null).run();
  const adminNumber=env.WHATSAPP_ADMIN_NUMBER||'9193919375';
  await sendWhatsAppText(env,adminNumber,`${TYPES[type]} request\nReference: ${rid}\nName: ${name}\nPhone: +${phone}\nEmail: ${email}${requestSummary?`\nDetails: ${requestSummary}`:''}`).catch(()=>{});
  return json({ok:true,request_id:rid,lead_id:merged.lead.id,duplicate:merged.duplicate,message:'Your request has been received. Our team will review it.'});
}
