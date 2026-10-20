import { json, readJson, requireAdmin, razorpayApi } from '../../_lib/utils.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';
import { maybeSweepAbandonedOrders } from '../../_lib/order-maintenance.js';

const clean=v=>String(v??'').trim().toLowerCase();
const paidState=v=>['paid','captured','successful','success'].includes(clean(v));
const terminalState=v=>['cancelled','canceled','failed','expired','refunded','revoked'].includes(clean(v));
const isOneTime=o=>clean(o?.payment_mode)==='one_time';
const hasSubscription=o=>!isOneTime(o)&&!!String(o?.gateway_subscription_id||'').trim();

function classifyOrder(o={}){
  const received=Number(o.received_paise||0),hasMoney=received>0,terminal=terminalState(o.status)||terminalState(o.payment_status);
  if(terminal){
    if(hasMoney&&hasSubscription(o))return 'cancelled_subscriptions';
    return 'cancelled_orders';
  }
  if(!hasMoney)return 'pending_orders';
  if(String(o.order_stage||'new').toLowerCase()==='existing')return 'existing_orders';
  return 'new_orders';
}

function decorate(o={}){
  const received=Math.max(0,Number(o.received_paise||0));
  const setup=Math.max(0,Number(o.setup_amount_paise||0));
  // Prefer the latest amount returned by the connected payment gateway. The local order
  // amount is the fallback and already represents the gross amount requested at checkout.
  const recurring=Math.max(0,Number(o.gateway_recurring_paise||0)||Number(o.amount_paise||0)||Number(o.base_recurring_paise||0));
  const kind=clean(o.latest_payment_kind),life=clean(o.status||o.payment_status),latest=Math.max(0,Number(o.latest_receipt_paise||0));
  const explicitTrial=Number(o.trial_enabled_hint||0)===1;
  // Older test orders may have collected GST on the initial trial amount (for example
  // ₹1.12 instead of ₹1). Do not mislabel those as a full Subscription payment. A
  // catalog/snapshot trial plus a payment smaller than the real recurring mandate is
  // still a Trial; once the real recurring charge arrives the latest receipt no longer
  // matches this condition and the order naturally becomes Subscription.
  const trialPaid=received>0&&!isOneTime(o)&&(
    kind==='authentication'||kind==='trial'||life==='authenticated'||
    (explicitTrial&&latest>0&&recurring>0&&latest<recurring)
  );
  const orderType=trialPaid?'trial':isOneTime(o)?'one_time':'subscription';
  const currentDue=received>0?(trialPaid?recurring:0):((explicitTrial||setup>0)&&!isOneTime(o)?setup:recurring);
  return {...o,received_paise:received,recurring_charge_paise:recurring,current_due_paise:Math.max(0,currentDue),order_type:orderType,gateway_label:String(o.latest_gateway||o.gateway||'').trim()};
}

async function expireStalePending(env){return maybeSweepAbandonedOrders(env);}

