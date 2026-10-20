import { getSiteSettings, hmacHex } from './utils.js';
import { brandedEmailHtml, emailMoney, brandHomeUrl } from './branded-email.js';
import { sendConfiguredEmail } from './outbound-email.js';
import { getAutomaticEmailTemplates, applyEmailTemplate, automaticEmailTextHtml, automaticEmailSummaryRows } from './automatic-email-templates.js';
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const num=v=>Math.max(0,Math.round(Number(v||0)));
const paidStates=new Set(['paid','captured','successful','success','completed']);
function secret(env){return String(env.PAYMENT_RETRY_SECRET||env.AUTOMATION_API_KEY||env.RAZORPAY_KEY_SECRET||env.STRIPE_WEBHOOK_SECRET||env.ADMIN_LOGIN_PASSWORD||'').trim();}
export async function ensurePaymentRecoveryTable(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS payment_recovery_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL DEFAULT '',
    failure_reason TEXT NOT NULL DEFAULT '',
    failure_reference TEXT NOT NULL DEFAULT '',
    attempt_amount_paise INTEGER NOT NULL DEFAULT 0,
    last_failure_fingerprint TEXT NOT NULL DEFAULT '',
    last_failure_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    immediate_sent_at TEXT NOT NULL DEFAULT '',
    reminder2_due_at TEXT NOT NULL DEFAULT '',
    reminder2_sent_at TEXT NOT NULL DEFAULT '',
    reminder3_due_at TEXT NOT NULL DEFAULT '',
    reminder3_sent_at TEXT NOT NULL DEFAULT '',
    reminder_level INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_recovery_due ON payment_recovery_emails(status,reminder2_due_at,reminder3_due_at)').run().catch(()=>{});
}
function toIstParts(ms){const d=new Date(ms+330*60000);return{y:d.getUTCFullYear(),m:d.getUTCMonth(),day:d.getUTCDate(),hour:d.getUTCHours(),min:d.getUTCMinutes()};}
function istUtcMs(y,m,day,hour,min=0){return Date.UTC(y,m,day,hour,min)-330*60000;}
function randomMinute(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%91;}
function eveningDueAfter(targetMs){
  let p=toIstParts(targetMs),start=istUtcMs(p.y,p.m,p.day,21,0),end=istUtcMs(p.y,p.m,p.day,22,30);
  if(targetMs>end){const d=new Date(istUtcMs(p.y,p.m,p.day+1,21,0));p=toIstParts(d.getTime());start=istUtcMs(p.y,p.m,p.day,21,0);end=istUtcMs(p.y,p.m,p.day,22,30);}
  const earliest=Math.max(targetMs,start),span=Math.max(0,Math.floor((end-earliest)/60000));return new Date(earliest+Math.min(span,randomMinute())*60000).toISOString();
}
async function retryToken(env,orderId,email,expires){const s=secret(env);if(!s)return'';return hmacHex(s,`${orderId}|${String(email||'').toLowerCase()}|${expires}`);}
export async function buildRetryUrl(env,orderId,email){const expires=Math.floor(Date.now()/1000)+10*86400,t=await retryToken(env,orderId,email,expires);if(!t)return `${brandHomeUrl(env)}/my-orders`;return `${brandHomeUrl(env)}/my-orders?retry_order=${encodeURIComponent(orderId)}&retry_expires=${expires}&retry_token=${encodeURIComponent(t)}`;}
export async function verifyRetryToken(env,orderId,email,expires,token){const ex=Number(expires||0);if(!ex||ex<Math.floor(Date.now()/1000)||ex>Math.floor(Date.now()/1000)+14*86400)return false;const expected=await retryToken(env,orderId,email,ex);if(!expected||expected.length!==String(token||'').length)return false;let x=0;for(let i=0;i<expected.length;i++)x|=expected.charCodeAt(i)^String(token).charCodeAt(i);return x===0;}
async function sendRecoveryEmail(env,row,kind='immediate'){
  const order=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(row.order_id).first().catch(()=>null);if(!order?.customer_email)return{ok:false,reason:'email missing'};
  const [site,templates]=await Promise.all([getSiteSettings(env).catch(()=>({siteName:'IronPulse Gym'})),getAutomaticEmailTemplates(env)]);
  const items=(await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=? ORDER BY id').bind(order.id).all().catch(()=>({results:[]}))).results||[];const plan=items.map(x=>x.product_name).filter(Boolean).join(', ')||'Membership';
  const amount=num(row.attempt_amount_paise)||num(order.amount_paise),retryUrl=await buildRetryUrl(env,order.order_id,order.customer_email),isImmediate=kind==='immediate';
  const base=templates.payment_failed,rendered=applyEmailTemplate(base,{BrandName:site.siteName||'IronPulse Gym',ClientName:order.customer_name||'Customer',OrderId:order.order_id,RetryUrl:retryUrl});
  if(!isImmediate){rendered.heading=kind==='reminder3'?'Final Payment Reminder':'Payment Reminder';rendered.eyebrow=kind==='reminder3'?'Final Reminder':'Friendly Reminder';rendered.intro=`This is a reminder that your earlier payment of ${emailMoney(amount)} was not completed. If you still want the service, use the secure retry button below.`;}
  let ctaUrl=rendered.buttonUrl||retryUrl;if(ctaUrl==='@RetryUrl')ctaUrl=retryUrl;
  const html=brandedEmailHtml({site,env,title:rendered.heading,eyebrow:rendered.eyebrow,greetingText:rendered.greeting,customerName:order.customer_name||'Customer',introHtml:automaticEmailTextHtml(rendered.intro),summaryTitle:rendered.summaryTitle,summaryRows:automaticEmailSummaryRows(rendered,[order.order_id,plan,emailMoney(amount),'Payment not completed']),bodyHtml:automaticEmailTextHtml(rendered.body),noteHtml:automaticEmailTextHtml(rendered.note),ctaLabel:rendered.buttonLabel,ctaUrl});
  const subject=!isImmediate?`${site.siteName||'IronPulse Gym'} - ${kind==='reminder3'?'Final ':''}Payment Reminder - ${order.order_id}`:rendered.subject;
  const text=`Payment not completed for ${order.order_id}. Amount: ${emailMoney(amount)}. Retry: ${retryUrl}`;
  return sendConfiguredEmail(env,{to:order.customer_email,subject,html,text,fromName:site.siteName||'IronPulse Gym'},{purpose:'email'});
}
export async function recordPaymentFailure(env,orderId,{reason='',reference='',attemptAmountPaise=0,automationEvent=''}={}){
  await ensurePaymentRecoveryTable(env);const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);if(!o?.customer_email)return{ok:false,reason:'order or email missing'};
  const fingerprint=`${clean(reference,180)}|${clean(reason,220)}|${num(attemptAmountPaise)}`;const old=await env.DB.prepare('SELECT * FROM payment_recovery_emails WHERE order_id=?').bind(orderId).first().catch(()=>null);
  if(old&&old.last_failure_fingerprint===fingerprint&&old.last_failure_at&&Date.now()-new Date(old.last_failure_at).getTime()<5*60000)return{ok:true,skipped:true,reason:'duplicate failure event'};
  const now=Date.now(),due2=eveningDueAfter(now+48*3600000);
  await env.DB.prepare(`INSERT INTO payment_recovery_emails(order_id,customer_email,failure_reason,failure_reference,attempt_amount_paise,last_failure_fingerprint,last_failure_at,reminder2_due_at,status,reminder_level,updated_at)
    VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,?,'open',0,CURRENT_TIMESTAMP)
    ON CONFLICT(order_id) DO UPDATE SET customer_email=excluded.customer_email,failure_reason=excluded.failure_reason,failure_reference=excluded.failure_reference,attempt_amount_paise=excluded.attempt_amount_paise,last_failure_fingerprint=excluded.last_failure_fingerprint,last_failure_at=CURRENT_TIMESTAMP,immediate_sent_at='',reminder2_due_at=excluded.reminder2_due_at,reminder2_sent_at='',reminder3_due_at='',reminder3_sent_at='',reminder_level=0,status='open',resolved_at='',updated_at=CURRENT_TIMESTAMP`).bind(orderId,o.customer_email||'',clean(reason,500),clean(reference,220),num(attemptAmountPaise)||num(o.amount_paise),fingerprint,due2).run();
  try{const push=await import('./notification-events-v1-58.js');await push.financialNotification(env,{event:'payment_failed',orderId,eventKey:`failure:${orderId}:${reference||fingerprint}`});}catch{}
  const row=await env.DB.prepare('SELECT * FROM payment_recovery_emails WHERE order_id=?').bind(orderId).first();if(['payment_failed','subscription_failed'].includes(clean(automationEvent,40))){const active=await env.DB.prepare("SELECT 1 ok FROM email_automation_flows WHERE status='active' AND trigger_type=? LIMIT 1").bind(clean(automationEvent,40)).first().catch(()=>null);if(active?.ok)return {ok:true,deferredToAutomation:true};}const sent=await sendRecoveryEmail(env,row,'immediate').catch(e=>({ok:false,reason:e.message}));if(sent?.ok)await env.DB.prepare("UPDATE payment_recovery_emails SET immediate_sent_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(orderId).run().catch(()=>{});return sent;
}
export async function processDuePaymentRecoveryEmails(env,{limit=50}={}){
  await ensurePaymentRecoveryTable(env);const rows=(await env.DB.prepare(`SELECT * FROM payment_recovery_emails WHERE status='open' AND ((reminder_level=0 AND reminder2_due_at<>'' AND reminder2_due_at<=CURRENT_TIMESTAMP) OR (reminder_level=1 AND reminder3_due_at<>'' AND reminder3_due_at<=CURRENT_TIMESTAMP)) ORDER BY updated_at ASC LIMIT ?`).bind(Math.max(1,Math.min(200,Number(limit||50)))).all()).results||[],out=[];
  for(const row of rows){const o=await env.DB.prepare('SELECT payment_status,status FROM orders WHERE order_id=?').bind(row.order_id).first().catch(()=>null),receipt=await env.DB.prepare("SELECT id FROM payment_receipts WHERE order_id=? AND amount_paise>0 AND lower(COALESCE(status,'')) IN ('paid','captured','successful','success') LIMIT 1").bind(row.order_id).first().catch(()=>null);if(receipt||paidStates.has(String(o?.payment_status||'').toLowerCase())){await env.DB.prepare("UPDATE payment_recovery_emails SET status='resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run();out.push({order_id:row.order_id,status:'resolved'});continue;}
    const kind=Number(row.reminder_level||0)===0?'reminder2':'reminder3',sent=await sendRecoveryEmail(env,row,kind).catch(e=>({ok:false,reason:e.message}));if(sent?.ok&&kind==='reminder2'){const due3=eveningDueAfter(Date.now()+24*3600000);await env.DB.prepare("UPDATE payment_recovery_emails SET reminder2_sent_at=CURRENT_TIMESTAMP,reminder3_due_at=?,reminder_level=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(due3,row.id).run();}else if(sent?.ok){await env.DB.prepare("UPDATE payment_recovery_emails SET reminder3_sent_at=CURRENT_TIMESTAMP,reminder_level=2,status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run();}out.push({order_id:row.order_id,kind,ok:!!sent?.ok,reason:sent?.reason||''});}
  return{ok:true,processed:rows.length,results:out};
}
