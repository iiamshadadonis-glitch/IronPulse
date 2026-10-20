import { json, requireAdmin } from '../../_lib/utils.js';

const DAY=/^\d{4}-\d{2}-\d{2}$/;
const CLASS_TYPES=new Set(['all','online_class','offline_class','demo','webinar','trial','unassigned']);
const CONFIRMED=new Set(['new_subscriber','renewal','paid','one_time']);
const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
const validDay=(value,fallback)=>DAY.test(String(value||''))?String(value):fallback;
const results=async statement=>(await statement.all()).results||[];
const dateExpr=column=>`date(NULLIF(${column},''),'+330 minutes')`;

function bounds(url){
  const now=new Date(),endDefault=new Date(now.getTime()+19800000).toISOString().slice(0,10),startDate=new Date(`${endDefault}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate()-30);
  let start=validDay(url.searchParams.get('start'),startDate.toISOString().slice(0,10));
  let end=validDay(url.searchParams.get('end'),endDefault);
  if(start>end)[start,end]=[end,start];
  const maxStart=new Date(`${end}T00:00:00Z`);maxStart.setUTCDate(maxStart.getUTCDate()-3653);
  if(start<maxStart.toISOString().slice(0,10))start=maxStart.toISOString().slice(0,10);
  return {start,end};
}

async function columns(env,table){
  try{return new Set((await results(env.DB.prepare(`PRAGMA table_info(${table})`))).map(row=>String(row.name||'')));}catch{return new Set();}
}

async function capabilities(env){
  const names=['order_items','order_class_assignments','product_class_mappings','dance_coaches','contact_leads','lead_identity_links','manual_payments'];
  const sets=await Promise.all(names.map(name=>columns(env,name)));
  return Object.fromEntries(names.map((name,index)=>[name,sets[index]]));
}

function orderContextCtes(caps){
  const assignments=caps.order_class_assignments,mappings=caps.product_class_mappings,items=caps.order_items,coaches=caps.dance_coaches;
  const assignmentReady=assignments.has('order_id')&&assignments.has('class_type')&&assignments.has('coach_id');
  const mappingReady=mappings.has('product_id')&&mappings.has('class_type')&&mappings.has('coach_id')&&items.has('product_id');
  const activeAssignment=assignmentReady?`(SELECT a.class_type FROM order_class_assignments a WHERE a.order_id=o.id AND COALESCE(a.enabled,1)=1 AND lower(COALESCE(a.status,'active'))='active' ORDER BY a.id DESC LIMIT 1)`:"''";
  const mappedClass=mappingReady?`(SELECT m.class_type FROM order_items oi JOIN product_class_mappings m ON m.product_id=oi.product_id WHERE oi.order_id=o.id AND COALESCE(m.enabled,1)=1 AND lower(COALESCE(m.status,'active'))='active' ORDER BY oi.id LIMIT 1)`:"''";
  const assignmentCoach=assignmentReady?`(SELECT COALESCE(a.coach_id,0) FROM order_class_assignments a WHERE a.order_id=o.id AND COALESCE(a.enabled,1)=1 AND lower(COALESCE(a.status,'active'))='active' ORDER BY a.id DESC LIMIT 1)`:'0';
  const mappedCoach=mappingReady?`(SELECT COALESCE(m.coach_id,0) FROM order_items oi JOIN product_class_mappings m ON m.product_id=oi.product_id WHERE oi.order_id=o.id AND COALESCE(m.enabled,1)=1 AND lower(COALESCE(m.status,'active'))='active' ORDER BY oi.id LIMIT 1)`:'0';
  const coachName=coaches.has('id')&&coaches.has('name')?`COALESCE((SELECT c.name FROM dance_coaches c WHERE c.id=ob.analytics_coach_id LIMIT 1),'Unassigned')`:`'Unassigned'`;
  return `order_base AS (
      SELECT o.*,
        COALESCE(NULLIF(${activeAssignment},''),NULLIF(${mappedClass},''),'unassigned') analytics_class_type,
        COALESCE(NULLIF(${assignmentCoach},0),NULLIF(${mappedCoach},0),0) analytics_coach_id
      FROM orders o
    ), order_context AS (
      SELECT ob.*,${coachName} analytics_coach_name FROM order_base ob
    )`;
}

async function businessRows(env,start,end,caps){
  const context=orderContextCtes(caps),manualType=caps.manual_payments.has('payment_type')?"lower(COALESCE(mp.payment_type,''))":caps.manual_payments.has('payment_mode')?"lower(COALESCE(mp.payment_mode,''))":"''",manualReady=['id','amount_paise','payment_date'].every(column=>caps.manual_payments.has(column));
  const manualUnion=manualReady?`UNION ALL
    SELECT mp.id,${dateExpr('mp.payment_date')} day,mp.amount_paise,${caps.manual_payments.has('order_id')?"COALESCE(mp.order_id,'')":"''"},'',
      COALESCE(o.analytics_class_type,'unassigned'),COALESCE(o.analytics_coach_id,0),COALESCE(o.analytics_coach_name,'Unassigned'),
      CASE WHEN lower(COALESCE(o.payment_mode,''))='one_time' OR ${manualType} LIKE '%one%time%' THEN 'one_time'
           WHEN ${caps.manual_payments.has('order_id')?"trim(COALESCE(mp.order_id,''))<>'' AND EXISTS(SELECT 1 FROM manual_payments older WHERE older.id<mp.id AND older.order_id=mp.order_id AND lower(COALESCE(older.status,'recorded')) NOT IN ('failed','cancelled','canceled'))":'0'} THEN 'renewal'
           WHEN ${caps.manual_payments.has('order_id')?"trim(COALESCE(mp.order_id,''))<>''":'0'} THEN 'new_subscriber' ELSE 'paid' END
    FROM manual_payments mp ${caps.manual_payments.has('order_id')?'LEFT JOIN order_context o ON o.order_id=mp.order_id':'LEFT JOIN order_context o ON 0=1'}
    WHERE ${dateExpr('mp.payment_date')} BETWEEN ? AND ? AND mp.amount_paise>0 ${caps.manual_payments.has('status')?"AND lower(COALESCE(mp.status,'recorded')) NOT IN ('failed','cancelled','canceled')":''}`:'';
  const paymentStatement=env.DB.prepare(`WITH ${context}, successful AS (
    SELECT pr.id,${dateExpr('pr.paid_at')} day,pr.amount_paise,pr.order_id,pr.subscription_id,
      COALESCE(o.analytics_class_type,'unassigned') class_type,COALESCE(o.analytics_coach_id,0) coach_id,COALESCE(o.analytics_coach_name,'Unassigned') coach_name,
      CASE WHEN lower(COALESCE(o.payment_mode,'subscription'))='one_time' THEN 'one_time'
           WHEN trim(COALESCE(pr.subscription_id,o.gateway_subscription_id,''))<>'' AND EXISTS(
             SELECT 1 FROM payment_receipts older WHERE older.id<pr.id AND COALESCE(NULLIF(older.subscription_id,''),older.order_id)=COALESCE(NULLIF(pr.subscription_id,''),pr.order_id)
               AND lower(COALESCE(older.status,'')) IN ('paid','captured','successful','success')) THEN 'renewal'
           ELSE 'new_subscriber' END category
    FROM payment_receipts pr LEFT JOIN order_context o ON o.order_id=pr.order_id
    WHERE ${dateExpr('pr.paid_at')} BETWEEN ? AND ? AND pr.amount_paise>0 AND lower(COALESCE(pr.status,'')) IN ('paid','captured','successful','success')
    ${manualUnion}
  ) SELECT day,category,class_type,coach_id,coach_name,COUNT(*) count,SUM(amount_paise) amount_paise
    FROM successful GROUP BY day,category,class_type,coach_id,coach_name ORDER BY day,category,class_type`);
  const payments=results(paymentStatement.bind(...(manualReady?[start,end,start,end]:[start,end])));
  const exceptions=results(env.DB.prepare(`WITH ${context} SELECT ${dateExpr('o.updated_at')} day,
      CASE WHEN lower(COALESCE(o.status,'')) IN ('cancelled','canceled','expired','revoked') OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','expired','revoked') THEN 'cancelled' ELSE 'failed' END category,
      COALESCE(o.analytics_class_type,'unassigned') class_type,COALESCE(o.analytics_coach_id,0) coach_id,COALESCE(o.analytics_coach_name,'Unassigned') coach_name,
      COUNT(*) count,SUM(COALESCE(o.amount_paise,0)) amount_paise
    FROM order_context o WHERE ${dateExpr('o.updated_at')} BETWEEN ? AND ?
      AND (lower(COALESCE(o.status,'')) IN ('cancelled','canceled','failed','expired','revoked') OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','failed','expired','revoked'))
    GROUP BY day,category,class_type,coach_id,coach_name ORDER BY day,category`).bind(start,end));
  const refunds=results(env.DB.prepare(`WITH ${context} SELECT ${dateExpr('r.created_at')} day,'refund' category,
      COALESCE(o.analytics_class_type,'unassigned') class_type,COALESCE(o.analytics_coach_id,0) coach_id,COALESCE(o.analytics_coach_name,'Unassigned') coach_name,
      COUNT(*) count,SUM(COALESCE(r.amount_paise,0)) amount_paise
    FROM refund_requests r LEFT JOIN order_context o ON o.order_id=r.order_id
    WHERE ${dateExpr('r.created_at')} BETWEEN ? AND ? AND lower(COALESCE(r.status,'requested')) NOT IN ('failed','rejected')
    GROUP BY day,class_type,coach_id,coach_name ORDER BY day`).bind(start,end));
  const [paymentRows,exceptionRows,refundRows]=await Promise.all([payments,exceptions,refunds]);
  return [...paymentRows,...exceptionRows,...refundRows];
}

async function visitorRows(env,start,end){
  return results(env.DB.prepare(`SELECT ${dateExpr('created_at')} day,COALESCE(NULLIF(trim(source),''),'Direct / unknown') source,COUNT(DISTINCT visitor_id) count
    FROM visitor_events WHERE ${dateExpr('created_at')} BETWEEN ? AND ? GROUP BY day,source ORDER BY day,source`).bind(start,end));
}

async function leadRows(env,start,end,caps){
  const lead=caps.contact_leads,links=caps.lead_identity_links,identity=[];
  for(const column of ['name','phone','email','instagram_id'])if(lead.has(column))identity.push(`trim(COALESCE(l.${column},''))<>''`);
  if(links.has('lead_id'))identity.push('EXISTS(SELECT 1 FROM lead_identity_links li WHERE li.lead_id=l.id)');
  const identified=identity.length?`(${identity.join(' OR ')})`:'1=1';
  const canJoin=lead.has('order_id'),context=canJoin?`${orderContextCtes(caps)}, `:'',join=canJoin?'LEFT JOIN order_context o ON o.order_id=l.order_id':'',mapped=canJoin?"COALESCE(o.analytics_class_type,'unassigned')":"'unassigned'",message=lead.has('message')?"lower(COALESCE(l.message,''))":"''";
  const inferred=`CASE WHEN ${mapped}<>'unassigned' THEN ${mapped}
      WHEN lower(COALESCE(l.source,'')) LIKE '%trial%' OR ${message} LIKE '%trial%' THEN 'trial'
      WHEN lower(COALESCE(l.source,'')) LIKE '%webinar%' OR ${message} LIKE '%webinar%' THEN 'webinar'
      WHEN lower(COALESCE(l.source,'')) LIKE '%demo%' OR ${message} LIKE '%demo%' THEN 'demo'
      WHEN lower(COALESCE(l.source,'')) LIKE '%offline%' OR lower(COALESCE(l.source,'')) LIKE '%gym%' THEN 'offline_class'
      WHEN lower(COALESCE(l.source,'')) LIKE '%online%' THEN 'online_class' ELSE 'unassigned' END`;
  return results(env.DB.prepare(`WITH ${context} identified_leads AS (
      SELECT ${dateExpr('l.created_at')} day,COALESCE(NULLIF(trim(l.source),''),'Website') source,${inferred} class_type
      FROM contact_leads l ${join} WHERE ${dateExpr('l.created_at')} BETWEEN ? AND ? AND ${identified}
    ) SELECT day,source,class_type,COUNT(*) count FROM identified_leads GROUP BY day,source,class_type ORDER BY day,source,class_type`).bind(start,end));
}

function coachRows(rows){
  const grouped=new Map();
  for(const row of rows){
    const coachId=Number(row.coach_id||0);if(!coachId)continue;
    const key=`${row.day}:${coachId}`,item=grouped.get(key)||{day:row.day,coach_id:coachId,coach_name:row.coach_name||'Coach',count:0,students:0,subscribers:0,new_subscribers:0,renewals:0,one_time:0,cancelled:0,failed:0,refunds:0,gross_amount_paise:0,refund_amount_paise:0,amount_paise:0};
    const count=Number(row.count||0),amount=Number(row.amount_paise||0),category=String(row.category||'');
    if(category==='new_subscriber'){item.new_subscribers+=count;item.subscribers+=count;item.students+=count;}
    else if(category==='renewal'){item.renewals+=count;item.subscribers+=count;item.students+=count;}
    else if(category==='one_time'){item.one_time+=count;item.students+=count;}
    else if(category==='paid')item.students+=count;
    else if(category==='cancelled')item.cancelled+=count;
    else if(category==='failed')item.failed+=count;
    else if(category==='refund'){item.refunds+=count;item.refund_amount_paise+=amount;}
    if(CONFIRMED.has(category))item.gross_amount_paise+=amount;
    item.count=item.students;item.amount_paise=item.gross_amount_paise-item.refund_amount_paise;grouped.set(key,item);
  }
  return [...grouped.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.coach_name.localeCompare(b.coach_name));
}

function forClass(rows,classType){return classType==='all'?rows:rows.filter(row=>String(row.class_type||'unassigned')===classType);}

async function summary(env,start,end,{mode='all',classType='all'}={}){
  const caps=await capabilities(env),needBusiness=mode==='all'||mode==='business'||mode==='coaches',business=needBusiness?await businessRows(env,start,end,caps):[];
  if(mode==='business'){const rows=forClass(business,classType);return {mode,rows,business:rows};}
  if(mode==='visitors'){const rows=await visitorRows(env,start,end);return {mode,rows,visitors:rows};}
  if(mode==='leads'){const rows=forClass(await leadRows(env,start,end,caps),classType);return {mode,rows,leads:rows};}
  if(mode==='coaches'){const rows=coachRows(business);return {mode,rows,coaches:rows};}
  const [visitors,leads]=await Promise.all([visitorRows(env,start,end),leadRows(env,start,end,caps)]);
  return {business,visitors,leads,coaches:coachRows(business)};
}

async function dayDetails(env,day,category){
  const wanted=clean(category,40),all=!wanted||wanted==='all';
  const manualColumns=await columns(env,'manual_payments'),manualReady=['id','amount_paise','payment_date'].every(column=>manualColumns.has(column));
  const paid=results(env.DB.prepare(`SELECT pr.id,${dateExpr('pr.paid_at')} event_date,
      CASE WHEN lower(COALESCE(o.payment_mode,'subscription'))='one_time' THEN 'one_time'
           WHEN trim(COALESCE(pr.subscription_id,o.gateway_subscription_id,''))<>'' AND EXISTS(SELECT 1 FROM payment_receipts older WHERE older.id<pr.id AND COALESCE(NULLIF(older.subscription_id,''),older.order_id)=COALESCE(NULLIF(pr.subscription_id,''),pr.order_id) AND lower(COALESCE(older.status,'')) IN ('paid','captured','successful','success')) THEN 'renewal'
           ELSE 'new_subscriber' END category,
      COALESCE(o.customer_name,'Customer') customer_name,COALESCE(o.customer_phone,'') customer_phone,COALESCE(o.customer_email,'') customer_email,
      pr.amount_paise,pr.order_id,COALESCE(pr.subscription_id,o.gateway_subscription_id,'') subscription_id,
      COALESCE((SELECT total_count FROM order_items oi WHERE oi.order_id=o.id ORDER BY oi.id LIMIT 1),0) total_cycles,
      CASE WHEN trim(COALESCE(pr.subscription_id,o.gateway_subscription_id,''))='' THEN 1 ELSE (SELECT COUNT(*) FROM payment_receipts cycle WHERE COALESCE(NULLIF(cycle.subscription_id,''),cycle.order_id)=COALESCE(NULLIF(pr.subscription_id,''),pr.order_id) AND lower(COALESCE(cycle.status,'')) IN ('paid','captured','successful','success')) END successful_cycles,
      'Paid' status
    FROM payment_receipts pr LEFT JOIN orders o ON o.order_id=pr.order_id
    WHERE ${dateExpr('pr.paid_at')}=? AND pr.amount_paise>0 AND lower(COALESCE(pr.status,'')) IN ('paid','captured','successful','success') ORDER BY pr.id DESC LIMIT 500`).bind(day));
  const failed=results(env.DB.prepare(`SELECT o.id,${dateExpr('o.updated_at')} event_date,
      CASE WHEN lower(COALESCE(o.status,'')) IN ('cancelled','canceled','expired','revoked') OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','expired','revoked') THEN 'cancelled' ELSE 'failed' END category,
      COALESCE(o.customer_name,'Customer') customer_name,COALESCE(o.customer_phone,'') customer_phone,COALESCE(o.customer_email,'') customer_email,
      COALESCE(o.amount_paise,0) amount_paise,o.order_id,COALESCE(o.gateway_subscription_id,'') subscription_id,
      COALESCE((SELECT total_count FROM order_items oi WHERE oi.order_id=o.id ORDER BY oi.id LIMIT 1),0) total_cycles,
      (SELECT COUNT(*) FROM payment_receipts cycle WHERE cycle.order_id=o.order_id AND lower(COALESCE(cycle.status,'')) IN ('paid','captured','successful','success')) successful_cycles,
      CASE WHEN lower(COALESCE(o.status,'')) IN ('cancelled','canceled','expired','revoked') OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','expired','revoked') THEN 'Cancelled' ELSE 'Failed' END status
    FROM orders o WHERE ${dateExpr('o.updated_at')}=? AND (lower(COALESCE(o.status,'')) IN ('cancelled','canceled','failed','expired','revoked') OR lower(COALESCE(o.payment_status,'')) IN ('cancelled','canceled','failed','expired','revoked')) ORDER BY o.id DESC LIMIT 500`).bind(day));
  const manual=manualReady?results(env.DB.prepare(`SELECT mp.id,${dateExpr('mp.payment_date')} event_date,
      CASE WHEN ${manualColumns.has('payment_mode')?"lower(COALESCE(mp.payment_mode,''))":"''"}='one_time' THEN 'one_time' ELSE 'paid' END category,
      COALESCE(o.customer_name,'Customer') customer_name,COALESCE(o.customer_phone,'') customer_phone,COALESCE(o.customer_email,'') customer_email,
      mp.amount_paise,${manualColumns.has('order_id')?"COALESCE(mp.order_id,'')":"''"} order_id,COALESCE(o.gateway_subscription_id,'') subscription_id,
      COALESCE((SELECT total_count FROM order_items oi WHERE oi.order_id=o.id ORDER BY oi.id LIMIT 1),0) total_cycles,
      1 successful_cycles,'Paid' status
    FROM manual_payments mp ${manualColumns.has('order_id')?'LEFT JOIN orders o ON o.order_id=mp.order_id':'LEFT JOIN orders o ON 0=1'}
    WHERE ${dateExpr('mp.payment_date')}=? AND mp.amount_paise>0 ${manualColumns.has('status')?"AND lower(COALESCE(mp.status,'recorded')) NOT IN ('failed','cancelled','canceled')":''} ORDER BY mp.id DESC LIMIT 500`).bind(day)):Promise.resolve([]);
  const refund=results(env.DB.prepare(`SELECT id,${dateExpr('created_at')} event_date,'refund' category,COALESCE(customer_name,'Customer') customer_name,COALESCE(customer_phone,'') customer_phone,'' customer_email,COALESCE(amount_paise,0) amount_paise,COALESCE(order_id,'') order_id,'' subscription_id,0 total_cycles,0 successful_cycles,'Refund' status FROM refund_requests WHERE ${dateExpr('created_at')}=? AND lower(COALESCE(status,'requested')) NOT IN ('failed','rejected') ORDER BY id DESC LIMIT 500`).bind(day));
  let rows=[...(await paid),...(await manual),...(await failed),...(await refund)];
  if(!all)rows=rows.filter(row=>wanted==='paid'?['new_subscriber','renewal','paid','one_time'].includes(row.category):row.category===wanted);
  return rows.map(row=>({...row,remaining_cycles:Math.max(0,Number(row.total_cycles||0)-Number(row.successful_cycles||0)),client_ref:row.order_id?`order:${row.order_id}`:''}));
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const url=new URL(request.url),{start,end}=bounds(url),detail=validDay(url.searchParams.get('detail'),''),requested=clean(url.searchParams.get('mode')||'all',20),mode=['all','business','visitors','leads','coaches'].includes(requested)?requested:'all',requestedClass=clean(url.searchParams.get('classType')||'all',30),classType=CLASS_TYPES.has(requestedClass)?requestedClass:'all';
  try{
    if(detail)return json({day:detail,category:clean(url.searchParams.get('category')||'all',40),rows:await dayDetails(env,detail,url.searchParams.get('category')||'all')},200,{'cache-control':'private, no-store'});
    return json({start,end,classType,...await summary(env,start,end,{mode,classType})},200,{'cache-control':'private, no-store'});
  }catch(e){return json({error:'Analytics could not be prepared from the saved business records.',detail:clean(e.message,300)},500,{'cache-control':'private, no-store'});}
}
