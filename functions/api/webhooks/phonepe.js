import { json, sha256Hex, hmacHex, notifyAdmin, sendOrderPaidEmail, getPaymentSettings } from '../../_lib/utils.js';
import { recordPaymentFailure } from '../../_lib/payment-recovery.js';
import { recordPaymentReceipt } from '../../_lib/payment-receipts.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
function timingSafe(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
async function verifyPhonePeWebhook(request,bodyText,settings,env){
  const mode=String(env.PHONEPE_WEBHOOK_AUTH_MODE||settings.phonepeWebhookAuthMode||'').trim().toLowerCase();
  const rawAuth=clean(request.headers.get('authorization')||'',300).trim();
  const auth=rawAuth.replace(/^SHA256\s+/i,'').replace(/^SHA256\(([^)]+)\)$/i,'$1').trim().toLowerCase();
  const user=env.PHONEPE_WEBHOOK_USERNAME||settings.phonepeWebhookUsername||'',pass=env.PHONEPE_WEBHOOK_PASSWORD||settings.phonepeWebhookPassword||'';
  const secret=env.PHONEPE_WEBHOOK_SECRET||settings.phonepeWebhookSecret||'',keyId=env.PHONEPE_WEBHOOK_KEY_ID||settings.phonepeWebhookKeyId||'';
  const sig=clean(request.headers.get('phonepe-checksum-signature')||request.headers.get('x-phonepe-checksum-signature')||'',400).toLowerCase(),sentKey=clean(request.headers.get('x-phonepe-checksum-key-id')||'',200);
  const verifySha=async()=>{if(!user||!pass)return null;const expected=(await sha256Hex(`${user}:${pass}`)).toLowerCase();return timingSafe(auth,expected);};
  const verifyHmac=async()=>{if(!secret||!sig||!(!keyId||sentKey===keyId))return null;const expected=(await hmacHex(secret,bodyText)).toLowerCase();return timingSafe(sig,expected);};
  if(mode==='sha')return verifySha();
  if(mode==='hmac')return verifyHmac();
  // Backward compatibility for older saved settings without an explicit mode.
  const sha=await verifySha();if(sha!==null)return sha;
  return verifyHmac();
}
function eventData(payload){
  const p=payload?.payload||payload||{},event=clean(payload?.event||payload?.type||'phonepe.event',140).toLowerCase();
  const state=clean(p.state||p.subscriptionDetails?.state||'',50).toUpperCase();
  const sid=clean(p.merchantSubscriptionId||p.paymentFlow?.merchantSubscriptionId||p.subscriptionDetails?.merchantSubscriptionId||'',180);
  const orderId=clean(p.metaInfo?.udf1||p.paymentDetails?.[0]?.metaInfo?.udf1||'',120);
  const paymentId=clean(p.transactionId||p.orderId||p.paymentDetails?.[0]?.transactionId||'',180);
  return {p,event,state,sid,orderId,paymentId};
}
export async function onRequestPost({request,env}){
  const bodyText=await request.text();let payload={};try{payload=JSON.parse(bodyText||'{}');}catch(_){return json({error:'Invalid JSON'},400);}
  const settings=await getPaymentSettings(env),verified=await verifyPhonePeWebhook(request,bodyText,settings,env);
  if(verified===false)return json({error:'Invalid PhonePe webhook authorization'},401);
  const x=eventData(payload);
  let orderId=x.orderId;
  if(!orderId&&x.sid){const o=await env.DB.prepare('SELECT order_id FROM orders WHERE gateway_subscription_id=? LIMIT 1').bind(x.sid).first().catch(()=>null);orderId=o?.order_id||'';}
  if(!orderId&&(x.p.merchantOrderId||x.p.orderId)){const mo=clean(x.p.merchantOrderId,180),po=clean(x.p.orderId,180);const o=await env.DB.prepare('SELECT order_id FROM orders WHERE gateway_order_id IN (?,?) LIMIT 1').bind(mo,po).first().catch(()=>null);orderId=o?.order_id||'';}
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,?)').bind(orderId,'phonepe',x.event,bodyText,verified===true?1:0).run();
  // Unverified events are audit-only. They never change financial state.
  if(verified!==true)return json({ok:true,verified:false});
  let status='',paymentStatus='';
  const flowType=clean(x.p.paymentFlow?.type||x.p.subscriptionDetails?.type||'',80).toUpperCase();
  const isSetup=x.event.includes('checkout.setup.order')||((x.event==='checkout.order.completed'||x.event==='checkout.order.failed')&&flowType.includes('SUBSCRIPTION'));
  const isOneTime=(x.event==='checkout.order.completed'||x.event==='checkout.order.failed')&&!isSetup&&(flowType==='PG_CHECKOUT'||!x.sid);
  const isRedemption=x.event.includes('subscription.redemption');
  const isNotification=x.event.includes('subscription.notification');
  // A completed notification only means the customer was notified before a debit;
  // it is not a successful charge and must never mark the order paid.
  if((isSetup||isRedemption)&&x.event.includes('completed')){const paidAmount=Number(x.p.amount||x.p.redemptionAmount||x.p.paymentDetails?.[0]?.amount||0);const paidState=String(x.p.paymentDetails?.[0]?.state||x.p.state||'').toUpperCase();const actuallyPaid=paidAmount>0 && ['COMPLETED','SUCCESS','SUCCEEDED','PAID'].some(v=>paidState.includes(v));status=x.sid?'active':'paid';paymentStatus=actuallyPaid?'paid':'awaiting_payment';}
  if((isSetup||isRedemption)&&x.event.includes('failed')){status='failed';paymentStatus='failed';}
  if(isOneTime&&x.event.includes('completed')){status='paid';paymentStatus='paid';}
  if(isOneTime&&x.event.includes('failed')){status='failed';paymentStatus='failed';}
  if(x.state==='ACTIVE'&&!isNotification){status='active';paymentStatus=paymentStatus||'awaiting_payment';}
  if(x.state==='REVOKED'||x.state==='CANCELLED'||x.state==='CANCELED'||x.event.includes('revoked')||x.event.includes('cancel')){status='cancelled';paymentStatus='cancelled';}
  if(x.state==='PAUSED'||x.event.includes('paused')){status='paused';paymentStatus='awaiting_payment';}
  if(x.state==='ACTIVE'&&x.event.includes('unpaused')){status='active';paymentStatus='awaiting_payment';}
  if(orderId&&status){
    const reason=status==='failed'?clean(x.p.errorContext?.description||x.p.errorCode||x.event,300):null;
    await env.DB.prepare(`UPDATE orders SET gateway='phonepe',status=?,payment_status=CASE WHEN ?='awaiting_payment' AND lower(COALESCE(payment_status,'')) IN ('paid','captured','successful','success') THEN 'paid' WHEN ?='awaiting_payment' AND lower(COALESCE(payment_status,'')) IN ('authenticated','authorized','authorised') THEN 'authenticated' ELSE ? END,gateway_payment_id=COALESCE(NULLIF(?,''),gateway_payment_id),gateway_subscription_id=COALESCE(NULLIF(?,''),gateway_subscription_id),failure_reason=CASE WHEN ? IS NOT NULL THEN ? ELSE failure_reason END,order_stage=CASE WHEN ? IN ('failed','cancelled') THEN 'change' ELSE order_stage END,updated_at=CURRENT_TIMESTAMP WHERE order_id=?`)
      .bind(status,paymentStatus,paymentStatus,paymentStatus,x.paymentId,x.sid,reason,reason,status,orderId).run();
    if(['failed','cancelled'].includes(String(status||'').toLowerCase())){
      const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
      const itemRows=await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_id=?) ORDER BY id').bind(orderId).all().catch(()=>({results:[]}));
      if(o?.customer_phone){const lifeStatus=String(status).toLowerCase();await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).bind(o.customer_name||'Customer',o.customer_phone,o.customer_email||'','',(itemRows.results||[]).map(i=>i.product_name).join(', ')||'DropBeat Dance Studio',lifeStatus,'phonepe',x.sid||o.gateway_subscription_id||'',`Automatically moved to inactive customers from order ${orderId} (${lifeStatus}).`).run().catch(()=>{});}
    }
    if(paymentStatus==='paid'){
      const paidAmount=Math.max(0,Number(x.p.amount||x.p.redemptionAmount||x.p.paymentDetails?.[0]?.amount||0));
      const paidState=String(x.p.paymentDetails?.[0]?.state||x.p.state||'').toUpperCase();
      if(paidAmount>0&&x.paymentId&&['COMPLETED','SUCCESS','SUCCEEDED','PAID'].some(v=>paidState.includes(v))){
        await recordPaymentReceipt(env,{gateway:'phonepe',transaction_id:x.paymentId,order_id:orderId,subscription_id:x.sid||'',amount_paise:paidAmount,currency:'INR',status:'paid',payment_kind:isOneTime?'one_time':isRedemption?'subscription_charge':isSetup?'authentication':'payment',payment_method:x.p.paymentDetails?.[0]?.paymentMode||'',upi_id:x.p.paymentDetails?.[0]?.vpa||x.p.paymentDetails?.[0]?.utr||'',paid_at_epoch:Math.floor(Number(x.p.paymentDetails?.[0]?.timestamp||x.p.timestamp||0)/((Number(x.p.paymentDetails?.[0]?.timestamp||x.p.timestamp||0)>1e12)?1000:1)),payload_json:payload}).catch(()=>{});
      }
      const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first();
      const itemRows=await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_id=?) ORDER BY id').bind(orderId).all().catch(()=>({results:[]}));
      const isOneTime=String(o?.payment_mode||'').toLowerCase()==='one_time' && !(x.sid||o?.gateway_subscription_id);
      if(o?.customer_phone&&!isOneTime)await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,updated_at=CURRENT_TIMESTAMP`).bind(o.customer_name||'',o.customer_phone,o.customer_email||'','',(itemRows.results||[]).map(i=>i.product_name).join(', ')||'DropBeat Dance Studio','active','phonepe',x.sid||o.gateway_subscription_id||'',`Paid order ${orderId}`).run().catch(()=>{});
      await env.DB.prepare("UPDATE contact_leads SET status='converted',outcome='Payment Collected',follow_up_date='',next_action='',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(orderId).run().catch(()=>{});
      await sendOrderPaidEmail(env,orderId).catch(()=>{});
    }
    if(status==='failed'){const automationEvent=x.sid?'subscription_failed':'payment_failed';await recordPaymentFailure(env,orderId,{reason:x.p.errorContext?.description||x.p.errorCode||x.event,reference:x.paymentId||'',attemptAmountPaise:Number(x.p.amount||x.p.redemptionAmount||x.p.paymentDetails?.[0]?.amount||0),automationEvent}).catch(()=>{});const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,automationEvent,{failureReason:x.p.errorContext?.description||x.p.errorCode||x.event,reference:x.paymentId||x.event,amountPaise:Number(x.p.amount||x.p.redemptionAmount||x.p.paymentDetails?.[0]?.amount||0)}).catch(()=>{});}
    if(status==='cancelled'){const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,'subscription_cancelled',{reference:x.sid||x.paymentId||x.event,cancellationDate:new Date().toISOString().slice(0,10)}).catch(()=>{});}
    await notifyAdmin(env,`PhonePe event for DropBeat Dance Studio\nOrder ID: ${orderId}\nEvent: ${x.event}\nStatus: ${x.state||status}`).catch(()=>{});
  }
  if(orderId)await bumpAdminActivity(env,'orders').catch(()=>{});
  await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ok:true,verified:true});
}
