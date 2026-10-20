import {
  json, readJson, requireAdmin, normalizePhone, rupeesToPaise, orderId,
  getPaymentSettings, getSiteSettings, getSocialIntegrationSettings, razorpayApi, safeJsonParse,
  sendWhatsAppText, sendEmailNotice, preferredPublicOrigin
} from '../../_lib/utils.js';
import { findLeadByIdentity, getLeadCandidates, saveLeadPrimaryFields, saveLeadSocialFields, mergeKnownLeadCandidateBatch } from '../../_lib/lead-profile.js';
import { createCheckoutWithFallback, phonePeSubscriptionStatus, cancelPhonePeSubscription } from '../../_lib/payment-gateways.js';
import { paymentReceiptsForOrders, recordPaymentReceipt } from '../../_lib/payment-receipts.js';
import { calculateTaxBreakdown } from '../../_lib/taxes.js';
import { brandedEmailHtml, brandHomeUrl, emailMoney } from '../../_lib/branded-email.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const titleCase=s=>String(s||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const digits=v=>String(v??'').replace(/\D/g,'');
const localDigits=v=>{const d=digits(v);return d.length===12&&d.startsWith('91')?d.slice(2):d;};
const nowIso=()=>new Date().toISOString();
const inrPaise=v=>Math.max(0,Math.round(Number(v||0)));
function parseLinks(v){try{const a=JSON.parse(String(v||'[]'));return Array.isArray(a)?a.map(x=>clean(x,1200)).filter(Boolean).slice(0,5):[];}catch(_){return[];}}
const SOCIAL_PROFILES=[
  {platform:'instagram',field:'instagram_id',label:'Instagram ID'},
  {platform:'facebook',field:'facebook_id',label:'Facebook ID'},
  {platform:'threads',field:'threads_id',label:'Threads ID'},
  {platform:'snapchat',field:'snapchat_id',label:'Snapchat ID'},
  {platform:'linkedin',field:'linkedin_id',label:'LinkedIn ID'},
  {platform:'x',field:'twitter_id',label:'X / Twitter ID'},
  {platform:'pinterest',field:'pinterest_id',label:'Pinterest ID'},
  {platform:'youtube',field:'youtube_id',label:'YouTube ID'},
  {platform:'tiktok',field:'tiktok_id',label:'TikTok ID'},
  {platform:'telegram',field:'telegram_id',label:'Telegram ID'}
];
function publicUrl(value){const raw=clean(value,2000);if(!/^https?:\/\//i.test(raw))return'';try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.toString():'';}catch{return'';}}
const SOCIAL_HOSTS={
  instagram:/^(?:www\.)?instagram\.com$/i,facebook:/^(?:www\.|m\.)?facebook\.com$/i,threads:/^(?:www\.)?threads\.net$/i,
  snapchat:/^(?:www\.)?snapchat\.com$/i,linkedin:/^(?:www\.)?linkedin\.com$/i,x:/^(?:www\.)?(?:x|twitter)\.com$/i,
  pinterest:/^(?:www\.)?pinterest\.[a-z.]+$/i,youtube:/^(?:www\.)?(?:youtube\.com|youtu\.be)$/i,tiktok:/^(?:www\.)?tiktok\.com$/i,
  telegram:/^(?:www\.)?(?:t\.me|telegram\.me)$/i
};
function platformPublicUrl(platform,value){const direct=publicUrl(value);if(!direct)return'';try{return SOCIAL_HOSTS[platform]?.test(new URL(direct).hostname)?direct:'';}catch{return'';}}
function socialHandle(platform,value){
  let v=clean(value,500);if(!v)return'';const direct=publicUrl(v);
  if(direct){try{const u=new URL(direct),parts=u.pathname.split('/').filter(Boolean);if(platform==='facebook'&&u.pathname.toLowerCase().includes('profile.php'))return u.searchParams.get('id')||v;if(platform==='linkedin'&&['in','company'].includes(parts[0]))parts.shift();v=parts.pop()||v;}catch(_){}}
  return v.replace(/^@/,'').replace(/[?#].*$/,'').replace(/\/+$/,'').trim();
}
function socialHref(platform,value,preferred=''){
  const direct=platformPublicUrl(platform,preferred)||platformPublicUrl(platform,value);if(direct)return direct;const h=socialHandle(platform,value);if(!h)return'';
  // Provider-scoped numeric participant IDs are useful for matching, but most
  // are not public profile handles. Keep them visible without inventing a URL.
  if(/^\d+$/.test(h))return'';
  const e=encodeURIComponent(h);
  return ({instagram:`https://www.instagram.com/${e}/`,facebook:`https://www.facebook.com/${e}`,threads:`https://www.threads.net/@${e}`,snapchat:`https://www.snapchat.com/add/${e}`,linkedin:`https://www.linkedin.com/in/${e}`,x:`https://x.com/${e}`,pinterest:`https://www.pinterest.com/${e}/`,youtube:h.startsWith('UC')?`https://www.youtube.com/channel/${e}`:`https://www.youtube.com/@${e}`,tiktok:`https://www.tiktok.com/@${e}`,telegram:`https://t.me/${e}`})[platform]||'';
}
function socialProfileBundle(lead={},candidateBundle={},identityLinks=[]){
  const map=candidateBundle?.map||{},out=[];
  for(const cfg of SOCIAL_PROFILES){
    const active=(map[cfg.field]||[]).filter(x=>Number(x.is_primary||0)===1||Number(x.is_pending||0)===1),profileUrls=(map[cfg.field.replace(/_id$/,'_profile_url')]||[]).filter(x=>Number(x.is_primary||0)===1||Number(x.is_pending||0)===1).map(x=>clean(x.value,2000)).filter(Boolean),values=[];
    if(cfg.field==='instagram_id'&&lead.instagram_id)values.push({value:lead.instagram_id,href:'',source:'existing'});active.forEach(x=>values.push({value:x.value,href:'',source:x.source||''}));
    for(const row of identityLinks||[]){const p=String(row.platform||'').toLowerCase()==='twitter'?'x':String(row.platform||'').toLowerCase();if(p!==cfg.platform)continue;values.push({value:clean(row.participant_username,500)||clean(row.external_id,500),href:clean(row.participant_profile_url,2000),source:p});}
    const seen=new Set();for(const item of values){const raw=item.value,id=socialHandle(cfg.platform,raw),key=id.toLowerCase();if(!id||seen.has(key))continue;seen.add(key);const at=['instagram','threads','x','tiktok','telegram'].includes(cfg.platform)&&!/^\d+$/.test(id)?'@':'',candidateHref=values.length===1&&profileUrls.length===1?profileUrls[0]:'';out.push({platform:cfg.platform,field:cfg.field,label:cfg.label,id,display:`${at}${id}`,href:socialHref(cfg.platform,raw,item.href||candidateHref),source:item.source||''});}
  }
  return out;
}

async function stripeApi(env,path,{method='GET',params=null}={}){
  const s=await getPaymentSettings(env);
  const key=env.STRIPE_SECRET_KEY||s.stripeSecretKey;
  if(!key)throw new Error('Stripe credentials not configured');
  const init={method,headers:{authorization:`Bearer ${key}`}};
  if(params&&method!=='GET'){
    const body=new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{
      if(v===undefined||v===null)return;
      if(Array.isArray(v))v.forEach(x=>body.append(k,String(x)));else body.append(k,String(v));
    });
    init.headers['content-type']='application/x-www-form-urlencoded';
    init.body=body.toString();
  }
  const res=await fetch(`https://api.stripe.com/v1${path}`,init);
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||'Stripe API failed');
  return data;
}

function queryIdentity(url){
  return {
    leadId:Number(url.searchParams.get('lead_id')||url.searchParams.get('id')||0),
    orderId:clean(url.searchParams.get('order_id'),180),
    subscriberId:Number(url.searchParams.get('subscriber_id')||0),
    refundId:clean(url.searchParams.get('refund_id'),180),
    q:clean(url.searchParams.get('q'),300)
  };
}

async function resolveSeed(env,ident){
  let lead=null, order=null, subscriber=null, refund=null;
  if(ident.leadId)lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(ident.leadId).first();
  if(ident.orderId)order=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(ident.orderId).first();
  if(ident.subscriberId){
    if(ident.subscriberId<0){
      // The Customers list gives reconciled paid orders a negative synthetic
      // subscriber id. Those rows live in orders, not in subscribers.
      order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(-ident.subscriberId).first();
    }else subscriber=await env.DB.prepare('SELECT * FROM subscribers WHERE id=?').bind(ident.subscriberId).first();
  }
  if(ident.refundId){
    const asNum=Number(ident.refundId||0);
    refund=asNum?await env.DB.prepare('SELECT * FROM refund_requests WHERE id=? OR refund_id=? ORDER BY id DESC LIMIT 1').bind(asNum,ident.refundId).first():await env.DB.prepare('SELECT * FROM refund_requests WHERE refund_id=? ORDER BY id DESC LIMIT 1').bind(ident.refundId).first();
  }
  if(ident.q&&!lead&&!order&&!subscriber&&!refund){
    const q=ident.q, like=`%${q}%`, qDigits=localDigits(q);
    lead=await env.DB.prepare(`SELECT * FROM contact_leads WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR instagram_id LIKE ? OR order_id LIKE ? OR gateway_subscription_id LIKE ? OR gateway_payment_id LIKE ? OR EXISTS (SELECT 1 FROM lead_field_candidates c WHERE c.lead_id=contact_leads.id AND c.value LIKE ?) ORDER BY id DESC LIMIT 1`).bind(like,like,like,like,like,like,like,like).first().catch(()=>null);
    if(!lead)order=await env.DB.prepare(`SELECT * FROM orders WHERE order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ? OR gateway_subscription_id LIKE ? OR gateway_payment_id LIKE ? ORDER BY id DESC LIMIT 1`).bind(like,like,qDigits?`%${qDigits}%`:like,like,like,like).first().catch(()=>null);
    if(!lead&&!order)subscriber=await env.DB.prepare(`SELECT * FROM subscribers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR gateway_subscription_id LIKE ? ORDER BY id DESC LIMIT 1`).bind(like,qDigits?`%${qDigits}%`:like,like,like).first().catch(()=>null);
  }
  return {lead,order,subscriber,refund};
}

function seedProfile(seed){
  const {lead,order,subscriber,refund}=seed;
  const phone=lead?.phone||order?.website_phone||order?.customer_phone||order?.razorpay_phone||subscriber?.phone||refund?.customer_phone||'';
  const email=lead?.email||order?.customer_email||subscriber?.email||'';
  const name=lead?.name||order?.customer_name||subscriber?.name||refund?.customer_name||'';
  const visitorId=lead?.visitor_id||'';
  return {phone,email,name,visitorId,leadId:lead?.id||0};
}

async function findRelatedLead(env,profile,seed){
  if(seed.lead)return seed.lead;
  const where=[],binds=[];const ld=localDigits(profile.phone);
  if(ld){where.push('phone LIKE ?');binds.push(`%${ld}%`);}
  if(profile.email){where.push('lower(email)=lower(?)');binds.push(profile.email);}
  if(seed.order?.order_id){where.push('order_id=?');binds.push(seed.order.order_id);}
  if(seed.order?.gateway_subscription_id||seed.subscriber?.gateway_subscription_id){where.push('gateway_subscription_id=?');binds.push(seed.order?.gateway_subscription_id||seed.subscriber?.gateway_subscription_id);}
  if(seed.order?.gateway_payment_id){where.push('gateway_payment_id=?');binds.push(seed.order.gateway_payment_id);}
  if(!where.length)return null;
  return env.DB.prepare(`SELECT * FROM contact_leads WHERE ${where.join(' OR ')} ORDER BY id DESC LIMIT 1`).bind(...binds).first().catch(()=>null);
}

async function ensureLead(env,payload={}){
  let lead=null;
  if(payload.lead_id)lead=await env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(Number(payload.lead_id)).first();
  if(lead)return lead;
  const phone=normalizePhone(payload.phone||payload.customer_phone||'');
  const email=clean(payload.email||payload.customer_email,220).toLowerCase();
  const matched=await findLeadByIdentity(env,{visitor_id:payload.visitor_id||'',phone,email,instagram_id:payload.instagram_id||''});
  if(matched.lead)return matched.lead;
  const name=clean(payload.name||payload.customer_name||'Customer',160);
  const visitorId=clean(payload.visitor_id,80);
  const result=await env.DB.prepare(`INSERT INTO contact_leads(name,phone,email,message,source,status,visitor_id,source_detail,interest_level,assigned_to,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(name,phone,email,'','admin_crm','new',visitorId,'admin-client-crm',clean(payload.interest_level||'Warm',40),clean(payload.assigned_to||'Admin',80)).run();
  return env.DB.prepare('SELECT * FROM contact_leads WHERE id=?').bind(result.meta.last_row_id).first();
}

async function relatedOrders(env,profile,lead,seed){
  const where=[],binds=[];const ld=localDigits(profile.phone||lead?.phone);
  if(ld){const like=`%${ld}%`;where.push('(customer_phone LIKE ? OR website_phone LIKE ? OR razorpay_phone LIKE ?)');binds.push(like,like,like);}
  const email=profile.email||lead?.email||'';if(email){where.push('lower(customer_email)=lower(?)');binds.push(email);}
  const orderIds=[lead?.order_id,seed.order?.order_id,seed.refund?.order_id].filter(Boolean);for(const id of orderIds){where.push('order_id=?');binds.push(id);}
  const subIds=[lead?.gateway_subscription_id,seed.order?.gateway_subscription_id,seed.subscriber?.gateway_subscription_id,seed.refund?.subscription_id].filter(Boolean);for(const id of subIds){where.push('gateway_subscription_id=?');binds.push(id);}
  const payIds=[lead?.gateway_payment_id,seed.order?.gateway_payment_id,seed.refund?.payment_id].filter(Boolean);for(const id of payIds){where.push('gateway_payment_id=?');binds.push(id);}
  if(!where.length)return [];
  const r=await env.DB.prepare(`SELECT * FROM orders WHERE ${where.join(' OR ')} ORDER BY created_at DESC,id DESC LIMIT 100`).bind(...binds).all();
  return r.results||[];
}

async function relatedSubscribers(env,profile,orders,seed){
  const where=[],binds=[];const ld=localDigits(profile.phone);
  if(ld){where.push('phone LIKE ?');binds.push(`%${ld}%`);}
  if(profile.email){where.push('lower(email)=lower(?)');binds.push(profile.email);}
  const subs=[seed.subscriber?.gateway_subscription_id,...orders.map(o=>o.gateway_subscription_id)].filter(Boolean);for(const x of subs){where.push('gateway_subscription_id=?');binds.push(x);}
  if(!where.length)return [];
  const r=await env.DB.prepare(`SELECT * FROM subscribers WHERE ${where.join(' OR ')} ORDER BY updated_at DESC,id DESC LIMIT 50`).bind(...binds).all();
  return r.results||[];
}

async function pageStats(env,visitorId){
  if(!visitorId)return {visit_count:0,time_spent_ms:0,first_visit:null,last_visit:null,pages:[],source:''};
  const [summary,p,sourceResult]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) visit_count,COALESCE(SUM(duration_ms),0) time_spent_ms,MIN(created_at) first_visit,MAX(created_at) last_visit FROM visitor_events WHERE visitor_id=?`).bind(visitorId).first().catch(()=>null),
    env.DB.prepare(`SELECT path,COUNT(*) visits,COALESCE(SUM(duration_ms),0) time_spent_ms,MIN(created_at) first_seen,MAX(created_at) last_seen FROM visitor_events WHERE visitor_id=? GROUP BY path ORDER BY time_spent_ms DESC,visits DESC,last_seen DESC`).bind(visitorId).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT COALESCE(NULLIF(TRIM(source),''),'Direct / unknown') source,MIN(COALESCE(referrer,'')) referrer,COUNT(*) visits,MIN(created_at) first_seen,MAX(created_at) last_seen FROM visitor_events WHERE visitor_id=? GROUP BY LOWER(COALESCE(NULLIF(TRIM(source),''),'Direct / unknown')) ORDER BY first_seen`).bind(visitorId).all().catch(()=>({results:[]}))
  ]);
  const sourceRows=sourceResult?.results||[];
  return {...(summary||{}),pages:p?.results||[],source:sourceRows[0]?.source||'',referrer:sourceRows[0]?.referrer||'',sources:sourceRows};
}

async function orderItems(env,orders){
  const ids=orders.map(o=>Number(o.id)).filter(Boolean);if(!ids.length)return [];
  const ph=ids.map(()=>'?').join(',');
  const sql=`SELECT oi.*,o.order_id public_order_id,p.id product_catalog_id,p.features_json product_features_json,p.trial_enabled product_trial_enabled,p.trial_amount_paise product_trial_amount_paise,p.trial_value product_trial_value,p.trial_unit product_trial_unit,p.billing_period product_billing_period,(SELECT GROUP_CONCAT(DISTINCT pp.page_key) FROM page_placements pp WHERE pp.product_id=oi.product_id AND COALESCE(pp.visible,1)=1) product_pages FROM order_items oi JOIN orders o ON o.id=oi.order_id LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id IN (${ph}) ORDER BY oi.id DESC`;
  try{
    const r=await env.DB.prepare(sql).bind(...ids).all();return r.results||[];
  }catch(e){
    // Backward-compatible safety for an older live D1 database while the
    // automatic schema upgrader adds V14.5+ plan/trial columns.
    if(!/no such column/i.test(String(e?.message||e)))throw e;
    const fallback=await env.DB.prepare(`SELECT oi.*,o.order_id public_order_id,NULL product_catalog_id,'[]' product_features_json,0 product_trial_enabled,100 product_trial_amount_paise,7 product_trial_value,'days' product_trial_unit,'monthly' product_billing_period,(SELECT GROUP_CONCAT(DISTINCT pp.page_key) FROM page_placements pp WHERE pp.product_id=oi.product_id AND COALESCE(pp.visible,1)=1) product_pages FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.order_id IN (${ph}) ORDER BY oi.id DESC`).bind(...ids).all();
    return fallback.results||[];
  }
}

async function followups(env,leadId){
  if(!leadId)return [];
  const r=await env.DB.prepare('SELECT * FROM lead_followups WHERE lead_id=? ORDER BY followup_date DESC,id DESC LIMIT 200').bind(leadId).all().catch(()=>({results:[]}));return r.results||[];
}
async function manualPayments(env,leadId,orders){
  const orderIds=orders.map(o=>o.order_id).filter(Boolean);const where=[],binds=[];
  if(leadId){where.push('lead_id=?');binds.push(leadId);}
  for(const id of orderIds){where.push('order_id=?');binds.push(id);}
  if(!where.length)return [];
  const r=await env.DB.prepare(`SELECT * FROM manual_payments WHERE ${where.join(' OR ')} ORDER BY payment_date DESC,id DESC LIMIT 300`).bind(...binds).all().catch(()=>({results:[]}));return r.results||[];
}
async function paymentEvents(env,orders){
  const ids=orders.map(o=>o.order_id).filter(Boolean);if(!ids.length)return [];
  const ph=ids.map(()=>'?').join(',');const r=await env.DB.prepare(`SELECT * FROM payment_events WHERE order_id IN (${ph}) ORDER BY created_at DESC,id DESC LIMIT 300`).bind(...ids).all().catch(()=>({results:[]}));return r.results||[];
}

function parseGatewayEvent(e){
  try{
    const p=JSON.parse(e.payload_json||'{}'),gateway=String(e.gateway||'').toLowerCase();
    if(gateway==='razorpay'){
      const pay=p?.payload?.payment?.entity||{};const sub=p?.payload?.subscription?.entity||{};
      return {date:e.created_at,type:e.event_type,mode:pay.method?`Razorpay - ${pay.method}`:'Razorpay',amount_paise:Number(pay.amount||0),status:pay.status||sub.status||e.event_type,transaction_reference:pay.id||sub.id||'',gateway:'razorpay',order_id:e.order_id||''};
    }
    if(gateway==='phonepe'){
      const o=p?.payload||p||{},details=Array.isArray(o.paymentDetails)?o.paymentDetails:[],pay=details[0]||{};
      return {date:e.created_at,type:e.event_type,mode:pay.paymentMode?`PhonePe - ${pay.paymentMode}`:'PhonePe',amount_paise:Number(pay.amount||o.amount||o.redemptionAmount||0),status:pay.state||o.state||e.event_type,transaction_reference:pay.transactionId||o.transactionId||o.orderId||o.refundId||o.merchantOrderId||'',gateway:'phonepe',order_id:e.order_id||''};
    }
    const o=p?.data?.object||{};return {date:e.created_at,type:e.event_type,mode:'Stripe',amount_paise:Number(o.amount_paid||o.amount_received||o.amount||0),status:o.status||e.event_type,transaction_reference:o.payment_intent||o.charge||o.id||'',gateway:'stripe',order_id:e.order_id||''};
  }catch(_){return {date:e.created_at,type:e.event_type,mode:e.gateway||'Gateway',amount_paise:0,status:e.event_type,transaction_reference:'',gateway:e.gateway,order_id:e.order_id||''};}
}


function adminPaymentStatus(raw='',eventType='',amount=0){
  const r=String(raw||'').toLowerCase(),e=String(eventType||'').toLowerCase();
  if(/cancel|revoke|expire/.test(r)||/cancel|revoke|expire/.test(e))return 'cancelled';
  if(/fail|halt|past_due|unpaid/.test(r)||/fail|halt|payment_failed/.test(e))return 'failed';
  if(Number(amount||0)>0 && (/captur|paid|success|complete|charg/.test(r)||/payment\.captured|invoice\.paid|payment_succeeded|redemption.*completed|checkout\.order\.completed/.test(e)))return 'paid';
  return 'pending';
}
function orderAdminPaymentStatus(order){
  const r=String(order?.payment_status||order?.status||'').toLowerCase();
  if(/cancel|revoke|expire/.test(r))return 'cancelled';
  if(/fail|halt/.test(r))return 'failed';
  if(['paid','captured','successful','success'].includes(r))return 'paid';
  return 'pending';
}
function orderSubscriptionStatus(order){
  const s=String(order?.status||'').toLowerCase();
  if(['authenticated','active','paused','pending','halted','cancelled','canceled','completed','expired','failed'].includes(s))return s==='canceled'?'cancelled':s;
  return orderAdminPaymentStatus(order);
}
function orderBalance(order,manualForOrder=[]){
  if(orderAdminPaymentStatus(order)==='paid')return 0;
  const received=manualForOrder.reduce((s,p)=>s+Number(p.amount_paise||0),0);
  return Math.max(0,Number(order.amount_paise||0)-received);
}

async function buildClient(env,ident){
  const seed=await resolveSeed(env,ident);let profile=seedProfile(seed);let lead=await findRelatedLead(env,profile,seed);if(lead){seed.lead=lead;profile=seedProfile(seed);}

  // Keep the modal-opening path read-only and parallel wherever possible. Older
  // builds performed historical candidate recovery synchronously here, which meant
  // every Client Details click could execute many repeated D1 reads/writes before
  // the first useful UI was rendered. Current submissions/payment hooks already use
  // the same merge rules in real time; the legacy recovery is now queued after the
  // response instead (see backfillClientCandidates below).
  const leadId=lead?.id||0,visitorId=lead?.visitor_id||profile.visitorId;
  const baseReads=Promise.all([
    pageStats(env,visitorId),
    followups(env,leadId),
    getLeadCandidates(env,leadId),
    leadId?env.DB.prepare('SELECT * FROM lead_submissions WHERE lead_id=? ORDER BY created_at DESC,id DESC LIMIT 300').bind(leadId).all().catch(()=>({results:[]})):Promise.resolve({results:[]}),
    leadId?env.DB.prepare('SELECT * FROM service_requests WHERE lead_id=? ORDER BY created_at DESC,id DESC LIMIT 300').bind(leadId).all().catch(()=>({results:[]})):Promise.resolve({results:[]}),
    visitorId?env.DB.prepare('SELECT * FROM visitor_cart_state WHERE visitor_id=?').bind(visitorId).first().catch(()=>null):Promise.resolve(null),
    visitorId?env.DB.prepare(`SELECT pie.id,pie.product_id,pie.product_slug,pie.source_path,pie.created_at,pie.updated_at,p.name AS product_name FROM product_interest_events pie LEFT JOIN products p ON p.id=pie.product_id WHERE pie.visitor_id=? ORDER BY pie.updated_at DESC LIMIT 50`).bind(visitorId).all().catch(()=>({results:[]})):Promise.resolve({results:[]}),
    leadId?env.DB.prepare(`SELECT li.platform,li.external_id,c.participant_username,c.participant_profile_url FROM lead_identity_links li LEFT JOIN social_dm_conversations c ON c.id=(SELECT sc.id FROM social_dm_conversations sc WHERE sc.platform=li.platform AND sc.participant_id=li.external_id ORDER BY sc.last_message_at DESC,sc.id DESC LIMIT 1) WHERE li.lead_id=? ORDER BY li.updated_at DESC LIMIT 30`).bind(leadId).all().catch(()=>({results:[]})):Promise.resolve({results:[]})
  ]);
  const orders=await relatedOrders(env,profile,lead,seed);
  const relatedReads=Promise.all([
    relatedSubscribers(env,profile,orders,seed),
    orderItems(env,orders),
    manualPayments(env,leadId,orders),
    paymentEvents(env,orders),
    paymentReceiptsForOrders(env,orders.map(o=>o.order_id))
  ]);
  const [[analytics,follows,candidateBundle,submissionResult,requestResult,cart,interestResult,identityResult],[subscribers,items,manual,events,receipts]]=await Promise.all([baseReads,relatedReads]);
  const submissions=submissionResult?.results||[];
  const requests=requestResult?.results||[];
  const productInterests=interestResult?.results||[];
  const itemByOrder={};for(const i of items)(itemByOrder[i.public_order_id]||(itemByOrder[i.public_order_id]=[])).push(i);
  const manualByOrder={};for(const p of manual)(manualByOrder[p.order_id]||(manualByOrder[p.order_id]=[])).push(p);
  const totalPending=orders.reduce((sum,o)=>sum+orderBalance(o,manualByOrder[o.order_id]||[]),0)+(orders.length?0:Number(cart?.amount_paise||0));
  const totalPaid=receipts.reduce((s,p)=>s+Number(p.amount_paise||0),0)+manual.reduce((s,p)=>s+Number(p.amount_paise||0),0);
  const serviceCount=orders.length?items.reduce((n,i)=>n+Number(i.quantity||1),0):Number(cart?.service_count||0);
  const latestOrder=orders[0]||seed.order||null;const latestSub=subscribers[0]||seed.subscriber||null;
  const client={
    lead_id:lead?.id||0,name:lead?.name||profile.name||latestOrder?.customer_name||latestSub?.name||'Customer',phone:lead?.phone||profile.phone||'',email:lead?.email||profile.email||'',
    status:lead?.status||'',interest_level:lead?.interest_level||((lead?.status==='hot')?'Hot':'Warm'),follow_up_date:lead?.follow_up_date||'',next_action:lead?.next_action||'',assigned_to:lead?.assigned_to||'Admin',price_discussed:lead?.price_discussed||'',notes:lead?.notes||'',message:lead?.message||'',source:lead?.source||'',source_detail:lead?.source_detail||'',outcome:lead?.outcome||'',last_contact_method:lead?.last_contact_method||'',last_contacted_at:lead?.last_contacted_at||'',visitor_id:lead?.visitor_id||'',created_at:lead?.created_at||latestOrder?.created_at||latestSub?.created_at||'',
    age:lead?.age??'',gender:lead?.gender||'',instagram_id:lead?.instagram_id||'',current_occupation:lead?.current_occupation||'',experience_level:lead?.experience_level||'',projects_count:lead?.projects_count??'',future_goal:lead?.future_goal||'',role_interest:lead?.role_interest||'',profile_message:lead?.profile_message||'',profile_photo_links:parseLinks(lead?.profile_photo_links),profile_video_links:parseLinks(lead?.profile_video_links),profile_submitted:Number(lead?.profile_submitted||0),profile_updated_at:lead?.profile_updated_at||'',pending_change_count:Number(candidateBundle.pending_count||0),is_favorite:Number(lead?.is_favorite||0)
  };
  const socialProfiles=socialProfileBundle(lead||{},candidateBundle,identityResult?.results||[]);client.social_profiles=socialProfiles;
  for(const cfg of SOCIAL_PROFILES){const first=socialProfiles.find(x=>x.field===cfg.field);if(cfg.field!=='instagram_id')client[cfg.field]=first?.id||'';}
  const history=[];
  const normalizeCommentText=v=>String(v||'').replace(/^Blog comment on /i,'Comment on fitness tip ');
  const legacyIsComment=lead&&(/comment/i.test(String(lead.source||''))||/^Blog comment on |^Comment on article /i.test(String(lead.message||'')));
  // Preserve the original interaction for legacy leads, but do not duplicate it when
  // lead_submissions already contains the exact first interaction.
  if(lead){
    const legacyCreated=String(lead.created_at||'').slice(0,16),legacyMessage=String(lead.message||'').trim();
    const hasEquivalentSubmission=submissions.some(x=>String(x.created_at||'').slice(0,16)===legacyCreated && String(x.message||'').trim()===legacyMessage);
    if(!hasEquivalentSubmission)history.push(legacyIsComment
      ?{kind:'Comment',date:lead.created_at,title:'Website Comment',status:'comment',detail:normalizeCommentText(lead.message||'Comment received.'),notes:'article_comment',done_by:'Website'}
      :{kind:'Enquiry',date:lead.created_at,title:'Website Enquiry',status:lead.status||'new',detail:lead.message||'Contact form submitted.',notes:lead.source_detail||'',done_by:'Website'});
  }
  submissions.filter(x=>String(x.submission_type||'').toLowerCase()!=='request'&&String(x.status||'').toLowerCase()!=='deleted').forEach(x=>{
    const type=String(x.submission_type||'contact').toLowerCase(),social=type==='social_lead',inquiry=type==='contact',comment=type==='comment',commentReply=type==='comment_reply';
    if(comment){history.push({kind:'Comment',date:x.created_at,title:'Website Comment',status:'comment',detail:normalizeCommentText(x.message||'Comment received.'),notes:'article_comment',done_by:'Website'});return;}
    if(commentReply){history.push({kind:'Comment',date:x.created_at,title:'Comment Reply',status:'responded',detail:normalizeCommentText(x.message||'Admin responded to the comment.'),notes:'article_comment_reply',done_by:'Admin'});return;}
    history.push({kind:type==='profile'?'Profile':'Enquiry',date:x.created_at,title:type==='profile'?'Profile Submission':(social?(String(x.source_detail||'Social Media Enquiry').split('•')[0].trim()||'Social Media Enquiry'):'Website Enquiry'),status:type==='profile'?'profile updated':(inquiry?(x.status||'in_progress'):(lead?.status||'new')),detail:x.message||(type==='profile'?'Profile details submitted.':social?'Social media enquiry received.':'Contact form submitted.'),notes:x.source_detail||'',done_by:social?'Social Media':'Website'});
  });
  requests.forEach(r=>history.push({kind:'Request',request:true,date:r.created_at,title:'Website Request',request_label:r.request_label||'Service Request',status:r.status||'new',ticket_status:r.status||'new',detail:[r.request_label||'',r.pause_months?`Pause: ${r.pause_months} month(s)`:'' ,r.pause_until?`Preferred resume: ${r.pause_until}`:'',r.statement_period?`Period: ${r.statement_period}`:'',r.message||''].filter(Boolean).join(' • '),notes:r.message||'',done_by:'Website Request Form',reference:r.request_id||''}));
  follows.forEach(f=>history.push({kind:'Follow-up',date:f.created_at||f.followup_date,title:f.followup_type||'Follow-up',status:f.outcome||'',detail:[f.followup_date?`Follow-up date: ${f.followup_date}`:'',f.discussion||''].filter(Boolean).join(' • '),notes:f.notes||'',next_action:f.next_action||'',next_date:f.next_follow_up_date||'',done_by:f.done_by||''}));
  productInterests.forEach(x=>history.push({kind:'Interest',date:x.updated_at||x.created_at,title:'Plan Interest',status:'interested',detail:clean(x.product_name||x.product_slug||'Plan / Offer',240),notes:'Customer selected “I’m Interested” on the Offer Details page.',done_by:'Website',reference:clean(x.source_path,500)}));
  orders.forEach(o=>history.push({kind:'Order',date:o.created_at,title:`Order ${o.order_id}`,status:orderAdminPaymentStatus(o),detail:(itemByOrder[o.order_id]||[]).map(i=>i.product_name).join(', ')||'Order created',notes:o.internal_notes||''}));
  manual.forEach(p=>history.push({kind:'Payment',date:p.payment_date||p.created_at,title:p.payment_type||'Manual Payment',status:p.status||'recorded',detail:`₹${(Number(p.amount_paise||0)/100).toFixed(2)} via ${p.payment_mode||'manual'}`,notes:p.notes||'',reference:p.transaction_reference||''}));
  events.map(parseGatewayEvent).forEach(p=>history.push({kind:'Gateway',date:p.date,title:p.type,status:p.status,detail:`${p.mode}${p.amount_paise?` • ₹${(p.amount_paise/100).toFixed(2)}`:''}`,reference:p.transaction_reference||''}));
  history.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const planForOrder=orderId=>{
    const its=itemByOrder[orderId]||[],first=its[0]||{};
    const names=[...new Set(its.map(i=>i.product_name||i.variant_name).filter(Boolean))],offers=[...new Set(its.map(i=>i.coupon_code).filter(Boolean))],pages=[...new Set(its.flatMap(i=>String(i.product_pages||'').split(',')).map(x=>x.trim()).filter(Boolean))];
    const offer_source=pages.includes('yearly')?'Yearly Offer':pages.includes('festival')?'Festival Offer':pages.includes('offers')?'Membership Offer':'Membership Offer';
    const benefits=[];for(const i of its){try{const a=JSON.parse(i.product_features_json||'[]');if(Array.isArray(a))for(const x of a){const v=String(x||'').trim();if(v&&!benefits.includes(v))benefits.push(v);}}catch(_){}}
    const base_subscription_charge_paise=its.reduce((sum,i)=>sum+Number(i.recurring_unit_amount_paise||i.unit_amount_paise||0)*Math.max(1,Number(i.quantity||1)),0);
    return {plan_offer:names.join(', ')||'—',offer_name:offers.join(', '),offer_source,gateway:its.find(i=>i.gateway)?.gateway||'',payment_mode:its.find(i=>i.payment_mode)?.payment_mode||'',trial_enabled:Number(first.product_trial_enabled||0),trial_amount_paise:Number(first.setup_amount_paise||first.product_trial_amount_paise||0),trial_value:Number(first.product_trial_value||0),trial_unit:first.product_trial_unit||'',billing_period:first.product_billing_period||'',base_subscription_charge_paise,subscription_charge_paise:base_subscription_charge_paise,membership_benefits:benefits,catalog_plan:its.some(i=>Number(i.product_catalog_id||0)>0)};
  };
  // The saved Subscription Overview row is the preferred recurring-charge source
  // because it reflects the amount configured at the payment gateway. The order
  // amount is the next fallback because checkout stores the exact gross amount sent
  // to the gateway (including enabled GST/service/other charges). The catalogue
  // price is used only when neither of those actual values is available.
  const subCache={};const subIds=[...new Set(orders.map(o=>o.gateway_subscription_id).filter(Boolean))];
  if(subIds.length){const ph=subIds.map(()=>'?').join(',');const cached=(await env.DB.prepare(`SELECT subscription_id,row_json FROM subscription_overview_cache WHERE subscription_id IN (${ph})`).bind(...subIds).all().catch(()=>({results:[]}))).results||[];for(const x of cached){try{subCache[x.subscription_id]=JSON.parse(x.row_json||'{}');}catch(_){}}}
  const recurringChargeFor=(o={},meta={})=>{
    const cache=subCache[o.gateway_subscription_id]||{};
    const vals=[cache.next_charge_amount_paise,cache.plan_amount_paise,cache.recurring_charge_paise,meta.base_subscription_charge_paise,o.amount_paise];
    for(const v of vals){const n=Number(v||0);if(Number.isFinite(n)&&n>0)return Math.round(n);}
    return 0;
  };
  const paymentCommon=(o,meta)=>({
    total_order_amount_paise:Number(o.amount_paise||0),
    subscription_charge_paise:recurringChargeFor(o,meta),
    base_subscription_charge_paise:Number(meta.base_subscription_charge_paise||0),
    original_amount_paise:Number(o.original_amount_paise||o.amount_paise||0),discount_paise:Number(o.discount_paise||0),offer_discount_paise:Number(o.offer_discount_paise||0),coupon_discount_paise:Number(o.coupon_discount_paise||0),coupon_code:o.coupon_code||'',
    trial_enabled:meta.trial_enabled,trial_amount_paise:meta.trial_amount_paise,trial_value:meta.trial_value,trial_unit:meta.trial_unit,billing_period:meta.billing_period,membership_benefits:meta.membership_benefits,catalog_plan:meta.catalog_plan
  });
  const receiptPayments=receipts.map(r=>{
    const o=orders.find(o=>o.order_id===r.order_id)||{},meta=planForOrder(r.order_id),kind=String(r.payment_kind||'payment').toLowerCase(),method=[String(r.gateway||o.gateway||meta.gateway||'').replace(/^./,c=>c.toUpperCase()),r.payment_method?titleCase(r.payment_method):''].filter(Boolean).join(' - ');
    return {date:r.paid_at||r.created_at,time:'',payment_type:kind==='authentication'?'Trial / Authentication Payment':kind==='one_time'?'One-Time Payment':kind==='subscription_charge'?'Subscription Payment':'Payment',payment_mode:method||titleCase(r.gateway||'Payment Gateway'),order_payment_mode:o.payment_mode||meta.payment_mode||'',gateway:r.gateway||o.gateway||meta.gateway||'',plan_offer:meta.plan_offer,offer_name:meta.offer_name,offer_source:meta.offer_source,...paymentCommon(o,meta),amount_received_paise:Number(r.amount_paise||0),base_amount_paise:Number(r.base_amount_paise||0),gst_amount_paise:Number(r.gst_amount_paise||0),service_charge_paise:Number(r.service_charge_paise||0),other_tax_paise:Number(r.other_tax_paise||0),tax_snapshot_json:r.tax_snapshot_json||'{}',pending_amount_paise:0,balance_amount_paise:0,next_payment_due_date:'',payment_status:'paid',collected_by:titleCase(r.gateway||''),transaction_reference:r.transaction_id||'',order_id:r.order_id||'',upi_id:r.upi_id||''};
  });
  const payments=[...manual.map(p=>{
    const o=orders.find(o=>o.order_id===p.order_id)||{},meta=planForOrder(p.order_id);
    return {date:p.payment_date||p.created_at,time:'',payment_type:p.payment_type||'Manual Payment',payment_mode:p.payment_mode||o.payment_mode||meta.payment_mode||'Manual',order_payment_mode:o.payment_mode||meta.payment_mode||'',gateway:o.gateway||meta.gateway||'manual',plan_offer:meta.plan_offer,offer_name:meta.offer_name,offer_source:meta.offer_source,...paymentCommon(o,meta),amount_received_paise:Number(p.amount_paise||0),pending_amount_paise:0,balance_amount_paise:0,next_payment_due_date:p.next_payment_due_date||'',payment_status:'paid',collected_by:p.collected_by||'',transaction_reference:p.transaction_reference||'',order_id:p.order_id||''};
  }),...receiptPayments];
  for(const o of orders){
    const meta=planForOrder(o.order_id),hasActual=payments.some(x=>x.order_id===o.order_id&&Number(x.amount_received_paise||0)>0),life=orderSubscriptionStatus(o),trialAuth=meta.trial_enabled&&meta.trial_amount_paise>0&&life==='authenticated',cache=subCache[o.gateway_subscription_id]||{},nextEpoch=Number(cache.next_charge_at||cache.charge_at||cache.charge_at_epoch||0),nextDue=nextEpoch?new Date(nextEpoch*1000).toISOString().slice(0,10):'',actualRecurring=recurringChargeFor(o,meta);
    if(trialAuth){payments.push({date:o.created_at,time:'',payment_type:'Subscription',payment_mode:o.payment_mode||meta.payment_mode||'subscription',order_payment_mode:o.payment_mode||'',gateway:o.gateway||meta.gateway||'',plan_offer:meta.plan_offer,offer_name:meta.offer_name,offer_source:meta.offer_source,...paymentCommon(o,meta),amount_received_paise:0,pending_amount_paise:actualRecurring,balance_amount_paise:actualRecurring,next_payment_due_date:nextDue,payment_status:'pending',collected_by:o.gateway||'',transaction_reference:o.gateway_subscription_id||'',order_id:o.order_id||''});continue;}
    if(!hasActual){const aps=orderAdminPaymentStatus(o),currentDue=meta.trial_enabled&&meta.trial_amount_paise>0&&aps==='pending'?meta.trial_amount_paise:actualRecurring;payments.push({date:o.created_at,time:'',payment_type:o.payment_mode==='one_time'?'One-Time Payment':'Subscription',payment_mode:o.payment_mode||meta.payment_mode||'subscription',order_payment_mode:o.payment_mode||'',gateway:o.gateway||meta.gateway||'',plan_offer:meta.plan_offer,offer_name:meta.offer_name,offer_source:meta.offer_source,...paymentCommon(o,meta),amount_received_paise:0,pending_amount_paise:aps==='pending'?currentDue:0,balance_amount_paise:aps==='pending'?currentDue:0,next_payment_due_date:nextDue,payment_status:aps,collected_by:o.gateway||'',transaction_reference:o.gateway_payment_id||o.gateway_subscription_id||o.gateway_order_id||'',order_id:o.order_id||''});}
  }
  payments.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.amount_received_paise||0)-Number(a.amount_received_paise||0));
  const subscriptions=[];const seen=new Set(),lastReceiptByOrder={},lastReceiptBySubscription={};
  const receiptEpoch=r=>{const n=Number(r?.paid_at_epoch||0);if(n>0)return n;const d=Date.parse(String(r?.paid_at||r?.created_at||''));return Number.isFinite(d)?Math.floor(d/1000):0;};
  for(const r of receipts){const epoch=receiptEpoch(r);if(!epoch)continue;if(r.order_id&&epoch>Number(lastReceiptByOrder[r.order_id]||0))lastReceiptByOrder[r.order_id]=epoch;if(r.subscription_id&&epoch>Number(lastReceiptBySubscription[r.subscription_id]||0))lastReceiptBySubscription[r.subscription_id]=epoch;}
  for(const o of orders){if(!o.gateway_subscription_id||seen.has(o.gateway_subscription_id))continue;seen.add(o.gateway_subscription_id);const its=itemByOrder[o.order_id]||[];const first=its[0]||{},meta=planForOrder(o.order_id),cache=subCache[o.gateway_subscription_id]||{},lastCharge=cache.previous_bill_at||lastReceiptBySubscription[o.gateway_subscription_id]||lastReceiptByOrder[o.order_id]||'';subscriptions.push({order_id:o.order_id,gateway:first.gateway||o.gateway||'razorpay',subscription_id:o.gateway_subscription_id,status:orderSubscriptionStatus(o),amount_paise:recurringChargeFor(o,meta),base_amount_paise:Number(meta.base_subscription_charge_paise||0),billing_months:Number(first.billing_months||1),total_count:Number(first.total_count||cache.total_count||0),paid_count:cache.paid_count??'',remaining_count:cache.remaining_count??'',next_charge_at:cache.next_charge_at||cache.charge_at||'',last_charge_at:lastCharge,short_url:first.checkout_url||o.fallback_url||'',plan_offer:meta.plan_offer,offer_name:meta.offer_name,payment_mode:first.payment_mode||o.payment_mode||'subscription'});}
  for(const s of subscribers){if(s.gateway_subscription_id&&!seen.has(s.gateway_subscription_id)){seen.add(s.gateway_subscription_id);subscriptions.push({order_id:'',gateway:s.gateway||'razorpay',subscription_id:s.gateway_subscription_id,status:s.subscription_status||'',amount_paise:0,billing_months:1,total_count:0,paid_count:'',remaining_count:'',next_charge_at:'',last_charge_at:'',short_url:'',plan_offer:s.plan_name||'Membership',offer_name:'',payment_mode:'subscription'});}}
  return {client,social_profiles:socialProfiles,analytics,orders,order_items:items,subscribers,subscriptions,payments,history,candidates:candidateBundle.map||{},submissions,requests,cart:cart||null,product_interests:productInterests,summary:{service_count:serviceCount,total_pending_paise:totalPending,total_paid_paise:totalPaid,followup_count:follows.length,order_count:orders.length,payment_count:payments.length}};
}


async function backfillClientCandidates(env,data){
  const leadId=Number(data?.client?.lead_id||0);if(!leadId)return;
  const inputs=[];
  for(const o of [...(data?.orders||[])].reverse())inputs.push({source:'checkout',values:{name:o.customer_name||'',phone:o.customer_phone||o.website_phone||o.razorpay_phone||'',email:o.customer_email||''}});
  for(const sub of [...(data?.subscribers||[])].reverse())inputs.push({source:sub.gateway||'subscription',values:{name:sub.name||'',phone:sub.phone||'',email:sub.email||''}});
  if(inputs.length)await mergeKnownLeadCandidateBatch(env,leadId,inputs,'historical');
}

async function searchClients(env,url){
  const q=clean(url.searchParams.get('q'),300);const from=clean(url.searchParams.get('from'),20);const to=clean(url.searchParams.get('to'),20);const like=`%${q}%`;const where=[],binds=[];
  if(q){where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.instagram_id LIKE ? OR l.order_id LIKE ? OR l.gateway_subscription_id LIKE ? OR l.gateway_payment_id LIKE ? OR EXISTS (SELECT 1 FROM lead_field_candidates c WHERE c.lead_id=l.id AND c.value LIKE ?))`);binds.push(like,like,like,like,like,like,like,like);}
  if(from){where.push("date(l.created_at)>=date(?)");binds.push(from);}
  if(to){where.push("date(l.created_at)<=date(?)");binds.push(to);}
  const sql=`SELECT l.*,COUNT(v.id) visit_count,COALESCE(SUM(v.duration_ms),0) time_spent_ms,MIN(v.created_at) first_visit,MAX(v.created_at) last_visit FROM contact_leads l LEFT JOIN visitor_events v ON v.visitor_id=l.visitor_id ${where.length?'WHERE '+where.join(' AND '):''} GROUP BY l.id ORDER BY COALESCE(l.updated_at,l.created_at) DESC LIMIT 200`;
  const rows=(await env.DB.prepare(sql).bind(...binds).all()).results||[];
  for(const r of rows){
    r.page_stats=(await pageStats(env,r.visitor_id)).pages.slice(0,8);
    const cart=r.visitor_id?await env.DB.prepare('SELECT service_count,amount_paise FROM visitor_cart_state WHERE visitor_id=?').bind(r.visitor_id).first().catch(()=>null):null;
    r.cart_service_count=Number(cart?.service_count||0);r.cart_amount_paise=Number(cart?.amount_paise||0);
    const ld=localDigits(r.phone);let o=[];if(ld)o=(await env.DB.prepare("SELECT * FROM orders WHERE customer_phone LIKE ? OR website_phone LIKE ? OR razorpay_phone LIKE ? ORDER BY id DESC LIMIT 25").bind(`%${ld}%`,`%${ld}%`,`%${ld}%`).all()).results||[];
    r.order_count=o.length;r.service_count=0;r.pending_amount_paise=0;r.paid_amount_paise=0;
    const receiptRows=await paymentReceiptsForOrders(env,o.map(x=>x.order_id));
    r.paid_amount_paise=receiptRows.reduce((sum,x)=>sum+Number(x.amount_paise||0),0);
    for(const x of o){if(orderAdminPaymentStatus(x)!=='paid')r.pending_amount_paise+=Number(x.amount_paise||0);}
    if(o.length){const ids=o.map(x=>x.id);const ph=ids.map(()=>'?').join(',');const c=await env.DB.prepare(`SELECT COALESCE(SUM(quantity),0) n FROM order_items WHERE order_id IN (${ph})`).bind(...ids).first().catch(()=>null);r.service_count=Number(c?.n||0);}else{r.service_count=r.cart_service_count;r.pending_amount_paise=r.cart_amount_paise;}
  }
  // If the search term is an order/payment/subscription identifier that has not
  // yet been copied onto a lead row, still surface the customer instead of
  // returning an empty search. The unified client resolver will connect the
  // order/subscriber back to the matching lead when the card is opened.
  if(q && !rows.length){
    const oq=await env.DB.prepare(`SELECT * FROM orders WHERE order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ? OR gateway_order_id LIKE ? OR gateway_payment_id LIKE ? OR gateway_subscription_id LIKE ? ORDER BY id DESC LIMIT 20`).bind(like,like,like,like,like,like,like).all().catch(()=>({results:[]}));
    for(const o of (oq.results||[])){
      if(from && String(o.created_at||'').slice(0,10)<from)continue;
      if(to && String(o.created_at||'').slice(0,10)>to)continue;
      const actual=(await paymentReceiptsForOrders(env,[o.order_id])).reduce((sum,x)=>sum+Number(x.amount_paise||0),0);
      rows.push({order_id:o.order_id,customer_name:o.customer_name,customer_phone:o.website_phone||o.customer_phone,customer_email:o.customer_email,created_at:o.created_at,last_visit:o.created_at,status:o.status,payment_status:o.payment_status,service_count:0,pending_amount_paise:orderAdminPaymentStatus(o)==='paid'?0:Number(o.amount_paise||0),paid_amount_paise:actual,page_stats:[]});
    }
    if(!rows.length){
      const sq=await env.DB.prepare(`SELECT * FROM subscribers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR gateway_subscription_id LIKE ? ORDER BY id DESC LIMIT 20`).bind(like,like,like,like).all().catch(()=>({results:[]}));
      for(const x of (sq.results||[])){
        if(from && String(x.created_at||'').slice(0,10)<from)continue;
        if(to && String(x.created_at||'').slice(0,10)>to)continue;
        rows.push({subscriber_id:x.id,name:x.name,phone:x.phone,email:x.email,created_at:x.created_at,last_visit:x.updated_at||x.created_at,status:x.subscription_status,service_count:x.plan_name?1:0,pending_amount_paise:0,paid_amount_paise:0,page_stats:[]});
      }
    }
  }
  return rows;
}

