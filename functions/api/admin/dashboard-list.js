import { json, requireAdmin } from '../../_lib/utils.js';
import { syncStudentLeadAccounts } from '../../_lib/identity-sync.js';

const paidOrderMatchForLead = alias => `EXISTS (
  SELECT 1 FROM orders po
  WHERE (lower(COALESCE(po.payment_status,'')) IN ('paid','captured','successful','success') OR lower(COALESCE(po.status,'')) IN ('paid','captured','successful','success'))
    AND (
      (COALESCE(${alias}.order_id,'')<>'' AND po.order_id=${alias}.order_id)
      OR (COALESCE(${alias}.email,'')<>'' AND lower(trim(COALESCE(po.customer_email,'')))=lower(trim(${alias}.email)))
      OR (COALESCE(${alias}.phone,'')<>'' AND (
        substr(replace(replace(replace(replace(replace(COALESCE(po.customer_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
        OR substr(replace(replace(replace(replace(replace(COALESCE(po.website_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
        OR substr(replace(replace(replace(replace(replace(COALESCE(po.razorpay_phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(COALESCE(${alias}.phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)
      ))
    )
)`;
const activeLeadWhere = alias => `lower(COALESCE(${alias}.status,'new')) NOT IN ('closed','converted')
  AND lower(COALESCE(${alias}.interest_level,'')) <> 'not interested'
  AND lower(COALESCE(${alias}.outcome,'')) NOT IN ('not interested','closed','converted','purchased','payment collected')
  AND NOT (lower(COALESCE(${alias}.source,'')) IN ('razorpay','stripe','phonepe','payment_gateway') AND lower(COALESCE(${alias}.source_detail,'')) LIKE '%customer identity%')
  AND NOT (${paidOrderMatchForLead(alias)})`;

async function attachPageStats(env,rows){
  const vids=[...new Set((rows||[]).map(r=>r.visitor_id).filter(Boolean))];
  if(!vids.length)return rows||[];
  const ph=vids.map(()=>'?').join(',');
  const data=(await env.DB.prepare(`SELECT visitor_id,path,COUNT(*) visits,COALESCE(SUM(duration_ms),0) time_spent_ms FROM visitor_events WHERE visitor_id IN (${ph}) GROUP BY visitor_id,path ORDER BY visitor_id,time_spent_ms DESC,visits DESC`).bind(...vids).all()).results||[];
  const sources=(await env.DB.prepare(`SELECT visitor_id,COALESCE(NULLIF(TRIM(source),''),'Direct / unknown') source,MIN(COALESCE(referrer,'')) referrer,COUNT(*) visits,MIN(created_at) first_seen,MAX(created_at) last_seen FROM visitor_events WHERE visitor_id IN (${ph}) GROUP BY visitor_id,LOWER(COALESCE(NULLIF(TRIM(source),''),'Direct / unknown')) ORDER BY visitor_id,first_seen`).bind(...vids).all().catch(()=>({results:[]}))).results||[];
  const by={},sourceBy={};for(const x of data)(by[x.visitor_id]||(by[x.visitor_id]=[])).push(x);for(const x of sources)(sourceBy[x.visitor_id]||(sourceBy[x.visitor_id]=[])).push(x);
  for(const r of rows){const src=sourceBy[r.visitor_id]||[];r.page_stats=(by[r.visitor_id]||[]).slice(0,12);r.traffic_sources=src;r.traffic_source=src[0]?.source||'';r.traffic_referrer=src[0]?.referrer||'';}
  return rows;
}

