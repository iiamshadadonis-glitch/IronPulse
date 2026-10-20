import { json, getSiteSettings, safeJsonParse, razorpayApi, sendOrderPaidEmail } from '../_lib/utils.js';
import { latestPaymentReceipt, backfillPaymentReceipts, recordPaymentReceipt } from '../_lib/payment-receipts.js';
import { bumpAdminActivity } from '../_lib/admin-activity.js';
import { createPortalSession, ensurePaidStudentPortalAccount } from '../_lib/portal-auth.js';

const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?Math.max(0,Math.round(n)):0;};

function gatewayLabel(g){return ({razorpay:'Razorpay',stripe:'Stripe',phonepe:'PhonePe',manual:'Manual'})[String(g||'').toLowerCase()]||clean(g,50)||'Payment Gateway';}
function dateOnly(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,10):d.toISOString().slice(0,10);}
function addTrial(base,value,unit){const d=new Date(base||Date.now()),n=Math.max(1,Number(value||1)),u=String(unit||'days').toLowerCase();if(Number.isNaN(d.getTime()))return'';if(u==='weeks')d.setUTCDate(d.getUTCDate()+n*7);else if(u==='months')d.setUTCMonth(d.getUTCMonth()+n);else if(u==='years')d.setUTCFullYear(d.getUTCFullYear()+n);else d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}

