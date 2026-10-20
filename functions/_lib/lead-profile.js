import { normalizePhone } from './utils.js';
import { enrollEligibleLeads, processLeadNurture } from './lead-nurturing.js';
import { enrollEmailAutomationForEvent, processEmailAutomations } from './email-automations.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const digits=v=>String(v??'').replace(/\D/g,'');
const keyPhone=v=>{const d=digits(v);return d.length>=10?d.slice(-10):d;};
const keyInstagram=v=>clean(v,220).toLowerCase().replace(/^https?:\/\/(www\.)?instagram\.com\//,'').replace(/^@/,'').replace(/[/?#].*$/,'').trim();
export const SOCIAL_ID_FIELDS=['facebook_id','instagram_id','threads_id','snapchat_id','linkedin_id','twitter_id','pinterest_id','youtube_id','tiktok_id','telegram_id'];
const SOCIAL_HOSTS={
  facebook_id:/^(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\//i,
  instagram_id:/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
  threads_id:/^(?:https?:\/\/)?(?:www\.)?threads\.net\//i,
  snapchat_id:/^(?:https?:\/\/)?(?:www\.)?snapchat\.com\/(?:add\/)?/i,
  linkedin_id:/^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in\/|company\/)?/i,
  twitter_id:/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i,
  pinterest_id:/^(?:https?:\/\/)?(?:www\.)?pinterest\.[a-z.]+\//i,
  youtube_id:/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:@|channel\/|c\/|user\/)?|youtu\.be\/)/i,
  tiktok_id:/^(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i,
  telegram_id:/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i
};
function keySocial(field,value){
  let v=clean(value,500).toLowerCase().trim();if(!v)return'';
  v=v.replace(SOCIAL_HOSTS[field]||/^$/,'').replace(/^@/,'').trim();
  if(field==='facebook_id'&&/^profile\.php/i.test(v)){const m=v.match(/[?&]id=([^&]+)/i);if(m)return clean(m[1],500).toLowerCase();}
  v=v.replace(/[?#].*$/,'').replace(/\/+$/,'').trim();
  return v;
}

export function normalizeLeadCandidate(field,value){
  const v=clean(value,500);
  if(!v)return'';
  if(field==='phone')return keyPhone(v);
  if(field==='email')return v.toLowerCase();
  if(field==='instagram_id')return keyInstagram(v);
  if(SOCIAL_ID_FIELDS.includes(field))return keySocial(field,v);
  if(field==='visitor_id')return v.toLowerCase();
  return v.toLowerCase().replace(/\s+/g,' ').trim();
}

const IDENTITY_FIELDS=['name','phone','email','instagram_id','age','date_of_birth','gender','location','interests','current_occupation','experience_level','projects_count','future_goal','role_interest'];
const CONTACT_CONTEXT_FIELDS=['device_id','ip_address','country_code'];

function parseLinkJson(value){try{const v=JSON.parse(String(value||'[]'));return Array.isArray(v)?v.map(x=>clean(x,1200)).filter(Boolean):[];}catch(_){return[];}}
function mergeLinkSets(incoming=[],existing=[]){const seen=new Set(),out=[];for(const raw of [...incoming,...existing]){const v=clean(raw,1200);if(!v||seen.has(v))continue;seen.add(v);out.push(v);if(out.length>=5)break;}return out;}
async function mergeProfileMedia(env,leadId,input={}){
  if(!leadId)return;
  const photos=Array.isArray(input.photo_links)?input.photo_links:[];
  const videos=Array.isArray(input.video_links)?input.video_links:[];
  if(!photos.length&&!videos.length)return;
  const row=await env.DB.prepare('SELECT profile_photo_links,profile_video_links FROM contact_leads WHERE id=?').bind(leadId).first().catch(()=>null);
  const nextPhotos=photos.length?mergeLinkSets(photos,parseLinkJson(row?.profile_photo_links)):parseLinkJson(row?.profile_photo_links);
  const nextVideos=videos.length?mergeLinkSets(videos,parseLinkJson(row?.profile_video_links)):parseLinkJson(row?.profile_video_links);
  await env.DB.prepare('UPDATE contact_leads SET profile_photo_links=?,profile_video_links=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(JSON.stringify(nextPhotos),JSON.stringify(nextVideos),leadId).run().catch(()=>{});
}

async function candidateLead(env,field,normalized){
  if(!normalized)return null;
  return env.DB.prepare(`SELECT l.* FROM lead_field_candidates c JOIN contact_leads l ON l.id=c.lead_id WHERE c.field_name=? AND c.normalized_value=? ORDER BY COALESCE(l.updated_at,l.created_at) DESC,l.id DESC LIMIT 1`).bind(field,normalized).first().catch(()=>null);
}

export async function findLeadByIdentity(env,identities={}){
  const {visitor_id='',phone='',email='',instagram_id=''}=identities||{};
  const visitor=normalizeLeadCandidate('visitor_id',visitor_id);
  if(visitor){
    let lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE lower(COALESCE(visitor_id,\'\'))=? ORDER BY id DESC LIMIT 1').bind(visitor).first().catch(()=>null);
    if(!lead)lead=await candidateLead(env,'visitor_id',visitor);
    if(lead)return {lead,matched_by:'device'};
  }
  const phoneKey=normalizeLeadCandidate('phone',phone);
  if(phoneKey){
    let lead=await env.DB.prepare("SELECT * FROM contact_leads WHERE substr(replace(replace(replace(replace(COALESCE(phone,''),'+',''),' ',''),'-',''),'(',''),-10)=? ORDER BY id DESC LIMIT 1").bind(phoneKey).first().catch(()=>null);
    if(!lead)lead=await candidateLead(env,'phone',phoneKey);
    if(lead)return {lead,matched_by:'phone'};
  }
  const mail=normalizeLeadCandidate('email',email);
  if(mail){
    let lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE lower(COALESCE(email,\'\'))=? ORDER BY id DESC LIMIT 1').bind(mail).first().catch(()=>null);
    if(!lead)lead=await candidateLead(env,'email',mail);
    if(lead)return {lead,matched_by:'email'};
  }
  const ig=normalizeLeadCandidate('instagram_id',instagram_id);
  if(ig){
    let lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE lower(ltrim(COALESCE(instagram_id,\'\'),\'@\'))=? ORDER BY id DESC LIMIT 1').bind(ig).first().catch(()=>null);
    if(!lead)lead=await candidateLead(env,'instagram_id',ig);
    if(lead)return {lead,matched_by:'instagram'};
  }
  for(const field of SOCIAL_ID_FIELDS){
    if(field==='instagram_id')continue;
    const normalized=normalizeLeadCandidate(field,identities?.[field]);if(!normalized)continue;
    const lead=await candidateLead(env,field,normalized);
    if(lead)return {lead,matched_by:field.replace(/_id$/,'')};
  }
  return {lead:null,matched_by:''};
}

async function upsertCandidate(env,leadId,field,value,{primary=false,pending=false,source='website'}={}){
  const raw=clean(value,field==='name'?160:500);const norm=normalizeLeadCandidate(field,raw);if(!raw||!norm)return;
  await env.DB.prepare(`INSERT INTO lead_field_candidates(lead_id,field_name,value,normalized_value,is_primary,is_pending,source,last_seen_at)
    VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(lead_id,field_name,normalized_value) DO UPDATE SET
      value=excluded.value,
      is_primary=MAX(lead_field_candidates.is_primary,excluded.is_primary),
      is_pending=MAX(lead_field_candidates.is_pending,excluded.is_pending),
      source=excluded.source,
      last_seen_at=CURRENT_TIMESTAMP
    WHERE COALESCE(lead_field_candidates.value,'')<>COALESCE(excluded.value,'')
       OR lead_field_candidates.is_primary<excluded.is_primary
       OR lead_field_candidates.is_pending<excluded.is_pending`).bind(leadId,field,raw,norm,primary?1:0,pending?1:0,source).run().catch(()=>{});
}

async function ensureCurrentCandidates(env,lead){
  if(!lead?.id)return;
  const fields=IDENTITY_FIELDS;
  for(const field of fields){if(lead[field]!==null&&lead[field]!==undefined&&String(lead[field]).trim()!=='')await upsertCandidate(env,lead.id,field,lead[field],{primary:true,source:'existing'});}
  if(lead.visitor_id)await upsertCandidate(env,lead.id,'visitor_id',lead.visitor_id,{primary:true,source:'tracking'});
}

function dbValue(field,value){
  if(field==='phone')return normalizePhone(value);
  if(field==='email')return clean(value,220).toLowerCase();
  if(field==='instagram_id')return keyInstagram(value);
  if(field==='age'||field==='projects_count')return value===''||value===null||value===undefined?null:Math.max(0,Math.round(Number(value)||0));
  return clean(value,field==='name'?160:500);
}

function generatedName(value,lead={}){
  const raw=clean(value,160),key=normalizeLeadCandidate('name',raw);if(!key)return true;
  if(/^(customer|subscriber|lead|contact|whatsapp customer|instagram lead|facebook lead|social lead)$/.test(key))return true;
  if(/^\+?\d[\d\s().-]{6,}$/.test(raw)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))return true;
  return SOCIAL_ID_FIELDS.some(field=>normalizeLeadCandidate(field,lead[field])===key);
}

export async function mergeLeadSubmission(env,input={},opts={}){
  const submissionType=clean(opts.submissionType||input.submission_type||'contact',60)||'contact';
  const source=clean(opts.source||input.source||'website',80)||'website';
  const sourceDetail=clean(input.source_detail||opts.sourceDetail||'',300);
  const visitorId=clean(input.visitor_id,80);
  const phone=input.phone?normalizePhone(input.phone):'';
  const email=clean(input.email,220).toLowerCase();
  const instagram=keyInstagram(input.instagram_id);
  const socialIdentities={};for(const field of SOCIAL_ID_FIELDS){const value=field==='instagram_id'?instagram:clean(input[field],500);if(value)socialIdentities[field]=value;}
  let {lead,matched_by}=await findLeadByIdentity(env,{visitor_id:visitorId,phone,email,...socialIdentities});
  let created=false;
  if(!lead){
    const res=await env.DB.prepare(`INSERT INTO contact_leads(name,phone,email,message,source,status,visitor_id,source_detail,interest_level,assigned_to,instagram_id,age,date_of_birth,gender,location,interests,current_occupation,experience_level,projects_count,future_goal,role_interest,profile_message,profile_submitted,profile_updated_at,updated_at)
      VALUES(?,?,?,?,?,'new',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CASE WHEN ?='profile' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP)`).bind(
        clean(input.name||'Customer',160),phone,email,clean(input.message||input.profile_message||'',5000),source,visitorId,sourceDetail,clean(input.interest_level||'Warm',40),clean(input.assigned_to||'Admin',80),instagram,
        dbValue('age',input.age),dbValue('date_of_birth',input.date_of_birth||input.dob),dbValue('gender',input.gender),dbValue('location',input.location||input.city),dbValue('interests',input.interests||input.interest),dbValue('current_occupation',input.current_occupation),dbValue('experience_level',input.experience_level),dbValue('projects_count',input.projects_count),dbValue('future_goal',input.future_goal),dbValue('role_interest',input.role_interest),clean(input.profile_message||'',5000),submissionType==='profile'?1:0,submissionType
      ).run();
    lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(res.meta.last_row_id).first();
    created=true;matched_by='new';
  }else{
    await ensureCurrentCandidates(env,lead);
    const updateSet=[];const updateVals=[];
    if(visitorId&&!lead.visitor_id){updateSet.push('visitor_id=?');updateVals.push(visitorId);}
    const profileFields=IDENTITY_FIELDS;
    for(const field of profileFields){
      let incoming=input[field];if(field==='phone')incoming=phone;if(field==='email')incoming=email;if(field==='instagram_id')incoming=instagram;if(field==='date_of_birth')incoming=input.date_of_birth||input.dob;if(field==='location')incoming=input.location||input.city;if(field==='interests')incoming=input.interests||input.interest;
      if(incoming===undefined||incoming===null||String(incoming).trim()==='')continue;
      const current=lead[field];const inNorm=normalizeLeadCandidate(field,incoming),curNorm=normalizeLeadCandidate(field,current);
      if(!curNorm){updateSet.push(`${field}=?`);updateVals.push(dbValue(field,incoming));await upsertCandidate(env,lead.id,field,incoming,{primary:true,source:submissionType});}
      else if(field==='name'&&generatedName(current,lead)&&!generatedName(incoming,{...lead,name:incoming})){updateSet.push('name=?');updateVals.push(dbValue('name',incoming));await upsertCandidate(env,lead.id,'name',current,{pending:true,source:'previous_primary'});await upsertCandidate(env,lead.id,'name',incoming,{primary:true,source:submissionType});}
      else if(inNorm!==curNorm){await upsertCandidate(env,lead.id,field,incoming,{pending:true,source:submissionType});}
      else await upsertCandidate(env,lead.id,field,incoming,{primary:true,source:submissionType});
    }
    if(visitorId)await upsertCandidate(env,lead.id,'visitor_id',visitorId,{primary:!lead.visitor_id||normalizeLeadCandidate('visitor_id',lead.visitor_id)===normalizeLeadCandidate('visitor_id',visitorId),pending:false,source:'tracking'});
    if(submissionType==='profile'){
      updateSet.push('profile_submitted=1','profile_updated_at=CURRENT_TIMESTAMP');
      if(!lead.profile_message&&input.profile_message){updateSet.push('profile_message=?');updateVals.push(clean(input.profile_message,5000));}
    }
    updateSet.push('updated_at=CURRENT_TIMESTAMP');
    if(updateSet.length)await env.DB.prepare(`UPDATE contact_leads SET ${updateSet.join(',')} WHERE id=?`).bind(...updateVals,lead.id).run();
    lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(lead.id).first();
  }
  await ensureCurrentCandidates(env,lead);
  // Non-Instagram social identities intentionally stay in the existing generic
  // candidate table. This adds cross-platform matching without adding columns or
  // migrations to contact_leads, and it only writes when a capture supplies an ID.
  for(const field of SOCIAL_ID_FIELDS){
    if(field==='instagram_id')continue;
    const value=socialIdentities[field];if(value)await upsertCandidate(env,lead.id,field,value,{primary:true,pending:false,source:submissionType||source});
  }
  // Operational context is kept as alternate contact metadata rather than used
  // as an automatic identity-merge key. IP addresses can be shared or change;
  // treating them as a person identifier would merge unrelated people.
  for(const field of CONTACT_CONTEXT_FIELDS){
    const value=field==='device_id'?(input.device_id||visitorId):input[field];
    if(value)await upsertCandidate(env,lead.id,field,value,{primary:true,pending:false,source:'consented_tracking'});
  }
  if(submissionType==='profile')await mergeProfileMedia(env,lead.id,input);
  lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(lead.id).first();
  const submissionRes=await env.DB.prepare(`INSERT INTO lead_submissions(lead_id,submission_type,visitor_id,source_detail,message,payload_json,status,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(lead.id,submissionType,visitorId,sourceDetail,clean(input.message||input.profile_message||'',5000),JSON.stringify(input),['contact','comment'].includes(submissionType)?'new':'recorded').run().catch(()=>null);
  // Enrol immediately after every first-party or connected-platform lead capture.
  // Delivery failures never roll back the already-saved lead/submission.
  if(!opts.skipNurture)try{await enrollEligibleLeads(env,{leadId:Number(lead.id),limit:30});await processLeadNurture(env,{leadId:Number(lead.id),limit:20,enroll:false});}catch(_){ }
  if(!opts.skipNurture)try{await enrollEmailAutomationForEvent(env,{leadId:Number(lead.id),eventType:created?'lead_created':'lead_updated',context:{submissionType,source,eventId:`submission-${Number(submissionRes?.meta?.last_row_id||0)}`}});await processEmailAutomations(env,{leadId:Number(lead.id),limit:20});}catch(_){ }
  return {lead,created,duplicate:!created,matched_by,submission_id:Number(submissionRes?.meta?.last_row_id||0)||0};
}

async function findGatewayLeadExact(env,{phone='',email=''}={}){
  // Payment-gateway data is allowed to ENRICH an existing local client only.
  // It must never create or discover a lead by visitor id, Instagram id, name,
  // or historical candidate values. This prevents an old merchant account from
  // repopulating the Business Dashboard with unrelated gateway customers.
  const phoneKey=keyPhone(phone);
  if(phoneKey){
    const lead=await env.DB.prepare("SELECT * FROM contact_leads WHERE substr(replace(replace(replace(replace(replace(COALESCE(phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=? ORDER BY id DESC LIMIT 1").bind(phoneKey).first().catch(()=>null);
    if(lead)return {lead,matched_by:'phone'};
  }
  const mail=clean(email,220).toLowerCase();
  if(mail){
    const lead=await env.DB.prepare("SELECT * FROM contact_leads WHERE lower(trim(COALESCE(email,'')))=? ORDER BY id DESC LIMIT 1").bind(mail).first().catch(()=>null);
    if(lead)return {lead,matched_by:'email'};
  }
  return {lead:null,matched_by:''};
}

export async function mergeGatewayIdentity(env,{name='',phone='',email='',gateway='',subscription_id='',payment_id='',order_id=''}={}){
  const source=clean(gateway||'payment_gateway',80).toLowerCase()||'payment_gateway';
  const cleanPhone=phone?normalizePhone(phone):'';
  const cleanEmail=clean(email,220).toLowerCase();
  const cleanName=clean(name,160);
  if(!cleanPhone&&!cleanEmail)return {lead:null,created:false,matched_by:''};
  const found=await findGatewayLeadExact(env,{phone:cleanPhone,email:cleanEmail});
  let lead=found.lead;
  const created=false;
  // IMPORTANT: no INSERT here. Gateway-only customers remain visible in live
  // subscription/payment screens, but are never persisted as CRM leads unless
  // the customer already exists locally with the exact phone or email.
  if(!lead)return {lead:null,created:false,matched_by:''};
  await ensureCurrentCandidates(env,lead);
  const fields={name:cleanName,phone:cleanPhone,email:cleanEmail};
  for(const [field,value] of Object.entries(fields)){
    if(!value)continue;
    const cur=normalizeLeadCandidate(field,lead[field]),incoming=normalizeLeadCandidate(field,value);
    if(!cur){
      await env.DB.prepare(`UPDATE contact_leads SET ${field}=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(dbValue(field,value),lead.id).run().catch(()=>{});
      await upsertCandidate(env,lead.id,field,value,{primary:true,pending:false,source});
      lead[field]=dbValue(field,value);
    }else if(cur!==incoming){
      await upsertCandidate(env,lead.id,field,value,{primary:false,pending:true,source});
    }else{
      await upsertCandidate(env,lead.id,field,value,{primary:true,pending:false,source});
    }
  }
  const set=[],vals=[];
  if(subscription_id&&!lead.gateway_subscription_id){set.push('gateway_subscription_id=?');vals.push(clean(subscription_id,180));}
  if(payment_id&&!lead.gateway_payment_id){set.push('gateway_payment_id=?');vals.push(clean(payment_id,180));}
  if(order_id&&!lead.order_id){set.push('order_id=?');vals.push(clean(order_id,100));}
  if(set.length){set.push('updated_at=CURRENT_TIMESTAMP');await env.DB.prepare(`UPDATE contact_leads SET ${set.join(',')} WHERE id=?`).bind(...vals,lead.id).run().catch(()=>{});}
  lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(lead.id).first().catch(()=>lead);
  return {lead,created,matched_by:found.matched_by||''};
}


// Add identity values to a lead that has ALREADY been resolved by the existing
// relationship logic (for example an older checkout/order linked to this client).
// This deliberately does not perform another match and does not create a new
// submission. It uses the same candidate rules as mergeLeadSubmission: blank
// confirmed fields are filled, matching values are reaffirmed, and different
// values become pending dropdown candidates without overwriting the confirmed one.
export async function mergeKnownLeadCandidates(env,leadId,input={},source='historical'){
  if(!leadId)return null;
  let lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(Number(leadId)).first().catch(()=>null);
  if(!lead)return null;
  await ensureCurrentCandidates(env,lead);
  const fields=['name','phone','email','instagram_id'];
  for(const field of fields){
    let incoming=input[field];
    if(field==='phone')incoming=incoming?normalizePhone(incoming):'';
    if(field==='email')incoming=clean(incoming,220).toLowerCase();
    if(field==='instagram_id')incoming=keyInstagram(incoming);
    if(incoming===undefined||incoming===null||String(incoming).trim()==='')continue;
    const current=lead[field],inNorm=normalizeLeadCandidate(field,incoming),curNorm=normalizeLeadCandidate(field,current);
    if(!curNorm){
      await env.DB.prepare(`UPDATE contact_leads SET ${field}=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(dbValue(field,incoming),lead.id).run().catch(()=>{});
      await upsertCandidate(env,lead.id,field,incoming,{primary:true,pending:false,source});
      lead[field]=dbValue(field,incoming);
    }else if(inNorm!==curNorm){
      await upsertCandidate(env,lead.id,field,incoming,{primary:false,pending:true,source});
    }else{
      await upsertCandidate(env,lead.id,field,incoming,{primary:true,pending:false,source});
    }
  }
  await ensureCurrentCandidates(env,lead);
  return env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(lead.id).first().catch(()=>lead);
}


// Batch variant used by the client-details recovery path. It preserves the exact
// merge rules of mergeKnownLeadCandidates, but resolves the lead and seeds the
// current values only once instead of repeating that work for every historical
// order/subscriber. This keeps older alternate identities recoverable without
// making the Client Details modal wait on dozens of redundant D1 round-trips.
export async function mergeKnownLeadCandidateBatch(env,leadId,inputs=[],defaultSource='historical'){
  if(!leadId)return null;
  let lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(Number(leadId)).first().catch(()=>null);
  if(!lead)return null;
  await ensureCurrentCandidates(env,lead);
  const seen=new Set();
  for(const item of (Array.isArray(inputs)?inputs:[])){
    const source=clean(item?.source||defaultSource,80)||defaultSource;
    const values=item?.values||item||{};
    for(const field of ['name','phone','email','instagram_id']){
      let incoming=values[field];
      if(field==='phone')incoming=incoming?normalizePhone(incoming):'';
      if(field==='email')incoming=clean(incoming,220).toLowerCase();
      if(field==='instagram_id')incoming=keyInstagram(incoming);
      if(incoming===undefined||incoming===null||String(incoming).trim()==='')continue;
      const inNorm=normalizeLeadCandidate(field,incoming);if(!inNorm)continue;
      const uniq=`${field}:${inNorm}`;if(seen.has(uniq))continue;seen.add(uniq);
      const current=lead[field],curNorm=normalizeLeadCandidate(field,current);
      if(!curNorm){
        const value=dbValue(field,incoming);
        await env.DB.prepare(`UPDATE contact_leads SET ${field}=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(value,lead.id).run().catch(()=>{});
        await upsertCandidate(env,lead.id,field,incoming,{primary:true,pending:false,source});
        lead[field]=value;
      }else if(inNorm!==curNorm){
        await upsertCandidate(env,lead.id,field,incoming,{primary:false,pending:true,source});
      }else{
        await upsertCandidate(env,lead.id,field,incoming,{primary:true,pending:false,source});
      }
    }
  }
  return env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(lead.id).first().catch(()=>lead);
}

export async function getLeadCandidates(env,leadId){
  if(!leadId)return {map:{},pending_count:0};
  const rows=(await env.DB.prepare('SELECT * FROM lead_field_candidates WHERE lead_id=? ORDER BY field_name,is_primary DESC,is_pending DESC,last_seen_at DESC,id DESC').bind(leadId).all().catch(()=>({results:[]}))).results||[];
  const map={};let pending=0;
  for(const r of rows){(map[r.field_name]||(map[r.field_name]=[])).push(r);if(Number(r.is_pending||0))pending++;}
  return {map,pending_count:pending};
}

export async function saveLeadPrimaryFields(env,leadId,values={},source='admin'){
  const lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(leadId).first();if(!lead)throw new Error('Client lead not found.');
  const set=[],binds=[];
  for(const field of IDENTITY_FIELDS){
    if(!Object.prototype.hasOwnProperty.call(values,field))continue;
    const raw=values[field];const value=dbValue(field,raw);
    set.push(`${field}=?`);binds.push(value);
    await env.DB.prepare('UPDATE lead_field_candidates SET is_primary=0,is_pending=0,last_seen_at=CURRENT_TIMESTAMP WHERE lead_id=? AND field_name=?').bind(leadId,field).run().catch(()=>{});
    if(value!==null&&value!==undefined&&String(value).trim()!=='')await upsertCandidate(env,leadId,field,value,{primary:true,pending:false,source});
  }
  if(Object.prototype.hasOwnProperty.call(values,'profile_message')){set.push('profile_message=?');binds.push(clean(values.profile_message,5000));}
  if(set.length){set.push('updated_at=CURRENT_TIMESTAMP');await env.DB.prepare(`UPDATE contact_leads SET ${set.join(',')} WHERE id=?`).bind(...binds,leadId).run();}
  return env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(leadId).first();
}

export async function saveLeadSocialFields(env,leadId,values={},source='admin'){
  const id=Number(leadId||0);if(!id)throw new Error('Client lead not found.');
  const existing=(await env.DB.prepare("SELECT field_name,normalized_value,is_primary,is_pending FROM lead_field_candidates WHERE lead_id=? AND (field_name LIKE '%_id')").bind(id).all().catch(()=>({results:[]}))).results||[];
  for(const field of SOCIAL_ID_FIELDS){
    if(field==='instagram_id'||!Object.prototype.hasOwnProperty.call(values,field))continue;
    const value=clean(values[field],500),normalized=normalizeLeadCandidate(field,value),active=existing.filter(x=>x.field_name===field&&(Number(x.is_primary||0)===1||Number(x.is_pending||0)===1));
    if(!normalized&&!active.length)continue;
    if(normalized&&active.length===1&&active[0].normalized_value===normalized&&Number(active[0].is_primary||0)===1&&!Number(active[0].is_pending||0))continue;
    await env.DB.prepare('UPDATE lead_field_candidates SET is_primary=0,is_pending=0,last_seen_at=CURRENT_TIMESTAMP WHERE lead_id=? AND field_name=?').bind(id,field).run().catch(()=>{});
    if(normalized)await upsertCandidate(env,id,field,value,{primary:true,pending:false,source});
  }
  return {ok:true,lead_id:id};
}
