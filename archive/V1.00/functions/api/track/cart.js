import { json, readJson } from '../../_lib/utils.js';

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const visitorId = String(b.visitor_id || '').trim().slice(0,80);
  if (!visitorId) return json({ ok:false, error:'visitor_id required' }, 400);
  const items = Array.isArray(b.items) ? b.items.slice(0,100).map(x => ({
    product_id: Number(x.product_id || 0) || null,
    variant_id: Number(x.variant_id || 0) || null,
    name: String(x.name || '').slice(0,180),
    variant_name: String(x.variant_name || '').slice(0,120),
    quantity: Math.max(1, Math.min(100, Number(x.quantity || 1))),
    offer_price_paise: Math.max(0, Math.round(Number(x.offer_price_paise || 0)))
  })) : [];
  const serviceCount = items.reduce((n,x)=>n + Number(x.quantity || 0), 0);
  const amountPaise = items.reduce((n,x)=>n + Number(x.offer_price_paise || 0) * Number(x.quantity || 1), 0);
  await env.DB.prepare(`INSERT INTO visitor_cart_state(visitor_id,service_count,amount_paise,items_json,updated_at)
    VALUES(?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(visitor_id) DO UPDATE SET service_count=excluded.service_count,amount_paise=excluded.amount_paise,items_json=excluded.items_json,updated_at=CURRENT_TIMESTAMP`)
    .bind(visitorId, serviceCount, amountPaise, JSON.stringify(items)).run();
  return json({ ok:true, service_count:serviceCount, amount_paise:amountPaise });
}
