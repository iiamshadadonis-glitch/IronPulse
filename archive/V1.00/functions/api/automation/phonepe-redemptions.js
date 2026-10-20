import { json, readJson, requireAutomation } from '../../_lib/utils.js';
import { getGatewayAvailability, phonePeNotifyRedemption, phonePeSubscriptionStatus } from '../../_lib/payment-gateways.js';

const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
const asDate=v=>{const d=new Date(String(v||'').replace(' ','T')+(String(v||'').includes('T')||String(v||'').endsWith('Z')?'':'Z'));return Number.isNaN(d.getTime())?null:d;};
function addMonths(d,months){const x=new Date(d.getTime());const day=x.getUTCDate();x.setUTCDate(1);x.setUTCMonth(x.getUTCMonth()+Math.max(1,Number(months||1)));const max=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();x.setUTCDate(Math.min(day,max));return x;}
function eventInfo(e){
  try{
    const b=JSON.parse(e.payload_json||'{}'),p=b.payload||b.data||b;
    const ids=[];for(const pd of (p.paymentDetails||[])){if(String(pd.state||'').toUpperCase()==='COMPLETED')ids.push(String(pd.transactionId||pd.utr||''));}
    const fallback=String(p.merchantOrderId||p.orderId||'');
    let when=0;for(const pd of (p.paymentDetails||[])){if(String(pd.state||'').toUpperCase()==='COMPLETED')when=Math.max(when,Number(pd.timestamp||0));}
    return {ids:ids.filter(Boolean),fallback,when:when||(new Date(e.created_at||0).getTime())};
  }catch(_){return {ids:[],fallback:'',when:new Date(e.created_at||0).getTime()};}
}
async function successfulCycles(env,orderId){
  const r=await env.DB.prepare("SELECT * FROM payment_events WHERE gateway='phonepe' AND order_id=? AND verified=1 AND (event_type IN ('checkout.setup.order.completed','checkout.order.completed','subscription.redemption.order.completed','subscription.redemption.transaction.completed') OR lower(event_type) LIKE '%redemption%completed%') ORDER BY created_at ASC,id ASC").bind(orderId).all().catch(()=>({results:[]}));
  const seen=new Set(),cycles=[];
  for(const e of (r.results||[])){
    const i=eventInfo(e);const keys=i.ids.length?i.ids:[i.fallback||`event:${e.id}`];
    let fresh=false;for(const k of keys){if(k&&!seen.has(k)){seen.add(k);fresh=true;}}
    if(fresh)cycles.push({event:e,when:i.when||new Date(e.created_at||0).getTime()});
  }
  return cycles;
}
async function alreadyNotified(env,orderId,cycleKey){
  const r=await env.DB.prepare("SELECT id,payload_json FROM payment_events WHERE gateway='phonepe' AND order_id=? AND event_type='phonepe.redemption.notify.requested' ORDER BY id DESC LIMIT 50").bind(orderId).all().catch(()=>({results:[]}));
  return (r.results||[]).some(x=>{try{return JSON.parse(x.payload_json||'{}').cycle_key===cycleKey;}catch(_){return false;}});
}
async function loadCandidates(env,onlyOrderId=''){
  let sql=`SELECT o.id db_order_id,o.order_id,o.customer_name,o.customer_phone,o.customer_email,o.gateway,o.gateway_subscription_id,o.created_at,o.payment_status,o.status,
    oi.id item_id,oi.product_name,oi.variant_name,oi.quantity,oi.unit_amount_paise,oi.recurring_unit_amount_paise,oi.billing_months,oi.total_count,oi.payment_mode,oi.gateway AS item_gateway
    FROM orders o JOIN order_items oi ON oi.order_id=o.id
    WHERE lower(COALESCE(o.gateway,oi.gateway,''))='phonepe' AND COALESCE(o.gateway_subscription_id,oi.gateway_subscription_id,'')<>'' AND lower(COALESCE(o.payment_mode,oi.payment_mode,'subscription'))='subscription'`;
  const binds=[];if(onlyOrderId){sql+=' AND o.order_id=?';binds.push(onlyOrderId);}sql+=' ORDER BY o.id ASC,oi.id ASC LIMIT 100';
  const r=await env.DB.prepare(sql).bind(...binds).all();return r.results||[];
}
async function processRedemptions(env,{order_id='',dry_run=false,force=false}={}){
  const availability=await getGatewayAvailability(env);
  if(!availability.configured.phonepe)throw new Error('PhonePe credentials are not configured.');
  const rows=await loadCandidates(env,clean(order_id,180));const now=new Date(),out=[];
  for(const x of rows){
    const subId=clean(x.gateway_subscription_id,63);const billingMonths=Math.max(1,Number(x.billing_months||1));const totalCount=Math.max(1,Number(x.total_count||1));const cycles=await successfulCycles(env,x.order_id);const paidCount=Math.max(cycles.length,0);
    const baseline=cycles.length?new Date(cycles[cycles.length-1].when):asDate(x.created_at);if(!baseline){out.push({order_id:x.order_id,subscription_id:subId,action:'skipped',reason:'Could not determine billing baseline.'});continue;}
    const nextDue=addMonths(baseline,billingMonths);const cycleNo=Math.max(1,paidCount+1);const cycleKey=`${subId}:${cycleNo}:${nextDue.toISOString().slice(0,10)}`;
    if(paidCount>=totalCount){out.push({order_id:x.order_id,subscription_id:subId,action:'complete',paid_count:paidCount,total_count:totalCount});continue;}
    if(!force&&nextDue.getTime()>now.getTime()){out.push({order_id:x.order_id,subscription_id:subId,action:'not_due',next_due_at:nextDue.toISOString(),paid_count:paidCount,total_count:totalCount});continue;}
    if(await alreadyNotified(env,x.order_id,cycleKey)){out.push({order_id:x.order_id,subscription_id:subId,action:'already_notified',next_due_at:nextDue.toISOString(),cycle_key:cycleKey});continue;}
    const status=await phonePeSubscriptionStatus(env,subId).catch(e=>({state:'ERROR',error:String(e?.message||e)}));
    if(String(status.state||'').toUpperCase()!=='ACTIVE'){out.push({order_id:x.order_id,subscription_id:subId,action:'skipped',reason:`Subscription is ${status.state||'not active'}.`,gateway_status:status});continue;}
    const amount=Math.max(100,Math.round(Number(x.recurring_unit_amount_paise||x.unit_amount_paise||0)*Math.max(1,Number(x.quantity||1))));
    if(dry_run){out.push({order_id:x.order_id,subscription_id:subId,action:'would_notify',next_due_at:nextDue.toISOString(),amount_paise:amount,cycle_key:cycleKey,paid_count:paidCount,total_count:totalCount});continue;}
    const notify=await phonePeNotifyRedemption(env,{merchantSubscriptionId:subId,merchantOrderId:`UCR-${x.order_id}-${cycleNo}-${Date.now().toString(36)}`,amountPaise:amount,customer:{name:x.customer_name,email:x.customer_email,phone:x.customer_phone},autoDebit:true});
    await env.DB.prepare("INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,'phonepe','phonepe.redemption.notify.requested',?,1)").bind(x.order_id,JSON.stringify({cycle_key:cycleKey,next_due_at:nextDue.toISOString(),paid_count:paidCount,total_count:totalCount,notify})).run();
    out.push({order_id:x.order_id,subscription_id:subId,action:'notified',next_due_at:nextDue.toISOString(),cycle_key:cycleKey,notify});
  }
  return {ok:true,processed:rows.length,results:out,note:'PhonePe AutoPay renewals require the merchant to send Redemption Notify. This endpoint is intended to be called by your automation scheduler; autoDebit is enabled and STANDARD retries are requested.'};
}

export async function onRequestGet({request,env}){
  try{await requireAutomation(request,env)}catch(e){return json({error:e.message},401)}
  try{const u=new URL(request.url);return json(await processRedemptions(env,{order_id:u.searchParams.get('order_id')||'',dry_run:u.searchParams.get('dry_run')!=='0',force:false}));}catch(e){return json({error:e.message||'PhonePe redemption check failed.'},400)}
}
export async function onRequestPost({request,env}){
  try{await requireAutomation(request,env)}catch(e){return json({error:e.message},401)}
  try{const b=await readJson(request);return json(await processRedemptions(env,{order_id:b.order_id||'',dry_run:!!b.dry_run,force:!!b.force}));}catch(e){return json({error:e.message||'PhonePe redemption processing failed.'},400)}
}