// Badge/navigation callers only need the five bucket ID lists and their counts.
// Keep this small result briefly in-isolate so stacked legacy dashboard decorators
// cannot repeat the same D1 scan during one navigation.
let summaryMemo={expires:0,payload:null};
async function orderSummary(env,{force=false}={}){
  if(!force&&summaryMemo.payload&&Date.now()<summaryMemo.expires)return summaryMemo.payload;
  const {results}=await env.DB.prepare(`SELECT o.id,o.order_id,o.status,o.payment_status,o.order_stage,o.payment_mode,o.gateway_subscription_id,
    CASE WHEN EXISTS(SELECT 1 FROM payment_receipts pr WHERE pr.order_id=o.order_id AND pr.amount_paise>0 AND lower(COALESCE(pr.status,'')) IN ('paid','captured','successful','success') LIMIT 1)
      OR EXISTS(SELECT 1 FROM manual_payments mp WHERE mp.order_id=o.order_id AND mp.amount_paise>0 AND lower(COALESCE(mp.status,'recorded')) NOT IN ('failed','cancelled','canceled') LIMIT 1)
      THEN 1 ELSE 0 END received_paise
    FROM orders o ORDER BY o.id DESC`).all();
  const buckets={new_orders:[],pending_orders:[],existing_orders:[],cancelled_orders:[],cancelled_subscriptions:[]};
  for(const row of results||[]){const key=classifyOrder(row);buckets[key].push({id:row.id,order_id:row.order_id});}
  const payload={summary:true,...buckets,counts:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,v.length]))};
  summaryMemo={payload,expires:Date.now()+30000};return payload;
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  await expireStalePending(env);
  const u=new URL(request.url);
  if(u.searchParams.get('summary')==='1')return json(await orderSummary(env,{force:u.searchParams.get('refresh')==='1'}),200,{'cache-control':'private, max-age=15','x-uc-d1-mode':'order-summary'});
  const q=u.searchParams.get('q')||'',status=u.searchParams.get('status')||'',exportAll=u.searchParams.get('export')==='1';
  const where=[],params=[];
  if(status){where.push('o.status=?');params.push(status);}
  if(q){const like=`%${q}%`;where.push('(o.order_id LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ? OR o.gateway_subscription_id LIKE ? OR o.gateway_payment_id LIKE ?)');params.push(like,like,like,like,like,like);}
  const sql=`WITH selected_orders AS (
      SELECT o.* FROM orders o ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY o.id DESC ${exportAll?'':'LIMIT 500'}
    ), receipt_paid AS (
      SELECT pr.* FROM payment_receipts pr JOIN selected_orders so ON so.order_id=pr.order_id
      WHERE pr.amount_paise>0 AND lower(COALESCE(pr.status,'')) IN ('paid','captured','successful','success')
    ), receipt_totals AS (
      SELECT order_id,SUM(amount_paise) amount_paise FROM receipt_paid GROUP BY order_id
    ), receipt_ranked AS (
      SELECT rp.*,ROW_NUMBER() OVER(PARTITION BY rp.order_id ORDER BY COALESCE(NULLIF(rp.paid_at_epoch,0),strftime('%s',rp.paid_at)) DESC,rp.id DESC) rn
      FROM receipt_paid rp
    ), manual_totals AS (
      SELECT mp.order_id,SUM(mp.amount_paise) amount_paise FROM manual_payments mp JOIN selected_orders so ON so.order_id=mp.order_id
      WHERE mp.amount_paise>0 AND lower(COALESCE(mp.status,'recorded')) NOT IN ('failed','cancelled','canceled') GROUP BY mp.order_id
    ), item_ranked AS (
      SELECT oi.*,COALESCE(p.trial_enabled,0) product_trial,
        ROW_NUMBER() OVER(PARTITION BY oi.order_id ORDER BY oi.id) rn
      FROM order_items oi JOIN selected_orders so ON so.id=oi.order_id LEFT JOIN products p ON p.id=oi.product_id
    ), item_totals AS (
      SELECT order_id,
        SUM(COALESCE(NULLIF(recurring_unit_amount_paise,0),unit_amount_paise,0)*CASE WHEN COALESCE(quantity,1)>1 THEN quantity ELSE 1 END) base_recurring_paise,
        MAX(CASE WHEN product_trial=1 OR (json_valid(COALESCE(tax_snapshot_json,''))=1 AND json_extract(tax_snapshot_json,'$.trial') IS NOT NULL) THEN 1 ELSE 0 END) trial_enabled_hint
      FROM item_ranked GROUP BY order_id
    ), subscription_ranked AS (
      SELECT so.id order_row_id,c.row_json,
        ROW_NUMBER() OVER(PARTITION BY so.id ORDER BY c.last_refreshed_at DESC) rn
      FROM selected_orders so JOIN subscription_overview_cache c
        ON c.subscription_id=so.gateway_subscription_id AND lower(COALESCE(c.gateway,''))=lower(COALESCE(so.gateway,''))
    )
    SELECT so.*,
      COALESCE(rt.amount_paise,0)+COALESCE(mt.amount_paise,0) received_paise,
      COALESCE(rr.amount_paise,0) latest_receipt_paise,
      COALESCE(rr.payment_kind,'') latest_payment_kind,
      COALESCE(rr.gateway,so.gateway,'') latest_gateway,
      COALESCE(fi.setup_amount_paise,0) setup_amount_paise,
      COALESCE(it.trial_enabled_hint,0) trial_enabled_hint,
      COALESCE(it.base_recurring_paise,0) base_recurring_paise,
      COALESCE(fi.product_name,'') plan_name,
      COALESCE(NULLIF(CAST(json_extract(sr.row_json,'$.next_charge_amount_paise') AS INTEGER),0),
        NULLIF(CAST(json_extract(sr.row_json,'$.plan_amount_paise') AS INTEGER),0),
        NULLIF(CAST(json_extract(sr.row_json,'$.recurring_charge_paise') AS INTEGER),0),0) gateway_recurring_paise
    FROM selected_orders so
    LEFT JOIN receipt_totals rt ON rt.order_id=so.order_id
    LEFT JOIN receipt_ranked rr ON rr.order_id=so.order_id AND rr.rn=1
    LEFT JOIN manual_totals mt ON mt.order_id=so.order_id
    LEFT JOIN item_totals it ON it.order_id=so.id
    LEFT JOIN item_ranked fi ON fi.order_id=so.id AND fi.rn=1
    LEFT JOIN subscription_ranked sr ON sr.order_row_id=so.id AND sr.rn=1
    ORDER BY so.id DESC`;
  const {results}=await env.DB.prepare(sql).bind(...params).all();
  const orders=(results||[]).map(decorate),buckets={new_orders:[],pending_orders:[],existing_orders:[],cancelled_orders:[],cancelled_subscriptions:[]};
  for(const o of orders)buckets[classifyOrder(o)].push(o);
  return json({orders,...buckets,counts:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,v.length]))});
}

