import { json, readJson, requireAdmin, normalizePhone } from '../../_lib/utils.js';

function paidWhere(){
  return `(lower(coalesce(o.payment_status,'')) IN ('paid','captured','successful','success') OR lower(coalesce(o.status,'')) IN ('paid','captured','successful','success'))`;
}
export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error:e.message },401); }
  const url=new URL(request.url), q=String(url.searchParams.get('q')||'').trim().toLowerCase();
  const {results:checkoutRows}=await env.DB.prepare(`
    SELECT
      'order:' || o.order_id AS row_key,
      o.order_id,
      o.customer_name AS name,
      o.customer_phone AS phone,
      o.customer_email AS email,
      o.amount_paise,
      COALESCE((SELECT oi.product_name FROM order_items oi WHERE oi.order_id=o.id ORDER BY oi.id LIMIT 1),'One-Time Payment') AS purpose,
      o.gateway,
      o.gateway_payment_id AS transaction_reference,
      o.internal_notes AS notes,
      COALESCE(o.updated_at,o.created_at) AS payment_date,
      'Checkout' AS source
    FROM orders o
    WHERE lower(coalesce(o.payment_mode,''))='one_time' AND ${paidWhere()}
    ORDER BY COALESCE(o.updated_at,o.created_at) DESC
    LIMIT 500
  `).all();
  const {results:manualRows}=await env.DB.prepare(`
    SELECT
      'manual:' || id AS row_key,
      '' AS order_id,
      name,phone,email,amount_paise,purpose,gateway,transaction_reference,notes,
      COALESCE(payment_date,created_at) AS payment_date,
      'Manual' AS source
    FROM one_time_users
    ORDER BY COALESCE(payment_date,created_at) DESC
    LIMIT 500
  `).all();
  let rows=[...(checkoutRows||[]),...(manualRows||[])];
  if(q) rows=rows.filter(r=>[r.name,r.phone,r.email,r.order_id,r.purpose,r.gateway,r.transaction_reference].some(v=>String(v||'').toLowerCase().includes(q)));
  rows.sort((a,b)=>String(b.payment_date||'').localeCompare(String(a.payment_date||'')));
  return json({ users:rows.slice(0,500) });
}

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error:e.message },401); }
  const b=await readJson(request);
  const phone=normalizePhone(b.phone||'');
  if(!phone) return json({ error:'Phone number is required.' },400);
  const amountPaise=Math.max(0,Math.round(Number(b.amount_rupees||0)*100));
  const res=await env.DB.prepare(`
    INSERT INTO one_time_users(name,phone,email,amount_paise,purpose,gateway,transaction_reference,notes,payment_date)
    VALUES(?,?,?,?,?,?,?,?,?)
  `).bind(
    String(b.name||'').trim(), phone, String(b.email||'').trim(), amountPaise,
    String(b.purpose||'One-Time Payment').trim(), String(b.gateway||'manual').trim(),
    String(b.transaction_reference||'').trim(), String(b.notes||'').trim(),
    String(b.payment_date||'').trim() || new Date().toISOString()
  ).run();
  return json({ ok:true, id:res.meta.last_row_id });
}

export async function onRequestDelete({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error:e.message },401); }
  const id=Number(new URL(request.url).searchParams.get('id')||0);
  if(!id) return json({ error:'Record id is required.' },400);
  await env.DB.prepare('DELETE FROM one_time_users WHERE id=?').bind(id).run();
  return json({ ok:true });
}