async function reconcileRazorpayReference(env,order,reference){
  if(String(order?.gateway||'').toLowerCase()!=='razorpay'||!/^pay_[A-Za-z0-9]+$/.test(String(reference||'')))return null;
  const payment=await razorpayApi(env,`/payments/${encodeURIComponent(reference)}`,{method:'GET'}).catch(()=>null);
  if(!payment||(payment.captured!==true&&String(payment.status||'').toLowerCase()!=='captured')||Number(payment.amount||0)<=0)return null;
  const itemRows=(await env.DB.prepare('SELECT gateway_subscription_id,setup_amount_paise,tax_snapshot_json FROM order_items WHERE order_id=? ORDER BY id').bind(order.id).all().catch(()=>({results:[]}))).results||[];
  const subscriptionId=clean(order.gateway_subscription_id||itemRows.find(x=>x.gateway_subscription_id)?.gateway_subscription_id,220);
  let linked=String(payment?.notes?.order_id||'')===String(order.order_id||'');
  if(subscriptionId&&!linked){
    const inv=await razorpayApi(env,`/invoices?subscription_id=${encodeURIComponent(subscriptionId)}`,{method:'GET'}).catch(()=>({items:[]}));
    linked=(inv.items||[]).some(x=>String(x.subscription_id||'')===subscriptionId&&(String(x.payment_id||'')===reference||(payment.invoice_id&&String(x.id||'')===String(payment.invoice_id))));
  }
  if(!linked)return null;
  let authCeiling=0;for(const row of itemRows){const snap=safeJsonParse(row.tax_snapshot_json||'{}',{});authCeiling+=Math.max(Number(row.setup_amount_paise||0),Number(snap?.trial?.totalPaise||0),Number(snap?.setup?.totalPaise||0),0);}
  const oneTime=String(order.payment_mode||'').toLowerCase()==='one_time',amount=num(payment.amount),kind=oneTime?'one_time':authCeiling>0&&amount<=Math.max(authCeiling,100)+2?'authentication':'subscription_charge';
  const receipt=await recordPaymentReceipt(env,{gateway:'razorpay',transaction_id:reference,order_id:order.order_id,subscription_id:subscriptionId,amount_paise:amount,currency:payment.currency||'INR',status:'paid',payment_kind:kind,payment_method:payment.method||'',upi_id:payment.vpa||payment.upi?.vpa||'',paid_at_epoch:Number(payment.created_at||0),payload_json:payment}).catch(()=>null);
  if(receipt){const lifecycle=kind==='authentication'?'authenticated':'paid',payStatus=kind==='authentication'?'authenticated':'paid';await env.DB.prepare('UPDATE orders SET status=?,payment_status=?,gateway_payment_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(lifecycle,payStatus,reference,order.id).run().catch(()=>{});await bumpAdminActivity(env,'orders').catch(()=>{});}
  return receipt;
}
function safeRetry(url){const v=clean(url,1200);if(!v)return'/checkout';try{const u=new URL(v,'https://urgent-casting.invalid');return ['http:','https:'].includes(u.protocol)?v:'/checkout';}catch{return'/checkout';}}

export async function onRequestGet({request,env}){
  const u=new URL(request.url),orderId=clean(u.searchParams.get('order'),120),reference=clean(u.searchParams.get('reference')||u.searchParams.get('payment_id')||u.searchParams.get('session_id'),220);
  if(!orderId)return json({error:'Order reference is required.'},400);
  const order=await env.DB.prepare('SELECT * FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);
  if(!order)return json({error:'This payment record could not be found.'},404);

  // Older verified events are imported automatically after an upgrade. This extra
  // best-effort pass makes the customer result page useful during the first request.
  let receipt=await latestPaymentReceipt(env,{orderId,transactionId:reference});
  if(!receipt){await backfillPaymentReceipts(env,{limit:250,orderId}).catch(()=>{});receipt=await latestPaymentReceipt(env,{orderId,transactionId:reference});}
  if(!receipt&&reference){receipt=await reconcileRazorpayReference(env,order,reference);}

  const items=(await env.DB.prepare(`SELECT oi.*,p.name product_catalog_name,p.regular_price_paise,p.offer_price_paise,p.trial_enabled,p.trial_amount_paise,p.trial_value,p.trial_unit
    FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? ORDER BY oi.id`).bind(order.id).all().catch(()=>({results:[]}))).results||[];
  const first=items[0]||{},subscriptionCharge=items.reduce((s,x)=>s+num(x.recurring_unit_amount_paise||x.unit_amount_paise)*Math.max(1,num(x.quantity)||1),0)||num(order.amount_paise),regularValue=items.reduce((s,x)=>s+num(x.original_unit_amount_paise||x.regular_price_paise||x.recurring_unit_amount_paise||x.unit_amount_paise)*Math.max(1,num(x.quantity)||1),0)||subscriptionCharge;
  const itemTax=safeJsonParse(first.tax_snapshot_json||'{}',{}),trialTax=itemTax?.trial||{},receiptTax=safeJsonParse(receipt?.tax_snapshot_json||'{}',{});
  const trialAmount=num(first.setup_amount_paise||first.trial_amount_paise),savedTrialEnabled=trialAmount>0&&!!(itemTax&&itemTax.trial);
  const trialEnabled=(Number(first.trial_enabled||0)===1||savedTrialEnabled)&&trialAmount>0,trialGross=num(trialTax.totalPaise)||trialAmount,received=num(receipt?.amount_paise),isTrialPayment=!!receipt&&trialEnabled&&received>0&&(String(receipt?.payment_kind||'').toLowerCase()==='authentication'||received<=Math.max(trialGross,100))&&String(order.payment_mode||'').toLowerCase()!=='one_time';
  const localState=String(order.payment_status||order.status||'').toLowerCase(),failed=['failed','cancelled','canceled','expired'].some(x=>localState.includes(x));
  const site=await getSiteSettings(env).catch(()=>({}));
  const planName=clean(items.map(x=>x.product_name||x.variant_name).filter(Boolean).join(', '),220)||'DropBeat Dance Studio Membership';
  const offerSaving=Math.max(0,regularValue-subscriptionCharge),paidAt=receipt?.paid_at||order.updated_at||order.created_at;
  const status=receipt?'success':failed?'failed':'pending';
  // Final safety net: regardless of where the payment originated (website cart,
  // admin-generated link, QR, or direct retry), once a confirmed receipt exists
  // make sure the branded success email + invoice is sent exactly once.
  if(receipt&&order.customer_email)await sendOrderPaidEmail(env,order.order_id).catch(()=>{});
  // Amount for the payment currently being attempted. Trial authentication collects only the trial amount;
  // all other payment modes use the exact gross amount saved on the order/payment request.
  const oneTime=String(order.payment_mode||'').toLowerCase()==='one_time';
  const requestedGross=num(order.amount_paise)||num(itemTax?.oneTime?.totalPaise)||num(itemTax?.recurring?.totalPaise)||subscriptionCharge;
  const attemptAmount=receipt?received:(!oneTime&&trialEnabled?trialAmount:requestedGross);

  let nextChargeDate='';
  if(order.gateway_subscription_id){
    const cached=await env.DB.prepare('SELECT row_json,charge_at_epoch FROM subscription_overview_cache WHERE lower(gateway)=lower(?) AND subscription_id=? LIMIT 1').bind(order.gateway||'',order.gateway_subscription_id).first().catch(()=>null);
    if(cached){let row={};try{row=JSON.parse(cached.row_json||'{}');}catch{}const ep=num(row.next_charge_at||row.charge_at||cached.charge_at_epoch);if(ep)nextChargeDate=new Date(ep*1000).toISOString().slice(0,10);}
  }
  if(!nextChargeDate&&trialEnabled)nextChargeDate=addTrial(paidAt||order.created_at,num(first.trial_value)||7,first.trial_unit||'days');

  // Track Order has moved into the authenticated student dashboard. Failed
  // payment retries continue through the order's already-saved gateway URL.
  const freshRetryUrl=safeRetry(order.fallback_url);

  let portal=null,sessionHeader='';
  const verifiedBrowserReturn=!!(receipt&&reference&&String(receipt.transaction_id||'')===String(reference));
  if(verifiedBrowserReturn){
    try{const linked=await ensurePaidStudentPortalAccount(env,order),session=await createPortalSession(env,linked.account.id);sessionHeader=session.header;portal={route:'/student-dashboard?payment=success',accountCreated:linked.created,requiresPasswordSetup:linked.requiresPasswordSetup};}catch(_){portal=null;}
  }

  return json({
    ok:true,status,
    brand:{name:clean(site.siteName,160)||'DropBeat Dance Studio',tagline:clean(site.tagline,240)||'Online and studio dance classes for every level',logo_url:clean(site.logoUrl,800)||'/assets/dropbeat-logo.svg',primary_color:clean(site.primaryColor,30)||'#4B55BE'},
    order:{order_id:order.order_id,customer_name:clean(order.customer_name,160),payment_mode:clean(order.payment_mode,40),plan_name:planName,lifecycle_status:clean(order.status,40),payment_status:clean(order.payment_status,40)},
    payment:receipt?{gateway:receipt.gateway,gateway_label:gatewayLabel(receipt.gateway),transaction_id:receipt.transaction_id,amount_paise:received,currency:receipt.currency||'INR',payment_kind:receipt.payment_kind||'payment',payment_method:receipt.payment_method||'',upi_id:receipt.upi_id||'',paid_at:paidAt,base_amount_paise:num(receipt.base_amount_paise)||num(receiptTax.basePaise)||received,gst_amount_paise:num(receipt.gst_amount_paise)||num(receiptTax.gstPaise),service_charge_paise:num(receipt.service_charge_paise)||num(receiptTax.serviceChargePaise),other_tax_paise:num(receipt.other_tax_paise)||num(receiptTax.otherTaxPaise),tax:receiptTax}:null,
    trial:{enabled:trialEnabled,is_trial_payment:isTrialPayment,amount_paise:trialAmount,charged_amount_paise:trialGross,value:num(first.trial_value),unit:clean(first.trial_unit,20),next_charge_date:nextChargeDate},
    invoice:{
      invoice_no:`INV-${String(dateOnly(paidAt)||new Date().toISOString().slice(0,10)).replace(/-/g,'')}-${clean((receipt?.transaction_id||order.order_id).replace(/[^a-z0-9]/gi,''),50).slice(-8).toUpperCase()}`,
      invoice_date:dateOnly(paidAt)||new Date().toISOString().slice(0,10),regular_value_paise:regularValue,offer_value_paise:subscriptionCharge,offer_saving_paise:offerSaving,received_paise:received,balance_due_today_paise:receipt?0:(trialEnabled?trialAmount:subscriptionCharge),plan_name:planName,payment_gateway:receipt?gatewayLabel(receipt.gateway):gatewayLabel(order.gateway),payment_reference:receipt?.transaction_id||'',is_trial_payment:isTrialPayment,trial_amount_paise:trialAmount,trial_charged_amount_paise:trialGross,trial_value:num(first.trial_value),trial_unit:clean(first.trial_unit,20),next_charge_date:nextChargeDate,
      base_received_paise:num(receipt?.base_amount_paise)||num(receiptTax.basePaise)||received,gst_amount_paise:num(receipt?.gst_amount_paise)||num(receiptTax.gstPaise),service_charge_paise:num(receipt?.service_charge_paise)||num(receiptTax.serviceChargePaise),other_tax_paise:num(receipt?.other_tax_paise)||num(receiptTax.otherTaxPaise),gst_percent:Number(receiptTax.gstPercent||0),gst_number:clean(receiptTax.gstNumber,80),other_tax_label:clean(receiptTax.otherTaxLabel||'Other Tax',60),other_tax_percent:Number(receiptTax.otherTaxPercent||0),service_charge_percent:Number(receiptTax.serviceChargePercent||0)
    },
    attempt_amount_paise:attemptAmount,
    retry_url:freshRetryUrl,failure_reason:clean(order.failure_reason,500),portal
  },200,{'cache-control':'no-store',...(sessionHeader?{'set-cookie':sessionHeader}:{})});
}