export async function onRequestPut({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request);if(!b.order_id)return json({error:'order_id is required'},400);
  const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(b.order_id).first();if(!o)return json({error:'Order not found'},404);
  let status=b.status||o.status,payment=b.payment_status||o.payment_status,stage=b.order_stage||o.order_stage||'new',gatewayMessage='';const sub=o.gateway_subscription_id||b.gateway_subscription_id;
  if(b.action==='mark_cancelled'){status='cancelled';payment='cancelled';stage='existing';gatewayMessage='Order marked cancelled by admin.';}
  if(b.action==='mark_failed'){status='failed';payment='failed';stage='existing';gatewayMessage='Order marked failed by admin.';}
  try{
    if(b.action==='pause'&&sub){await razorpayApi(env,`/subscriptions/${sub}/pause`,{payload:{pause_at:'now'}});status='paused';payment=paidState(o.payment_status)?'paid':'pending';stage='existing';gatewayMessage='Subscription pause request sent.';}
    if(b.action==='resume'&&sub){await razorpayApi(env,`/subscriptions/${sub}/resume`,{payload:{resume_at:'now'}});status='active';payment=paidState(o.payment_status)?'paid':'pending';stage='existing';gatewayMessage='Subscription resume request sent.';}
    if(b.action==='cancel'&&sub){await razorpayApi(env,`/subscriptions/${sub}/cancel`,{payload:{cancel_at_cycle_end:0}});status='cancelled';payment='cancelled';stage='existing';gatewayMessage='Subscription cancel request sent.';}
  }catch(e){gatewayMessage=e.message;}
  // In Process remains in the New Orders work queue. Delivered / Completed moves
  // the paid order into Existing Orders, matching the admin workflow.
  if(b.action==='process'){status='in_process';stage='new';}
  if(b.action==='review'){stage='existing';}
  if(b.action==='deliver'||status==='delivered'||status==='completed'){
    status=String(b.status||status).toLowerCase()==='completed'?'completed':'delivered';stage='existing';
  }
  if(status==='cancelled'||payment==='cancelled'){status='cancelled';payment='cancelled';stage='existing';}
  if(status==='failed'||payment==='failed'){status='failed';payment='failed';stage='existing';}
  await env.DB.prepare(`UPDATE orders SET status=?,payment_status=?,order_stage=?,customer_name=COALESCE(?,customer_name),customer_email=COALESCE(?,customer_email),customer_phone=COALESCE(?,customer_phone),website_phone=COALESCE(?,website_phone),razorpay_phone=COALESCE(?,razorpay_phone),internal_notes=COALESCE(?,internal_notes),updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(status,payment,stage,b.customer_name||null,b.customer_email||null,b.customer_phone||null,b.website_phone||null,b.razorpay_phone||null,b.notes||null,b.order_id).run();
  if(terminalState(status)||terminalState(payment)){
    const phone=b.customer_phone||b.website_phone||o.customer_phone||o.website_phone||o.razorpay_phone||'';
    if(phone){
      const lifeStatus=String(status||payment||'').toLowerCase().includes('fail')?'failed':'cancelled';
      const planRow=await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=? ORDER BY id LIMIT 1').bind(o.id).first().catch(()=>null);
      await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at)
        VALUES(?,?,?,'',?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`)
        .bind(b.customer_name||o.customer_name||'Customer',phone,b.customer_email||o.customer_email||'',planRow?.product_name||'Membership',lifeStatus,o.gateway||b.gateway||'',sub||'',`Automatically moved to inactive customers from order ${b.order_id} (${lifeStatus}).`).run().catch(()=>{});
    }
  }
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,1)').bind(b.order_id,b.gateway||'admin',b.action||'admin_status_update',JSON.stringify({...b,gatewayMessage})).run();
  summaryMemo={expires:0,payload:null};
  await bumpAdminActivity(env,'orders').catch(()=>{});
  if(sub)await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ok:true,status,payment_status:payment,order_stage:stage,gatewayMessage});
}
