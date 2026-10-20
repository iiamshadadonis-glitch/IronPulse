import { json, readJson, hmacHex, getPaymentSettings, notifyAdmin, sendOrderPaidEmail, razorpayApi } from '../../_lib/utils.js';
import { mergeGatewayIdentity } from '../../_lib/lead-profile.js';
import { recordPaymentReceipt } from '../../_lib/payment-receipts.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
export async function onRequestPost({request,env}){
  const b=await readJson(request),paymentId=clean(b.razorpay_payment_id,180),subscriptionId=clean(b.razorpay_subscription_id||b.subscription_id,180),signature=clean(b.razorpay_signature,300),orderId=clean(b.order_id,100);
  if(!paymentId||!subscriptionId||!signature)return json({error:'Incomplete Razorpay payment verification details.'},400);
  const settings=await getPaymentSettings(env),secret=env.RAZORPAY_KEY_SECRET||settings.razorpayKeySecret||'';
  if(!secret)return json({error:'Razorpay Key Secret is not configured.'},503);
  const expected=await hmacHex(secret,`${paymentId}|${subscriptionId}`);
  if(expected!==signature)return json({error:'Razorpay payment signature verification failed.'},401);
  const order=await env.DB.prepare(`SELECT DISTINCT o.* FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE (?='' OR o.order_id=?) AND (o.gateway_subscription_id=? OR oi.gateway_subscription_id=?) ORDER BY o.id DESC LIMIT 1`).bind(orderId,orderId,subscriptionId,subscriptionId).first().catch(()=>null);
  if(!order)return json({error:'Verified payment received, but the linked local order was not found. Refresh the admin payment records.'},404);

  // A valid Checkout signature confirms that the subscription authorisation response
  // is authentic. It does not by itself prove that the full recurring plan amount was
  // collected. Fetch the actual Razorpay Payment and record only the money that was
  // captured. This is essential for paid trials/upfront amounts (for example ₹1 today).
  const payment=await razorpayApi(env,`/payments/${encodeURIComponent(paymentId)}`,{method:'GET'}).catch(()=>null);
  const paymentAmount=Math.max(0,Number(payment?.amount||0));
  const captured=String(payment?.status||'').toLowerCase()==='captured'||payment?.captured===true;
  const setupRow=await env.DB.prepare('SELECT COALESCE(SUM(setup_amount_paise),0) setup_amount_paise FROM order_items WHERE order_id=? AND gateway_subscription_id=?').bind(order.id,subscriptionId).first().catch(()=>({setup_amount_paise:0}));
  const setupAmount=Math.max(0,Number(setupRow?.setup_amount_paise||0));
  const upfrontReceived=captured&&setupAmount>0&&paymentAmount>0;

  if(upfrontReceived){
    // A configured trial/setup amount is real money collected as part of Razorpay's
    // authorisation transaction. Mark the current payment due as paid, while the
    // future recurring plan continues according to the subscription schedule.
    await env.DB.prepare("UPDATE orders SET status='authenticated',payment_status='authenticated',gateway='razorpay',gateway_payment_id=?,gateway_subscription_id=?,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(paymentId,subscriptionId,order.id).run();
    await env.DB.prepare("UPDATE order_items SET status='authenticated',gateway='razorpay',gateway_subscription_id=? WHERE order_id=? AND gateway_subscription_id=?").bind(subscriptionId,order.id,subscriptionId).run().catch(()=>{});
    await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,1)').bind(order.order_id,'razorpay','payment.captured',JSON.stringify({event:'payment.captured',payload:{payment:{entity:{...(payment||{}),id:paymentId,amount:paymentAmount,status:payment?.status||'captured',notes:{...(payment?.notes||{}),order_id:order.order_id,subscription_id:subscriptionId}}},subscription:{entity:{id:subscriptionId,notes:{order_id:order.order_id}}}}})).run().catch(()=>{});
    await recordPaymentReceipt(env,{gateway:'razorpay',transaction_id:paymentId,order_id:order.order_id,subscription_id:subscriptionId,amount_paise:paymentAmount,currency:payment?.currency||'INR',status:'paid',payment_kind:'authentication',payment_method:payment?.method||'',upi_id:payment?.vpa||payment?.upi?.vpa||'',paid_at_epoch:Number(payment?.created_at||0),payload_json:payment||{}}).catch(()=>{});
    const items=(await env.DB.prepare('SELECT product_name FROM order_items WHERE order_id=? ORDER BY id').bind(order.id).all().catch(()=>({results:[]}))).results||[];
    if(order.customer_phone)await env.DB.prepare(`INSERT INTO subscribers(name,phone,email,city,plan_name,subscription_status,gateway,gateway_subscription_id,notes,updated_at)
      VALUES(?,?,?,?,?,'authenticated','razorpay',?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,plan_name=excluded.plan_name,subscription_status='authenticated',gateway='razorpay',gateway_subscription_id=excluded.gateway_subscription_id,updated_at=CURRENT_TIMESTAMP`).bind(order.customer_name||'',order.customer_phone,order.customer_email||'','',items.map(x=>x.product_name).filter(Boolean).join(', ')||'Membership',subscriptionId,`Authenticated trial/upfront payment ${paymentId}; recurring charge is still pending.`).run().catch(()=>{});
    await mergeGatewayIdentity(env,{name:order.customer_name,phone:order.customer_phone,email:order.customer_email,gateway:'razorpay',subscription_id:subscriptionId,payment_id:paymentId,order_id:order.order_id}).catch(()=>{});
    await notifyAdmin(env,`IronPulse Gym trial/upfront payment verified\nOrder ID: ${order.order_id}\nGateway: Razorpay\nAmount received: ₹${(paymentAmount/100).toFixed(2)}`).catch(()=>{});
    await sendOrderPaidEmail(env,order.order_id).catch(()=>{});
    await bumpAdminActivity(env,'orders').catch(()=>{});
    await bumpAdminActivity(env,'subscriptions').catch(()=>{});
    return json({ok:true,order_id:order.order_id,payment_id:paymentId,amount_paise:paymentAmount,status:'authenticated',message:'Your payment was verified successfully.'});
  }

  // Normal subscription authorisation: keep money as pending. Razorpay's
  // subscription.charged/payment.captured webhook is the authoritative signal for
  // the actual recurring amount. This prevents a mandate/authentication transaction
  // from being mistaken for the plan payment.
  await env.DB.prepare("UPDATE orders SET status='authenticated',payment_status=CASE WHEN lower(COALESCE(payment_status,'')) IN ('paid','captured','successful','success') THEN payment_status ELSE 'awaiting_payment' END,gateway='razorpay',gateway_payment_id=COALESCE(NULLIF(?,''),gateway_payment_id),gateway_subscription_id=?,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(paymentId,subscriptionId,order.id).run();
  await env.DB.prepare("UPDATE order_items SET status='authenticated',gateway='razorpay',gateway_subscription_id=? WHERE order_id=? AND gateway_subscription_id=?").bind(subscriptionId,order.id,subscriptionId).run().catch(()=>{});
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,1)').bind(order.order_id,'razorpay','subscription.authenticated',JSON.stringify({event:'subscription.authenticated',payload:{payment:{entity:{...(payment||{}),id:paymentId,amount:paymentAmount,notes:{...(payment?.notes||{}),order_id:order.order_id,subscription_id:subscriptionId}}},subscription:{entity:{id:subscriptionId,notes:{order_id:order.order_id}}}}})).run().catch(()=>{});
  await mergeGatewayIdentity(env,{name:order.customer_name,phone:order.customer_phone,email:order.customer_email,gateway:'razorpay',subscription_id:subscriptionId,payment_id:paymentId,order_id:order.order_id}).catch(()=>{});
  await bumpAdminActivity(env,'orders').catch(()=>{});
  await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ok:true,order_id:order.order_id,payment_id:paymentId,amount_paise:captured?paymentAmount:0,status:'authenticated',message:'Your subscription was authenticated successfully.'});
}