export async function onRequestGet({ request, env }) {
  try{await requireAdmin(request, env)}catch(e){return json({error:e.message},401)}
  await syncStudentLeadAccounts(env,{limit:1000}).catch(()=>{});
  const type = new URL(request.url).searchParams.get('type') || 'totalLeads';
  try{
    if(['studentSignups','coachSignups','paidCustomers'].includes(type)){
      let rows=[];
      if(type==='studentSignups'||type==='coachSignups'){
        const role=type==='coachSignups'?'coach':'student',result=await env.DB.prepare(`SELECT a.id,a.display_name name,a.real_name,a.email,a.phone,a.status,a.approval_source,a.profile_photo_url,a.created_at,a.updated_at,CASE WHEN a.role='coach' THEN p.dance_coach_id ELSE 0 END dance_coach_id,p.designation,p.badge,p.bio,p.experience,p.availability_days_json,p.availability_slots_json,p.class_types_json,p.instagram_url,p.facebook_url,p.application_status FROM portal_accounts a LEFT JOIN portal_coach_profiles p ON p.account_id=a.id WHERE a.role=? ORDER BY datetime(a.created_at) DESC,a.id DESC LIMIT 2000`).bind(role).all();rows=result.results||[];
      }else{
        const result=await env.DB.prepare(`SELECT a.id,a.display_name name,a.real_name,a.email,a.phone,a.status,a.approval_source,a.profile_photo_url,a.created_at,a.updated_at,COALESCE((SELECT SUM(o.amount_paise) FROM orders o WHERE lower(COALESCE(o.customer_email,''))=lower(a.email) AND lower(COALESCE(o.payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing')),0) amount_paise,(SELECT MAX(o.updated_at) FROM orders o WHERE lower(COALESCE(o.customer_email,''))=lower(a.email) AND lower(COALESCE(o.payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing')) last_payment_at FROM portal_accounts a WHERE a.role='student' AND a.status='active' AND (EXISTS(SELECT 1 FROM orders o WHERE lower(COALESCE(o.customer_email,''))=lower(a.email) AND lower(COALESCE(o.payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing')) OR EXISTS(SELECT 1 FROM webinar_members m WHERE lower(m.customer_email)=lower(a.email) AND m.status='current' AND lower(COALESCE(m.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due'))) ORDER BY datetime(COALESCE(last_payment_at,a.updated_at)) DESC,a.id DESC LIMIT 2000`).all();rows=result.results||[];
      }
      const format=new URL(request.url).searchParams.get('format')||'';if(format==='csv'){
        const columns=['id','name','real_name','email','phone','status','approval_source','created_at','last_payment_at','amount_paise'],escape=value=>`"${String(value??'').replace(/"/g,'""')}"`,csv=[columns.map(escape).join(','),...rows.map(row=>columns.map(key=>escape(row[key])).join(','))].join('\r\n');return new Response('\ufeff'+csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${type}.csv"`,'cache-control':'no-store'}});
      }
      return json({rows});
    }
    if(type==='activeSubscriptions'||type==='pendingCollections'){
      const where=type==='activeSubscriptions'
        ? "lower(COALESCE(o.payment_mode,'subscription'))<>'one_time' AND (o.status IN ('paid','captured','successful','success') OR o.payment_status IN ('paid','captured','successful','success'))"
        : "o.payment_status NOT IN ('paid','captured','successful','success')";
      const r=await env.DB.prepare(`SELECT o.*,l.id lead_id,l.visitor_id,l.interest_level,l.follow_up_date,l.next_action,l.assigned_to,l.is_favorite,
        COALESCE((SELECT SUM(quantity) FROM order_items oi WHERE oi.order_id=o.id),0) service_count,
        COALESCE((SELECT SUM(amount_paise) FROM manual_payments mp WHERE mp.order_id=o.order_id),0) manual_paid_paise
        FROM orders o LEFT JOIN contact_leads l ON l.order_id=o.order_id OR (l.phone!='' AND (o.customer_phone LIKE '%'||substr(l.phone,-10)||'%' OR o.website_phone LIKE '%'||substr(l.phone,-10)||'%'))
        WHERE ${where} GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`).all();
      const rows=await attachPageStats(env,(r.results||[]).map(x=>({...x,id:x.lead_id||0})));
      for(const x of rows){
        if(x.visitor_id){
          const a=await env.DB.prepare(`SELECT COUNT(*) visit_count,COALESCE(SUM(duration_ms),0) time_spent_ms,MIN(created_at) first_visit,MAX(created_at) last_visit FROM visitor_events WHERE visitor_id=?`).bind(x.visitor_id).first().catch(()=>null);
          Object.assign(x,a||{});
        }else{x.visit_count=0;x.time_spent_ms=0;x.first_visit=null;x.last_visit=null;}
        const paid=['paid','captured','successful','success'].includes(String(x.payment_status||'').toLowerCase());
        x.pending_amount_paise=paid?0:Math.max(0,Number(x.amount_paise||0)-Number(x.manual_paid_paise||0));
        x.paid_amount_paise=paid?Number(x.amount_paise||0):Number(x.manual_paid_paise||0);
      }
      return json({rows});
    }
    let where=activeLeadWhere('l');
    if (type === 'hotLeads') where=`${activeLeadWhere('l')} AND (lower(COALESCE(l.status,''))='hot' OR lower(COALESCE(l.interest_level,''))='hot') AND COALESCE(l.updated_at,l.created_at)>=datetime('now','-3 days')`;
    else if (type === 'recentLeads') where=`${activeLeadWhere('l')} AND l.created_at>=datetime('now','-7 days')`;
    else if (type === 'todayFollowups') where=`l.follow_up_date=date('now','+330 minutes') AND ${activeLeadWhere('l')}`;
    else if (type === 'tomorrowFollowups') where=`l.follow_up_date=date('now','+330 minutes','+1 day') AND ${activeLeadWhere('l')}`;
    else if (type === 'totalFollowupsDue') where=`l.follow_up_date IS NOT NULL AND trim(l.follow_up_date)!='' AND l.follow_up_date<=date('now','+330 minutes') AND ${activeLeadWhere('l')}`;
    const limit=type==='recentLeads'?50:100;
    const r=await env.DB.prepare(`SELECT l.*,
      COUNT(v.id) visit_count,COALESCE(SUM(v.duration_ms),0) time_spent_ms,MIN(v.created_at) first_visit,MAX(v.created_at) last_visit,
      COALESCE(c.service_count,0) cart_service_count,COALESCE(c.amount_paise,0) cart_amount_paise,
      o.amount_paise linked_order_amount_paise,o.payment_status linked_payment_status,o.status linked_order_status,o.gateway linked_gateway,o.gateway_subscription_id linked_subscription_id,o.gateway_payment_id linked_payment_id,
      COALESCE((SELECT SUM(quantity) FROM order_items oi WHERE oi.order_id=o.id),0) service_count
      FROM contact_leads l
      LEFT JOIN visitor_events v ON v.visitor_id=l.visitor_id
      LEFT JOIN visitor_cart_state c ON c.visitor_id=l.visitor_id
      LEFT JOIN orders o ON o.order_id=l.order_id
      WHERE ${where}
      GROUP BY l.id ORDER BY COALESCE(l.updated_at,l.created_at) DESC,l.id DESC LIMIT ${limit}`).all();
    const rows=await attachPageStats(env,r.results||[]);
    for(const x of rows){
      const paid=['paid','captured','successful','success'].includes(String(x.linked_payment_status||'').toLowerCase());
      x.service_count=Number(x.service_count||0)||Number(x.cart_service_count||0);
      x.pending_amount_paise=paid?0:Number(x.linked_order_amount_paise||x.cart_amount_paise||0);
      x.paid_amount_paise=paid?Number(x.linked_order_amount_paise||0):0;
    }
    return json({rows});
  }catch(e){
    try{const r=await env.DB.prepare("SELECT * FROM contact_leads WHERE lower(COALESCE(status,'new')) NOT IN ('closed','converted') AND lower(COALESCE(interest_level,''))<>'not interested' AND NOT (lower(COALESCE(source,'')) IN ('razorpay','stripe','phonepe','payment_gateway') AND lower(COALESCE(source_detail,'')) LIKE '%customer identity%') ORDER BY created_at DESC LIMIT 100").all();return json({rows:r.results||[],warning:e.message});}
    catch(e2){return json({error:e2.message||e.message},500)}
  }
}