async function paymentContextForOrder(env,order){
  if(!order)return {oneTime:false,setup:0,recurring:0,authCeiling:100};
  const rows=(await env.DB.prepare('SELECT setup_amount_paise,unit_amount_paise,recurring_unit_amount_paise,quantity,tax_snapshot_json FROM order_items WHERE order_id=? ORDER BY id').bind(order.id).all().catch(()=>({results:[]}))).results||[];
  let setup=0,recurring=0,authCeiling=0;
  for(const row of rows){const base=Math.max(0,Number(row.setup_amount_paise||0)),snap=safeJsonParse(row.tax_snapshot_json||'{}',{});setup+=base;recurring+=Math.max(0,Number(row.recurring_unit_amount_paise||row.unit_amount_paise||0))*Math.max(1,Number(row.quantity||1));authCeiling+=Math.max(base,Number(snap?.trial?.totalPaise||0),Number(snap?.setup?.totalPaise||0),0);}
  return {oneTime:String(order.payment_mode||'').toLowerCase()==='one_time',setup,recurring:recurring||Math.max(0,Number(order.amount_paise||0)),authCeiling:Math.max(authCeiling,setup,100)};
}
function receiptPaymentState(receipts=[],ctx={},remoteStatus=''){
  const rs=(receipts||[]).filter(x=>Number(x.amount_paise||0)>0),st=String(remoteStatus||'').toLowerCase();
  if(/cancel|revoke|expire/.test(st))return'cancelled';
  if(/fail|halt|past_due|unpaid|incomplete_expired/.test(st))return'failed';
  if(ctx.oneTime)return rs.length?'paid':'pending';
  if(!rs.length)return /auth/.test(st)?'authenticated':'pending';
  const authCeiling=Math.max(Number(ctx.authCeiling||ctx.setup||0),100),authOnly=Number(ctx.setup||0)>0&&rs.every(r=>String(r.payment_kind||'').toLowerCase()==='authentication'||Number(r.amount_paise||0)<=authCeiling);
  return authOnly?'authenticated':'paid';
}
function receiptKindForAmount(ctx={},amount=0){if(ctx.oneTime)return'one_time';return Number(ctx.setup||0)>0&&Number(amount||0)>0&&Number(amount||0)<=Math.max(Number(ctx.authCeiling||ctx.setup||0),100)?'authentication':'subscription_charge';}

