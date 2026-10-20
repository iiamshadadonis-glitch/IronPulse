import { sendOrderPaidEmail, json, hmacHex, notifyAdmin, getPaymentSettings } from '../../_lib/utils.js';
import { recordPaymentFailure } from '../../_lib/payment-recovery.js';
import { stripeApi } from '../../_lib/payment-gateways.js';
import { mergeGatewayIdentity } from '../../_lib/lead-profile.js';
import { recordPaymentReceipt } from '../../_lib/payment-receipts.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

function parseStripeSig(sig='') { return Object.fromEntries(sig.split(',').map(x=>x.split('=').map(v=>v.trim())).filter(x=>x.length===2)); }
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
function addUtcMonths(epochSeconds,months){
  const d=new Date(Math.max(0,n(epochSeconds))*1000);
  if(Number.isNaN(d.getTime()))return 0;
  const day=d.getUTCDate();
  d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Math.max(0,n(months))); 
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));
  return Math.floor(d.getTime()/1000);
}
async function upsertSubscriber(env,orderId,subscriptionId,status='active'){
  if(!orderId)return;
  const o=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
  if(!o?.customer_phone)return;
  const items=await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=? ORDER BY id').bind(orderId).all().catch(()=>({results:[]}));
  const plan=(items.results||[]).map(x=>x.product_name).filter(Boolean).join(', ')||'IronPulse Gym';
  await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status=excluded.subscription_status,gateway=excluded.gateway,gateway_subscription_id=excluded.gateway_subscription_id,updated_at=CURRENT_TIMESTAMP`)
    .bind(o.customer_name||'',o.customer_phone,o.customer_email||'','',plan,status,'stripe',subscriptionId||o.gateway_subscription_id||'',`Order ${orderId}`).run().catch(()=>{});
}
async function applyFiniteStripeCycles(env,obj){
  if(!obj?.id)return;
  const meta=obj.metadata||{};
  const count=Math.max(1,n(meta.intended_total_count,1));
  const months=Math.max(1,n(meta.intended_billing_months,1));
  if(!count||!months)return;
  const firstEnd=n(obj.current_period_end);
  if(!firstEnd)return;
  const cancelAt=addUtcMonths(firstEnd,months*(count-1));
  if(!cancelAt)return;
  // This is idempotent: every relevant subscription webhook calculates the same
  // intended end date and Stripe accepts updating cancel_at to the same timestamp.
  await stripeApi(env,`/subscriptions/${encodeURIComponent(obj.id)}`,{method:'POST',params:{cancel_at:cancelAt,proration_behavior:'none','metadata[intended_total_count]':String(count),'metadata[intended_billing_months]':String(months)}}).catch(()=>{});
}

export async function onRequestPost({ request, env }) {
  const bodyText = await request.text();
  const sig = request.headers.get('stripe-signature') || '';
  const settings = await getPaymentSettings(env);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || settings.stripeWebhookSecret || '';
  let verified = false;
  if (webhookSecret && sig) {
    const parts = parseStripeSig(sig);
    const signedPayload = `${parts.t}.${bodyText}`;
    const expected = await hmacHex(webhookSecret, signedPayload);
    verified = expected === parts.v1;
    if (!verified) return json({ error: 'Invalid signature' }, 401);
  }
  const payload = JSON.parse(bodyText || '{}');
  const event = payload.type || 'unknown';
  const obj = payload.data?.object || {};
  const orderId = obj.metadata?.order_id || obj.subscription_details?.metadata?.order_id || obj.parent?.subscription_details?.metadata?.order_id || obj.client_reference_id || '';
  const subscriptionId = obj.subscription || (String(obj.object||'').includes('subscription') ? obj.id : '') || obj.parent?.subscription_details?.subscription || '';
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,?)').bind(orderId, 'stripe', event, bodyText, verified ? 1 : 0).run();

  // Preserve the project's existing sandbox behavior: if no webhook secret has
  // been configured yet, the callback can still update test state. Once a secret
  // exists, only a verified signature is authoritative.
  const authoritative = webhookSecret ? verified : true;
  if(!authoritative)return json({ok:true,verified:false});

  if (orderId) {
    if (event === 'checkout.session.completed') {
      const details=obj.customer_details||{};
      let cust=(obj.customer&&typeof obj.customer==='object')?obj.customer:null;
      if(!cust&&typeof obj.customer==='string')cust=await stripeApi(env,`/customers/${encodeURIComponent(obj.customer)}`,{method:'GET'}).catch(()=>null);
      await mergeGatewayIdentity(env,{name:details.name||cust?.name||'',phone:details.phone||cust?.phone||'',email:details.email||cust?.email||obj.customer_email||'',gateway:'stripe',subscription_id:subscriptionId,payment_id:obj.payment_intent||'',order_id:orderId}).catch(()=>{});
    }
    if (event === 'checkout.session.expired') {
      await env.DB.prepare("UPDATE orders SET status='expired', payment_status='expired', failure_reason=COALESCE(NULLIF(failure_reason,''),'Stripe Checkout Session expired before payment'), updated_at=CURRENT_TIMESTAMP WHERE order_id=? AND lower(COALESCE(payment_status,'')) NOT IN ('paid','captured','successful','success')").bind(orderId).run().catch(()=>{});
    }
    if (event === 'checkout.session.completed' || event === 'invoice.paid' || event === 'invoice.payment_succeeded') {
      const amountReceived=Number(obj.amount_paid||obj.amount_received||obj.amount_total||0);
      const sessionPaid=event==='checkout.session.completed' && String(obj.payment_status||'').toLowerCase()==='paid' && amountReceived>0;
      const invoicePaid=(event==='invoice.paid'||event==='invoice.payment_succeeded') && amountReceived>0;
      const fin=await env.DB.prepare(`SELECT o.payment_mode,o.status current_status,COALESCE(SUM(oi.setup_amount_paise),0) setup_amount_paise,COALESCE(SUM(oi.unit_amount_paise*COALESCE(oi.quantity,1)),0) recurring_amount_paise FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.order_id=? GROUP BY o.id`).bind(orderId).first().catch(()=>({payment_mode:'',setup_amount_paise:0,recurring_amount_paise:0,current_status:''}));
      const oneTime=String(fin?.payment_mode||'').toLowerCase()==='one_time'&&!subscriptionId;
      const upfrontAmount=Number(fin?.setup_amount_paise||0),isUpfrontReceipt=!oneTime&&upfrontAmount>0&&amountReceived>0&&amountReceived<=Math.max(upfrontAmount,100);
      if(sessionPaid||invoicePaid){
        const lifecycle=isUpfrontReceipt?'authenticated':'paid',payState=isUpfrontReceipt?'authenticated':'paid';
        await env.DB.prepare(`UPDATE orders SET status=?, payment_status=?, gateway='stripe', gateway_payment_id=?, gateway_subscription_id=COALESCE(NULLIF(?,''),gateway_subscription_id), updated_at=CURRENT_TIMESTAMP WHERE order_id=?`).bind(lifecycle,payState,obj.payment_intent || obj.charge || obj.id, subscriptionId || '', orderId).run();
        // For subscriptions, the invoice event is the authoritative money-received record.
        // For one-time Checkout payments, the completed session is sufficient.
        if(invoicePaid||oneTime||isUpfrontReceipt){
          const tx=String(obj.payment_intent||obj.charge||obj.id||'');
          if(tx)await recordPaymentReceipt(env,{gateway:'stripe',transaction_id:tx,order_id:orderId,subscription_id:subscriptionId||'',amount_paise:amountReceived,currency:String(obj.currency||'INR').toUpperCase(),status:'paid',payment_kind:oneTime?'one_time':isUpfrontReceipt?'authentication':'subscription_charge',payment_method:Array.isArray(obj.payment_method_types)?obj.payment_method_types[0]||'':'',paid_at_epoch:Number(obj.status_transitions?.paid_at||obj.created||0),payload_json:payload}).catch(()=>{});
        }
        if(!oneTime)await upsertSubscriber(env,orderId,subscriptionId,isUpfrontReceipt?'authenticated':'active');
        if(!isUpfrontReceipt){
          await env.DB.prepare("UPDATE contact_leads SET status='converted',outcome='Payment Collected',follow_up_date='',next_action='',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(orderId).run().catch(()=>{});
        }
        await sendOrderPaidEmail(env, orderId).catch(()=>{});
      }else{
        await env.DB.prepare("UPDATE orders SET status='awaiting_payment',payment_status='awaiting_payment',gateway='stripe',gateway_subscription_id=COALESCE(NULLIF(?,''),gateway_subscription_id),updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(subscriptionId||'',orderId).run().catch(()=>{});
      }
    }
    if (event.includes('payment_failed')) {
      const automationEvent=subscriptionId?'subscription_failed':'payment_failed';
      await env.DB.prepare('UPDATE orders SET status=?, payment_status=?, failure_reason=?, order_stage=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind('failed','failed','Stripe payment failed','change',orderId).run();
      await recordPaymentFailure(env,orderId,{reason:o.last_payment_error?.message||o.failure_message||'Stripe payment failed',reference:o.payment_intent||o.id||'',attemptAmountPaise:Number(o.amount_due||o.amount_total||0),automationEvent}).catch(()=>{});
      await upsertSubscriber(env,orderId,subscriptionId,'failed');
      const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,automationEvent,{failureReason:o.last_payment_error?.message||o.failure_message||'Stripe payment failed',reference:o.payment_intent||o.id||event,amountPaise:Number(o.amount_due||o.amount_total||0)}).catch(()=>{});
    }
    if ((event === 'customer.subscription.created' || event === 'customer.subscription.updated') && obj.id) {
      await env.DB.prepare("UPDATE orders SET gateway=?, gateway_subscription_id=?, status=?, payment_status=CASE WHEN lower(COALESCE(payment_status,'')) IN ('paid','captured','successful','success','authenticated','authorized','authorised') THEN payment_status ELSE 'awaiting_payment' END, updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind('stripe',obj.id,obj.status||'active',orderId).run().catch(()=>{});
      if(event==='customer.subscription.created')await applyFiniteStripeCycles(env,obj);
      // Stripe explicitly separates subscription creation/status changes from money received.
      // Only invoice.paid / a Checkout Session with payment_status=paid is allowed to activate
      // the local subscriber record. This prevents an incomplete/trial/created subscription
      // from appearing as a paid subscriber before a successful charge exists.
      const paidOrder=await env.DB.prepare('SELECT payment_status FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
      if(['paid','captured','successful','success'].includes(String(paidOrder?.payment_status||'').toLowerCase())){
        await upsertSubscriber(env,orderId,obj.id,'active');
      }
    }
    if (event.includes('customer.subscription.deleted') || event.includes('subscription_schedule.canceled')) {
      await env.DB.prepare('UPDATE orders SET status=?, payment_status=?, order_stage=?, updated_at=CURRENT_TIMESTAMP WHERE order_id=?').bind('cancelled','cancelled','change',orderId).run();
      await upsertSubscriber(env,orderId,obj.id||subscriptionId,'cancelled');
      const automation=await import('../../_lib/email-automations.js');await automation.triggerOrderEmailAutomation(env,orderId,'subscription_cancelled',{reference:obj.id||subscriptionId||event,cancellationDate:new Date().toISOString().slice(0,10)}).catch(()=>{});
    }
    await notifyAdmin(env, `Stripe event for IronPulse Gym\nOrder ID: ${orderId || '-'}\nEvent: ${event}`);
  }
  if(orderId)await bumpAdminActivity(env,'orders').catch(()=>{});
  await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ ok: true, verified:true });
}
