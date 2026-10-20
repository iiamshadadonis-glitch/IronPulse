import { json, requireAdmin } from '../../_lib/utils.js';
import { maybeSweepAbandonedOrders } from '../../_lib/order-maintenance.js';
import { getVisitorAnalytics } from '../../_lib/visitor-analytics.js';
async function one(env, sql, ...args) { return await env.DB.prepare(sql).bind(...args).first(); }
let dashboardMemo={expires:0,payload:null};
const EDGE_TTL_SECONDS=120;

function dashboardCacheKey(request){const url=new URL(request.url);return new Request(`${url.origin}/__uc-internal/v16-90-admin-dashboard-summary`,{method:'GET'});}
async function cachedDashboard(request){try{const hit=await globalThis.caches?.default?.match(dashboardCacheKey(request));if(!hit)return null;return await hit.json();}catch{return null;}}
function cacheDashboard(request,payload,waitUntil){try{const task=globalThis.caches?.default?.put(dashboardCacheKey(request),new Response(JSON.stringify(payload),{headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${EDGE_TTL_SECONDS}`}}));if(typeof waitUntil==='function')waitUntil(task);else task.catch(()=>{});}catch{}}
async function refreshVisitorCards(payload,request,env,waitUntil){
  const analytics=await getVisitorAnalytics({request,env,waitUntil});
  if(payload.visitor_revision===analytics.revision)return payload;
  return {...payload,visitor_revision:analytics.revision,stats:{...payload.stats,
    websiteVisitors:Number(analytics.summary?.visitors||0),
    repeatVisitors:Number(analytics.summary?.repeat_visitors||0),
    topSource:analytics.top_source?.source||'Direct / unknown'}};
}

const paidOrderMatchForLead = alias => `EXISTS (
  SELECT 1 FROM orders o
  WHERE (lower(COALESCE(o.payment_status,'')) IN ('paid','captured','successful','success') OR lower(COALESCE(o.status,'')) IN ('paid','captured','successful','success'))
    AND (
      (COALESCE(${alias}.order_id,'')<>'' AND o.order_id=${alias}.order_id)
      OR (COALESCE(${alias}.email,'')<>'' AND lower(trim(COALESCE(o.customer_email,'')))=lower(trim(${alias}.email)))
      OR (COALESCE(${alias}.phone,'')<>'' AND (
        substr(replace(replace(replace(replace(replace(COALESCE(o.customer_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
        OR substr(replace(replace(replace(replace(replace(COALESCE(o.website_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
        OR substr(replace(replace(replace(replace(replace(COALESCE(o.razorpay_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
      ))
    )
)`;
const activeLeadWhere = alias => `
  lower(COALESCE(${alias}.status,'new')) NOT IN ('closed','converted')
  AND lower(COALESCE(${alias}.interest_level,'')) <> 'not interested'
  AND lower(COALESCE(${alias}.outcome,'')) NOT IN ('not interested','closed','converted','purchased','payment collected')
  AND NOT (lower(COALESCE(${alias}.source,'')) IN ('razorpay','stripe','phonepe','payment_gateway') AND lower(COALESCE(${alias}.source_detail,'')) LIKE '%customer identity%')
  AND NOT (${paidOrderMatchForLead(alias)})
`;

export async function onRequestGet({ request, env, waitUntil }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const force=new URL(request.url).searchParams.get('refresh')==='1';
  // Multiple legacy dashboard decorators can request the same summary during one
  // navigation. Reuse the already-computed aggregate briefly instead of rescanning
  // visitors, leads and payments for each identical request.
  if(!force&&dashboardMemo.payload&&Date.now()<dashboardMemo.expires){
    let payload=dashboardMemo.payload;
    try{payload=await refreshVisitorCards(payload,request,env,waitUntil);}catch(error){console.warn('Visitor dashboard refresh unavailable:',error);}
    if(payload!==dashboardMemo.payload){dashboardMemo={payload,expires:Date.now()+120000};cacheDashboard(request,payload,waitUntil);}
    return json(payload,200,{'cache-control':'private, no-store','x-uc-d1-cache':'memory'});
  }
  const edgePayload=force?null:await cachedDashboard(request);if(edgePayload){
    let payload=edgePayload;
    try{payload=await refreshVisitorCards(payload,request,env,waitUntil);}catch(error){console.warn('Visitor dashboard refresh unavailable:',error);}
    dashboardMemo={payload,expires:Date.now()+60000};if(payload!==edgePayload)cacheDashboard(request,payload,waitUntil);
    return json(payload,200,{'cache-control':'private, no-store','x-uc-d1-cache':'edge'});
  }
  // V16.72: the one-hour abandoned-order rule is preserved, but the expensive
  // UPDATE scan is shared/throttled instead of running on every Dashboard read.
  await maybeSweepAbandonedOrders(env).catch(()=>{});
  const today = new Date(Date.now()+19800000).toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+19800000+86400000).toISOString().slice(0,10);
  // One commerce statement replaces the former repeated Orders, bucket, failed,
  // revenue, subscription, pending-collection and today-revenue scans.
  const commerceMetrics = await one(env,`WITH payment_rows AS (
    SELECT order_id,amount_paise,CASE WHEN date(COALESCE(NULLIF(paid_at,''),created_at),'+330 minutes')=? THEN 1 ELSE 0 END is_today
    FROM payment_receipts WHERE amount_paise>0 AND lower(COALESCE(status,'')) IN ('paid','captured','successful','success')
    UNION ALL
    SELECT order_id,amount_paise,CASE WHEN date(payment_date)=? THEN 1 ELSE 0 END is_today
    FROM manual_payments WHERE amount_paise>0 AND lower(COALESCE(status,'recorded')) NOT IN ('failed','cancelled','canceled')
  ), paid AS (
    SELECT order_id,SUM(amount_paise) received_paise FROM payment_rows GROUP BY order_id
  ), payment_totals AS (
    SELECT COALESCE(SUM(amount_paise),0) revenue_paise,
      COALESCE(SUM(CASE WHEN is_today=1 THEN amount_paise ELSE 0 END),0) today_revenue_paise,
      COALESCE(SUM(CASE WHEN is_today=1 THEN 1 ELSE 0 END),0) today_payments
    FROM payment_rows
  ), x AS (
    SELECT o.*,
      COALESCE(p.received_paise,0) received_paise,
      CASE WHEN lower(COALESCE(o.status,'')) IN ('cancelled','canceled','failed','expired','refunded','revoked')
             OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','failed','expired','refunded','revoked')
           THEN 1 ELSE 0 END terminal,
      CASE WHEN lower(COALESCE(o.payment_mode,'subscription'))<>'one_time'
             AND trim(COALESCE(o.gateway_subscription_id,''))<>'' THEN 1 ELSE 0 END has_subscription
    FROM orders o LEFT JOIN paid p ON p.order_id=o.order_id
  )
  SELECT COUNT(*) total_orders,
    COALESCE(SUM(CASE WHEN received_paise>0 AND terminal=0 AND lower(COALESCE(order_stage,'new'))<>'existing' THEN 1 ELSE 0 END),0) new_paid,
    COALESCE(SUM(CASE WHEN received_paise<=0 AND terminal=0 THEN 1 ELSE 0 END),0) pending_orders,
    COALESCE(SUM(CASE WHEN received_paise>0 AND terminal=0 AND lower(COALESCE(order_stage,'new'))='existing' THEN 1 ELSE 0 END),0) existing_orders,
    COALESCE(SUM(CASE WHEN terminal=1 AND received_paise>0 AND has_subscription=1 THEN 1 ELSE 0 END),0) cancelled_subscriptions,
    COALESCE(SUM(CASE WHEN terminal=1 AND NOT(received_paise>0 AND has_subscription=1) THEN 1 ELSE 0 END),0) cancelled_orders,
    COALESCE(SUM(CASE WHEN payment_status='failed' OR status='failed' THEN 1 ELSE 0 END),0) failed_orders,
    COALESCE(SUM(CASE WHEN lower(COALESCE(payment_mode,'subscription'))<>'one_time' AND (lower(COALESCE(status,'')) IN ('active','authenticated','paid','captured','successful','success') OR lower(COALESCE(payment_status,'')) IN ('authenticated','paid','captured','successful','success')) THEN 1 ELSE 0 END),0) active_subscriptions,
    COALESCE(SUM(CASE WHEN payment_status IN ('awaiting_payment','failed') OR status IN ('new_checkout','failed') THEN 1 ELSE 0 END),0) pending_collections,
    COALESCE(SUM(CASE WHEN payment_status IN ('awaiting_payment','failed') OR status IN ('new_checkout','failed') THEN amount_paise ELSE 0 END),0) pending_collections_paise,
    pt.revenue_paise,pt.today_revenue_paise,pt.today_payments
  FROM x CROSS JOIN payment_totals pt`,today,today).catch(()=>({total_orders:0,new_paid:0,pending_orders:0,existing_orders:0,cancelled_subscriptions:0,cancelled_orders:0,failed_orders:0,active_subscriptions:0,pending_collections:0,pending_collections_paise:0,revenue_paise:0,today_revenue_paise:0,today_payments:0}));
  // V16.90: evaluate the expensive paid-customer exclusion once for each lead,
  // then derive every Dashboard lead/follow-up counter from that one eligible set.
  // The former seven separate statements repeated the same order/identity scan.
  const leadMetrics = await one(env,`WITH eligible AS (
    SELECT l.* FROM contact_leads l WHERE ${activeLeadWhere('l')}
  ) SELECT
    COUNT(*) total_leads,
    COALESCE(SUM(CASE WHEN (lower(COALESCE(status,''))='hot' OR lower(COALESCE(interest_level,''))='hot') AND COALESCE(updated_at,created_at)>=datetime('now','-3 days') THEN 1 ELSE 0 END),0) hot_leads,
    COALESCE(SUM(CASE WHEN created_at>=datetime('now','-7 days') THEN 1 ELSE 0 END),0) recent_leads,
    COALESCE(SUM(CASE WHEN follow_up_date=? THEN 1 ELSE 0 END),0) today_followups,
    COALESCE(SUM(CASE WHEN follow_up_date=? THEN 1 ELSE 0 END),0) tomorrow_followups,
    COALESCE(SUM(CASE WHEN follow_up_date IS NOT NULL AND trim(follow_up_date)<>'' AND follow_up_date<=? THEN 1 ELSE 0 END),0) due_followups
  FROM eligible`,today,tomorrow,today).catch(()=>({total_leads:0,hot_leads:0,recent_leads:0,today_followups:0,tomorrow_followups:0,due_followups:0}));
  // Follow-ups Overview is the complete open enquiry work queue: New + In Progress.
  // Resolved/deleted enquiries are excluded. Article comments intentionally participate
  // because a visitor may use a comment as their first way to contact the business.
  const inquiries = await one(env,`SELECT (
    (SELECT COUNT(*) FROM lead_submissions WHERE submission_type IN ('contact','comment') AND lower(COALESCE(status,'new')) IN ('new','in_progress')) +
    (SELECT COUNT(*) FROM contact_leads l WHERE lower(COALESCE(l.status,'new')) NOT IN ('closed','converted') AND NOT EXISTS (SELECT 1 FROM lead_submissions s2 WHERE s2.lead_id=l.id AND s2.submission_type IN ('contact','comment')))
  ) c`).catch(()=>({c:0}));
  const accountMetrics=await one(env,`SELECT
    (SELECT COUNT(*) FROM portal_accounts WHERE role='student') student_signups,
    (SELECT COUNT(*) FROM portal_accounts WHERE role='coach') coach_signups,
    (SELECT COUNT(*) FROM portal_accounts a WHERE a.role='student' AND a.status='active' AND (EXISTS(SELECT 1 FROM orders o WHERE lower(COALESCE(o.customer_email,''))=lower(a.email) AND lower(COALESCE(o.payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing')) OR EXISTS(SELECT 1 FROM webinar_members m WHERE lower(m.customer_email)=lower(a.email) AND m.status='current' AND lower(COALESCE(m.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')))) paid_customers`).catch(()=>({student_signups:0,coach_signups:0,paid_customers:0}));
  let visitors={c:0}, repeatVisitors={c:0}, topSource={source:'Direct / unknown'};
  let visitorRevision=0;
  try {
    const analytics=await getVisitorAnalytics({request,env,waitUntil,force});
    visitorRevision=analytics.revision;
    visitors={c:Number(analytics.summary?.visitors||0)};
    repeatVisitors={c:Number(analytics.summary?.repeat_visitors||0)};
    topSource=analytics.top_source||{source:'Direct / unknown'};
  } catch (_) {}
  const payload={ visitor_revision:visitorRevision,stats: {
    orders: commerceMetrics.total_orders || 0, paid: commerceMetrics.new_paid || 0, failed: commerceMetrics.failed_orders || 0, revenue_paise: commerceMetrics.revenue_paise || 0,
    pendingOrders: commerceMetrics.pending_orders || 0, existingOrders: commerceMetrics.existing_orders || 0,
    cancelledOrders: commerceMetrics.cancelled_orders || 0, cancelledSubscriptions: commerceMetrics.cancelled_subscriptions || 0,
    totalLeads: leadMetrics.total_leads || 0, hotLeads: leadMetrics.hot_leads || 0, activeSubscriptions: commerceMetrics.active_subscriptions || 0, recentLeads: leadMetrics.recent_leads || 0,
    todayFollowups: leadMetrics.today_followups || 0, tomorrowFollowups: leadMetrics.tomorrow_followups || 0, totalFollowupsDue: leadMetrics.due_followups || 0, inquiries: inquiries.c || 0,
    pendingCollections: commerceMetrics.pending_collections || 0, pendingCollectionsPaise: commerceMetrics.pending_collections_paise || 0,
    todayRevenuePaise: commerceMetrics.today_revenue_paise || 0, todayPayments: commerceMetrics.today_payments || 0, websiteVisitors: visitors.c || 0, repeatVisitors: repeatVisitors.c || 0, topSource: topSource.source || 'Direct / unknown',
    studentSignups:Number(accountMetrics.student_signups||0),coachSignups:Number(accountMetrics.coach_signups||0),paidCustomers:Number(accountMetrics.paid_customers||0)
  }};dashboardMemo={payload,expires:Date.now()+120000};cacheDashboard(request,payload,waitUntil);return json(payload,200,{'cache-control':'private, no-store','x-uc-d1-cache':'miss'});
}