async function refreshGateway(env,b){
  const order=b.order_id?await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(clean(b.order_id,180)).first():null;
  const subId=clean(b.subscription_id||order?.gateway_subscription_id,180),payId=clean(b.payment_id||order?.gateway_payment_id,180);
  let gateway=clean(b.gateway||order?.gateway||'razorpay',30).toLowerCase();
  if(!subId&&!payId)throw new Error('No gateway subscription or payment ID is saved for this client.');
  if(gateway==='phonepe'){
    if(!subId)throw new Error('PhonePe subscription ID is not saved for this client.');
    const sub=await phonePeSubscriptionStatus(env,subId);
    const ev=order?await env.DB.prepare("SELECT * FROM payment_events WHERE order_id=? AND gateway='phonepe' AND verified=1 ORDER BY created_at DESC,id DESC LIMIT 100").bind(order.order_id).all().catch(()=>({results:[]})):{results:[]};
    const payment_records=(ev.results||[]).map(parseGatewayEvent).filter(x=>x.amount_paise||String(x.type||'').includes('redemption')||String(x.type||'').includes('checkout')).map(x=>{const ps=adminPaymentStatus(x.status,x.type,x.amount_paise);return {date:x.date,payment_type:x.type,payment_mode:x.mode||'PhonePe',amount_received_paise:ps==='paid'?Number(x.amount_paise||0):0,pending_amount_paise:ps==='pending'?Number(order?.amount_paise||0):0,payment_status:ps,transaction_reference:x.transaction_reference||'',next_payment_due_date:'',order_id:order?.order_id||'',gateway:'phonepe'};});
    const status=String(sub?.state||order?.status||'').toLowerCase();
    const ctx=await paymentContextForOrder(env,order),receipts=order?await paymentReceiptsForOrders(env,[order.order_id]):[];
    const hasFailed=payment_records.some(x=>x.payment_status==='failed');
    const payStatus=hasFailed?'failed':receiptPaymentState(receipts,ctx,status);
    if(order)await env.DB.prepare('UPDATE orders SET status=?,payment_status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(status||order.status||'created',payStatus,order.order_id).run();
    return {gateway:'phonepe',subscription:sub,payment:null,invoices:[],payment_records};
  }
  if(gateway==='stripe'){
    let sub=null,invoices=[],payment=null;
    if(subId){sub=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}`);const inv=await stripeApi(env,`/invoices?subscription=${encodeURIComponent(subId)}&limit=100`);invoices=inv.data||[];}
    if(payId){const id=payId.startsWith('pi_')?payId:'';if(id)payment=await stripeApi(env,`/payment_intents/${encodeURIComponent(id)}`);}
    const status=sub?(sub.pause_collection?'paused_collection':sub.status):(payment?.status||order?.status||'');
    const ctx=await paymentContextForOrder(env,order);
    const payment_records=invoices.map(x=>{const amt=Number(x.amount_paid||0),ps=adminPaymentStatus(x.status,'invoice.'+String(x.status||''),amt);return {date:x.created?new Date(x.created*1000).toISOString():'',payment_type:'Stripe Invoice',payment_mode:'Stripe',amount_received_paise:ps==='paid'?amt:0,pending_amount_paise:ps==='pending'?Number(x.amount_remaining||order?.amount_paise||0):0,payment_status:ps,transaction_reference:x.payment_intent||x.id||'',next_payment_due_date:x.due_date?new Date(x.due_date*1000).toISOString():'',order_id:order?.order_id||'',gateway:'stripe'};});
    if(order){
      for(const x of invoices){const amt=Number(x.amount_paid||0),tx=String(x.payment_intent||x.charge||x.id||'');if(amt>0&&tx&&/paid|succeeded/i.test(String(x.status||'')))await recordPaymentReceipt(env,{gateway:'stripe',transaction_id:tx,order_id:order.order_id,subscription_id:subId||'',amount_paise:amt,currency:String(x.currency||'INR').toUpperCase(),status:'paid',payment_kind:receiptKindForAmount(ctx,amt),payment_method:Array.isArray(x.payment_method_types)?x.payment_method_types[0]||'':'',paid_at_epoch:Number(x.status_transitions?.paid_at||x.created||0),payload_json:x}).catch(()=>{});}
      const intentAmt=Number(payment?.amount_received||0),intentPaid=intentAmt>0&&String(payment?.status||'').toLowerCase()==='succeeded';if(intentPaid&&payment?.id)await recordPaymentReceipt(env,{gateway:'stripe',transaction_id:payment.id,order_id:order.order_id,subscription_id:subId||'',amount_paise:intentAmt,currency:String(payment.currency||'INR').toUpperCase(),status:'paid',payment_kind:receiptKindForAmount(ctx,intentAmt),payment_method:Array.isArray(payment.payment_method_types)?payment.payment_method_types[0]||'':'',paid_at_epoch:Number(payment.created||0),payload_json:payment}).catch(()=>{});
    }
    const receipts=order?await paymentReceiptsForOrders(env,[order.order_id]):[],payStatus=receiptPaymentState(receipts,ctx,status);
    if(order)await env.DB.prepare('UPDATE orders SET status=?,payment_status=?,gateway_payment_id=COALESCE(?,gateway_payment_id),updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(status||order.status||'created',payStatus,payment?.id||null,order.order_id).run();
    return {gateway:'stripe',subscription:sub,payment,invoices,payment_records};
  }
  gateway='razorpay';let sub=null,payment=null,invoices=[];
  if(subId){sub=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subId)}`,{method:'GET'});const inv=await razorpayApi(env,`/invoices?subscription_id=${encodeURIComponent(subId)}`,{method:'GET'}).catch(()=>({items:[]}));invoices=inv.items||[];}
  if(payId)payment=await razorpayApi(env,`/payments/${encodeURIComponent(payId)}`,{method:'GET'}).catch(()=>null);
  const status=sub?.status||payment?.status||order?.status||'',ctx=await paymentContextForOrder(env,order);
  const payment_records=invoices.map(x=>{const amt=Number(x.amount_paid||0),ps=adminPaymentStatus(x.status,'invoice.'+String(x.status||''),amt);return {date:x.issued_at?new Date(x.issued_at*1000).toISOString():(x.date?new Date(x.date*1000).toISOString():''),payment_type:'Razorpay Subscription Payment',payment_mode:'Razorpay',amount_received_paise:ps==='paid'?amt:0,pending_amount_paise:ps==='pending'?Number((x.amount_due??x.amount) || order?.amount_paise||0):0,payment_status:ps,transaction_reference:x.payment_id||x.id||'',next_payment_due_date:x.billing_end?new Date(x.billing_end*1000).toISOString():'',order_id:order?.order_id||'',gateway:'razorpay'};});
  if(order){
    const directAmt=Number(payment?.amount||0),directPaid=directAmt>0&&/captured|paid/.test(String(payment?.status||'').toLowerCase());if(directPaid&&payment?.id)await recordPaymentReceipt(env,{gateway:'razorpay',transaction_id:payment.id,order_id:order.order_id,subscription_id:subId||sub?.id||'',amount_paise:directAmt,currency:payment.currency||'INR',status:'paid',payment_kind:receiptKindForAmount(ctx,directAmt),payment_method:payment.method||'',upi_id:payment.vpa||payment.upi?.vpa||'',paid_at_epoch:Number(payment.created_at||0),payload_json:payment}).catch(()=>{});
    for(const x of invoices){const amt=Number(x.amount_paid||0),tx=String(x.payment_id||'');if(amt>0&&tx&&/paid|issued/i.test(String(x.status||'')))await recordPaymentReceipt(env,{gateway:'razorpay',transaction_id:tx,order_id:order.order_id,subscription_id:subId||sub?.id||'',amount_paise:amt,currency:x.currency||'INR',status:'paid',payment_kind:receiptKindForAmount(ctx,amt),paid_at_epoch:Number(x.paid_at||x.issued_at||x.date||0),payload_json:x}).catch(()=>{});}
  }
  const receipts=order?await paymentReceiptsForOrders(env,[order.order_id]):[],payStatus=receiptPaymentState(receipts,ctx,status);
  if(order)await env.DB.prepare('UPDATE orders SET status=?,payment_status=?,gateway_payment_id=COALESCE(?,gateway_payment_id),gateway_subscription_id=COALESCE(?,gateway_subscription_id),updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind(status||order.status||'created',payStatus,payment?.id||null,sub?.id||null,order.order_id).run();
  return {gateway:'razorpay',subscription:sub,payment,invoices,payment_records};
}

async function refreshClientGateways(env,b){
  const lead=await ensureLead(env,b);
  const data=await buildClient(env,{leadId:lead.id,orderId:'',subscriberId:0,refundId:'',q:''});
  const refreshed=[];
  for(const o of (data.orders||[])){
    if(!o.gateway_subscription_id&&!o.gateway_payment_id)continue;
    try{refreshed.push({order_id:o.order_id,...await refreshGateway(env,{order_id:o.order_id,gateway:o.gateway||'razorpay',subscription_id:o.gateway_subscription_id||'',payment_id:o.gateway_payment_id||''})});}catch(err){refreshed.push({order_id:o.order_id,gateway:o.gateway||'',error:String(err?.message||err)});}
  }
  return {ok:true,lead_id:lead.id,refreshed,client_data:await buildClient(env,{leadId:lead.id,orderId:'',subscriberId:0,refundId:'',q:''})};
}

async function subscriptionAction(env,b){
  const subId=clean(b.subscription_id,180);if(!subId)throw new Error('Subscription ID is required.');
  const gateway=clean(b.gateway||'razorpay',30).toLowerCase(),action=clean(b.subscription_action,30).toLowerCase();let data,st='';
  if(gateway==='phonepe'){
    if(action==='cancel'){data=await cancelPhonePeSubscription(env,subId);st='cancelled';}
    else if(action==='pause')throw new Error('PhonePe AutoPay pause is controlled by the customer in the UPI/PSP app. Ask the customer to pause the mandate there, then use Refresh here to confirm the latest status.');
    else if(action==='resume')throw new Error('PhonePe AutoPay cannot be unpaused by the merchant. The customer must unpause the mandate in the same UPI/PSP app. If the mandate was revoked/cancelled, create a new subscription authorization.');
    else throw new Error('Unsupported subscription action.');
  }else if(gateway==='stripe'){
    const current=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}`);
    const currentStatus=String(current?.status||'').toLowerCase();
    if(action==='pause'){
      if(currentStatus==='canceled')throw new Error('This Stripe subscription is already canceled and cannot be paused. Create a new subscription if the customer wants to subscribe again.');
      data=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}`,{method:'POST',params:{'pause_collection[behavior]':'void'}});st='paused_collection';
    }else if(action==='resume'){
      if(currentStatus==='canceled')throw new Error('A canceled Stripe subscription cannot be restarted. Create a new subscription/payment authorization for the customer.');
      if(currentStatus==='paused')data=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}/resume`,{method:'POST'});
      else if(current?.pause_collection)data=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}`,{method:'POST',params:{pause_collection:''}});
      else throw new Error('This Stripe subscription is not currently paused. Refresh the subscription status before trying Resume.');
      st=data?.status||'active';
    }else if(action==='cancel'){data=await stripeApi(env,`/subscriptions/${encodeURIComponent(subId)}`,{method:'DELETE'});st='canceled';}
    else throw new Error('Unsupported subscription action.');
  }else{
    const current=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subId)}`,{method:'GET'});
    const currentStatus=String(current?.status||'').toLowerCase();
    if(action==='pause'){
      if(currentStatus!=='active')throw new Error(`Razorpay allows Pause only for an active subscription. Current status: ${currentStatus||'unknown'}. Refresh first and use the action supported by the current status.`);
      data=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subId)}/pause`,{payload:{pause_at:'now'}});st=data?.status||'paused';
    }else if(action==='resume'){
      if(['cancelled','canceled','completed','expired'].includes(currentStatus))throw new Error('A canceled/completed Razorpay subscription cannot be restarted. Create a new subscription authorization if the customer wants to continue.');
      if(currentStatus!=='paused')throw new Error(`Razorpay Resume is available only for a paused subscription. Current status: ${currentStatus||'unknown'}.`);
      data=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subId)}/resume`,{payload:{resume_at:'now'}});st=data?.status||'active';
    }else if(action==='cancel'){data=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subId)}/cancel`,{payload:{cancel_at_cycle_end:0}});st=data?.status||'cancelled';}
    else throw new Error('Unsupported subscription action.');
  }
  await env.DB.prepare(`UPDATE orders SET status=?,payment_status=CASE WHEN ? IN ('cancelled','canceled') THEN 'cancelled' WHEN lower(COALESCE(payment_status,'')) IN ('paid','captured') THEN 'paid' ELSE 'pending' END,updated_at=CURRENT_TIMESTAMP WHERE gateway_subscription_id=?`).bind(st,st,subId).run().catch(()=>{});
  await env.DB.prepare('UPDATE subscribers SET subscription_status=?,updated_at=CURRENT_TIMESTAMP WHERE gateway_subscription_id=?').bind(st,subId).run().catch(()=>{});
  return {ok:true,status:st,subscription:data};
}

