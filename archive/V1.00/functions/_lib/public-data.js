import { safeJsonParse } from './utils.js';
import { getProductClassMappings } from './dance-studio.js';

export function bannerHref(b) {
  if (b.link_type === 'url') return b.link_value || '/offers';
  if (b.link_type === 'page') return b.link_value || '/offers';
  if (b.link_type === 'product') return `/offers#${b.link_value || ''}`;
  return '/offers';
}

export async function getPublicBanners(env) {
  const { results } = await env.DB.prepare("SELECT * FROM banners WHERE visible = 1 AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP) ORDER BY sort_order, id LIMIT 8").all();
  return (results || []).map(b => ({ ...b, href: bannerHref(b), hero_title: b.title, hero_text: b.subtitle }));
}

export async function getPublicProducts(env, page = '') {
  const where = page ? 'WHERE p.status = ? AND pp.page_key = ? AND pp.visible = 1' : 'WHERE p.status = ?';
  const params = page ? [page, 'active'] : ['active'];
  const sql = page
    ? `SELECT p.*, px.placement_order FROM products p
       JOIN (
         SELECT product_id, MIN(sort_order) AS placement_order
         FROM page_placements
         WHERE page_key = ? AND visible = 1
         GROUP BY product_id
       ) px ON px.product_id = p.id
       WHERE p.status = ?
       ORDER BY px.placement_order, p.sort_order, p.id`
    : `SELECT p.*, p.sort_order AS placement_order FROM products p ${where} ORDER BY p.sort_order, p.id`;
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  const rows = results || [];
  if (!rows.length) return [];

  // Fetch all images and variants in two queries instead of two queries per product.
  // This avoids the N+1 request pattern and significantly reduces D1 round trips.
  const ids = rows.map(r => Number(r.id)).filter(Number.isFinite);
  const marks = ids.map(() => '?').join(',');
  const [imageResult, variantResult, demandResult, classMappings] = await Promise.all([
    env.DB.prepare(`SELECT * FROM product_images WHERE product_id IN (${marks}) ORDER BY product_id, sort_order, id`).bind(...ids).all(),
    env.DB.prepare(`SELECT id, product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise, setup_amount_paise FROM product_variants WHERE product_id IN (${marks}) AND status = 'active' ORDER BY product_id, billing_months`).bind(...ids).all(),
    env.DB.prepare(`SELECT p.id AS product_id,
      COALESCE((SELECT COUNT(*) FROM product_interest_events pie WHERE pie.product_id=p.id AND datetime(pie.updated_at)>=datetime('now','-7 days')),0) AS recent_interest_count,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND lower(o.payment_status) IN ('paid','captured','active','successful','success') AND datetime(o.created_at)>=datetime('now','-7 days')),0) AS recent_paid_count,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND lower(o.payment_status) IN ('paid','captured','active','successful','success')),0) AS sold_count
      FROM products p WHERE p.id IN (${marks})`).bind(...ids).all().catch(()=>({results:[]})),
    getProductClassMappings(env,ids).catch(()=>new Map())
  ]);

  const imagesByProduct = new Map();
  for (const image of imageResult.results || []) {
    const list = imagesByProduct.get(image.product_id) || [];
    if (list.length < 3) list.push(image);
    imagesByProduct.set(image.product_id, list);
  }
  const variantsByProduct = new Map();
  for (const variant of variantResult.results || []) {
    const list = variantsByProduct.get(variant.product_id) || [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  const demandByProduct = new Map((demandResult.results || []).map(r => [Number(r.product_id), r]));

  return rows.map(p => {
    const d=demandByProduct.get(Number(p.id))||{};
    return {
      ...p,
      recent_interest_count:Number(d.recent_interest_count||0),
      recent_paid_count:Number(d.recent_paid_count||0),
      sold_count:Number(d.sold_count||0),
      features: safeJsonParse(p.features_json, []),
      images: imagesByProduct.get(p.id) || [],
      variants: variantsByProduct.get(p.id) || [],
      class_mapping: classMappings.get(Number(p.id)) || null
    };
  });
}

export async function getPublicStories(env, limit = 24) {
  const { results } = await env.DB.prepare("SELECT title,url,platform,thumbnail_url FROM success_stories WHERE status='active' ORDER BY sort_order, id DESC LIMIT ?").bind(Math.max(1, Math.min(100, Number(limit) || 24))).all();
  return results || [];
}
