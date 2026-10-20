import { json, requireAdmin } from '../../_lib/utils.js';

export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error:e.message },401); }
  const url=new URL(request.url),q=String(url.searchParams.get('q')||'').trim();
  const like=`%${q}%`;
  const where=q?`AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.instagram_id LIKE ? OR l.next_action LIKE ?)` : '';
  const matchOrder=`(
    (COALESCE(l.phone,'')<>'' AND substr(replace(replace(replace(replace(COALESCE(o.customer_phone,o.website_phone,o.razorpay_phone,''),'+',''),' ',''),'-',''),'(',''),-10)=substr(replace(replace(replace(replace(COALESCE(l.phone,''),'+',''),' ',''),'-',''),'(',''),-10))
    OR (COALESCE(l.email,'')<>'' AND lower(COALESCE(o.customer_email,''))=lower(l.email))
    OR (COALESCE(l.order_id,'')<>'' AND o.order_id=l.order_id)
  )`;
  const matchSubscriber=`((COALESCE(l.phone,'')<>'' AND substr(replace(replace(replace(replace(COALESCE(s.phone,''),'+',''),' ',''),'-',''),'(',''),-10)=substr(replace(replace(replace(replace(COALESCE(l.phone,''),'+',''),' ',''),'-',''),'(',''),-10)) OR (COALESCE(l.email,'')<>'' AND lower(COALESCE(s.email,''))=lower(l.email)))`;
  const stmt=env.DB.prepare(`
    SELECT l.*,
      COUNT(v.id) AS visit_count,
      COALESCE(SUM(v.duration_ms),0) AS time_spent_ms,
      MAX(v.created_at) AS last_visit,
      COALESCE(
        (SELECT oi.product_name FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE ${matchOrder} ORDER BY COALESCE(o.updated_at,o.created_at) DESC,oi.id ASC LIMIT 1),
        (SELECT s.plan_name FROM subscribers s WHERE ${matchSubscriber} ORDER BY COALESCE(s.updated_at,s.created_at) DESC LIMIT 1),
        '—'
      ) AS plan_offer,
      COALESCE(
        (SELECT COALESCE(NULLIF(o.payment_status,''),NULLIF(o.status,''),'unknown') FROM orders o WHERE ${matchOrder} AND COALESCE(o.gateway_subscription_id,'')<>'' ORDER BY COALESCE(o.updated_at,o.created_at) DESC LIMIT 1),
        (SELECT COALESCE(NULLIF(s.subscription_status,''),'unknown') FROM subscribers s WHERE ${matchSubscriber} AND COALESCE(s.gateway_subscription_id,'')<>'' ORDER BY COALESCE(s.updated_at,s.created_at) DESC LIMIT 1),
        '—'
      ) AS subscription_status,
      COALESCE(
        (SELECT MAX(pe.created_at) FROM payment_events pe JOIN orders o ON o.order_id=pe.order_id WHERE ${matchOrder} AND COALESCE(o.gateway_subscription_id,'')<>'' AND COALESCE(pe.verified,0)=1 AND (lower(pe.event_type) LIKE '%payment%paid%' OR lower(pe.event_type) LIKE '%payment%captur%' OR lower(pe.event_type) LIKE '%invoice%paid%' OR lower(pe.event_type) LIKE '%redemption%complete%' OR lower(pe.event_type) LIKE '%charge%succeed%')),
        (SELECT MAX(mp.payment_date) FROM manual_payments mp WHERE mp.lead_id=l.id AND lower(COALESCE(mp.payment_type,'')) LIKE '%subscription%'),
        ''
      ) AS last_subscription_at
    FROM contact_leads l
    LEFT JOIN visitor_events v ON v.visitor_id=l.visitor_id
    WHERE COALESCE(l.is_favorite,0)=1 ${where}
    GROUP BY l.id
    ORDER BY COALESCE(l.updated_at,l.created_at) DESC,l.id DESC
    LIMIT 1000
  `);
  const r=q?await stmt.bind(like,like,like,like,like).all():await stmt.all();
  return json({rows:r.results||[]});
}
