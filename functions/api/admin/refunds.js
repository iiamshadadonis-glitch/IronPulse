import { json, readJson, requireAdmin, rupeesToPaise, razorpayApi, getPaymentSettings, getSiteSettings, sendEmailNotice } from '../../_lib/utils.js';
import { phonePeApi } from '../../_lib/payment-gateways.js';
import { bumpAdminActivity } from '../../_lib/admin-activity.js';

const DEFAULT_PLATFORM_REFUND_FEE_PERCENT = 5;
const phonePeMerchantOrderId=v=>String(v||'').trim().replace(/[^A-Za-z0-9_-]/g,'-').slice(0,63);
const phonePeRefundId=()=>`UCRF-${Date.now()}-${Math.random().toString(36).slice(2,8)}`.slice(0,63);

async function stripeApi(env, path, { method='GET', payload=null } = {}) {
  const s = await getPaymentSettings(env);
  const key = env.STRIPE_SECRET_KEY || s.stripeSecretKey;
  if (!key) throw new Error('Stripe secret key is not configured');
  const init = { method, headers:{ Authorization:`Bearer ${key}` } };
  if (payload && method !== 'GET') {
    init.headers['content-type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(payload).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error?.message || 'Stripe API failed');
  return data;
}

async function localSearch(env,q){
  if(!q)return [];
  const digits=String(q).replace(/\D/g,'');
  const local=digits.length>10?digits.slice(-10):digits;
  const like=`%${q}%`, likePhone=local?`%${local}%`:like;
  const {results}=await env.DB.prepare(`SELECT * FROM orders WHERE order_id LIKE ? OR customer_phone LIKE ? OR website_phone LIKE ? OR razorpay_phone LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR gateway_subscription_id LIKE ? OR gateway_payment_id LIKE ? OR gateway_order_id LIKE ? ORDER BY id DESC LIMIT 25`).bind(like,likePhone,likePhone,likePhone,like,like,like,like,like).all();
  return results||[];
}

function previewFrom(provider, gatewayResult, order){
  let gross=Number(order?.amount_paise||0), refunded=0, gatewayFee=0;
  if(provider==='razorpay' && gatewayResult){
    gross=Number(gatewayResult.amount||gross||0);
    refunded=Number(gatewayResult.amount_refunded||0);
    gatewayFee=Number(gatewayResult.fee||0);
  }
  if(provider==='phonepe' && gatewayResult){
    gross=Number(gatewayResult.amount||gross||0);
    gatewayFee=Number(gatewayResult.feeAmount||gatewayResult.paymentDetails?.[0]?.feeAmount||0);
  }
  if(provider==='stripe' && gatewayResult){
    if(gatewayResult.object==='payment_intent'){
      gross=Number(gatewayResult.amount_received||gatewayResult.amount||gross||0);
      const charge=typeof gatewayResult.latest_charge==='object'?gatewayResult.latest_charge:null;
      refunded=Number(charge?.amount_refunded||0);
      gatewayFee=Number(charge?.balance_transaction?.fee||0);
    } else if(gatewayResult.object==='charge'){
      gross=Number(gatewayResult.amount||gross||0);
      refunded=Number(gatewayResult.amount_refunded||0);
      gatewayFee=Number(gatewayResult.balance_transaction?.fee||0);
    }
  }
  const available=Math.max(0,gross-refunded);
  const percent=DEFAULT_PLATFORM_REFUND_FEE_PERCENT;
  const platformFee=Math.round(available*percent/100);
  // Allocate the original provider fee proportionally when a payment has already
  // been partially refunded, so repeated partial refunds do not subtract the
  // full original processing fee more than once.
  const gatewayFeeAllocated = gross>0 ? Math.round(gatewayFee*(available/gross)) : gatewayFee;
  // This is a suggested customer refund only; the admin can change it before submitting.
  const suggested=Math.max(0,available-gatewayFeeAllocated-platformFee);
  return {
    grossAmountPaise:gross,
    alreadyRefundedPaise:refunded,
    availablePaise:available,
    gatewayFeePaise:gatewayFeeAllocated,
    platformFeePercent:percent,
    platformFeePaise:platformFee,
    suggestedRefundPaise:suggested,
    providerFeeNote: provider==='razorpay'
      ? 'Razorpay fee treatment is shown from the payment record when available.'
      : provider==='phonepe'
        ? 'PhonePe fee information is shown only when it is returned in the order-status response; the final refund amount remains editable by the admin.'
        : 'Stripe fee information is shown from the payment record when available; final fee treatment depends on the merchant pricing agreement.'
  };
}

async function fetchStripePayment(env,id){
  if(/^pi_/.test(id)){
    const pi=await stripeApi(env,`/payment_intents/${encodeURIComponent(id)}?expand[]=latest_charge.balance_transaction`);
    if(typeof pi.latest_charge==='string' && pi.latest_charge){
      try{ pi.latest_charge=await stripeApi(env,`/charges/${encodeURIComponent(pi.latest_charge)}?expand[]=balance_transaction`); }catch(_){}
    }
    return pi;
  }
  if(/^ch_/.test(id))return stripeApi(env,`/charges/${encodeURIComponent(id)}?expand[]=balance_transaction`);
  return null;
}

async function logRefund(env,row){
  const vals=[row.refund_id||'',row.provider||'manual',row.order_id||'',row.payment_id||'',row.subscription_id||'',row.customer_name||'',row.customer_phone||'',Number(row.amount_paise||0),row.status||'requested',row.reason||'',row.mode||'',JSON.stringify(row.gateway_response||{}),Number(row.gross_amount_paise||0),Number(row.gateway_fee_paise||0),Number(row.platform_fee_paise||0),Number(row.platform_fee_percent||0)];
  try{
    await env.DB.prepare(`INSERT INTO refund_requests(refund_id,provider,order_id,payment_id,subscription_id,customer_name,customer_phone,amount_paise,status,reason,mode,gateway_response_json,gross_amount_paise,gateway_fee_paise,platform_fee_paise,platform_fee_percent,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(...vals).run();
  }catch(_){
    await env.DB.prepare(`INSERT INTO refund_requests(refund_id,provider,order_id,payment_id,subscription_id,customer_name,customer_phone,amount_paise,status,reason,mode,gateway_response_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(...vals.slice(0,12)).run();
  }
  try{const push=await import('../../_lib/notification-events-v1-58.js');await push.financialNotification(env,{event:'refund_processed',orderId:row.order_id,eventKey:'refund:'+row.provider+':'+row.refund_id,body:'A refund record was updated. Open your dashboard to review its current status.'});}catch{}
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const u=new URL(request.url);const q=(u.searchParams.get('q')||'').trim();const mode=u.searchParams.get('mode')||'search';const exportAll=u.searchParams.get('export')==='1';
  if(mode==='client'){
    const phone=(u.searchParams.get('phone')||'').replace(/\D/g,'').slice(-10),orderId=(u.searchParams.get('order_id')||'').trim(),subscriptionId=(u.searchParams.get('subscription_id')||'').trim();
    const where=[],binds=[];
    if(phone){where.push("substr(replace(replace(replace(replace(COALESCE(customer_phone,''),'+',''),' ',''),'-',''),'(',''),-10)=?");binds.push(phone);}
    if(orderId){where.push('order_id=?');binds.push(orderId);}
    if(subscriptionId){where.push('subscription_id=?');binds.push(subscriptionId);}
    if(!where.length)return json({refunds:[]});
    const {results}=await env.DB.prepare(`SELECT * FROM refund_requests WHERE ${where.join(' OR ')} ORDER BY id DESC LIMIT 200`).bind(...binds).all();
    return json({refunds:results||[]});
  }
  if(mode==='log'){
    const {results}=await env.DB.prepare(`SELECT * FROM refund_requests ORDER BY id DESC ${exportAll?'':'LIMIT 100'}`).all();
    return json({refunds:results||[]});
  }
  const orders=await localSearch(env,q);
  let gatewayResult=null,gatewayError='';
  const provider=u.searchParams.get('provider')||'';
  const localPaymentId = orders?.[0]?.gateway_payment_id || '';
  try{
    if(provider==='razorpay') {
      const payId = /^pay_/.test(q) ? q : (/^pay_/.test(localPaymentId) ? localPaymentId : '');
      if (payId) gatewayResult=await razorpayApi(env,`/payments/${encodeURIComponent(payId)}`,{method:'GET'});
    }
    if(provider==='stripe') {
      const id = (/^(pi_|ch_)/.test(q) ? q : (/^(pi_|ch_)/.test(localPaymentId) ? localPaymentId : ''));
      if(id) gatewayResult=await fetchStripePayment(env,id);
    }
    if(provider==='phonepe') {
      const o=orders?.[0]||null;const merchantOrder=phonePeMerchantOrderId(o?.gateway_order_id||o?.order_id||q);
      if(merchantOrder) gatewayResult=await phonePeApi(env,`/checkout/v2/order/${encodeURIComponent(merchantOrder)}/status?details=true&errorContext=true`,{method:'GET'});
    }
  }catch(e){gatewayError=e.message;}
  const message = !orders.length && !gatewayResult ? `No matching ${provider==='stripe'?'Stripe':provider==='phonepe'?'PhonePe':'Razorpay'} payment was found. Try the saved Order ID, Payment ID, Subscription ID, customer phone number or customer name.` : '';
  const refundPreview=previewFrom(provider,gatewayResult,orders?.[0]||null);
  return json({orders,gatewayResult,gatewayError,message,refundPreview});
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);const provider=b.provider||'manual';
  const searchKey=b.order_id||b.payment_id||b.subscription_id||b.phone||'';
  const o=searchKey?await env.DB.prepare('SELECT * FROM orders WHERE order_id=? OR gateway_subscription_id=? OR gateway_payment_id=? OR customer_phone=? OR website_phone=? OR razorpay_phone=?').bind(searchKey,searchKey,searchKey,searchKey,searchKey,searchKey).first():null;
  const savedGateway=String(o?.gateway||'').trim().toLowerCase();
  if(provider!=='manual'&&o&&savedGateway&&['razorpay','stripe','phonepe'].includes(savedGateway)&&savedGateway!==String(provider).toLowerCase())return json({error:`This payment was collected through ${savedGateway}. Refund it through the same payment gateway.`},400);
  const amount=rupeesToPaise(b.amount_rupees||0)||Number(o?.amount_paise||0);
  if(provider!=='manual' && amount<=0)return json({error:'Refund amount must be greater than zero.'},400);
  let gatewayResponse=null, refundId=''; let status='refund_recorded'; let paymentId=b.payment_id||o?.gateway_payment_id||'';
  if(provider==='razorpay'){
    if(!paymentId)return json({error:'Razorpay payment ID is required for Razorpay refund. Search the order first or enter payment ID.'},400);
    gatewayResponse=await razorpayApi(env,`/payments/${encodeURIComponent(paymentId)}/refund`,{payload:{amount,notes:{order_id:o?.order_id||b.order_id||'',reason:b.reason||'Admin refund'}}});
    refundId=gatewayResponse.id||''; status='refund_initiated';
  } else if(provider==='stripe'){
    const payload={};
    if(paymentId.startsWith('pi_')) payload.payment_intent=paymentId; else if(paymentId.startsWith('ch_')) payload.charge=paymentId; else return json({error:'Stripe refund needs a payment_intent ID (pi_) or charge ID (ch_).'},400);
    if(amount) payload.amount=String(amount);
    gatewayResponse=await stripeApi(env,'/refunds',{method:'POST',payload});
    refundId=gatewayResponse.id||''; status='refund_initiated';
  }
  else if(provider==='phonepe'){
    const originalMerchantOrderId=phonePeMerchantOrderId(o?.gateway_order_id||o?.order_id||b.order_id||'');
    if(!originalMerchantOrderId)return json({error:'PhonePe refund needs the saved DropBeat Dance Studio Order ID. Search the customer order first.'},400);
    const merchantRefundId=phonePeRefundId();
    gatewayResponse=await phonePeApi(env,'/payments/v2/refund',{method:'POST',payload:{merchantRefundId,originalMerchantOrderId,amount,customerDetails:{name:o?.customer_name||b.customer_name||'',email:o?.customer_email||'',phoneNumber:o?.customer_phone||b.customer_phone||b.phone||''}}});
    refundId=gatewayResponse.refundId||merchantRefundId;paymentId=paymentId||gatewayResponse.refundId||'';status='refund_initiated';
  }
  await logRefund(env,{refund_id:refundId,provider,order_id:o?.order_id||b.order_id||'',payment_id:paymentId,subscription_id:o?.gateway_subscription_id||b.subscription_id||'',customer_name:o?.customer_name||b.customer_name||'',customer_phone:o?.customer_phone||b.customer_phone||b.phone||'',amount_paise:amount,status,reason:b.reason||'',mode:b.mode||provider,gateway_response:gatewayResponse,gross_amount_paise:rupeesToPaise(b.gross_amount_rupees||0)||Number(o?.amount_paise||0),gateway_fee_paise:rupeesToPaise(b.gateway_fee_rupees||0),platform_fee_paise:rupeesToPaise(b.platform_fee_rupees||0),platform_fee_percent:Number(b.platform_fee_percent||0)});
  if(o){
    const fullAmount=Number(o.amount_paise||0);
    const fullRefund=refundId && amount>=fullAmount;
    await env.DB.prepare('UPDATE orders SET refund_status=?, payment_status=CASE WHEN ? THEN ? ELSE payment_status END, internal_notes=COALESCE(?,internal_notes), updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,fullRefund?1:0,fullRefund?'refunded':'',b.reason||null,o.id).run();
  }
  let emailNotice={ok:false,reason:'no customer email'};
  const customerEmail=String(o?.customer_email||b.customer_email||'').trim().toLowerCase();
  if(refundId&&customerEmail){
    const customerName=o?.customer_name||b.customer_name||'Customer',orderRef=o?.order_id||b.order_id||'-',amountText=`₹${(amount/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`,site=await getSiteSettings(env).catch(()=>({siteName:'DropBeat Dance Studio'})),brand=site?.siteName||'DropBeat Dance Studio';
    const html=`<p>Dear ${String(customerName).replace(/[<>&]/g,'')},</p><p>Your refund of <strong>${amountText}</strong> for Order <strong>${String(orderRef).replace(/[<>&]/g,'')}</strong> has been initiated through ${String(provider).replace(/[<>&]/g,'')}.</p><p>Refund reference: <strong>${String(refundId).replace(/[<>&]/g,'')}</strong>.</p><p>The amount is being returned to the original payment method. Bank/payment-provider processing can take up to 7 working days.</p><p>Thank you for choosing ${String(brand).replace(/[<>&]/g,'')}.</p>`;
    emailNotice=await sendEmailNotice(env,customerEmail,`${brand} - Refund Initiated - ${orderRef}`,html,`Refund ${amountText} initiated for ${orderRef}. Refund reference: ${refundId}. Bank/payment-provider processing can take up to 7 working days.`).catch(e=>({ok:false,reason:e.message}));
  }
  if(o)await bumpAdminActivity(env,'orders').catch(()=>{});
  const message=refundId?`Refund initiated: ${refundId}. ${emailNotice.ok?'An automatic email was sent to the client. ':''}The amount is being returned to the original payment method and bank/payment-provider processing can take up to 7 working days.`:'Manual refund record saved.';
  return json({ok:true,message,gatewayResponse,refund_id:refundId,refund_status:status,email_notice:emailNotice,expected_credit_timeline:'Up to 7 working days'});
}
