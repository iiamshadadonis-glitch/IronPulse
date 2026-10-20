import { json, readJson, requireAdmin, normalizePhone, orderId, calcTotalCount, getSiteSettings } from '../../_lib/utils.js';
import { calculateTaxBreakdown } from '../../_lib/taxes.js';
import { createCheckoutWithFallback, getGatewayAvailability } from '../../_lib/payment-gateways.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';
import { saveOrderClassAssignment } from '../../_lib/dance-studio.js';

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch(e) { return json({ error:e.message }, 401); }
  try {
  const b = await readJson(request), amountPaise = Math.round(Number(b.subscription_amount || 0) * 100);
  if (!amountPaise) return json({ error:'Subscription amount is required.' }, 400);
  const billingMonths=Math.max(1,Number(b.billing_months||1)),horizonYears=Math.max(1,Number(b.horizon_years||21));
  const totalCount=Math.max(1,Number(b.total_count||calcTotalCount(billingMonths,horizonYears)||1));
  const setupAmountPaise=Math.max(0,Math.round(Number(b.setup_amount||0)*100));
  const startDate=String(b.start_date||'').trim();let startAt=0;if(startDate){const x=Math.floor(new Date(`${startDate}T00:00:00+05:30`).getTime()/1000);if(Number.isFinite(x)&&x>Math.floor(Date.now()/1000)+60)startAt=x;}
  const isTrial=setupAmountPaise>0&&startAt>0;
  const taxSettings=(await getSiteSettings(env)).taxes||{},recurringTax=calculateTaxBreakdown(amountPaise,taxSettings),trialTax=isTrial?calculateTaxBreakdown(setupAmountPaise,{...taxSettings,enabled:false,gstEnabled:false,serviceChargeEnabled:false,otherTaxEnabled:false}):null,setupTax=!isTrial&&setupAmountPaise?calculateTaxBreakdown(setupAmountPaise,taxSettings):null;
  const recurringChargePaise=recurringTax.totalPaise,setupChargePaise=setupTax?.totalPaise||0,upfrontChargePaise=isTrial?setupAmountPaise:setupChargePaise;
  const customerPhone=normalizePhone(b.customer_phone||b.phone||''),oid=orderId(),fallbackUrl=`/offers?custom_order=${encodeURIComponent(oid)}`;
  const availability=await getGatewayAvailability(env).catch(()=>({primary:''}));
  const customer=await env.DB.prepare('INSERT INTO customers(name,phone,email,city,preferred_role,consent_whatsapp,consent_email) VALUES(?,?,?,?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,updated_at=CURRENT_TIMESTAMP RETURNING id')
    .bind(b.customer_name||'Custom Customer',customerPhone||oid,b.customer_email||'','','',1,1).first();
  const ord=await env.DB.prepare('INSERT INTO orders(order_id,customer_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,fallback_url,internal_notes,payment_mode,gateway_attempts_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(oid,customer?.id||null,b.customer_name||'',customerPhone||'',b.customer_email||'',recurringChargePaise+upfrontChargePaise,'INR','custom_subscription_created','awaiting_payment',availability.primary||'',fallbackUrl,b.notes||'','subscription','[]').run();
  const dbOrderId=ord.meta.last_row_id;
  let classAssignment=null;
  try{classAssignment=await saveOrderClassAssignment(env,{orderPk:dbOrderId,orderReference:oid,paymentMode:'subscription',input:b});}
  catch(error){await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(dbOrderId).run().catch(()=>{});return json({error:error.message||'Class or event details could not be saved.'},400);}
  let result=null,gatewayError='';
  try{result=await createCheckoutWithFallback(env,{kind:'subscription',orderId:oid,amountPaise:recurringChargePaise,currency:'INR',customer:{name:b.customer_name||'',phone:customerPhone,email:b.customer_email||''},description:b.plan_name||'DropBeat Dance Studio Custom Subscription',billingMonths,totalCount,setupAmountPaise:isTrial?0:setupChargePaise,trial:isTrial?{enabled:true,startAt,amountPaise:setupAmountPaise}:null,quantity:1,origin:new URL(request.url).origin});}
  catch(e){gatewayError=e.message||'Payment Gateway link could not be created.';result={attempts:e.attempts||[]};}
  const finalUrl=result?.url||fallbackUrl;
  await env.DB.prepare('INSERT INTO order_items(order_id,product_name,variant_name,quantity,unit_amount_paise,billing_months,horizon_years,total_count,setup_amount_paise,checkout_url,status,gateway_subscription_id,gateway,gateway_order_id,payment_mode,tax_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(dbOrderId,b.plan_name||'Custom Subscription',b.billing_type||'Custom',1,amountPaise,billingMonths,horizonYears,totalCount,setupAmountPaise,finalUrl,result?.url?'subscription_created':'gateway_error',result?.gatewaySubscriptionId||'',result?.gateway||availability.primary||'',result?.gatewayOrderId||'','subscription',JSON.stringify(isTrial?{recurring:recurringTax,trial:trialTax}:{recurring:recurringTax,setup:setupTax})).run();
  await env.DB.prepare('UPDATE orders SET tax_snapshot_json=? WHERE id=?').bind(JSON.stringify(isTrial?{recurring:recurringTax,trial:trialTax}:{recurring:recurringTax,setup:setupTax}),dbOrderId).run().catch(()=>{});
  await env.DB.prepare('UPDATE orders SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,fallback_url=?,gateway_attempts_json=?,failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE order_id=?')
    .bind(result?.gateway||availability.primary||'',result?.gatewayOrderId||'',result?.gatewaySubscriptionId||'',finalUrl,JSON.stringify(result?.attempts||[]),gatewayError||null,oid).run();
  await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});
  await bumpAdminActivity(env,'subscriptions').catch(()=>{});
  return json({ok:true,order_id:oid,amount_paise:recurringChargePaise,setup_amount_paise:upfrontChargePaise,tax:isTrial?{recurring:recurringTax,trial:trialTax}:{recurring:recurringTax,setup:setupTax},payment_link:finalUrl,gateway:result?.gateway||'',gateway_subscription_id:result?.gatewaySubscriptionId||'',gateway_error:gatewayError,total_count:totalCount,class_assignment_id:Number(classAssignment?.id||0),attempts:result?.attempts||[]});
  } catch (e) {
    console.error('custom-subscription.js payment request failed', e);
    return json({error:'Subscription link could not be created. Check Settings → Payments and confirm an enabled payment gateway is connected, then try again. If the gateway is already connected, refresh the page and review API Settings/Payment credentials before retrying.'},500);
  }
}
