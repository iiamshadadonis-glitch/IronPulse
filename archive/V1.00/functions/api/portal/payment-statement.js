import { json, getSiteSettings } from '../../_lib/utils.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';

const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const paidState=value=>/^(?:paid|captured|active|successful|success|authenticated|trialing|completed)$/i.test(clean(value,40));
const cancelledState=value=>/^(?:cancelled|canceled|refunded|expired)$/i.test(clean(value,40));
const dateOnly=value=>clean(value,30).slice(0,10);
const isoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`));
const gatewayLabel=value=>({razorpay:'Razorpay',phonepe:'PhonePe',stripe:'Stripe',manual:'Gym / Manual'})[clean(value,30).toLowerCase()]||clean(value,80)||'Payment Gateway';
const titleCase=value=>clean(value,80).replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())||'Pending';

function defaultPeriod(){
  const to=new Date(),from=new Date();from.setUTCMonth(from.getUTCMonth()-1);
  return {from:from.toISOString().slice(0,10),to:to.toISOString().slice(0,10)};
}

async function logoResponse(request,env,site){
  const origin=new URL(request.url).origin,candidates=[site.logoUrl,'/assets/ironpulse-invoice-logo.jpg','/assets/ironpulse-logo.svg'].filter(Boolean);
  for(const candidate of candidates){
    try{
      if(String(candidate).startsWith('data:'))continue;
      const target=new URL(String(candidate),origin);
      if(target.pathname==='/api/portal/payment-statement')continue;
      const response=await fetch(target.toString(),{headers:{accept:'image/avif,image/webp,image/png,image/jpeg,image/svg+xml'}});
      const type=clean(response.headers.get('content-type'),100).toLowerCase();
      if(!response.ok||!type.startsWith('image/'))continue;
      const bytes=await response.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>10*1024*1024)continue;
      return new Response(bytes,{status:200,headers:{'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
    }catch(_){/* try the next safe brand image */}
  }
  return new Response(null,{status:404,headers:{'cache-control':'no-store'}});
}

async function statementData(env,account,from,to){
  const address=String(account.email||'').toLowerCase();
  const ordersResult=await env.DB.prepare(`SELECT o.id,o.order_id,o.customer_name,o.customer_phone,o.customer_email,o.amount_paise,o.currency,o.status,o.payment_status,o.payment_mode,o.gateway,o.gateway_order_id,o.gateway_payment_id,o.gateway_subscription_id,o.created_at,o.updated_at,GROUP_CONCAT(oi.product_name,', ') items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE lower(COALESCE(o.customer_email,''))=? GROUP BY o.id ORDER BY datetime(o.created_at) DESC,o.id DESC LIMIT 300`).bind(address).all().catch(()=>({results:[]}));
  const orders=ordersResult.results||[],ids=orders.map(item=>item.order_id).filter(Boolean),receipts=[];
  if(ids.length){
    const placeholders=ids.map(()=>'?').join(','),result=await env.DB.prepare(`SELECT id,gateway,transaction_id,order_id,subscription_id,amount_paise,currency,status,payment_kind,payment_method,paid_at,paid_at_epoch FROM payment_receipts WHERE order_id IN (${placeholders}) AND amount_paise>0 AND lower(COALESCE(status,'')) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(paid_at_epoch,0),strftime('%s',paid_at)) DESC,id DESC LIMIT 1500`).bind(...ids).all().catch(()=>({results:[]}));receipts.push(...(result.results||[]));
  }
  const byOrder=new Map(orders.map(order=>[String(order.order_id),order])),receiptTotals=new Map();
  for(const receipt of receipts)receiptTotals.set(String(receipt.order_id),(receiptTotals.get(String(receipt.order_id))||0)+Math.max(0,Number(receipt.amount_paise||0)));
  const rows=[];
  for(const receipt of receipts){
    const when=dateOnly(receipt.paid_at||(receipt.paid_at_epoch?new Date(Number(receipt.paid_at_epoch)*1000).toISOString():''));if(!when||when<from||when>to)continue;
    const order=byOrder.get(String(receipt.order_id))||{};
    rows.push({date:receipt.paid_at||when,orderId:receipt.order_id||order.order_id||'',plan:order.items||'Fitness Membership',type:titleCase(receipt.payment_kind||order.payment_mode||'Payment'),gateway:gatewayLabel(receipt.gateway||order.gateway),amountPaise:Math.max(0,Number(receipt.amount_paise||0)),pendingPaise:0,status:titleCase(receipt.status||'paid'),reference:receipt.transaction_id||order.gateway_payment_id||order.gateway_subscription_id||'',currency:receipt.currency||order.currency||'INR'});
  }
  for(const order of orders){
    const status=clean(order.payment_status||order.status,60),received=receiptTotals.get(String(order.order_id))||0,amount=Math.max(0,Number(order.amount_paise||0)),paid=paidState(status),when=dateOnly(paid?(order.updated_at||order.created_at):order.created_at);
    if(!when||when<from||when>to)continue;
    if(paidState(status)&&received>0)continue;
    const cancelled=cancelledState(status),pending=paid||cancelled?0:Math.max(0,amount-received);
    rows.push({date:order.updated_at||order.created_at,orderId:order.order_id||'',plan:order.items||'Fitness Membership',type:titleCase(order.payment_mode||'Membership'),gateway:gatewayLabel(order.gateway),amountPaise:paid?Math.max(received,amount):0,pendingPaise:pending,status:titleCase(status),reference:order.gateway_payment_id||order.gateway_subscription_id||order.gateway_order_id||'',currency:order.currency||'INR'});
  }
  rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.orderId).localeCompare(String(a.orderId)));
  const latestOrder=orders[0]||{},paidPaise=rows.reduce((sum,row)=>sum+Number(row.amountPaise||0),0),pendingPaise=rows.reduce((sum,row)=>sum+Number(row.pendingPaise||0),0);
  return {customer:{name:account.display_name||account.real_name||latestOrder.customer_name||'Member',phone:account.phone||latestOrder.customer_phone||'',email:account.email||latestOrder.customer_email||''},rows,summary:{paidPaise,pendingPaise,transactionCount:rows.length},hasAnyPaymentHistory:orders.length>0||receipts.length>0};
}

export async function onRequestGet({request,env}){
  try{
    const account=await requirePortalAccount(request,env,['student']),url=new URL(request.url),site=await getSiteSettings(env);
    if(url.searchParams.get('asset')==='logo')return logoResponse(request,env,site);
    const defaults=defaultPeriod(),from=dateOnly(url.searchParams.get('from')||defaults.from),to=dateOnly(url.searchParams.get('to')||defaults.to);
    if(!isoDate(from)||!isoDate(to)||from>to)throw new Error('Choose a valid statement start and end date.');
    const days=Math.ceil((Date.parse(`${to}T12:00:00Z`)-Date.parse(`${from}T12:00:00Z`))/86400000);if(days>3660)throw new Error('Choose a statement period of ten years or less.');
    const data=await statementData(env,account,from,to);
    return json({ok:true,period:{from,to},generatedAt:new Date().toISOString(),brand:{name:site.siteName||'IronPulse Gym',tagline:site.tagline||'',logoUrl:site.logoUrl||'/assets/ironpulse-logo.svg',primaryColor:site.primaryColor||'#4B55BE',accentColor:site.accentColor||'#A469A8'},...data},200,{'cache-control':'private, no-store'});
  }catch(error){return json({error:error.message||'Your payment statement could not be loaded.'},400,{'cache-control':'no-store'});}
}