async function createStripeLink(env,{oid,lead,name,phone,email,amount,service,kind,b}){
  const recurring=kind==='subscription';
  const billingMonths=Math.max(1,Number(b.billing_months||1));
  const totalCount=Math.max(1,Number(b.total_count||12));
  const setup=rupeesToPaise(b.setup_amount||0);
  const params={
    'line_items[0][price_data][currency]':'inr',
    'line_items[0][price_data][unit_amount]':amount,
    'line_items[0][price_data][product_data][name]':clean(b.plan_name||service,120),
    'line_items[0][price_data][product_data][description]':service.slice(0,240),
    'line_items[0][quantity]':1,
    'metadata[order_id]':oid,'metadata[lead_id]':String(lead.id),
    'after_completion[type]':'hosted_confirmation',
    'after_completion[hosted_confirmation][custom_message]':'Payment received. IronPulse Gym will verify and continue your onboarding.'
  };
  let warning='';
  if(recurring && billingMonths<=36){
    const yearly=billingMonths%12===0;
    params['line_items[0][price_data][recurring][interval]']=yearly?'year':'month';
    params['line_items[0][price_data][recurring][interval_count]']=yearly?Math.max(1,billingMonths/12):billingMonths;
    params['subscription_data[metadata][order_id]']=oid;
    params['subscription_data[metadata][lead_id]']=String(lead.id);
    params['subscription_data[metadata][intended_total_count]']=String(totalCount);
    if(setup>0){
      params['line_items[1][price_data][currency]']='inr';
      params['line_items[1][price_data][unit_amount]']=setup;
      params['line_items[1][price_data][product_data][name]']='Setup / Advance Amount';
      params['line_items[1][price_data][product_data][description]']='One-time setup or advance amount';
      params['line_items[1][quantity]']=1;
    }
  }else if(recurring){
    // Stripe recurring interval_count is limited to a maximum of 3 years.
    // For a requested 4/5-year interval, preserve the sale by generating a
    // one-time Stripe fallback link for the current billing amount. The CRM
    // retains the intended frequency so the admin can renew it later.
    warning='Stripe fallback created as a one-time payment link because Stripe recurring billing intervals cannot exceed three years. The intended renewal frequency remains saved in the CRM.';
    params['payment_intent_data[metadata][order_id]']=oid;
    params['payment_intent_data[metadata][lead_id]']=String(lead.id);
    params['metadata[intended_billing_months]']=String(billingMonths);
    params['metadata[intended_total_count]']=String(totalCount);
    if(setup>0)params['line_items[0][price_data][unit_amount]']=amount+setup;
    params['line_items[0][price_data][product_data][name]']=`${clean(b.plan_name||service,90)} - Current Charge`;
  }else{
    params['payment_intent_data[metadata][order_id]']=oid;
    params['payment_intent_data[metadata][lead_id]']=String(lead.id);
    params['restrictions[completed_sessions][limit]']=1;
  }
  const link=await stripeApi(env,'/payment_links',{method:'POST',params});
  return {gateway:'stripe',data:link,url:link.url||'',subscription_id:'',gateway_order_id:link.id||'',warning,qr_from_url:kind==='qr'};
}

