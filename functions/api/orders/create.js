import { json, readJson, normalizePhone, orderId, notifyAdmin, getCheckoutSettings, getSiteSettings, calculateCheckoutLine, applyCouponAmount } from '../../_lib/utils.js';
import { calculateTaxBreakdown, aggregateTaxBreakdowns } from '../../_lib/taxes.js';
import { createCheckoutWithFallback, getGatewayAvailability } from '../../_lib/payment-gateways.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { contactContext } from '../../_lib/contact-context.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';

function couponBad(c,amount,slug,billing,qty){
  if(!c||c.status!=='active')return true;
  const now=new Date();
  if(c.starts_at&&new Date(c.starts_at)>now)return true;
  if(c.expires_at&&new Date(c.expires_at)<now)return true;
  if(c.max_uses&&c.used_count>=c.max_uses)return true;
  if(c.min_cart_paise&&amount<c.min_cart_paise)return true;
  if(c.product_slug&&c.product_slug!==slug)return true;
  if(c.billing_scope&&c.billing_scope!=='both'&&c.billing_scope!==billing)return true;
  if(c.member_limit&&qty>c.member_limit)return true;
  return false;
}
async function getCoupon(env,code=''){
  const c=String(code||'').trim().toUpperCase();
  return c?env.DB.prepare('SELECT * FROM coupon_codes WHERE code=?').bind(c).first():null;
}
async function memberDiscountAllowed(request,env,checkout,code=''){
  const normalized=String(code||'').trim().toUpperCase();
  if(!checkout.membershipDiscountEnabled||!normalized||normalized!==String(checkout.membershipDiscountCode||'').toUpperCase())return false;
  try{
    const account=await requirePortalAccount(request,env,['student']);if(account.status!=='active')return false;
    return !!(await env.DB.prepare("SELECT id FROM webinar_members WHERE lower(customer_email)=? AND status='current' LIMIT 1").bind(String(account.email||'').toLowerCase()).first());
  }catch(_){return false;}
}
const clean=(v,n=600)=>String(v??'').trim().slice(0,n);
function trialStartEpoch(product){
  if(!Number(product?.trial_enabled||0))return 0;
  const n=Math.max(1,Number(product.trial_value||1)),u=String(product.trial_unit||'days').toLowerCase(),d=new Date();
  if(u==='weeks')d.setUTCDate(d.getUTCDate()+n*7);
  else if(u==='months')d.setUTCMonth(d.getUTCMonth()+n);
  else if(u==='years')d.setUTCFullYear(d.getUTCFullYear()+n);
  else d.setUTCDate(d.getUTCDate()+n);
  return Math.floor(d.getTime()/1000);
}
function nextBillingEpoch(months=1){const d=new Date();d.setUTCMonth(d.getUTCMonth()+Math.max(1,Math.floor(Number(months||1))));return Math.floor(d.getTime()/1000);}
function billingLabel(calc={}){const interval=Math.max(1,Number(calc.billingInterval||1)),yearly=calc.billingType==='yearly';return yearly?(interval===1?'Yearly':`Every ${interval} years`):(interval===1?'Monthly':`Every ${interval} months`);}

