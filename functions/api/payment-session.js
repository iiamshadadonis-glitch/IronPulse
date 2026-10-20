import { json, getPaymentSettings, getSiteSettings, normalizePhone, razorpayApi, safeJsonParse } from '../_lib/utils.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const formatContact=(phone='')=>{const d=normalizePhone(phone);if(!d)return'';if(d.length===10)return`+91${d}`;return d.startsWith('00')?`+${d.slice(2)}`:(d.startsWith('91')?`+${d}`:`+${d}`);};

export async function onRequestGet({request,env,context}){
  const u=new URL(request.url),orderId=clean(u.searchParams.get('order'),100),subscriptionId=clean(u.searchParams.get('subscription'),180);
  if(!orderId||!subscriptionId)return json({error:'Order and subscription details are required.'},400);
  const row=await env.DB.prepare(`SELECT o.order_id,o.customer_name,o.customer_phone,o.customer_email,o.payment_status,o.status,o.created_at,o.gateway,
      oi.product_name,oi.variant_name,oi.gateway_subscription_id,oi.gateway item_gateway,oi.unit_amount_paise,oi.original_unit_amount_paise,oi.quantity,oi.setup_amount_paise,oi.tax_snapshot_json,oi.billing_months,oi.first_payment_amount_paise,oi.recurring_unit_amount_paise,oi.coupon_recurring_scope,
      p.regular_price_paise,p.offer_price_paise,p.offer_price_enabled,p.trial_enabled,p.trial_amount_paise,p.trial_value,p.trial_unit
    FROM orders o JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id
    WHERE o.order_id=? AND oi.gateway_subscription_id=? LIMIT 1`).bind(orderId,subscriptionId).first().catch(()=>null);
  if(!row)return json({error:'This payment session could not be found.'},404);
  if(String(row.item_gateway||row.gateway||'').toLowerCase()!=='razorpay')return json({error:'This payment session is not a Razorpay subscription checkout.'},400);
  if(['paid','captured','successful','success'].includes(String(row.payment_status||row.status||'').toLowerCase()))return json({error:'This subscription payment has already been completed.'},409);
  let remote=null;
  try{remote=await razorpayApi(env,`/subscriptions/${encodeURIComponent(subscriptionId)}`,{method:'GET'});}catch(e){return json({error:e.message||'Could not verify the Razorpay subscription.'},502);}
  const status=String(remote?.status||'').toLowerCase();
  if(['expired','cancelled','completed'].includes(status))return json({error:`This subscription link is ${status}. Create a new subscription link to continue.`},410);
  const expireBy=Number(remote?.expire_by||0);
  if(expireBy&&Math.floor(Date.now()/1000)>expireBy)return json({error:'This subscription link has expired. Create a new subscription link to continue.'},410);
  const payment=await getPaymentSettings(env),site=await getSiteSettings(env);
  const taxSnapshot=safeJsonParse(row.tax_snapshot_json||'{}',{}),recurringTax=taxSnapshot?.recurring||{},firstPaymentTax=taxSnapshot?.firstPayment||{},trialTax=taxSnapshot?.trial||{};
  // A custom/admin-created paid trial does not have a catalog product row, so
  // p.trial_enabled can be NULL even though the order item contains a real trial
  // amount and the tax snapshot explicitly marks it as a trial. Treat that saved
  // payment-request data as the source of truth for what is payable TODAY.
  const savedTrialAmount=Math.max(0,Number(row.setup_amount_paise||row.trial_amount_paise||0));
  const savedTrialEnabled=savedTrialAmount>0 && !!(taxSnapshot&&taxSnapshot.trial);
  const keyId=env.RAZORPAY_KEY_ID||payment.razorpayKeyId||'';
  if(!keyId)return json({error:'Razorpay Key ID is not configured.'},503);
  try{
    const lead=await env.DB.prepare("SELECT id FROM contact_leads WHERE lower(trim(COALESCE(email,'')))=? ORDER BY id DESC LIMIT 1").bind(clean(row.customer_email,220).toLowerCase()).first();
    if(lead?.id)context?.waitUntil?.(import('../_lib/email-automations.js').then(async automation=>{await automation.enrollEmailAutomationForEvent(env,{leadId:Number(lead.id),eventType:'abandoned_checkout',context:{eventId:`checkout-${orderId}`,orderId,checkoutUrl:request.url,productName:clean(row.product_name||row.variant_name,180)}});await automation.processEmailAutomations(env,{leadId:Number(lead.id),limit:10});}).catch(()=>{}));
  }catch(_){ }
  return json({
    ok:true,key_id:keyId,order_id:orderId,subscription_id:subscriptionId,hosted_url:clean(remote?.short_url||'',900),
    customer:{name:clean(row.customer_name,120),email:clean(row.customer_email,220),contact:formatContact(row.customer_phone)},
    plan:{name:clean([row.product_name,row.variant_name].filter(Boolean).join(' - '),180)||'Membership',amount_paise:Number(recurringTax.totalPaise||0)||Number(row.recurring_unit_amount_paise||row.unit_amount_paise||0)*Math.max(1,Number(row.quantity||1)),base_amount_paise:Number(recurringTax.basePaise||0)||Number(row.recurring_unit_amount_paise||row.unit_amount_paise||0)*Math.max(1,Number(row.quantity||1)),regular_amount_paise:Number(row.original_unit_amount_paise||row.regular_price_paise||row.unit_amount_paise||0)*Math.max(1,Number(row.quantity||1)),offer_amount_paise:Number(row.recurring_unit_amount_paise||row.unit_amount_paise||0)*Math.max(1,Number(row.quantity||1)),first_payment_amount_paise:Number(firstPaymentTax.totalPaise||0)||Number(row.first_payment_amount_paise||row.unit_amount_paise||0),first_payment_base_amount_paise:Number(firstPaymentTax.basePaise||0)||Number(row.first_payment_amount_paise||row.unit_amount_paise||0),first_payment_only_coupon:String(row.coupon_recurring_scope||'')==='first'&&Number(row.first_payment_amount_paise||0)<Number(row.recurring_unit_amount_paise||row.unit_amount_paise||0)*Math.max(1,Number(row.quantity||1)),billing_months:Math.max(1,Number(row.billing_months||1)),trial_enabled:(Number(row.trial_enabled||0)===1||savedTrialEnabled),trial_amount_paise:Number(trialTax.totalPaise||0)||savedTrialAmount,trial_base_amount_paise:Number(trialTax.basePaise||0)||savedTrialAmount,trial_value:Number(row.trial_value||0),trial_unit:clean(row.trial_unit,20),tax:{recurring:recurringTax,firstPayment:firstPaymentTax,trial:trialTax}},
    brand:{name:clean(site.siteName,160)||'IronPulse Gym',tagline:clean(site.tagline,220),logo_url:clean(site.logoUrl,800)||'/assets/ironpulse-logo.svg',primary_color:clean(site.primaryColor,30)||'#4B55BE'}
  },200,{'cache-control':'no-store'});
}