async function createRazorpayRequest(env,{oid,lead,name,phone,email,amount,service,kind,b}){
  let data=null,url='';
  if(kind==='qr'){
    data=await razorpayApi(env,'/payments/qr_codes',{payload:{type:'upi_qr',name:`IronPulse Gym ${name}`.slice(0,50),usage:'single_use',fixed_amount:true,payment_amount:amount,description:service.slice(0,120),notes:{order_id:oid,lead_id:String(lead.id)}}});url=data.image_url||data.short_url||'';
  }else if(kind==='payment_link'){
    data=await razorpayApi(env,'/payment_links',{payload:{amount,currency:'INR',accept_partial:false,description:service,customer:{name,contact:phone,email},notify:{sms:false,email:!!email},reminder_enable:false,notes:{order_id:oid,lead_id:String(lead.id)}}});url=data.short_url||'';
  }else{
    const billingMonths=Math.max(1,Number(b.billing_months||1));const totalCount=Math.max(1,Number(b.total_count||12));const period=billingMonths%12===0?'yearly':'monthly';const interval=period==='yearly'?Math.max(1,billingMonths/12):billingMonths;
    const plan=await razorpayApi(env,'/plans',{payload:{period,interval,item:{name:clean(b.plan_name||service,120),amount,currency:'INR',description:service.slice(0,240)},notes:{lead_id:String(lead.id),order_id:oid}}});
    const subPayload={plan_id:plan.id,total_count:totalCount,quantity:1,customer_notify:0,expire_by:Math.floor(Date.now()/1000)+86400,notes:{order_id:oid,lead_id:String(lead.id),customer_name:name,customer_phone:phone,customer_email:email,product_name:service}};
    const startDate=clean(b.start_date,20);if(startDate){const startAt=Math.floor(new Date(`${startDate}T00:00:00+05:30`).getTime()/1000);if(Number.isFinite(startAt)&&startAt>Math.floor(Date.now()/1000)+60)subPayload.start_at=startAt;}
    const setup=rupeesToPaise(b.setup_amount||0);if(setup>0)subPayload.addons=[{item:{name:'Setup / advance amount',amount:setup,currency:'INR'}}];
    data=await razorpayApi(env,'/subscriptions',{payload:subPayload});url=data.short_url||'';
  }
  return {gateway:'razorpay',data,url,subscription_id:kind==='subscription'?(data?.id||''):'',gateway_order_id:kind==='subscription'?'':(data?.id||''),warning:'',qr_from_url:false};
}

