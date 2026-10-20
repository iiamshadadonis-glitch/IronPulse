import { json, readJson, requireAdmin, normalizePhone, orderId, rupeesToPaise, getSiteSettings } from '../../_lib/utils.js';
import { calculateTaxBreakdown } from '../../_lib/taxes.js';
import { createCheckoutWithFallback, getGatewayAvailability } from '../../_lib/payment-gateways.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';
import { saveOrderClassAssignment } from '../../_lib/dance-studio.js';
export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch(e) { return json({ error:e.message }, 401); }
  try {
  const b=await readJson(request),amountPaise=rupeesToPaise(b.amount||0);
  if(!amountPaise)return json({error:'Payment amount is required.'},400);
  const tax=calculateTaxBreakdown(amountPaise,(await getSiteSettings(env)).taxes||{}),chargePaise=tax.totalPaise;
  const phone=normalizePhone(b.customer_phone||b.phone||''),oid=orderId(),localUrl=`/checkout.html?custom_order=${encodeURIComponent(oid)}`;
  let customerId=null;
  if(phone){const c=await env.DB.prepare('INSERT INTO customers(name,phone,email,city,preferred_role,consent_whatsapp,consent_email) VALUES(?,?,?,?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,email=excluded.email,updated_at=CURRENT_TIMESTAMP RETURNING id').bind(b.customer_name||'One-Time Customer',phone,b.customer_email||'','','',1,1).first();customerId=c?.id||null;}
  const availability=await getGatewayAvailability(env).catch(()=>({primary:''}));
  const ord=await env.DB.prepare('INSERT INTO orders(order_id,customer_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,fallback_url,internal_notes,payment_mode,gateway_attempts_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(oid,customerId,b.customer_name||'',phone,b.customer_email||'',chargePaise,'INR','one_time_payment_created','awaiting_payment',availability.primary||'',localUrl,b.notes||b.purpose||'','one_time','[]').run();
  let classAssignment=null;
  try{classAssignment=await saveOrderClassAssignment(env,{orderPk:ord.meta.last_row_id,orderReference:oid,paymentMode:'one_time',input:{...b,class_details_enabled:b.class_details_enabled??1}});}
  catch(error){await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(ord.meta.last_row_id).run().catch(()=>{});return json({error:error.message||'Class access dates and event details are required for a one-time payment link.'},400);}
  let result=null,gatewayError='';
  try{result=await createCheckoutWithFallback(env,{kind:'one_time',orderId:oid,amountPaise:chargePaise,currency:'INR',customer:{name:b.customer_name||'',phone,email:b.customer_email||''},description:b.purpose||b.notes||'DropBeat Dance Studio one-time payment',origin:new URL(request.url).origin,quantity:1});}
  catch(e){gatewayError=e.message||'Payment Gateway link could not be created.';result={attempts:e.attempts||[]};}
  const url=result?.url||localUrl;
  await env.DB.prepare('UPDATE orders SET gateway=?,gateway_order_id=?,gateway_subscription_id=?,fallback_url=?,gateway_attempts_json=?,failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(result?.gateway||availability.primary||'',result?.gatewayOrderId||'',result?.gatewaySubscriptionId||'',url,JSON.stringify(result?.attempts||[]),gatewayError||null,ord.meta.last_row_id).run();
  await env.DB.prepare('INSERT INTO order_items(order_id,product_name,variant_name,quantity,unit_amount_paise,billing_months,horizon_years,total_count,setup_amount_paise,checkout_url,status,gateway,gateway_order_id,payment_mode,tax_snapshot_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(ord.meta.last_row_id,b.purpose||'Custom One-Time Payment','One-Time',1,amountPaise,0,0,1,0,url,result?.url?'payment_link_created':'gateway_error',result?.gateway||availability.primary||'',result?.gatewayOrderId||'','one_time',JSON.stringify({oneTime:tax})).run();
  await env.DB.prepare('UPDATE orders SET tax_snapshot_json=? WHERE id=?').bind(JSON.stringify({oneTime:tax}),ord.meta.last_row_id).run().catch(()=>{});
  await bumpAdminActivity(env,'orders',{unreadDelta:1}).catch(()=>{});
  return json({ok:true,order_id:oid,amount_paise:chargePaise,base_amount_paise:amountPaise,tax,payment_link:url,gateway:result?.gateway||'',gateway_error:gatewayError,class_assignment_id:Number(classAssignment?.id||0),access_start_date:classAssignment?.access_start_date||'',access_end_date:classAssignment?.access_end_date||'',attempts:result?.attempts||[]});
  } catch (e) {
    console.error('custom-payment.js payment request failed', e);
    return json({error:'One-time payment link could not be created. Check Settings → Payments and confirm an enabled payment gateway is connected, then try again. If the gateway is already connected, refresh the page and review API Settings/Payment credentials before retrying.'},500);
  }
}