export async function onRequestPost({request,env}){
  try {
  const b=await readJson(request),customer=b.customer||{},phone=normalizePhone(customer.phone),items=b.items||[];
  const context=contactContext(request,b);
  const customerName=clean(customer.name,160),customerEmail=clean(customer.email,220).toLowerCase();
  if(!customerName)return json({error:'Name is required'},400);
  if(!phone)return json({error:'WhatsApp number is required'},400);
  if(!customerEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))return json({error:'A valid email address is required'},400);
  customer.name=customerName;customer.email=customerEmail;
  if(!items.length)return json({error:'Cart is empty'},400);

  const checkout=await getCheckoutSettings(env);
  const taxSettings=(await getSiteSettings(env)).taxes||{};
  const availability=await getGatewayAvailability(env).catch(()=>({primary:'',participating:[]}));
  await env.DB.prepare('INSERT INTO customers(name,phone,email,city,preferred_role,consent_whatsapp,consent_email,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,city=excluded.city,preferred_role=excluded.preferred_role,consent_whatsapp=excluded.consent_whatsapp,consent_email=excluded.consent_email,updated_at=CURRENT_TIMESTAMP')
    .bind(customer.name||'',phone,customer.email||'',customer.city||'',customer.preferred_role||'',customer.consent_whatsapp?1:0,customer.consent_email?1:0).run();
  const dbCustomer=await env.DB.prepare('SELECT id FROM customers WHERE phone=?').bind(phone).first();
  const order_id=orderId();
  const or=await env.DB.prepare('INSERT INTO orders(order_id,customer_id,customer_name,customer_phone,customer_email,amount_paise,original_amount_paise,discount_paise,currency,status,payment_status,gateway,website_phone,order_stage,payment_mode,gateway_attempts_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(order_id,dbCustomer?.id||null,customer.name||'',phone,customer.email||'',0,0,0,env.DEFAULT_CURRENCY||'INR','new_checkout','awaiting_payment',availability.primary||'',phone,'new',checkout.paymentMode||'subscription','[]').run();
  const oid=or.meta.last_row_id;

  let amount=0,original=0,discount=0,offerDiscountTotal=0,couponDiscountTotal=0;
  const used=new Set(),lines=[];
  for(const raw of items){
    const p=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(raw.product_id).first();
    if(!p)continue;
    const effectiveProduct={...p,offer_price_paise:Number(p.offer_price_enabled??1)?Number(p.offer_price_paise||0):Number(p.regular_price_paise||0)};
    const effectiveRaw={...raw,billing_months:Number(raw.billing_months||0)||(String(p.billing_period||'monthly')==='yearly'?12:1)};
    const calc=calculateCheckoutLine(effectiveProduct,effectiveRaw,checkout),billing=calc.billingType;
    const offerDiscount=Math.max(0,calc.originalSubtotal-calc.subtotal);
    let couponDiscount=0,lineDiscount=offerDiscount,couponScope='';
    const cp=checkout.productCouponsEnabled?await getCoupon(env,raw.coupon_code):null;
    if(cp&&!couponBad(cp,calc.subtotal,p.slug,billing,calc.qty)&&cp.applies_to==='item'){
      couponDiscount=applyCouponAmount(cp,calc.subtotal,calc.qty);lineDiscount+=couponDiscount;couponScope=String(cp.recurring_scope||'first')==='all'?'all':'first';used.add(cp.code);
    }
    lines.push({p,raw,calc,lineDiscount,offerDiscount,couponDiscount,couponScope,finalSubtotal:Math.max(0,calc.originalSubtotal-lineDiscount),paymentType:String(p.payment_type||'subscription')==='one_time'?'one_time':'subscription',trial:Number(p.trial_enabled||0)?{enabled:true,amountPaise:Math.max(100,Number(p.trial_amount_paise||100)),startAt:trialStartEpoch(p),unit:String(p.trial_unit||'days'),value:Math.max(1,Number(p.trial_value||1))}:null});
  }
  if(!lines.length)return json({error:'No valid membership plan was found in the cart.'},400);
  const paymentTypes=[...new Set(lines.map(x=>x.paymentType))];
  if(paymentTypes.length>1)return json({error:'Subscription plans and one-time plans must be checked out separately. Please keep only one payment type in the cart.'},400);
  const effectivePaymentMode=paymentTypes[0]||checkout.paymentMode||'subscription';

  const requestedCartCode=b.coupon_code||b.overall_coupon_code||'',memberCartCoupon=await memberDiscountAllowed(request,env,checkout,requestedCartCode);
  const cartCoupon=(checkout.overallCouponsEnabled||memberCartCoupon)?await getCoupon(env,requestedCartCode):null;
  const cartCouponScope=cartCoupon?(String(cartCoupon.recurring_scope||'first')==='all'?'all':'first'):'';
  const preCart=lines.reduce((s,x)=>s+x.finalSubtotal,0);
  const cartBilling=lines.every(x=>x.calc.billingMonths===12)?'yearly':(lines.every(x=>x.calc.billingMonths!==12)?'monthly':'both');
  let cartDiscount=0;
  if(cartCoupon&&!couponBad(cartCoupon,preCart,'',cartBilling,items.reduce((s,i)=>s+Number(i.quantity||1),0))&&cartCoupon.applies_to==='cart'){
    cartDiscount=applyCouponAmount(cartCoupon,preCart,1);used.add(cartCoupon.code);
  }

  let rest=cartDiscount;
  const checkout_urls=[],allAttempts=[],createdItems=[];
  for(const line of lines){
    const {p,raw,calc}=line;
    const share=preCart?Math.min(rest,Math.round(cartDiscount*line.finalSubtotal/preCart)):0;rest-=share;offerDiscountTotal+=Number(line.offerDiscount||0);couponDiscountTotal+=Number(line.couponDiscount||0)+share;
    const firstCouponDiscount=Number(line.couponDiscount||0)+share;
    const recurringCouponDiscount=(line.couponScope==='all'?Number(line.couponDiscount||0):0)+(cartCouponScope==='all'?share:0);
    const firstUnit=Math.max(100,Math.round(Math.max(0,calc.subtotal-firstCouponDiscount)/calc.qty));
    const recurringUnit=Math.max(100,Math.round(Math.max(0,calc.subtotal-recurringCouponDiscount)/calc.qty));
    const appliedCouponScope=(line.couponScope==='first'||(share>0&&cartCouponScope==='first'))?'first':((line.couponScope==='all'||(share>0&&cartCouponScope==='all'))?'all':'');
    amount+=firstUnit*calc.qty;original+=calc.originalSubtotal;discount+=Math.max(0,calc.originalSubtotal-firstUnit*calc.qty);
    let v=calc.billingIntervalExplicit?null:await env.DB.prepare("SELECT * FROM product_variants WHERE product_id=? AND billing_months=? AND status='active' ORDER BY id LIMIT 1").bind(p.id,calc.billingMonths).first();
    if(!v&&!calc.billingIntervalExplicit)v=await env.DB.prepare('SELECT * FROM product_variants WHERE product_id=? ORDER BY billing_months LIMIT 1').bind(p.id).first();
    const item={...(v||{}),name:billingLabel(calc),billing_months:calc.billingMonths,horizon_years:calc.subscriptionYears,total_count:calc.totalCount,offer_price_paise:recurringUnit,currency:p.currency||'INR',quantity:calc.qty,product_name:p.name};
    const recurringTax=calculateTaxBreakdown(recurringUnit*calc.qty,taxSettings);
    const firstPaymentTax=calculateTaxBreakdown(firstUnit*calc.qty,taxSettings);
    // A true paid trial is intentionally tax-free today. Configured taxes remain
    // part of the recurring amount that starts after the trial period.
    const trialTax=line.trial?calculateTaxBreakdown(line.trial.amountPaise,{...taxSettings,enabled:false,gstEnabled:false,serviceChargeEnabled:false,otherTaxEnabled:false}):null;
    const taxSnapshot={recurring:recurringTax,firstPayment:firstPaymentTax,trial:trialTax};
    const couponCodes=[raw.coupon_code||'',share>0?requestedCartCode:''].filter(Boolean).join(', ');
    const ir=await env.DB.prepare('INSERT INTO order_items(order_id,product_id,variant_id,product_name,variant_name,quantity,unit_amount_paise,original_unit_amount_paise,discount_paise,billing_months,horizon_years,total_count,setup_amount_paise,coupon_code,status,payment_mode,gateway,tax_snapshot_json,first_payment_amount_paise,recurring_unit_amount_paise,coupon_recurring_scope) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(oid,p.id,v?.id||null,p.name,item.name,calc.qty,firstUnit,calc.originalUnitAmount,Math.max(0,calc.originalSubtotal-firstUnit*calc.qty),calc.billingMonths,calc.subscriptionYears,calc.totalCount,line.trial?.amountPaise||0,couponCodes,effectivePaymentMode==='one_time'?'payment_link_pending':'created',effectivePaymentMode,availability.primary||'',JSON.stringify(taxSnapshot),firstUnit*calc.qty,recurringUnit,appliedCouponScope).run();
    createdItems.push({id:ir.meta.last_row_id,p,raw,calc,item,firstUnit,recurringUnit,trial:line.trial,recurringTax,firstPaymentTax,trialTax,couponScope:appliedCouponScope});
  }

  // Preserve the existing business rule: a subscription checkout creates one
  // gateway subscription link per selected plan; one-time mode creates one link
  // for the complete order. Global charges are calculated on the final discounted
  // amount before a checkout is created, so every participating gateway receives
  // the same customer-visible total.
  const oneTimeTax=effectivePaymentMode==='one_time'?calculateTaxBreakdown(amount,taxSettings):null;
  if(oneTimeTax){for(const row of createdItems){const snap={recurring:row.recurringTax,firstPayment:row.firstPaymentTax,trial:row.trialTax,oneTime:null};await env.DB.prepare('UPDATE order_items SET tax_snapshot_json=? WHERE id=?').bind(JSON.stringify(snap),row.id).run().catch(()=>{});}if(createdItems[0]){const snap={recurring:createdItems[0].recurringTax,firstPayment:createdItems[0].firstPaymentTax,trial:createdItems[0].trialTax,oneTime:oneTimeTax};await env.DB.prepare('UPDATE order_items SET tax_snapshot_json=? WHERE id=?').bind(JSON.stringify(snap),createdItems[0].id).run().catch(()=>{});}}
  const recurringAggregate=effectivePaymentMode==='subscription'?aggregateTaxBreakdowns(createdItems.map(x=>x.recurringTax)):null;
  const firstPaymentAggregate=effectivePaymentMode==='subscription'?aggregateTaxBreakdowns(createdItems.map(x=>x.firstPaymentTax)):null;
  const hasPaidTrial=createdItems.some(x=>x.trial?.enabled);
  const finalChargeAmount=effectivePaymentMode==='one_time'?Number(oneTimeTax?.totalPaise||amount):Number((hasPaidTrial?recurringAggregate:firstPaymentAggregate)?.totalPaise||amount);
  const orderTaxSnapshot=effectivePaymentMode==='one_time'?{oneTime:oneTimeTax}:{recurring:recurringAggregate,firstPayment:firstPaymentAggregate};
  if(effectivePaymentMode==='one_time'){
    try{
      const g=await createCheckoutWithFallback(env,{kind:'one_time',orderId:order_id,amountPaise:finalChargeAmount,currency:env.DEFAULT_CURRENCY||'INR',customer:{name:customer.name||'',phone,email:customer.email||''},description:'IronPulse Gym payment',origin:new URL(request.url).origin,quantity:1});
      checkout_urls.push(g.url);allAttempts.push(...(g.attempts||[]));
      await env.DB.prepare('UPDATE orders SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,fallback_url=?,gateway_attempts_json=?,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(g.gateway,g.gatewayOrderId||'',g.gatewaySubscriptionId||'',g.url||'',JSON.stringify(allAttempts),oid).run();
      for(const row of createdItems)await env.DB.prepare('UPDATE order_items SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,checkout_url=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(g.gateway,g.gatewayOrderId||'',g.gatewaySubscriptionId||'',g.url||'','payment_link_created',row.id).run().catch(async()=>{
          await env.DB.prepare('UPDATE order_items SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,checkout_url=?,status=? WHERE id=?').bind(g.gateway,g.gatewayOrderId||'',g.gatewaySubscriptionId||'',g.url||'','payment_link_created',row.id).run();
        });
    }catch(e){
      allAttempts.push(...(e.attempts||[]));
      await env.DB.prepare('UPDATE orders SET status=?,payment_status=?,failure_reason=?,gateway_attempts_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind('failed','failed',clean(e.message),JSON.stringify(allAttempts),oid).run();
    }
  }else{
    for(const row of createdItems){
      try{
        const taxesActive=row.recurringTax?.enabled===true,recurringCharge=taxesActive?row.recurringTax.totalPaise:row.recurringUnit,firstCharge=row.firstPaymentTax?.enabled===true?row.firstPaymentTax.totalPaise:row.firstUnit*row.calc.qty,firstOnlyDiscount=!row.trial&&row.couponScope==='first'&&firstCharge<(taxesActive?row.recurringTax.totalPaise:row.recurringUnit*row.calc.qty);
        const g=await createCheckoutWithFallback(env,{kind:'subscription',orderId:order_id,amountPaise:recurringCharge,currency:row.item.currency,customer:{name:customer.name||'',phone,email:customer.email||''},description:`${row.p.name} - ${row.item.name}`,billingMonths:row.calc.billingMonths,totalCount:firstOnlyDiscount?Math.max(1,row.calc.totalCount-1):row.calc.totalCount,setupAmountPaise:0,initialCharge:firstOnlyDiscount?{enabled:true,amountPaise:firstCharge,startAt:nextBillingEpoch(row.calc.billingMonths),label:'First subscription payment after coupon'}:null,trial:row.trial?{...row.trial,amountPaise:row.trial.amountPaise}:null,quantity:taxesActive?1:row.calc.qty,origin:new URL(request.url).origin});
        if(g.url)checkout_urls.push(g.url);allAttempts.push(...(g.attempts||[]));
        await env.DB.prepare('UPDATE order_items SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,checkout_url=?,status=? WHERE id=?').bind(g.gateway,g.gatewayOrderId||'',g.gatewaySubscriptionId||'',g.url||'','subscription_created',row.id).run();
        const current=await env.DB.prepare('SELECT gateway_subscription_id FROM orders WHERE id=?').bind(oid).first();
        if(!current?.gateway_subscription_id)await env.DB.prepare('UPDATE orders SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,fallback_url=?,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(g.gateway,g.gatewayOrderId||'',g.gatewaySubscriptionId||'',g.url||'',oid).run();
      }catch(e){
        allAttempts.push(...(e.attempts||[]));
        await env.DB.prepare('UPDATE order_items SET status=? WHERE id=?').bind('gateway_error',row.id).run();
        await env.DB.prepare('UPDATE orders SET failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(clean(e.message),oid).run();
      }
    }
    await env.DB.prepare('UPDATE orders SET gateway_attempts_json=?,status=CASE WHEN EXISTS(SELECT 1 FROM order_items WHERE order_id=? AND checkout_url IS NOT NULL AND TRIM(checkout_url)!=\'\') THEN status ELSE \'failed\' END,payment_status=CASE WHEN EXISTS(SELECT 1 FROM order_items WHERE order_id=? AND checkout_url IS NOT NULL AND TRIM(checkout_url)!=\'\') THEN payment_status ELSE \'failed\' END,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(JSON.stringify(allAttempts),oid,oid,oid).run();
  }

  for(const code of used)await env.DB.prepare('UPDATE coupon_codes SET used_count=used_count+1,updated_at=CURRENT_TIMESTAMP WHERE code=?').bind(code).run().catch(()=>{});
  await env.DB.prepare('UPDATE orders SET amount_paise=?,original_amount_paise=?,discount_paise=?,offer_discount_paise=?,coupon_discount_paise=?,coupon_code=?,payment_mode=?,tax_snapshot_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(finalChargeAmount,original,discount,offerDiscountTotal,couponDiscountTotal,[...used].join(', '),effectivePaymentMode,JSON.stringify(orderTaxSnapshot),oid).run();

  // Feed checkout identity through the SAME CRM identity/candidate pipeline used
  // by Contact, Requests, Profile and social-lead submissions. Matching priority
  // remains device -> phone -> email -> Instagram. Conflicting identity values are
  // saved as candidates instead of overwriting the currently confirmed value.
  try{
    const visitorId=String(b.visitor_id||'').slice(0,80);
    const merged=await mergeLeadSubmission(env,{visitor_id:visitorId,name:customer.name||'',phone,email:customer.email||'',message:'Website checkout / membership payment request',source_detail:'/checkout',...context},{submissionType:'checkout',source:'website',sourceDetail:'/checkout'});
    const lead=merged?.lead||null;
    if(lead?.id){
      const linked=await env.DB.prepare('SELECT gateway_subscription_id,gateway_payment_id FROM orders WHERE order_id=?').bind(order_id).first();
      await env.DB.prepare(`UPDATE contact_leads SET order_id=?,gateway_subscription_id=COALESCE(NULLIF(?,''),gateway_subscription_id),gateway_payment_id=COALESCE(NULLIF(?,''),gateway_payment_id),sale_amount_paise=?,purchase_type='Website Membership',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(order_id,linked?.gateway_subscription_id||'',linked?.gateway_payment_id||'',finalChargeAmount,lead.id).run();
    }
    if(visitorId)await env.DB.prepare("INSERT INTO visitor_cart_state(visitor_id,service_count,amount_paise,items_json,updated_at) VALUES(?,0,0,'[]',CURRENT_TIMESTAMP) ON CONFLICT(visitor_id) DO UPDATE SET service_count=0,amount_paise=0,items_json='[]',updated_at=CURRENT_TIMESTAMP").bind(visitorId).run();
  }catch(_){}

  await notifyAdmin(env,`New IronPulse Gym order\nOrder ID: ${order_id}\nName: ${customer.name||'-'}\nPhone: ${phone}\nAmount: ₹${(finalChargeAmount/100).toFixed(finalChargeAmount%100?2:0)}\nStatus: awaiting payment`);
  await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});
  const activeGateway=checkout_urls.length?(await env.DB.prepare('SELECT gateway FROM orders WHERE id=?').bind(oid).first().catch(()=>null))?.gateway:'';
  return json({ok:true,order_id,amount_paise:finalChargeAmount,first_payment_amount_paise:finalChargeAmount,recurring_amount_paise:Number(recurringAggregate?.totalPaise||amount),base_amount_paise:amount,tax:orderTaxSnapshot,original_amount_paise:original,discount_paise:discount,checkout_urls,redirect_url:checkout_urls[0]||'',gateway:activeGateway||availability.primary||'',payment_mode:effectivePaymentMode,message:checkout_urls.length?'Redirecting to secure payment page.':'Order saved, but no enabled Payment Gateway could create a checkout link. Review Settings → Payments.'});
  } catch (e) {
    console.error('checkout payment request failed', e);
    return json({error:'Payment could not be started because the website could not create the payment request. Please refresh and try again. If it still does not work, use Contact or Requests to send your details to the admin so they can help you complete the payment.'},500);
  }
}