async function sendWhatsAppImageUrl(env,to,imageUrl,caption=''){
  const phone=normalizePhone(to);if(!phone)throw new Error('The client does not have a WhatsApp number. Add a WhatsApp number in Client Details and try again.');
  const payment=await getPaymentSettings(env),provider=String(payment.otpProvider||'whatsapp_cloud').toLowerCase();
  const url=clean(imageUrl,2000);if(!/^https?:\/\//i.test(url))throw new Error('The payment QR image is not available as a public URL. Generate the QR again or send the payment link instead.');
  if(provider==='green_api'){
    const instance=env.GREEN_API_INSTANCE_ID||payment.greenApiInstanceId,token=env.GREEN_API_TOKEN||payment.greenApiToken;
    if(!instance||!token)throw new Error('GreenAPI is not connected. Open Settings → Social Media API → WhatsApp Webhook & Order OTP, connect GreenAPI, then try again.');
    const res=await fetch(`https://api.green-api.com/waInstance${encodeURIComponent(instance)}/sendFileByUrl/${encodeURIComponent(token)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chatId:`${phone}@c.us`,urlFile:url,fileName:'dropbeat-dance-studio-payment-qr.png',caption:clean(caption,1000)})});
    const data=await res.json().catch(()=>({}));if(!res.ok||!data.idMessage)throw new Error(data?.message||data?.error||'GreenAPI could not send the payment QR. Check the GreenAPI connection and try again.');
    return {ok:true,provider:'green_api',id:data.idMessage||''};
  }
  const token=env.WHATSAPP_CLOUD_TOKEN||payment.whatsappCloudToken,phoneId=env.WHATSAPP_PHONE_NUMBER_ID||payment.whatsappPhoneNumberId;
  if(!token||!phoneId)throw new Error('WhatsApp Cloud API is not connected. Open Settings → Social Media API → WhatsApp Webhook & Order OTP, connect WhatsApp Cloud API, then try again.');
  const res=await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'image',image:{link:url,caption:clean(caption,1000)}})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error?.message||'WhatsApp could not send the payment QR. Check the WhatsApp Cloud API connection and try again.');
  return {ok:true,provider:'whatsapp_cloud',id:data?.messages?.[0]?.id||''};
}

function paymentRequestNowPaise(order,item){
  let tax={};try{tax=JSON.parse(String(item?.tax_snapshot_json||order?.tax_snapshot_json||'{}'));}catch(_){tax={};}
  const setup=Math.max(0,Number(item?.setup_amount_paise||0));
  if(String(item?.payment_mode||order?.payment_mode||'').toLowerCase()==='subscription'&&setup>0){
    if(tax?.trial)return Math.max(0,Number(tax.trial.totalPaise||setup));
    if(tax?.setup)return Math.max(0,Number(tax.setup.totalPaise||setup));
    return setup;
  }
  if(tax?.oneTime)return Math.max(0,Number(tax.oneTime.totalPaise||order?.amount_paise||0));
  if(tax?.recurring)return Math.max(0,Number(tax.recurring.totalPaise||order?.amount_paise||0));
  return Math.max(0,Number(order?.amount_paise||0));
}

function paymentRequestPublicUrl(request,env,order){
  const origin=preferredPublicOrigin(request,env)||brandHomeUrl(env);
  const sub=clean(order?.gateway_subscription_id,240);
  if(sub)return `${origin}/payment?order=${encodeURIComponent(order.order_id)}&subscription=${encodeURIComponent(sub)}`;
  return clean(order?.fallback_url,2000);
}

async function sendExistingPaymentRequest(request,env,b){
  const orderIdValue=clean(b.order_id,180);if(!orderIdValue)throw new Error('Create the payment request first, then send it to the customer.');
  const order=await env.DB.prepare('SELECT * FROM orders WHERE order_id=? LIMIT 1').bind(orderIdValue).first();if(!order)throw new Error('The generated payment request could not be found. Generate it again and retry sending.');
  const item=await env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY id LIMIT 1').bind(order.id).first().catch(()=>null);
  const channel=clean(b.channel||b.delivery_channel,30).toLowerCase(),kind=String(order.status||'').toLowerCase()==='qr_created'?'qr':(String(order.payment_mode||'').toLowerCase()==='subscription'?'subscription':'payment_link');
  const [site,social]=await Promise.all([getSiteSettings(env),getSocialIntegrationSettings(env)]),brand=clean(site.siteName,160)||'IronPulse Gym',amount=paymentRequestNowPaise(order,item),service=clean(item?.product_name||item?.variant_name||'Payment Request',300),publicUrl=paymentRequestPublicUrl(request,env,order);
  const customerName=clean(order.customer_name||'Customer',160),phone=normalizePhone(order.customer_phone||order.website_phone||''),email=clean(order.customer_email,240).toLowerCase();
  const nativeQrImage=kind==='qr'&&String(order.gateway||'').toLowerCase()==='razorpay'&&/^https?:\/\//i.test(clean(order.fallback_url,2000));
  if(channel==='whatsapp'){
    if(!phone)throw new Error('This client has no WhatsApp number. Add the number in Client Details and try Send via WhatsApp again.');
    if(kind==='qr'&&nativeQrImage){
      const qrUrl=clean(order.fallback_url,2000);const caption=`Hi ${customerName},\n\nYour ${brand} payment QR for ${emailMoney(amount)} is ready.\nPurpose: ${service}\nOrder: ${order.order_id}\n\nScan the QR using your preferred UPI app. If you need help, please contact us.`;
      const result=await sendWhatsAppImageUrl(env,phone,qrUrl,caption);return {ok:true,channel:'whatsapp',provider:result.provider,message:`Payment QR sent to ${phone} on WhatsApp.`};
    }
    if(!publicUrl)throw new Error('The payment link is not available. Generate the payment request again, then retry WhatsApp delivery.');
    const text=`Hi ${customerName},\n\nYour ${brand} payment request is ready.\nAmount to pay now: ${emailMoney(amount)}\nPlan / Purpose: ${service}\nOrder: ${order.order_id}\n\nPay securely here:\n${publicUrl}\n\nThis link opens the secure payment page directly. If you need any help, please contact us.`;
    const result=await sendWhatsAppText(env,phone,text);if(!result?.ok)throw new Error('WhatsApp is not connected. Open Settings → Social Media API → WhatsApp Webhook & Order OTP, connect a provider, then try again.');
    return {ok:true,channel:'whatsapp',provider:result.provider,message:`Payment link sent to ${phone} on WhatsApp.`};
  }
  if(channel==='email'||channel==='gmail'){
    const gmail=social.gmail||{};if(!email)throw new Error('This client has no email address. Add the email in Client Details and try Send via Gmail again.');
    if(!gmail.enabled||gmail.connectionState!=='connected'||gmail.scopeStatus!=='verified_send'||!gmail.connectedEmail||!gmail.refreshToken)throw new Error('Gmail sending is not connected, enabled, and verified. Open Settings → Social Media API → Gmail / Email, reconnect the correct account, approve Gmail sending, run Test Connection, and then try again.');
    const isQr=kind==='qr',subject=isQr?`${brand} - Your Payment QR is Ready - ${order.order_id}`:`${brand} - Your Secure Payment Link is Ready - ${order.order_id}`;
    const qrBlock=isQr&&nativeQrImage?`<div style="text-align:center;margin:22px 0"><div style="font-size:15px;font-weight:800;color:#2b151d;margin-bottom:12px">Scan to pay ${emailMoney(amount)}</div><img src="${clean(order.fallback_url,2000).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="Payment QR" width="280" style="display:block;width:100%;max-width:280px;height:auto;margin:0 auto;border:1px solid #ead3bd;border-radius:16px;padding:10px;background:#fff"></div>`:'';
    const directLinkFallback=isQr&&!nativeQrImage;
    const html=brandedEmailHtml({site,env,title:isQr?'Your Payment QR is Ready':'Your Secure Payment Link is Ready',eyebrow:isQr?'Payment QR':'Payment Request',customerName,introHtml:`<p style="margin:0 0 12px">We have prepared this payment request especially for you. Please review the amount and purpose below, then complete the payment using your preferred payment method.</p>${qrBlock}`,summaryTitle:'Payment Request',summaryRows:[['Order ID',order.order_id],['Plan / Purpose',service],['Amount to Pay Now',emailMoney(amount)],['Payment Gateway',String(order.gateway||'Payment Gateway').replace(/^./,c=>c.toUpperCase())]],bodyHtml:isQr&&nativeQrImage?'<p style="margin:0">Scan the QR using your preferred UPI app. The QR already contains the payment amount, so you do not need to enter it manually.</p>':directLinkFallback?'<p style="margin:0">This payment gateway created a secure payment link instead of a public QR image. Use the button below to open the final payment page directly.</p>':'<p style="margin:0">Use the secure payment button below. It opens the final payment page directly; you do not need to return to the website checkout.</p>',noteHtml:'For your security, make the payment only through the payment page or QR shown in this email. If anything looks different, contact the admin before paying.',ctaLabel:isQr&&nativeQrImage?'':(isQr?'Open Secure Payment Page':'Pay Securely Now'),ctaUrl:publicUrl||brandHomeUrl(env)});
    const result=await sendEmailNotice(env,email,subject,html,`${brand} payment request ${order.order_id}. Amount to pay now: ${emailMoney(amount)}. ${publicUrl||''}`);if(!result?.ok)throw new Error(result?.reason||'Gmail could not send the payment request. Check Settings → Social Media API → Gmail / Email and try again.');
    return {ok:true,channel:'email',provider:result.provider||'gmail',message:`Payment request sent to ${email}.`};
  }
  throw new Error('Choose Send via WhatsApp or Send via Gmail.');
}

async function createGatewayRequest(env,b,kind){
  const lead=await ensureLead(env,b),phone=normalizePhone(b.phone||lead.phone||''),email=clean(b.email||lead.email,220),name=clean(b.name||lead.name||'IronPulse Gym Customer',160);
  const amount=rupeesToPaise(b.amount_rupees||b.subscription_amount||0);if(amount<=0)throw new Error('Enter the amount to collect.');
  const service=clean(b.service_summary||b.plan_name||'IronPulse Gym Membership',500),oid=orderId(),origin=clean(b.origin,500)||clean(env.PUBLIC_SITE_URL,500)||clean(env.SITE_URL,500)||'https://ironpulse-gym.pages.dev';
  const paymentKind=kind==='subscription'?'subscription':'one_time',billingMonths=Math.max(1,Number(b.billing_months||1)),totalCount=Math.max(1,Number(b.total_count||1)),setupAmount=rupeesToPaise(paymentKind==='subscription'?b.setup_amount||0:0);
  const startDate=clean(b.start_date,20);let startAt=0;if(paymentKind==='subscription'&&startDate){const x=Math.floor(new Date(`${startDate}T00:00:00+05:30`).getTime()/1000);if(Number.isFinite(x)&&x>Math.floor(Date.now()/1000)+60)startAt=x;}
  const isTrial=paymentKind==='subscription'&&setupAmount>0&&startAt>0;
  const taxSettings=(await getSiteSettings(env)).taxes||{},mainTax=calculateTaxBreakdown(amount,taxSettings),trialTax=isTrial?calculateTaxBreakdown(setupAmount,{...taxSettings,enabled:false,gstEnabled:false,serviceChargeEnabled:false,otherTaxEnabled:false}):null,setupTax=!isTrial&&setupAmount?calculateTaxBreakdown(setupAmount,taxSettings):null;
  const chargeAmount=mainTax.totalPaise,setupCharge=setupTax?.totalPaise||0,upfrontCharge=isTrial?setupAmount:setupCharge,taxSnapshot=paymentKind==='subscription'?(isTrial?{recurring:mainTax,trial:trialTax}:{recurring:mainTax,setup:setupTax}):{oneTime:mainTax};
  let result;
  if(kind==='qr'){
    // Keep the historical QR path for Razorpay when it is the primary gateway.
    const settings=await getPaymentSettings(env);const razorConfigured=!!(env.RAZORPAY_KEY_ID||settings.razorpayKeyId)&&!!(env.RAZORPAY_KEY_SECRET||settings.razorpayKeySecret);
    if(settings.primaryGateway==='razorpay'&&razorConfigured){result=await createRazorpayRequest(env,{oid,lead,name,phone,email,amount:chargeAmount,service,kind:'qr',b});result.attempts=[{gateway:'razorpay',ok:true}];result.gatewayOrderId=result.gateway_order_id;result.gatewaySubscriptionId=result.subscription_id;}
    else{result=await createCheckoutWithFallback(env,{kind:'one_time',orderId:oid,origin,amountPaise:chargeAmount,currency:'INR',customer:{name,phone,email},description:service,billingMonths:1,totalCount:1,setupAmountPaise:0,quantity:1});result.qr_from_url=true;}
  }else{
    result=await createCheckoutWithFallback(env,{kind:paymentKind,orderId:oid,origin,amountPaise:chargeAmount,currency:'INR',customer:{name,phone,email},description:service,billingMonths,totalCount,setupAmountPaise:isTrial?0:setupCharge,trial:isTrial?{enabled:true,startAt,amountPaise:setupAmount}:null,quantity:1});
  }
  const gateway=result.gateway,gatewayData=result.data||{},url=result.url||'',gatewayOrderId=result.gatewayOrderId||result.gateway_order_id||'',subscriptionId=result.gatewaySubscriptionId||result.subscription_id||'';
  const totalAmount=chargeAmount+upfrontCharge,status=kind==='qr'?'qr_created':kind==='payment_link'?'payment_link_created':'subscription_created',attempts=JSON.stringify(result.attempts||[]),paymentMode=paymentKind==='subscription'?'subscription':'one_time';
  const ord=await env.DB.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,gateway_order_id,gateway_subscription_id,fallback_url,internal_notes,website_phone,order_stage,payment_mode,gateway_attempts_json,tax_snapshot_json,updated_at)
    VALUES(?,?,?,?,?,'INR',?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(oid,name,phone,email,totalAmount,status,'awaiting_payment',gateway,gatewayOrderId,subscriptionId,url,clean(b.notes||'',3000),phone,'new',paymentMode,attempts,JSON.stringify(taxSnapshot)).run();
  const dbId=ord.meta.last_row_id;
  await env.DB.prepare(`INSERT INTO order_items(order_id,product_name,variant_name,quantity,unit_amount_paise,billing_months,horizon_years,total_count,setup_amount_paise,checkout_url,status,gateway_subscription_id,gateway,gateway_order_id,payment_mode,tax_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(dbId,service,paymentKind==='subscription'?'Custom Subscription':'One-Time Payment',1,amount,billingMonths,21,totalCount,setupAmount,url,'created',subscriptionId,gateway,gatewayOrderId,paymentMode,JSON.stringify(taxSnapshot)).run();
  await env.DB.prepare(`UPDATE contact_leads SET order_id=?,gateway_subscription_id=COALESCE(NULLIF(?,''),gateway_subscription_id),sale_amount_paise=?,purchase_type=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(oid,subscriptionId,totalAmount,paymentKind==='subscription'?'Customized Subscription':'Website Payment',lead.id).run();
  const publicPaymentUrl=subscriptionId?`${String(origin).replace(/\/$/,'')}/payment?order=${encodeURIComponent(oid)}&subscription=${encodeURIComponent(subscriptionId)}`:url;
  return {ok:true,order_id:oid,url,public_payment_url:publicPaymentUrl,gateway,gateway_data:gatewayData,lead_id:lead.id,amount_paise:chargeAmount,base_amount_paise:amount,tax:taxSnapshot,fallback_used:!!result.fallbackUsed,fallback_reason:(result.attempts||[]).filter(x=>!x.ok).map(x=>`${x.gateway}: ${x.error||'failed'}`).join(' | '),warning:result.warning||'',qr_from_url:!!result.qr_from_url,attempts:result.attempts||[]};
}


function indiaToday(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const map=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function archivedNotInterestedClients(env,url){
  const q=clean(url.searchParams.get('q'),300),like=`%${q}%`;
  const paidMatch=`EXISTS (
    SELECT 1 FROM orders o
    WHERE (lower(COALESCE(o.payment_status,'')) IN ('paid','captured','completed') OR lower(COALESCE(o.status,'')) IN ('paid','completed'))
      AND (
        (COALESCE(l.order_id,'')<>'' AND o.order_id=l.order_id)
        OR (COALESCE(l.email,'')<>'' AND lower(trim(COALESCE(o.customer_email,'')))=lower(trim(l.email)))
        OR (COALESCE(l.phone,'')<>'' AND (
          substr(replace(replace(replace(replace(replace(COALESCE(o.customer_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(l.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
          OR substr(replace(replace(replace(replace(replace(COALESCE(o.website_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(l.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
        ))
      )
  )`;
  const archiveWhere=`(
    lower(COALESCE(l.interest_level,''))='not interested'
    OR lower(COALESCE(l.outcome,'')) IN ('not interested','closed')
    OR (lower(COALESCE(l.outcome,''))='no response' AND trim(COALESCE(l.follow_up_date,''))='')
    OR (lower(COALESCE(l.status,''))='closed' AND lower(COALESCE(l.outcome,'')) NOT IN ('converted','purchased','payment collected'))
  )
    AND NOT (lower(COALESCE(l.source,'')) IN ('razorpay','stripe','phonepe','payment_gateway') AND lower(COALESCE(l.source_detail,'')) LIKE '%customer identity%')
    AND NOT (${paidMatch})`;
  const search=q?` AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.outcome LIKE ? OR l.notes LIKE ? OR l.source_detail LIKE ?)` : '';
  const stmt=env.DB.prepare(`SELECT l.*,
    COUNT(v.id) visit_count,COALESCE(SUM(v.duration_ms),0) time_spent_ms,MAX(v.created_at) last_visit
    FROM contact_leads l LEFT JOIN visitor_events v ON v.visitor_id=l.visitor_id
    WHERE ${archiveWhere}${search}
    GROUP BY l.id ORDER BY COALESCE(l.updated_at,l.created_at) DESC,l.id DESC LIMIT 1000`);
  const r=q?await stmt.bind(like,like,like,like,like,like).all():await stmt.all();
  return r.results||[];
}

export async function onRequestGet({request,env,waitUntil}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const url=new URL(request.url);try{
    const mode=url.searchParams.get('mode');
    if(mode==='search')return json({rows:await searchClients(env,url)});
    if(mode==='not_interested')return json({rows:await archivedNotInterestedClients(env,url)});
    const ident=queryIdentity(url);const data=await buildClient(env,ident);if(!data.client?.lead_id&&!data.orders.length&&!data.subscribers.length)return json({error:'Client could not be found.'},404);
    const recovery=backfillClientCandidates(env,data).catch(()=>{});
    if(typeof waitUntil==='function')waitUntil(recovery);
    return json(data);
  }catch(e){return json({error:e.message||'Could not load client details.'},500)}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);const action=clean(b.action,50).toLowerCase();
  try{
    if(action==='update_client'){
      const lead=await ensureLead(env,b);const name=clean(b.name||lead.name,160);const phone=normalizePhone(b.phone||lead.phone||'');const email=clean(b.email||lead.email,220).toLowerCase();if(email&&!EMAIL_RE.test(email))throw new Error('Enter a valid email address in the format name@domain.com.');
      await saveLeadPrimaryFields(env,lead.id,{name,phone,email,instagram_id:clean(b.instagram_id,220),age:b.age,gender:b.gender,current_occupation:b.current_occupation,experience_level:b.experience_level,projects_count:b.projects_count,future_goal:b.future_goal,role_interest:b.role_interest,profile_message:b.profile_message},'admin');
      await saveLeadSocialFields(env,lead.id,b,'admin');
      const nextInterest=clean(b.interest_level||lead.interest_level||'Warm',40),nextFollow=clean(b.follow_up_date||'',20);
      await env.DB.prepare(`UPDATE contact_leads SET interest_level=?,follow_up_date=?,next_action=?,price_discussed=?,assigned_to=?,notes=?,status=CASE WHEN lower(?)='not interested' AND trim(?)='' THEN 'closed' ELSE status END,outcome=CASE WHEN lower(?)='not interested' AND trim(?)='' THEN 'Not Interested' ELSE outcome END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextInterest,nextFollow,clean(b.next_action||'',300),clean(b.price_discussed||'',300),clean(b.assigned_to||'Admin',80),clean(b.notes||'',5000),nextInterest,nextFollow,nextInterest,nextFollow,lead.id).run();return json({ok:true,lead_id:lead.id,message:'Client details updated.'});
    }
    if(action==='add_followup'){
      const lead=await ensureLead(env,b);const date=clean(b.followup_date||indiaToday(),20);const outcome=clean(b.outcome,120);await env.DB.prepare(`INSERT INTO lead_followups(lead_id,followup_date,followup_type,contacted_person_name,outcome,next_follow_up_date,next_action,done_by,discussion,notes) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(lead.id,date,clean(b.followup_type,80),clean(b.contacted_person_name||lead.name,160),outcome,clean(b.next_follow_up_date,20),clean(b.next_action,200),clean(b.done_by||'Admin',80),clean(b.discussion,5000),clean(b.notes,5000)).run();
      const out=outcome.toLowerCase();let status=lead.status||'new',interest=lead.interest_level||'Warm';
      if(out.includes('purchased')||out.includes('converted')||out.includes('payment collected')){status='converted';interest='Hot';}
      else if(out.includes('closed')||out.includes('not interested')){status='closed';interest='Not Interested';}
      else if(out.includes('no response')&&!clean(b.next_follow_up_date,20)){status='closed';interest='Not Interested';}
      else if(out.includes('interested')||out.includes('expected')||out.includes('offer requested')||out.includes('callback')){status='hot';interest='Hot';}
      await env.DB.prepare(`UPDATE contact_leads SET status=?,interest_level=?,last_contact_method=?,outcome=?,follow_up_date=?,next_action=?,assigned_to=?,last_contacted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,interest,clean(b.followup_type,80),outcome,clean(b.next_follow_up_date,20),clean(b.next_action,200),clean(b.done_by||'Admin',80),lead.id).run();return json({ok:true,lead_id:lead.id,message:'Follow-up saved.'});
    }
    if(action==='add_order'){
      const lead=await ensureLead(env,b);const amount=rupeesToPaise(b.amount_rupees||0);const oid=orderId();const phone=normalizePhone(b.phone||lead.phone||'');const name=clean(b.name||lead.name,160);const email=clean(b.email||lead.email,220);const service=clean(b.service_name||'Customized Membership',240);const ord=await env.DB.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,internal_notes,website_phone,order_stage,updated_at) VALUES(?,?,?,?,?,'INR','custom_order_created','awaiting_payment','admin',?,?, 'new',CURRENT_TIMESTAMP)`).bind(oid,name,phone,email,amount,clean(b.notes,3000),phone).run();await env.DB.prepare(`INSERT INTO order_items(order_id,product_name,variant_name,quantity,unit_amount_paise,billing_months,horizon_years,total_count,setup_amount_paise,status) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(ord.meta.last_row_id,service,clean(b.order_type||'Customized',80),1,amount,1,21,252,0,'created').run();await env.DB.prepare(`UPDATE contact_leads SET order_id=?,sale_amount_paise=?,purchase_type='Customized Order',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(oid,amount,lead.id).run();await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});return json({ok:true,order_id:oid,lead_id:lead.id,message:'Order added to the client.'});
    }
    if(action==='add_payment'){
      const lead=await ensureLead(env,b);const amount=rupeesToPaise(b.amount_rupees||0);if(amount<=0)throw new Error('Enter the amount received.');const date=clean(b.payment_date||new Date().toISOString().slice(0,10),20);const oid=clean(b.order_id,180);await env.DB.prepare(`INSERT INTO manual_payments(lead_id,order_id,payment_date,payment_type,payment_mode,amount_paise,next_payment_due_date,collected_by,transaction_reference,notes,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(lead.id,oid,date,clean(b.payment_type||'Manual Payment',80),clean(b.payment_mode||'UPI',80),amount,clean(b.next_payment_due_date,20),clean(b.collected_by||'Admin',80),clean(b.transaction_reference,240),clean(b.notes,3000),'recorded').run();if(oid){const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(oid).first();if(o){const t=await env.DB.prepare('SELECT COALESCE(SUM(amount_paise),0) paid FROM manual_payments WHERE order_id=?').bind(oid).first();const st=Number(t?.paid||0)>=Number(o.amount_paise||0)?'paid':'partially_paid';await env.DB.prepare('UPDATE orders SET payment_status=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND payment_status NOT IN (\'paid\',\'captured\')').bind(st,oid).run();if(st==='paid')await env.DB.prepare("UPDATE contact_leads SET status='converted',interest_level='Hot',outcome='Payment Collected',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(lead.id).run().catch(()=>{});else await env.DB.prepare("UPDATE contact_leads SET status=CASE WHEN status IN ('closed','converted') THEN status ELSE 'hot' END,interest_level=CASE WHEN interest_level='Not Interested' THEN interest_level ELSE 'Hot' END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(lead.id).run().catch(()=>{});}}
      await bumpAdminActivity(env,'orders').catch(()=>{});return json({ok:true,lead_id:lead.id,message:'Payment saved.'});
    }
    if(action==='set_lead_state'){
      const lead=await ensureLead(env,b),state=clean(b.state,40).toLowerCase();
      if(state==='not_interested'){
        await env.DB.prepare("UPDATE contact_leads SET status='closed',interest_level='Not Interested',outcome='Not Interested',follow_up_date='',next_action='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(lead.id).run();
        return json({ok:true,lead_id:lead.id,state,message:'Moved to Customers → Not Interested.'});
      }
      if(state==='active'){
        await env.DB.prepare("UPDATE contact_leads SET status='new',interest_level=CASE WHEN lower(COALESCE(interest_level,''))='not interested' THEN 'Warm' ELSE interest_level END,outcome='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(lead.id).run();
        return json({ok:true,lead_id:lead.id,state,message:'Restored to active leads.'});
      }
      return json({error:'Unsupported lead state.'},400);
    }
    if(action==='set_favorite'){
      const lead=await ensureLead(env,b);const fav=(b.is_favorite===true||b.is_favorite==='true'||b.is_favorite===1||b.is_favorite==='1')?1:0;
      await env.DB.prepare('UPDATE contact_leads SET is_favorite=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(fav,lead.id).run();
      return json({ok:true,lead_id:lead.id,is_favorite:fav,message:fav?'Added to Favorites.':'Removed from Favorites.'});
    }
    if(action==='refresh_gateway'){const result={ok:true,...await refreshGateway(env,b)};await bumpAdminActivity(env,'orders').catch(()=>{});return json(result);}
    if(action==='refresh_client_gateways'){const result=await refreshClientGateways(env,b);await bumpAdminActivity(env,'orders').catch(()=>{});return json(result);}
    if(action==='subscription_action'){const result=await subscriptionAction(env,b);await bumpAdminActivity(env,'orders').catch(()=>{});await bumpAdminActivity(env,'subscriptions').catch(()=>{});return json(result);}
    if(action==='send_payment_request'){const result=await sendExistingPaymentRequest(request,env,b);await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});return json(result);}
    if(action==='create_qr'){const result=await createGatewayRequest(env,b,'qr');await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});return json(result);}
    if(action==='create_payment_link'){const result=await createGatewayRequest(env,b,'payment_link');await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});return json(result);}
    if(action==='create_subscription'){const result=await createGatewayRequest(env,b,'subscription');await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});await bumpAdminActivity(env,'subscriptions').catch(()=>{});return json(result);}
    return json({error:'Unknown client CRM action.'},400);
  }catch(e){return json({error:e.message||'Client CRM action failed.'},400)}
}
