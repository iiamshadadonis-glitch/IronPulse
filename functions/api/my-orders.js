import { json, sha256Hex } from '../_lib/utils.js';
import { ensurePaymentReceiptsTable } from '../_lib/payment-receipts.js';
import { ensureDanceStudioSchema, syncDanceMembershipsFromRecentOrders } from '../_lib/dance-studio.js';

function publicOrderStatus(order, paid){
  const st=String(order?.status||'').toLowerCase().trim(),ps=String(order?.payment_status||'').toLowerCase().trim();
  if(st==='delivered')return {key:'delivered',label:'Delivered'};
  if(st==='completed')return {key:'completed',label:'Completed'};
  if(st==='in_process'||st==='processing'||st==='process')return {key:'in_process',label:'In Progress'};
  if(st==='cancelled'||st==='canceled'||ps==='cancelled'||ps==='canceled'||st==='expired'||ps==='expired')return {key:'cancelled',label:'Cancelled'};
  if(st==='failed'||ps==='failed')return {key:'failed',label:'Failed'};
  if(paid)return {key:'in_process',label:'In Progress'};
  return {key:'in_process',label:'In Progress'};
}
function publicPaymentStatus(order, paid){
  const st=String(order?.status||'').toLowerCase(),ps=String(order?.payment_status||'').toLowerCase();
  if(paid)return {key:'paid',label:'Paid'};
  if(ps.includes('cancel')||st==='cancelled'||st==='canceled'||ps==='expired'||st==='expired')return {key:'cancelled',label:'Cancelled'};
  if(ps.includes('fail')||st==='failed')return {key:'failed',label:'Failed'};
  return {key:'pending',label:'Pending'};
}
export async function onRequestGet({ request, env }) {
  await ensurePaymentReceiptsTable(env);
  await ensureDanceStudioSchema(env);
  const auth=request.headers.get('authorization')||'',token=auth.replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({error:'Verification session is required.'},401);
  const tokenHash=await sha256Hex(token);
  const session=await env.DB.prepare("SELECT * FROM customer_sessions WHERE token_hash=? AND expires_at > CURRENT_TIMESTAMP").bind(tokenHash).first();
  if(!session)return json({error:'Your verification session has expired. Request a new OTP to view your orders.'},401);
  const key=String(session.phone||'');
  const byEmail=key.startsWith('email:'),identity=byEmail?key.slice(6).toLowerCase():key;
  const where=byEmail?'lower(o.customer_email)=?':'o.customer_phone=?';
  await syncDanceMembershipsFromRecentOrders(env,{lookbackDays:1}).catch(()=>{});
  const {results}=await env.DB.prepare(`SELECT o.*, GROUP_CONCAT(oi.product_name || ' - ' || oi.variant_name, ', ') AS items,
    (SELECT pr.transaction_id FROM payment_receipts pr WHERE pr.order_id=o.order_id AND lower(pr.status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(pr.paid_at_epoch,0),strftime('%s',pr.paid_at)) DESC,pr.id DESC LIMIT 1) AS payment_reference,
    (SELECT pr.amount_paise FROM payment_receipts pr WHERE pr.order_id=o.order_id AND lower(pr.status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(pr.paid_at_epoch,0),strftime('%s',pr.paid_at)) DESC,pr.id DESC LIMIT 1) AS latest_received_paise,
    (SELECT pr.payment_kind FROM payment_receipts pr WHERE pr.order_id=o.order_id AND lower(pr.status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(pr.paid_at_epoch,0),strftime('%s',pr.paid_at)) DESC,pr.id DESC LIMIT 1) AS latest_payment_kind,
    (SELECT COUNT(*) FROM payment_receipts pr2 WHERE pr2.order_id=o.order_id AND lower(pr2.status) IN ('paid','captured','successful','success') AND pr2.amount_paise>0) AS paid_receipts,
    c.city AS customer_city,c.preferred_role AS customer_preferred_role,
    COALESCE(a.id,0) AS class_assignment_id,COALESCE(NULLIF(a.class_name,''),pm.class_name,'') AS assigned_class_name,COALESCE(NULLIF(a.class_type,''),pm.class_type,'') AS assigned_class_type,COALESCE(NULLIF(a.class_time,''),pm.class_time,'') AS assigned_class_time,COALESCE(NULLIF(a.class_days_json,''),pm.class_days_json,'[]') AS assigned_class_days_json,COALESCE(NULLIF(a.access_start_date,''),pm.access_start_date,'') AS access_start_date,COALESCE(NULLIF(a.access_end_date,''),pm.access_end_date,'') AS access_end_date,COALESCE(NULLIF(a.payment_mode,''),p.payment_type,'') AS class_payment_mode,COALESCE(NULLIF(a.location_or_link,''),pm.location_or_link,'') AS class_location_or_link,COALESCE(dc.name,pc.name,'') AS assigned_coach_name
    FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id LEFT JOIN product_class_mappings pm ON pm.product_id=oi.product_id AND pm.enabled=1 LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN order_class_assignments a ON a.order_id=o.id AND a.enabled=1 LEFT JOIN dance_coaches dc ON dc.id=a.coach_id LEFT JOIN dance_coaches pc ON pc.id=pm.coach_id
    WHERE ${where} GROUP BY o.id ORDER BY o.id DESC LIMIT 100`).bind(identity).all();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const orders=(results||[]).map(o=>{
    const st=String(o.status||'').toLowerCase(),ps=String(o.payment_status||'').toLowerCase();
    const paid=Number(o.paid_receipts||0)>0||['paid','captured','active','authenticated'].includes(ps)||['paid','active','authenticated'].includes(st);
    const retryable=['failed','cancelled','canceled','expired'].some(x=>st.includes(x)||ps.includes(x));
    const orderState=publicOrderStatus(o,paid),paymentState=publicPaymentStatus(o,paid);
    let class_access=null;if(o.class_payment_mode==='one_time'&&(o.access_start_date||o.access_end_date)){
      const start=String(o.access_start_date||''),end=String(o.access_end_date||''),isUpcoming=Boolean(start&&today<start),isExpired=Boolean(end&&today>end),isLastDay=Boolean(end&&today===end),status=isExpired?'expired':isUpcoming?'upcoming':isLastDay?'last_day':'active';
      const message=isExpired?`Your one-time access ended on ${end}. Choose a membership plan or contact the studio to continue.`:isUpcoming?`Your one-time class access starts on ${start} and ends on ${end}.`:isLastDay?`Today is the last day of your one-time class access. Renew or contact the studio today to avoid losing access tomorrow.`:`Your one-time class access is active until ${end}.`;
      class_access={status,message,start_date:start,end_date:end,class_name:o.assigned_class_name||'',class_type:o.assigned_class_type||'',class_time:o.assigned_class_time||'',class_days_json:o.assigned_class_days_json||'[]',coach_name:o.assigned_coach_name||'',location_or_link:o.class_location_or_link||'',renew_url:'/offers',contact_url:`/contact?order=${encodeURIComponent(o.order_id)}`};
    }
    return {...o,paid,retryable,class_access,order_status:orderState.key,order_status_label:orderState.label,payment_display_status:paymentState.key,payment_display_label:paymentState.label,invoice_url:paid&&o.payment_reference?`/payment-success?order=${encodeURIComponent(o.order_id)}&reference=${encodeURIComponent(o.payment_reference)}&download=1&silent=1`:''};
  });
  return json({orders,verified_by:byEmail?'email':'whatsapp'});
}
