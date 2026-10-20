import { json, readJson, requireAdmin, normalizePhone } from '../../_lib/utils.js';


// V16.88: subscriber reads are reconciled without writing. A paid recurring
// order is visible immediately even when an older webhook did not create the
// optional subscribers mirror row. This also removes the former 2,000-order
// scan and per-order writes that ran whenever Customers was opened.
const normalizedPhone=column=>`substr(replace(replace(replace(replace(replace(COALESCE(${column},''),'+',''),' ',''),'-',''),'(',''),')',''),-10)`;
function subscriberQuery(hasSearch=false,exportAll=false){
  const where=hasSearch?`WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR city LIKE ? OR plan_name LIKE ? OR gateway_subscription_id LIKE ? OR notes LIKE ? OR order_id LIKE ?`:'';
  return `WITH received AS (
    SELECT order_id,SUM(amount_paise) received_paise FROM (
      SELECT order_id,amount_paise FROM payment_receipts WHERE amount_paise>0 AND lower(COALESCE(status,'')) IN ('paid','captured','successful','success')
      UNION ALL
      SELECT order_id,amount_paise FROM manual_payments WHERE amount_paise>0 AND lower(COALESCE(status,'recorded')) NOT IN ('failed','cancelled','canceled')
    ) GROUP BY order_id
  ), recurring_orders AS (
    SELECT o.id,o.order_id,o.customer_name name,o.customer_phone phone,o.customer_email email,'' city,
      COALESCE((SELECT product_name FROM order_items oi WHERE oi.order_id=o.id ORDER BY oi.id LIMIT 1),'Membership') plan_name,
      CASE WHEN lower(COALESCE(o.payment_status,'')) IN ('authenticated','authorized','trialing') OR lower(COALESCE(o.status,'')) IN ('authenticated','authorized','trialing') THEN 'authenticated' ELSE 'active' END subscription_status,
      COALESCE(o.gateway,'') gateway,COALESCE(o.gateway_subscription_id,'') gateway_subscription_id,
      'Reconciled from paid recurring order '||o.order_id||'.' notes,o.created_at,o.updated_at,
      'order:'||o.order_id client_ref,o.order_id,
      ROW_NUMBER() OVER (PARTITION BY ${normalizedPhone('o.customer_phone')} ORDER BY o.id DESC) phone_rank
    FROM orders o LEFT JOIN received r ON r.order_id=o.order_id
    WHERE lower(COALESCE(o.payment_mode,'subscription'))<>'one_time'
      AND trim(COALESCE(o.customer_phone,''))<>''
      AND trim(COALESCE(o.gateway_subscription_id,''))<>''
      AND lower(COALESCE(o.status,'')) NOT IN ('cancelled','canceled','failed','expired','refunded','revoked')
      AND lower(COALESCE(o.payment_status,'')) NOT IN ('cancelled','canceled','failed','expired','refunded','revoked')
      AND (COALESCE(r.received_paise,0)>0 OR lower(COALESCE(o.status,'')) IN ('active','authenticated','authorized','paid','captured','successful','success','trialing') OR lower(COALESCE(o.payment_status,'')) IN ('active','authenticated','authorized','paid','captured','successful','success','trialing'))
  ), combined AS (
    SELECT id,name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,created_at,updated_at,'subscriber:'||id client_ref,'' order_id FROM subscribers
    UNION ALL
    SELECT -id,name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,created_at,updated_at,client_ref,order_id FROM recurring_orders ro
    WHERE phone_rank=1 AND NOT EXISTS (
      SELECT 1 FROM subscribers s
      WHERE ${normalizedPhone('s.phone')}=${normalizedPhone('ro.phone')}
        AND lower(COALESCE(s.subscription_status,'active')) NOT IN ('cancelled','canceled','failed','halted','expired','unsubscribed','inactive')
    )
  ) SELECT * FROM combined ${where} ORDER BY datetime(COALESCE(updated_at,created_at)) DESC ${exportAll?'':'LIMIT 500'}`;
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const url=new URL(request.url);const q=url.searchParams.get('q')||'';const exportAll=url.searchParams.get('export')==='1';
  const like=`%${q}%`;
  const stmt=q?env.DB.prepare(subscriberQuery(true,exportAll)).bind(like,like,like,like,like,like,like,like):env.DB.prepare(subscriberQuery(false,exportAll));
  const {results}=await stmt.all();
  return json({subscribers:results||[]});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);
  if(Array.isArray(b.rows)){
    let created=0,updated=0,errors=[];
    for(const r of b.rows){
      const phone=normalizePhone(r.phone||r.whatsapp||'');
      if(!phone){errors.push({error:'Phone missing'});continue;}
      const before=await env.DB.prepare('SELECT id FROM subscribers WHERE phone=?').bind(phone).first();
      await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,city=excluded.city,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).bind(r.name||'',phone,r.email||'',r.city||'',r.plan_name||r.plan||'',r.subscription_status||r.status||'active',r.gateway||'',r.gateway_subscription_id||r.subscription_id||'',r.notes||'').run();
      before?updated++:created++;
    }
    return json({ok:true,created,updated,errors});
  }
  const phone=normalizePhone(b.phone||b.customer_phone||'');
  if(!phone)return json({error:'Phone number is required'},400);
  await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,city=excluded.city,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).bind(b.name||b.customer_name||'',phone,b.email||'',b.city||'',b.plan_name||'',b.subscription_status||'active',b.gateway||'',b.gateway_subscription_id||'',b.notes||'').run();
  return json({ok:true});
}

export async function onRequestDelete({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return json({error:'Subscriber id required'},400);
  await env.DB.prepare('DELETE FROM subscribers WHERE id=?').bind(id).run();
  return json({ok:true});
}
