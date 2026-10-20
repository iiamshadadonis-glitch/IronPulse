import { sendOrderPaidEmail, json, hmacHex, notifyAdmin, getPaymentSettings, razorpayApi, safeJsonParse } from '../../_lib/utils.js';
import { recordPaymentFailure } from '../../_lib/payment-recovery.js';
import { mergeGatewayIdentity } from '../../_lib/lead-profile.js';
import { recordPaymentReceipt } from '../../_lib/payment-receipts.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';
export async function onRequestPost({ request, env }) {
  const bodyText = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const settings = await getPaymentSettings(env);
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || settings.razorpayWebhookSecret || '';
  let verified = false;
  if (webhookSecret) {
    const expected = await hmacHex(webhookSecret, bodyText);
    verified = expected === signature;
    if (!verified) return json({ error: 'Invalid signature' }, 401);
  }
  const payload = JSON.parse(bodyText || '{}');
  const event = payload.event || 'unknown';
  const sub = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;
  const orderId = sub?.notes?.order_id || payment?.notes?.order_id || '';
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,?)').bind(orderId, 'razorpay', event, bodyText, verified ? 1 : 0).run();
  // Razorpay adds customer_id after the authorisation transaction. Pull that
  // identity only to enrich a pre-existing local CRM client with an exact phone/email match.
  // Gateway-only customers are kept out of contact_leads and remain visible only in live gateway views.
  try{
    let customer={};
    if(sub?.customer_id)customer=await razorpayApi(env,`/customers/${encodeURIComponent(sub.customer_id)}`,{method:'GET'});
    await mergeGatewayIdentity(env,{name:customer?.name||sub?.notes?.customer_name||'',phone:customer?.contact||payment?.contact||sub?.notes?.customer_phone||'',email:customer?.email||payment?.email||sub?.notes?.customer_email||'',gateway:'razorpay',subscription_id:sub?.id||'',payment_id:payment?.id||'',order_id:orderId});
  }catch(_){/* webhook processing must not fail only because CRM enrichment failed */}
  if (orderId) {
    const upfrontRow=await env.DB.prepare('SELECT o.id,o.payment_mode,o.status current_status FROM orders o WHERE o.order_id=?').bind(orderId).first().catch(()=>({id:0,payment_mode:'',current_status:''}));
    const itemRows=upfrontRow?.id?(await env.DB.prepare(`SELECT setup_amount_paise,tax_snapshot_json FROM order_items WHERE order_id=? AND (?='' OR gateway_subscription_id=?) ORDER BY id`).bind(upfrontRow.id,sub?.id||'',sub?.id||'').all().catch(()=>({results:[]}))).results||[]:[];
    let upfrontCeiling=0;
    for(const row of itemRows){const snap=safeJsonParse(row.tax_snapshot_json||'{}',{}),trial=Number(snap?.trial?.totalPaise||0),setupTax=Number(snap?.setup?.totalPaise||0),base=Number(row.setup_amount_paise||0);upfrontCeiling+=Math.max(0,base,trial,setupTax);}
    const hasConfiguredUpfront=upfrontCeiling>0,isOneTime=String(upfrontRow?.payment_mode||'').toLowerCase()==='one_time';
    const paymentAmount=Math.max(0,Number(payment?.amount||0)),paymentCaptured=payment?.captured===true||String(payment?.status||'').toLowerCase()==='captured';
    // V16.1 briefly taxed the trial itself. Accept that already-recorded gross amount
    // as an authentication payment too, while V16.2 trials use the untaxed base amount.
    const isUpfrontCapture=!isOneTime&&hasConfiguredUpfront&&paymentAmount>0&&paymentAmount<=Math.max(upfrontCeiling,100)+2;
    if(paymentCaptured&&paymentAmount>0&&payment?.id){
      await recordPaymentReceipt(env,{gateway:'razorpay',transaction_id:payment.id,order_id:orderId,subscription_id:sub?.id||payment?.notes?.subscription_id||'',amount_paise:paymentAmount,currency:payment.currency||'INR',status:'paid',payment_kind:isOneTime?'one_time':isUpfrontCapture?'authentication':'subscription_charge',payment_method:payment.method||'',upi_id:payment.vpa||payment.upi?.vpa||'',paid_at_epoch:Number(payment.created_at||0),payload_json:payload}).catch(()=>{});
    }
    let status = null, paymentStatus = null;
    if (event.includes('charged')) { status = 'paid'; paymentStatus = 'paid'; }
    if (event === 'payment.captured') { if(isOneTime){status='paid';paymentStatus='paid';} else if(isUpfrontCapture){status='authenticated';paymentStatus='authenticated';} else if(paymentCaptured&&paymentAmount>0){status='paid';paymentStatus='paid';} else {status='authenticated';paymentStatus='awaiting_payment';} }
    if (event === 'subscription.authenticated') { status = 'authenticated'; paymentStatus = isUpfrontCapture && paymentCaptured ? 'authenticated' : 'awaiting_payment'; }
    if (event === 'subscription.activated') {
      // For a paid-trial/upfront subscription, Razorpay can move the mandate to
      // `active` when the scheduled billing window starts before this webhook
      // proves that the recurring plan amount was actually captured. Keep the
      // local customer lifecycle as Authenticated until a real recurring receipt
      // is present; a captured plan charge (or subscription.charged) promotes it.
      if(hasConfiguredUpfront && !(paymentCaptured && paymentAmount>Math.max(upfrontCeiling,100)+2)){
        status = 'authenticated'; paymentStatus = 'authenticated';
      }else if(paymentCaptured && paymentAmount>0){
        status = 'paid'; paymentStatus = 'paid';
      }else{
        status = 'active'; paymentStatus = 'awaiting_payment';
      }
    }
    if (event === 'subscription.resumed') { status = 'active'; paymentStatus = 'awaiting_payment'; }
    if (event === 'subscription.paused') { status = 'paused'; paymentStatus = 'awaiting_payment'; }
    if (event === 'subscription.completed') { status = 'completed'; paymentStatus = 'awaiting_payment'; }
    if (event === 'subscription.updated' && sub?.status) {
      const current = String(sub.status).toLowerCase();
      status = current;
      paymentStatus = ['pending','halted'].includes(current) ? 'failed' : ['cancelled','canceled','expired'].includes(current) ? 'cancelled' : 'awaiting_payment';
    }
    if (event === 'subscription.expired') { status = 'expired'; paymentStatus = 'expired'; }
    if (event.includes('failed') || event === 'payment.failed' || event === 'subscription.pending' || event === 'subscription.halted') { status = 'failed'; paymentStatus = 'failed'; }
    if (event.includes('cancelled')) { status = 'cancelled'; paymentStatus = 'cancelled'; }
    if (status) {
      const rzPhone = payment?.contact || sub?.customer_details?.contact || null;
      const stageUpdate = status === 'cancelled' || status === 'failed' ? 'change' : null;
      const failureReason = status === 'failed' ? (payment?.error_description || payment?.error_reason || payment?.error_code || (event === 'subscription.halted' ? 'Automatic payment retries have been exhausted.' : event === 'subscription.pending' ? 'Subscription payment is pending after an unsuccessful charge attempt.' : 'Payment failed.')) : null;
      await env.DB.prepare("UPDATE orders SET status=?, payment_status=CASE WHEN ?='awaiting_payment' AND lower(COALESCE(payment_status,'')) IN ('paid','captured','successful','success') THEN 'paid' WHEN ?='awaiting_payment' AND lower(COALESCE(payment_status,'')) IN ('authenticated','authorized','authorised') THEN 'authenticated' ELSE ? END, gateway_payment_id=COALESCE(?,gateway_payment_id), gateway_subscription_id=COALESCE(?,gateway_subscription_id), razorpay_phone=COALESCE(?,razorpay_phone), failure_reason=CASE WHEN ? IS NOT NULL THEN ? ELSE failure_reason END, order_stage=CASE WHEN ? IS NOT NULL THEN ? WHEN order_stage IS NULL OR order_stage='' THEN 'new' ELSE order_stage END, updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(status, paymentStatus, paymentStatus, paymentStatus, payment?.id || null, sub?.id || null, rzPhone, failureReason, failureReason, stageUpdate, stageUpdate, orderId).run();
      if(['cancelled','failed','expired'].includes(String(status||'').toLowerCase())){
        const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
        const itemRows=await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_id=?) ORDER BY id').bind(orderId).all().catch(()=>({results:[]}));
        if(o?.customer_phone){const lifeStatus=String(status).toLowerCase();await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).bind(o.customer_name||'Customer',o.customer_phone,o.customer_email||'','',(itemRows.results||[]).map(i=>i.product_name).join(', ')||'DropBeat Dance Studio',lifeStatus,'razorpay',sub?.id||o.gateway_subscription_id||'',`Automatically moved to inactive customers from order ${orderId} (${lifeStatus}).`).run().catch(()=>{});}
      }
    }
    if (status === 'paid') {
      const o = await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first();
      const itemRows = await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_id=?) ORDER BY id').bind(orderId).all().catch(()=>({results:[]}));
      const isOneTime=String(o?.payment_mode||'').toLowerCase()==='one_time' && !(sub?.id||o?.gateway_subscription_id);
      if (o?.customer_phone && !isOneTime) {
        await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,updated_at=CURRENT_TIMESTAMP`).bind(o.customer_name||'',o.customer_phone,o.customer_email||'', '', (itemRows.results||[]).map(i=>i.product_name).join(', ')||'DropBeat Dance Studio', 'active', 'razorpay', sub?.id || o.gateway_subscription_id || '', `Paid order ${orderId}`).run().catch(()=>{});
      }
      await env.DB.prepare("UPDATE contact_leads SET status='converted',outcome='Payment Collected',follow_up_date='',next_action='',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(orderId).run().catch(()=>{});
      await notifyAdmin(env, `DropBeat Dance Studio payment successful
Order ID: ${orderId}
Gateway: Razorpay`); await sendOrderPaidEmail(env, orderId).catch(()=>{});
    }
    if (status === 'failed') { const why=payment?.error_description||payment?.error_reason||payment?.error_code||event,automationEvent=sub?.id?'subscription_failed':'payment_failed'; await notifyAdmin(env, `DropBeat Dance Studio payment failed\nOrder ID: ${orderId}\nGateway: Razorpay\nReason: ${why}\nPlease follow up.`); await recordPaymentFailure(env,orderId,{reason:why,reference:payment?.id||'',attemptAmountPaise:Number(payment?.amount||0),automationEvent}).catch(()=>{}); const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,automationEvent,{failureReason:why,reference:payment?.id||event,amountPaise:Number(payment?.amount||0)}).catch(()=>{}); }
    if (status === 'cancelled') { await notifyAdmin(env, `DropBeat Dance Studio subscription cancelled\nOrder ID: ${orderId}\nGateway: Razorpay\nPlease review the customer and subscription details.`, { eventType:'subscription_cancelled', eventKey:`razorpay:cancelled:${orderId}:${sub?.id||payment?.id||event}` }); const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,'subscription_cancelled',{reference:sub?.id||payment?.id||event,cancellationDate:new Date().toISOString().slice(0,10)}).catch(()=>{}); }
  }
  // One tiny revision write lets open admin dashboards discover a real payment/subscription change without rescanning gateway/cache tables.
  if(orderId)await bumpAdminActivity(env,'orders').catch(()=>{});
  await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ ok: true });
}

// Email notice helper is available for paid-order workflows.
