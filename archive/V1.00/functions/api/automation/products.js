import { json, readJson, requireAutomation, slugify, rupeesToPaise, calcTotalCount } from '../../_lib/utils.js';

async function ensureDefaultVariants(env, productId, sku, regular, offer, currency='INR') {
  const count = await env.DB.prepare('SELECT COUNT(*) c FROM product_variants WHERE product_id=?').bind(productId).first();
  if ((count?.c || 0) > 0) return;
  const list = [
    ['MONTHLY','Monthly',1,1], ['QUARTERLY','3 Months',3,3], ['HALFYEAR','6 Months',6,6], ['NINEMONTH','9 Months',9,9], ['YEARLY','Yearly',12,12], ['THREEYEAR','3 Years',36,36]
  ];
  for (const [suffix, name, months, mult] of list) {
    await env.DB.prepare(`INSERT OR IGNORE INTO product_variants(product_id,sku,name,billing_months,horizon_years,total_count,regular_price_paise,offer_price_paise,setup_amount_paise,currency,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(productId, `${sku}-${suffix}`, name, months, 21, calcTotalCount(months, 21), regular * mult, offer * mult, 0, currency, 'active').run();
  }
}
async function applyPageKeys(env, productId, pageKeys='') {
  const pages = String(pageKeys || '').split(/[|,]/).map(x=>x.trim()).filter(Boolean);
  for (const page of pages) await env.DB.prepare('INSERT OR IGNORE INTO page_placements(product_id,page_key,section_key,sort_order,visible) VALUES(?,?,?,?,1)').bind(productId, page, page==='offers'?'memberships':'featured', 0).run();
}
export async function onRequestPost({ request, env }) {
  try { await requireAutomation(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const b = await readJson(request);
  const items = Array.isArray(b.products) ? b.products : [b];
  let count = 0;
  for (const p of items) {
    const sku = p.sku; if (!sku || !p.name) continue;
    const regular = p.regular_price_paise ?? rupeesToPaise(p.regular_price);
    const offer = p.offer_price_paise ?? rupeesToPaise(p.offer_price);
    const features = Array.isArray(p.features) ? p.features : String(p.features || '').split(/[|\n]/).map(x=>x.trim()).filter(Boolean);
    await env.DB.prepare('INSERT INTO products(sku,name,slug,short_description,description,regular_price_paise,offer_price_paise,badge,features_json,eligibility,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,slug=excluded.slug,short_description=excluded.short_description,description=excluded.description,regular_price_paise=excluded.regular_price_paise,offer_price_paise=excluded.offer_price_paise,badge=excluded.badge,features_json=excluded.features_json,eligibility=excluded.eligibility,status=excluded.status,updated_at=CURRENT_TIMESTAMP')
      .bind(sku, p.name, p.slug || slugify(p.name), p.short_description || '', p.description || '', regular, offer, p.badge || '', JSON.stringify(features), p.eligibility || '', p.status || 'active').run();
    const product = await env.DB.prepare('SELECT id FROM products WHERE sku=?').bind(sku).first();
    if (product?.id) {
      await ensureDefaultVariants(env, product.id, sku, regular, offer, p.currency || 'INR');
      await applyPageKeys(env, product.id, p.page_keys || p.pages || '');
    }
    count++;
  }
  return json({ ok: true, count });
}
