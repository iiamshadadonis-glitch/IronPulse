import { json, requireAdmin, razorpayApi } from '../../_lib/utils.js';
import { getGatewayAvailability, stripeApi, phonePeSubscriptionStatus, gatewayLabel } from '../../_lib/payment-gateways.js';
import { mergeGatewayIdentity } from '../../_lib/lead-profile.js';

const DAY=86400,MAX_SUBSCRIPTIONS=1000,MAX_PHONEPE_STATUS=40,MAX_RAZORPAY_INVOICE_SUBS=25,MAX_GATEWAY_IDENTITY_SYNC=1000,MAX_GATEWAY_IDENTITY_BATCH=10,MAX_RAZORPAY_IDENTITY_ENRICH=2,MAX_LIST_PAYMENT_DETAIL_ENRICH=5,MAX_D1_BATCH=60;
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0;};
const safeJson=(v,f={})=>{try{return JSON.parse(String(v||''))||f;}catch(_){return f;}};
function inrDate(epoch){if(!epoch)return'';const d=new Date(Number(epoch)>1e12?Number(epoch):Number(epoch)*1000);if(Number.isNaN(d.getTime()))return'';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;}
function todayIST(){return inrDate(Date.now());}
function dateToEpoch(date,end=false){const ms=Date.parse(`${date}T${end?'23:59:59':'00:00:00'}+05:30`);return Math.floor(ms/1000);}
function addDays(date,delta){const d=new Date(`${date}T00:00:00+05:30`);d.setUTCDate(d.getUTCDate()+delta);return inrDate(d.getTime());}
function firstOfMonth(date){return `${date.slice(0,7)}-01`;}
function firstOfYear(date){return `${date.slice(0,4)}-01-01`;}
function rangeDates(from,to){const out=[];let d=from,guard=0;while(d<=to&&guard<370){out.push(d);d=addDays(d,1);guard++;}return out;}
function addMonthsEpoch(epoch,months){const e=num(epoch),m=Math.max(1,Math.floor(num(months)||1));if(!e)return 0;const d=new Date(e*1000),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+m);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return Math.floor(d.getTime()/1000);}
function periodRange(u){
  const today=todayIST(),kind=clean(u.searchParams.get('period')||'monthly',20).toLowerCase();
  let from=clean(u.searchParams.get('from'),10),to=clean(u.searchParams.get('to'),10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(to))to=today;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from))from=kind==='daily'?today:(kind==='yearly'?firstOfYear(today):firstOfMonth(today));
  if(from>to)[from,to]=[to,from];
  // Keep interactive queries bounded. A full current year is still below this cap.
  if(dateToEpoch(to,true)-dateToEpoch(from)>370*DAY)from=addDays(to,-369);
  return {period:['daily','monthly','yearly','custom'].includes(kind)?kind:'custom',from,to};
}
function statusLabel(s){const x=clean(s,40).toLowerCase();const map={created:'Created',authenticated:'Authenticated',active:'Active',trialing:'Trialing',pending:'Payment Pending',past_due:'Payment Pending',unpaid:'Unpaid',halted:'Payment Halted',cancelled:'Cancelled',canceled:'Cancelled',completed:'Completed',expired:'Expired',paused:'Paused',revoked:'Cancelled',failed:'Failed',incomplete:'Incomplete'};return map[x]||x.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||'Unknown';}
function paymentMethodLabel(v){const x=clean(v,80).toLowerCase().replace(/[\s_-]+/g,'');const map={upi:'UPI',card:'Card',netbanking:'Net Banking',bank:'Bank',wallet:'Wallet',emandate:'eMandate',nach:'NACH',autopay:'AutoPay',banktransfer:'Bank Transfer',paylater:'Pay Later'};return map[x]||clean(v,80).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function razorpayPaymentDetails(p={}){const method=clean(p.method||p.payment_method||'',80).toLowerCase(),upi=clean(p.vpa||p.upi?.vpa||p.upi_id||'',180);return {payment_method:method,payment_method_label:paymentMethodLabel(method),upi_id:method==='upi'?upi:''};}
function stripePaymentDetails(o={}){const charge=(o.latest_charge&&typeof o.latest_charge==='object')?o.latest_charge:o.charge||{},d=charge.payment_method_details||o.payment_method_details||{},method=clean(d.type||o.payment_method_types?.[0]||'',80).toLowerCase(),upi=clean(d.upi?.vpa||d.upi?.upi_id||'',180);return {payment_method:method,payment_method_label:paymentMethodLabel(method),upi_id:method==='upi'?upi:''};}
function phonePePaymentDetails(o={}){const d=o.paymentDetails?.[0]||o.paymentDetail||o.transactionDetails?.[0]||{},instrument=d.instrument||d.paymentInstrument||o.paymentInstrument||{},method=clean(d.paymentMode||d.paymentMethod||instrument.type||instrument.paymentMode||o.paymentMode||'',80).toLowerCase(),upi=clean(d.vpa||d.upiId||d.upi_id||instrument.vpa||instrument.upiId||instrument.upi_id||'',180);return {payment_method:method,payment_method_label:paymentMethodLabel(method),upi_id:method.includes('upi')?upi:''};}
function gatewayReason(payment={},fallback=''){return clean(payment.error_description||payment.error_reason||payment.error_code||payment.failure_reason||fallback,300);}
function localDate(v){if(!v)return'';const s=String(v);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const n=Number(v);return n?inrDate(n):'';}
function within(date,from,to){return !!date&&date>=from&&date<=to;}
function clientRef(row){return row.lead_id?`lead:${row.lead_id}`:(row.order_id?`order:${encodeURIComponent(row.order_id)}`:(row.subscriber_id?`subscriber:${row.subscriber_id}`:''));}

async function localSubscriptionMap(env){
  const rows=(await env.DB.prepare(`SELECT
      COALESCE(NULLIF(oi.gateway_subscription_id,''),NULLIF(o.gateway_subscription_id,'')) subscription_id,
      COALESCE(NULLIF(oi.gateway,''),NULLIF(o.gateway,''),'') gateway,
      o.order_id,o.customer_name,o.customer_phone,o.customer_email,o.created_at order_created_at,o.payment_mode order_payment_mode,o.amount_paise order_amount_paise,
      oi.product_name,oi.variant_name,oi.quantity,oi.unit_amount_paise,oi.recurring_unit_amount_paise,oi.billing_months,oi.horizon_years,oi.total_count,oi.coupon_code,oi.payment_mode item_payment_mode,
      l.id lead_id,
      s.id subscriber_id,s.plan_name subscriber_plan,s.subscription_status subscriber_status
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id=o.id
    LEFT JOIN contact_leads l ON l.order_id=o.order_id
    LEFT JOIN subscribers s ON s.gateway_subscription_id=COALESCE(NULLIF(oi.gateway_subscription_id,''),NULLIF(o.gateway_subscription_id,''))
    WHERE COALESCE(NULLIF(oi.gateway_subscription_id,''),NULLIF(o.gateway_subscription_id,'')) IS NOT NULL
      AND TRIM(COALESCE(NULLIF(oi.gateway_subscription_id,''),NULLIF(o.gateway_subscription_id,'')))!=''
    ORDER BY o.id DESC,oi.id DESC LIMIT 2500`).all().catch(()=>({results:[]}))).results||[];
  const out={};
  for(const r of rows){
    const id=clean(r.subscription_id,180);if(!id||out[id])continue;
    out[id]={...r,subscription_id:id,gateway:clean(r.gateway,20).toLowerCase(),plan_name:clean(r.product_name||r.subscriber_plan||'Membership',160),offer_name:clean(r.coupon_code||'',100),payment_mode:clean(r.item_payment_mode||r.order_payment_mode||'subscription',30),client_ref:clientRef(r)};
  }
  const subs=(await env.DB.prepare(`SELECT id,name,phone,email,plan_name,gateway,gateway_subscription_id,subscription_status,created_at FROM subscribers WHERE gateway_subscription_id IS NOT NULL AND TRIM(gateway_subscription_id)!=''`).all().catch(()=>({results:[]}))).results||[];
  for(const s of subs){const id=clean(s.gateway_subscription_id,180);const r=out[id]||(out[id]={subscription_id:id,gateway:clean(s.gateway,20).toLowerCase(),plan_name:s.plan_name||'Membership'});r.subscriber_id=r.subscriber_id||s.id;r.customer_name=r.customer_name||s.name;r.customer_phone=r.customer_phone||s.phone;r.customer_email=r.customer_email||s.email;r.subscriber_status=r.subscriber_status||s.subscription_status;r.order_created_at=r.order_created_at||s.created_at;r.client_ref=r.client_ref||`subscriber:${s.id}`;}
  // Existing CRM clients that were matched to a gateway subscription remain clickable
  // on later refreshes without repeating identity-merge work for every dashboard load.
  const leads=(await env.DB.prepare(`SELECT id,name,phone,email,order_id,gateway_subscription_id,created_at FROM contact_leads WHERE gateway_subscription_id IS NOT NULL AND TRIM(gateway_subscription_id)!='' ORDER BY id DESC`).all().catch(()=>({results:[]}))).results||[];
  for(const l of leads){const id=clean(l.gateway_subscription_id,180);if(!id)continue;const r=out[id]||(out[id]={subscription_id:id,plan_name:'Membership'});r.lead_id=r.lead_id||l.id;r.customer_name=r.customer_name||l.name;r.customer_phone=r.customer_phone||l.phone;r.customer_email=r.customer_email||l.email;r.order_id=r.order_id||l.order_id;r.order_created_at=r.order_created_at||l.created_at;r.client_ref=`lead:${l.id}`;}
  return out;
}

async function fetchRazorpaySubscriptions(env){
  const items=[];for(let skip=0;skip<MAX_SUBSCRIPTIONS;skip+=100){const r=await razorpayApi(env,`/subscriptions?count=100&skip=${skip}`,{method:'GET'});const batch=Array.isArray(r.items)?r.items:[];items.push(...batch);if(batch.length<100)break;}return {items,truncated:items.length>=MAX_SUBSCRIPTIONS};
}
async function fetchRazorpayPlans(env){
  // One plan-list request is enough for the admin catalogue in normal use and
  // keeps the subscription overview within Workers/Pages outbound-request limits.
  const map={},r=await razorpayApi(env,'/plans?count=100&skip=0',{method:'GET'}).catch(()=>({items:[]}));
  for(const x of (Array.isArray(r.items)?r.items:[]))if(x?.id)map[x.id]=x;return map;
}
async function enrichRazorpayMissingIdentity(env,rows){
  const targets=(rows||[]).filter(r=>r.gateway==='razorpay'&&r.subscription_id&&(!r.gateway_phone||!r.gateway_email||!r.gateway_name)).slice(0,MAX_RAZORPAY_IDENTITY_ENRICH);
  for(let i=0;i<targets.length;i+=5){
    const batch=targets.slice(i,i+5);await Promise.all(batch.map(async r=>{
      try{
        const raw=r.raw||{};let c={};
        if(raw.customer_id)c=await razorpayApi(env,`/customers/${encodeURIComponent(raw.customer_id)}`,{method:'GET'}).catch(()=>({}));
        let payment={};
        if(!c.contact||!c.email||!c.name){
          const inv=await razorpayApi(env,`/invoices?subscription_id=${encodeURIComponent(r.subscription_id)}`,{method:'GET'}).catch(()=>({items:[]}));
          const latest=(inv.items||[]).filter(x=>x.payment_id).sort((a,b)=>num(b.paid_at||b.issued_at)-num(a.paid_at||a.issued_at))[0];
          if(latest?.payment_id)payment=await razorpayApi(env,`/payments/${encodeURIComponent(latest.payment_id)}`,{method:'GET'}).catch(()=>({}));
        }
        const pm=razorpayPaymentDetails(payment);if(pm.payment_method){r.payment_method=pm.payment_method;r.payment_method_label=pm.payment_method_label;r.upi_id=pm.upi_id||r.upi_id||'';}
        const name=clean(c.name||payment.notes?.customer_name||'',180),phone=clean(c.contact||payment.contact||'',30),email=clean(c.email||payment.email||'',220);
        if(name){r.gateway_name=name;if(!r.name||r.name==='Subscriber')r.name=name;}
        if(phone){r.gateway_phone=phone;if(!r.phone)r.phone=phone;}
        if(email){r.gateway_email=email;if(!r.email)r.email=email;}
      }catch(_){/* best-effort identity enrichment only */}
    }));
  }
}
async function fetchStripeSubscriptions(env){
  const items=[];let starting='';for(let page=0;page<10&&items.length<MAX_SUBSCRIPTIONS;page++){const q=new URLSearchParams({status:'all',limit:'100'});q.append('expand[]','data.customer');if(starting)q.set('starting_after',starting);const r=await stripeApi(env,`/subscriptions?${q.toString()}`,{method:'GET'});const batch=Array.isArray(r.data)?r.data:[];items.push(...batch);if(!r.has_more||!batch.length)break;starting=batch[batch.length-1].id;}return {items,truncated:items.length>=MAX_SUBSCRIPTIONS};
}
async function fetchPhonePeSubscriptions(env,local){
  const ids=Object.values(local).filter(x=>x.gateway==='phonepe').map(x=>x.subscription_id).slice(0,MAX_PHONEPE_STATUS),items=[];
  for(let i=0;i<ids.length;i+=5){const batch=await Promise.all(ids.slice(i,i+5).map(async id=>{try{return {id,data:await phonePeSubscriptionStatus(env,id)}}catch(e){return {id,error:e.message}}}));items.push(...batch);}
  return {items,truncated:Object.values(local).filter(x=>x.gateway==='phonepe').length>ids.length};
}

function normalizeRazorpay(s,local={},plan={}){const gwName=clean(s.notes?.customer_name||'',180),gwPhone=clean(s.customer_contact||s.notes?.customer_phone||'',30),gwEmail=clean(s.customer_email||s.notes?.customer_email||'',220),gwMethod=clean(s.payment_method||'',80).toLowerCase(),qty=num(s.quantity||local.quantity||1)||1,unit=num(plan?.item?.amount||plan?.amount||local.recurring_unit_amount_paise||local.order_amount_paise||local.unit_amount_paise);return {
  subscription_id:clean(s.id,180),gateway:'razorpay',gateway_label:'Razorpay',plan_id:clean(s.plan_id,180),status:clean(s.status,40).toLowerCase(),status_label:statusLabel(s.status),
  created_at:num(s.created_at),start_at:num(s.start_at||s.created_at),ended_at:num(s.ended_at),charge_at:num(s.charge_at),next_charge_at:num(s.charge_at),current_start:num(s.current_start),current_end:num(s.current_end),
  total_count:num(s.total_count||local.total_count),paid_count:num(s.paid_count),remaining_count:num(s.remaining_count),auth_attempts:num(s.auth_attempts),
  amount_paise:unit,quantity:qty,next_charge_amount_paise:unit*qty,name:clean(local.customer_name||gwName||'Subscriber',180),phone:clean(local.customer_phone||gwPhone||'',30),email:clean(local.customer_email||gwEmail||'',220),gateway_name:gwName,gateway_phone:gwPhone,gateway_email:gwEmail,plan_name:clean(local.plan_name||s.notes?.product_name||plan?.item?.name||s.plan_id||'Membership',160),offer_name:clean(local.offer_name||s.offer_id||'',100),payment_mode:clean(local.payment_mode||'subscription',30),order_id:clean(local.order_id||s.notes?.order_id,100),client_ref:local.client_ref||'',payment_method:gwMethod,payment_method_label:paymentMethodLabel(gwMethod),upi_id:'',reason:'',raw:s
};}
function normalizeStripe(s,local={},paidCount=0){
  const item=s.items?.data?.[0],interval=item?.price?.recurring?.interval||item?.plan?.interval||'',intervalCount=num(item?.price?.recurring?.interval_count||item?.plan?.interval_count||local.billing_months||1);let months=local.billing_months||0;if(!months)months=interval==='year'?12*intervalCount:interval==='month'?intervalCount:0;
  const total=num(local.total_count||s.metadata?.intended_total_count||0),paid=num(paidCount||0),cust=(s.customer&&typeof s.customer==='object')?s.customer:{},gwName=clean(cust.name||'',180),gwPhone=clean(cust.phone||'',30),gwEmail=clean(cust.email||'',220);return {
    subscription_id:clean(s.id,180),gateway:'stripe',gateway_label:'Stripe',plan_id:clean(item?.price?.id||'',180),status:clean(s.status,40).toLowerCase(),status_label:statusLabel(s.status),created_at:num(s.created),start_at:num(s.start_date||s.created),ended_at:num(s.ended_at||s.canceled_at),charge_at:num(item?.current_period_end||s.current_period_end),next_charge_at:num(item?.current_period_end||s.current_period_end),current_start:num(item?.current_period_start||s.current_period_start),current_end:num(item?.current_period_end||s.current_period_end),total_count:total,paid_count:paid,remaining_count:total?Math.max(0,total-paid):0,auth_attempts:0,amount_paise:num(item?.price?.unit_amount||item?.plan?.amount||local.recurring_unit_amount_paise||local.order_amount_paise||local.unit_amount_paise),quantity:num(item?.quantity||local.quantity||1),next_charge_amount_paise:num(item?.price?.unit_amount||item?.plan?.amount||local.recurring_unit_amount_paise||local.order_amount_paise||local.unit_amount_paise)*num(item?.quantity||local.quantity||1),billing_months:num(months),name:clean(local.customer_name||gwName||'Subscriber',180),phone:clean(local.customer_phone||gwPhone||'',30),email:clean(local.customer_email||gwEmail||'',220),gateway_name:gwName,gateway_phone:gwPhone,gateway_email:gwEmail,plan_name:clean(local.plan_name||item?.price?.nickname||'Membership',160),offer_name:clean(local.offer_name||'',100),payment_mode:clean(local.payment_mode||'subscription',30),order_id:clean(local.order_id||s.metadata?.order_id,100),client_ref:local.client_ref||'',payment_method:'',payment_method_label:'',upi_id:'',reason:'',raw:s
  };}
function normalizePhonePe(entry,local={},paidCount=0,nextCharge=0){const d=entry.data||{},sub=d.subscriptionDetails||d.data||d,cust=d.customerDetails||sub.customerDetails||{},gwName=clean(cust.name||'',180),gwPhone=clean(cust.phoneNumber||cust.phone||'',30),gwEmail=clean(cust.email||'',220),state=clean(sub.state||d.state||local.subscriber_status||'created',40).toLowerCase();const total=num(local.total_count),paid=num(paidCount),gatewayAmount=num(sub.maxAmount||sub.maxAmountPaise||sub.amount||sub.amountPaise||d.maxAmount||d.maxAmountPaise||d.amount||d.amountPaise||d.paymentFlow?.maxAmount||d.paymentFlow?.amount),actualAmount=gatewayAmount||num(local.recurring_unit_amount_paise)||num(local.order_amount_paise)||num(local.unit_amount_paise),qty=num(local.quantity||1)||1;return {subscription_id:entry.id,gateway:'phonepe',gateway_label:'PhonePe',plan_id:'',status:state,status_label:statusLabel(state),created_at:Math.floor(Date.parse(local.order_created_at||'')/1000)||0,start_at:Math.floor(Date.parse(local.order_created_at||'')/1000)||0,ended_at:0,charge_at:num(nextCharge),next_charge_at:num(nextCharge),current_start:0,current_end:0,total_count:total,paid_count:paid,remaining_count:total?Math.max(0,total-paid):0,auth_attempts:0,amount_paise:actualAmount,quantity:qty,next_charge_amount_paise:actualAmount*qty,billing_months:num(local.billing_months||1),name:clean(local.customer_name||gwName||'Subscriber',180),phone:clean(local.customer_phone||gwPhone||'',30),email:clean(local.customer_email||gwEmail||'',220),gateway_name:gwName,gateway_phone:gwPhone,gateway_email:gwEmail,plan_name:clean(local.plan_name||'Membership',160),offer_name:clean(local.offer_name||'',100),payment_mode:clean(local.payment_mode||'subscription',30),order_id:clean(local.order_id,100),client_ref:local.client_ref||'',payment_method:'',payment_method_label:'',upi_id:'',reason:entry.error||'',raw:d};}

async function syncGatewayIdentities(env,rows){
  const targets=[];
  for(const r of rows||[]){
    if(targets.length>=MAX_GATEWAY_IDENTITY_SYNC)break;
    const phone=clean(r.gateway_phone||r.phone,30),email=clean(r.gateway_email||r.email,220),name=clean(r.gateway_name||r.name,180);
    if(!phone&&!email)continue;
    targets.push({r,phone,email,name});
  }
  for(let i=0;i<targets.length;i+=MAX_GATEWAY_IDENTITY_BATCH){
    await Promise.all(targets.slice(i,i+MAX_GATEWAY_IDENTITY_BATCH).map(async x=>{
      try{
        const merged=await mergeGatewayIdentity(env,{name:x.name,phone:x.phone,email:x.email,gateway:x.r.gateway,subscription_id:x.r.subscription_id,order_id:x.r.order_id});
        if(merged?.lead?.id){x.r.client_ref=`lead:${merged.lead.id}`;x.r.name=clean(merged.lead.name||x.r.name,180);x.r.phone=clean(merged.lead.phone||x.r.phone,30);x.r.email=clean(merged.lead.email||x.r.email,220);}
      }catch(_){/* live gateway rows remain visible even if CRM candidate sync fails */}
    }));
  }
}

function eventInfo(row,local){
  const p=safeJson(row.payload_json,{}),g=clean(row.gateway,20).toLowerCase(),e=clean(row.event_type,120).toLowerCase();let sid='',amount=0,created=0,reason='',isSuccess=false,isFailed=false,isCancelled=false,isRenewal=false,tx='',paymentMethod='',paymentMethodLabelText='',upiId='';
  if(g==='razorpay'){
    const sub=p?.payload?.subscription?.entity||{},pay=p?.payload?.payment?.entity||{},inv=p?.payload?.invoice?.entity||{},pm=razorpayPaymentDetails(pay);sid=clean(sub.id||inv.subscription_id||pay.notes?.subscription_id||'',180);amount=num(pay.amount||inv.amount_paid||inv.amount);created=num(pay.created_at||inv.paid_at||inv.issued_at||sub.created_at||p.created_at);reason=gatewayReason(pay,e);tx=clean(pay.id||inv.payment_id||inv.id||'',180);paymentMethod=pm.payment_method;paymentMethodLabelText=pm.payment_method_label;upiId=pm.upi_id;isSuccess=e.includes('charged')||e.includes('payment.captured')||e.includes('invoice.paid');isFailed=e.includes('failed')||e.includes('pending')||e.includes('halted');isCancelled=e.includes('cancelled');
  }else if(g==='stripe'){
    const o=p?.data?.object||{},pm=stripePaymentDetails(o);sid=clean((typeof o.subscription==='string'?o.subscription:o.subscription?.id)||o.id?.startsWith('sub_')&&o.id||o.parent?.subscription_details?.subscription||'',180);amount=num(o.amount_paid||o.amount_received||o.amount_total||o.amount_due);created=num(o.status_transitions?.paid_at||o.created||p.created);reason=clean(o.last_payment_error?.message||o.failure_message||e,300);tx=clean(o.payment_intent||o.charge||o.id||'',180);paymentMethod=pm.payment_method;paymentMethodLabelText=pm.payment_method_label;upiId=pm.upi_id;const stripePaid=(e==='invoice.paid'||e==='invoice.payment_succeeded')&&amount>0;const checkoutPaid=e==='checkout.session.completed'&&o.mode==='subscription'&&String(o.payment_status||'').toLowerCase()==='paid'&&amount>0;isSuccess=stripePaid||checkoutPaid;isFailed=e.includes('payment_failed')||e.includes('payment.failed');isCancelled=e.includes('subscription.deleted')||e.includes('schedule.canceled');isRenewal=isSuccess&&clean(o.billing_reason,80)!=='subscription_create';
  }else if(g==='phonepe'){
    const o=p?.payload||p,pm=phonePePaymentDetails(o);sid=clean(o.merchantSubscriptionId||o.paymentFlow?.merchantSubscriptionId||o.subscriptionDetails?.merchantSubscriptionId||'',180);amount=num(o.amount||o.redemptionAmount||o.paymentDetails?.[0]?.amount);const rawTs=o.completedAt||o.updatedAt||o.createdAt||o.timestamp||o.paymentDetails?.[0]?.timestamp||Date.parse(row.created_at);created=Math.floor(num(rawTs)/(num(rawTs)>1e12?1000:1));if(created<1e9)created=Math.floor(Date.parse(row.created_at)/1000);reason=clean(o.errorContext?.description||o.detailedErrorCode||o.errorCode||e,300);tx=clean(o.orderId||o.transactionId||o.paymentDetails?.[0]?.transactionId||o.merchantOrderId||'',180);paymentMethod=pm.payment_method;paymentMethodLabelText=pm.payment_method_label;upiId=pm.upi_id;const setupEvent=e.includes('checkout.setup.order')||((e==='checkout.order.completed'||e==='checkout.order.failed')&&clean(o.paymentFlow?.type,80).includes('SUBSCRIPTION'));const redemptionEvent=e.includes('subscription.redemption');const paidState=String(o.paymentDetails?.[0]?.state||o.state||'').toUpperCase();const phonePePaid=amount>0&&['COMPLETED','SUCCESS','SUCCEEDED','PAID'].some(v=>paidState.includes(v));isSuccess=phonePePaid&&((setupEvent&&e.includes('completed'))||(redemptionEvent&&e.includes('completed')));isFailed=(setupEvent&&e.includes('failed'))||(redemptionEvent&&e.includes('failed'))||e==='subscription.notification.failed';isCancelled=e.includes('cancel')||e.includes('revoke');isRenewal=isSuccess&&redemptionEvent;
  }
  const l=local[sid]||{};return {gateway:g,gateway_label:gatewayLabel(g),event_type:e,subscription_id:sid,amount_paise:amount,date:inrDate(created)||String(row.created_at||'').slice(0,10),created_at_epoch:num(created),reason,transaction_id:tx,payment_method:paymentMethod,payment_method_label:paymentMethodLabelText,upi_id:upiId,isSuccess,isFailed,isCancelled,isRenewal,local:l};
}
async function loadEvents(env,from,to,local){
  const q=await env.DB.prepare(`SELECT gateway,event_type,payload_json,created_at FROM payment_events WHERE date(created_at,'+330 minutes') BETWEEN ? AND ? ORDER BY id DESC LIMIT 5000`).bind(from,to).all().catch(()=>({results:[]}));
  return (q.results||[]).map(r=>eventInfo(r,local)).filter(x=>x.subscription_id);
}
async function paidCountMap(env,local){
  const q=await env.DB.prepare(`SELECT gateway,event_type,payload_json,created_at FROM payment_events WHERE event_type LIKE '%paid%' OR event_type LIKE '%succeed%' OR event_type LIKE '%charged%' OR event_type LIKE '%completed%' OR event_type='payment.captured' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]}));
  const out={};for(const row of q.results||[]){const e=eventInfo(row,local);if(e.subscription_id&&e.isSuccess)out[e.subscription_id]=(out[e.subscription_id]||0)+1;}return out;
}
async function latestPaymentMethodMap(env,local){
  const q=await env.DB.prepare(`SELECT gateway,event_type,payload_json,created_at FROM payment_events ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]}));
  const out={};for(const row of q.results||[]){const e=eventInfo(row,local);if(!e.subscription_id||!e.payment_method||out[e.subscription_id])continue;out[e.subscription_id]={payment_method:e.payment_method,payment_method_label:e.payment_method_label||paymentMethodLabel(e.payment_method),upi_id:e.upi_id||''};}return out;
}
async function latestSuccessfulBillMap(env,local){
  const q=await env.DB.prepare(`SELECT gateway,event_type,payload_json,created_at FROM payment_events WHERE event_type LIKE '%paid%' OR event_type LIKE '%succeed%' OR event_type LIKE '%charged%' OR event_type LIKE '%completed%' OR event_type='payment.captured' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]}));
  const out={};
  for(const row of q.results||[]){
    const e=eventInfo(row,local);
    if(!e.subscription_id||!e.isSuccess||Number(e.amount_paise||0)<=0)continue;
    const at=Number(e.created_at_epoch||0),old=out[e.subscription_id];
    if(!old||at>Number(old.at||0))out[e.subscription_id]={at,amount_paise:num(e.amount_paise),transaction_id:clean(e.transaction_id,180),payment_method:e.payment_method||'',payment_method_label:e.payment_method_label||'',upi_id:e.upi_id||''};
  }
  return out;
}
async function latestActualReceiptMap(env){
  const q=await env.DB.prepare(`SELECT gateway,transaction_id,order_id,subscription_id,amount_paise,payment_method,upi_id,paid_at_epoch,paid_at FROM payment_receipts WHERE subscription_id<>'' AND amount_paise>0 AND lower(status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(paid_at_epoch,0),strftime('%s',paid_at)) DESC,id DESC LIMIT 10000`).all().catch(()=>({results:[]}));
  const out={};for(const r of q.results||[]){const sid=clean(r.subscription_id,180);if(sid&&!out[sid])out[sid]=r;}return out;
}

async function phonePeNextChargeMap(env,local,paidMap){
  const q=await env.DB.prepare(`SELECT gateway,event_type,payload_json,created_at FROM payment_events WHERE gateway='phonepe' AND verified=1 ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]}));
  const latest={},seenTx=new Set();
  for(const row of q.results||[]){const e=eventInfo(row,local);if(!e.subscription_id||!e.isSuccess)continue;const k=e.transaction_id?`${e.subscription_id}|${e.transaction_id}`:`${e.subscription_id}|${e.event_type}|${e.created_at_epoch}`;if(seenTx.has(k))continue;seenTx.add(k);latest[e.subscription_id]=Math.max(num(latest[e.subscription_id]),num(e.created_at_epoch));}
  const out={};for(const l of Object.values(local)){if(l.gateway!=='phonepe')continue;const total=num(l.total_count),paid=num(paidMap[l.subscription_id]);if(total&&paid>=total){out[l.subscription_id]=0;continue;}const base=num(latest[l.subscription_id])||(Math.floor(Date.parse(l.order_created_at||'')/1000)||0);out[l.subscription_id]=addMonthsEpoch(base,num(l.billing_months||1));}return out;
}

async function liveSnapshot(env){
  const local=await localSubscriptionMap(env),availability=await getGatewayAvailability(env),paidMap=await paidCountMap(env,local),methodMap=await latestPaymentMethodMap(env,local),billMap=await latestSuccessfulBillMap(env,local),receiptMap=await latestActualReceiptMap(env),phonePeNext=await phonePeNextChargeMap(env,local,paidMap),rows=[],sources=[],truncated=[];
  for(const gateway of availability.participating){
    try{
      if(gateway==='razorpay'){const [r,plans]=await Promise.all([fetchRazorpaySubscriptions(env),fetchRazorpayPlans(env)]);const rzRows=[];for(const s of r.items){const row=normalizeRazorpay(s,local[s.id]||{},plans[s.plan_id]||{});rows.push(row);rzRows.push(row);}await enrichRazorpayMissingIdentity(env,rzRows);if(r.truncated)truncated.push(gateway);sources.push({gateway,label:'Razorpay',configured:true,fetched:r.items.length});}
      if(gateway==='stripe'){const r=await fetchStripeSubscriptions(env);for(const s of r.items)rows.push(normalizeStripe(s,local[s.id]||{},paidMap[s.id]||0));if(r.truncated)truncated.push(gateway);sources.push({gateway,label:'Stripe',configured:true,fetched:r.items.length});}
      if(gateway==='phonepe'){const r=await fetchPhonePeSubscriptions(env,local);for(const x of r.items)rows.push(normalizePhonePe(x,local[x.id]||{},paidMap[x.id]||0,phonePeNext[x.id]||0));if(r.truncated)truncated.push(gateway);sources.push({gateway,label:'PhonePe',configured:true,fetched:r.items.length});}
    }catch(e){sources.push({gateway,label:gatewayLabel(gateway),configured:true,fetched:0,error:clean(e.message,300)});}
  }
  // If a gateway is enabled but no global live endpoint returned a known local
  // subscription, keep the local record visible instead of making the dashboard
  // look empty. This is especially useful while configuring/testing webhooks.
  const seen=new Set(rows.map(r=>r.subscription_id));
  for(const l of Object.values(local))if(!seen.has(l.subscription_id)&&availability.participating.includes(l.gateway)){
    const base={id:l.subscription_id,status:l.subscriber_status||'created',created_at:Math.floor(Date.parse(l.order_created_at||'')/1000)||0,total_count:l.total_count,paid_count:paidMap[l.subscription_id]||0,remaining_count:Math.max(0,num(l.total_count)-(paidMap[l.subscription_id]||0))};
    rows.push(l.gateway==='razorpay'?normalizeRazorpay(base,l):l.gateway==='stripe'?normalizeStripe({...base,items:{data:[]}},l,paidMap[l.subscription_id]||0):normalizePhonePe({id:l.subscription_id,data:{state:base.status}},l,paidMap[l.subscription_id]||0,phonePeNext[l.subscription_id]||0));
  }
  for(const r of rows){const m=methodMap[r.subscription_id],bill=billMap[r.subscription_id]||{},receipt=receiptMap[r.subscription_id]||null;r.plan_amount_paise=num(r.amount_paise);r.actual_amount_known=1;if(m){r.payment_method=r.payment_method||m.payment_method;r.payment_method_label=r.payment_method_label||m.payment_method_label;r.upi_id=r.upi_id||m.upi_id||'';}if(bill.payment_method){r.payment_method=r.payment_method||bill.payment_method;r.payment_method_label=r.payment_method_label||bill.payment_method_label;r.upi_id=r.upi_id||bill.upi_id||'';}r.previous_bill_at=Number(receipt?.paid_at_epoch||bill.at||0);r.previous_bill_amount_paise=num(receipt?.amount_paise||bill.amount_paise||0);r.transaction_id=clean(receipt?.transaction_id||r.transaction_id||bill.transaction_id||'',180);if(receipt){r.amount_paise=num(receipt.amount_paise);r.payment_method=r.payment_method||clean(receipt.payment_method,80);r.payment_method_label=r.payment_method_label||paymentMethodLabel(receipt.payment_method);r.upi_id=r.upi_id||clean(receipt.upi_id,180);}else r.amount_paise=0;}
  // V16.72: cards/live snapshot is read-only with respect to CRM identity.
  // Exact identity merge remains available when an admin explicitly opens a detailed list,
  // but a background dashboard refresh must not rewrite candidate rows for every subscription.
  return {rows,local,availability,sources,truncated};
}

async function fetchRazorpayInvoiceEvents(env,rows,from,to){
  const out=[],eligible=rows.filter(r=>r.gateway==='razorpay'&&r.subscription_id).slice(0,MAX_RAZORPAY_INVOICE_SUBS);
  for(let i=0;i<eligible.length;i+=5){const batch=eligible.slice(i,i+5);const got=await Promise.all(batch.map(async r=>{try{return {r,data:await razorpayApi(env,`/invoices?subscription_id=${encodeURIComponent(r.subscription_id)}`,{method:'GET'})}}catch(_){return {r,data:{items:[]}}}}));for(const {r,data} of got){const paid=(data.items||[]).filter(x=>String(x.status||'').toLowerCase()==='paid'||num(x.amount_paid)>0).sort((a,b)=>num(a.paid_at||a.issued_at)-num(b.paid_at||b.issued_at));const latest=paid[paid.length-1];if(latest){r.previous_bill_at=num(latest.paid_at||latest.issued_at)||num(r.previous_bill_at);r.previous_bill_amount_paise=num(latest.amount_paid||latest.amount)||num(r.previous_bill_amount_paise);r.transaction_id=clean(latest.payment_id||r.transaction_id||'',180);if(!num(r.amount_paise)&&r.previous_bill_amount_paise)r.amount_paise=r.previous_bill_amount_paise;}paid.forEach((inv,idx)=>{const d=inrDate(inv.paid_at||inv.issued_at);if(within(d,from,to))out.push({...r,date:d,amount_paise:num(inv.amount_paid||inv.amount),previous_bill_amount_paise:num(inv.amount_paid||inv.amount),previous_bill_at:num(inv.paid_at||inv.issued_at),transaction_id:clean(inv.payment_id||inv.id,180),reason:'Payment received',isRenewal:idx>0,event_type:'invoice.paid'});});}}
  return out;
}
async function fetchStripeInvoiceEvents(env,rows,from,to){
  if(!rows.some(r=>r.gateway==='stripe'))return[];const out=[],gte=dateToEpoch(from),lte=dateToEpoch(to,true);let starting='';for(let page=0;page<5;page++){const q=new URLSearchParams({status:'paid',limit:'100'});q.set('created[gte]',String(gte));q.set('created[lte]',String(lte));if(starting)q.set('starting_after',starting);let data;try{data=await stripeApi(env,`/invoices?${q.toString()}`,{method:'GET'});}catch(_){break;}const batch=data.data||[];for(const inv of batch){const sid=typeof inv.subscription==='string'?inv.subscription:inv.parent?.subscription_details?.subscription||'';if(!sid)continue;const r=rows.find(x=>x.subscription_id===sid)||{subscription_id:sid,gateway:'stripe',gateway_label:'Stripe',name:'Subscriber',plan_name:'Membership'};const d=inrDate(inv.status_transitions?.paid_at||inv.created);out.push({...r,date:d,amount_paise:num(inv.amount_paid||inv.amount_due),transaction_id:clean(inv.payment_intent||inv.id,180),reason:'Payment received',isRenewal:clean(inv.billing_reason,80)!=='subscription_create',event_type:'invoice.paid'});}if(!data.has_more||!batch.length)break;starting=batch[batch.length-1].id;}return out;
}

async function historicalActivity(env,snap,from,to){
  const localEvents=await loadEvents(env,from,to,snap.local);
  const [rzInvoices,stInvoices]=await Promise.all([snap.availability.participating.includes('razorpay')?fetchRazorpayInvoiceEvents(env,snap.rows,from,to):[],snap.availability.participating.includes('stripe')?fetchStripeInvoiceEvents(env,snap.rows,from,to):[]]);
  const success=[],failed=[],cancelled=[],seen=new Set();
  function add(arr,row,key){const k=key||`${row.gateway}|${row.subscription_id}|${row.transaction_id||''}|${row.date}|${row.event_type||''}`;if(seen.has(k))return;seen.add(k);arr.push(row);}
  for(const x of [...rzInvoices,...stInvoices])add(success,x);
  for(const x of localEvents){const l=snap.rows.find(r=>r.subscription_id===x.subscription_id)||{};const row={...l,gateway:x.gateway,gateway_label:x.gateway_label,subscription_id:x.subscription_id,date:x.date,previous_bill_at:x.created_at_epoch||l.previous_bill_at||0,amount_paise:x.amount_paise||l.amount_paise||0,transaction_id:x.transaction_id,reason:x.reason,event_type:x.event_type,isRenewal:x.isRenewal};if(x.isSuccess)add(success,row);if(x.isFailed)add(failed,{...row,status:'failed',status_label:'Failed'});if(x.isCancelled)add(cancelled,{...row,status:'cancelled',status_label:'Cancelled'});}
  return {success,failed,cancelled};
}

async function enrichListPaymentDetails(env,rows){
  const needsDetail=r=>{
    if(!r||!r.subscription_id)return false;
    const method=String(r.payment_method||r.payment_method_label||'').toLowerCase();
    if(r.gateway==='razorpay')return !r.previous_bill_at||!r.previous_bill_amount_paise||!r.payment_method||(method.includes('upi')&&!r.upi_id)||!r.gateway_phone||!r.gateway_email;
    if(r.gateway==='stripe')return !r.payment_method;
    return false;
  };
  const targets=(rows||[]).filter(needsDetail).slice(0,MAX_LIST_PAYMENT_DETAIL_ENRICH);
  for(const r of targets){
    try{
      if(r.gateway==='razorpay'){
        let payment={},payId=String(r.transaction_id||''),latest=null;
        // Razorpay's subscription-invoice endpoint accepts subscription_id. Do not
        // add unsupported pagination arguments here; older code did so and could
        // prevent the payment lookup needed for UPI/contact/bill details.
        if(!payId.startsWith('pay_')||!r.previous_bill_at||!r.previous_bill_amount_paise){
          const inv=await razorpayApi(env,`/invoices?subscription_id=${encodeURIComponent(r.subscription_id)}`,{method:'GET'}).catch(()=>({items:[]}));
          const paid=(inv.items||[]).filter(x=>x.payment_id&&(String(x.status||'').toLowerCase()==='paid'||num(x.amount_paid)>0)).sort((a,b)=>num(b.paid_at||b.issued_at||b.date)-num(a.paid_at||a.issued_at||a.date));
          latest=paid[0]||null;
        }
        if(latest){
          payId=String(latest.payment_id||payId||'');
          r.transaction_id=r.transaction_id||payId;
          r.previous_bill_at=num(latest.paid_at||latest.issued_at||latest.date)||num(r.previous_bill_at);
          r.previous_bill_amount_paise=num(latest.amount_paid||latest.amount)||num(r.previous_bill_amount_paise);
          if(!num(r.amount_paise)&&r.previous_bill_amount_paise)r.amount_paise=r.previous_bill_amount_paise;
          const cd=latest.customer_details||{};
          if(cd.contact)r.gateway_phone=clean(cd.contact,30);
          if(cd.email)r.gateway_email=clean(cd.email,220);
          if(cd.name)r.gateway_name=clean(cd.name,180);
        }
        if(payId.startsWith('pay_'))payment=await razorpayApi(env,`/payments/${encodeURIComponent(payId)}`,{method:'GET'}).catch(()=>({}));
        const pm=razorpayPaymentDetails(payment);if(pm.payment_method)Object.assign(r,pm);
        if(payment?.amount&&!r.previous_bill_amount_paise)r.previous_bill_amount_paise=num(payment.amount);
        if(payment?.created_at&&!r.previous_bill_at)r.previous_bill_at=num(payment.created_at);
        if(payment?.contact)r.gateway_phone=clean(payment.contact,30);
        if(payment?.email)r.gateway_email=clean(payment.email,220);
        const merged=await mergeGatewayIdentity(env,{name:r.gateway_name||r.name,phone:r.gateway_phone||r.phone,email:r.gateway_email||r.email,gateway:'razorpay',subscription_id:r.subscription_id,payment_id:payId,order_id:r.order_id}).catch(()=>null);
        if(merged?.lead?.id){r.client_ref=`lead:${merged.lead.id}`;r.name=clean(merged.lead.name||r.name,180);r.phone=clean(merged.lead.phone||r.phone,30);r.email=clean(merged.lead.email||r.email,220);}
      }else if(r.gateway==='stripe'){
        const tx=String(r.transaction_id||'');let remote={};
        if(tx.startsWith('pi_'))remote=await stripeApi(env,`/payment_intents/${encodeURIComponent(tx)}?expand[]=latest_charge`,{method:'GET'}).catch(()=>({}));
        else if(tx.startsWith('ch_'))remote={latest_charge:await stripeApi(env,`/charges/${encodeURIComponent(tx)}`,{method:'GET'}).catch(()=>({}))};
        const pm=stripePaymentDetails(remote);if(pm.payment_method)Object.assign(r,pm);
      }
    }catch(_){/* detail enrichment is informational and must never break the subscription list */}
  }
  return rows;
}

async function persistOverviewListDetails(env,rows){
  const list=(rows||[]).filter(r=>r?.gateway&&r?.subscription_id),previous={};
  for(const gateway of [...new Set(list.map(r=>clean(r.gateway,20).toLowerCase()).filter(Boolean))]){
    const q=await env.DB.prepare('SELECT subscription_id,row_json,status,created_at_epoch,ended_at_epoch,charge_at_epoch FROM subscription_overview_cache WHERE gateway=?').bind(gateway).all().catch(()=>({results:[]}));
    for(const x of q.results||[])previous[`${gateway}|${clean(x.subscription_id,180)}`]={row:safeJson(x.row_json,{}),raw:x};
  }
  const stmts=[];
  for(const r of list){
    const gateway=clean(r.gateway,20).toLowerCase(),sid=clean(r.subscription_id,180),prior=previous[`${gateway}|${sid}`]||{row:{},raw:{}},safe=mergeCachedSnapshotRow(prior.row,publicRow(r));
    const jsonText=JSON.stringify(safe),status=clean(safe.status,40),created=num(safe.created_at),ended=num(safe.ended_at),charge=num(safe.charge_at),raw=prior.raw||{};
    if(String(raw.row_json||'')===jsonText&&clean(raw.status,40)===status&&num(raw.created_at_epoch)===created&&num(raw.ended_at_epoch)===ended&&num(raw.charge_at_epoch)===charge)continue;
    stmts.push(env.DB.prepare(`UPDATE subscription_overview_cache SET row_json=?,status=?,created_at_epoch=?,ended_at_epoch=?,charge_at_epoch=?,last_refreshed_at=CURRENT_TIMESTAMP WHERE gateway=? AND subscription_id=?`)
      .bind(jsonText,status,created,ended,charge,gateway,sid));
  }
  if(stmts.length)await d1Batch(env,stmts);
}
async function persistOverviewActivityDetails(env,rows,filter){
  const activityType=filter==='renewed'?'successful':clean(filter,30);
  if(!['successful','failed','cancelled'].includes(activityType))return;
  const list=(rows||[]).filter(r=>r?.gateway&&r?.subscription_id),previous={},keyBySignature={};
  for(const gateway of [...new Set(list.map(r=>clean(r.gateway,20).toLowerCase()).filter(Boolean))]){
    const dates=list.filter(r=>clean(r.gateway,20).toLowerCase()===gateway).map(r=>clean(r.date,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if(!dates.length)continue;
    const q=await env.DB.prepare('SELECT activity_key,row_json FROM subscription_overview_activity_cache WHERE gateway=? AND event_date BETWEEN ? AND ?').bind(gateway,dates[0],dates[dates.length-1]).all().catch(()=>({results:[]}));
    for(const x of q.results||[]){const key=clean(x.activity_key,900),row=safeJson(x.row_json,{});previous[key]={row,row_json:String(x.row_json||'')};keyBySignature[cacheActivitySignature(activityType,row)]=key;}
  }
  const stmts=[];
  for(const r of list){
    const generatedKey=cacheActivityKey(activityType,r),targetKey=previous[generatedKey]?generatedKey:(keyBySignature[cacheActivitySignature(activityType,r)]||generatedKey),prior=previous[targetKey],safe=mergeCachedSnapshotRow(prior?.row||{},publicRow(r)),jsonText=JSON.stringify(safe);
    if(prior&&prior.row_json===jsonText)continue;
    stmts.push(env.DB.prepare('UPDATE subscription_overview_activity_cache SET row_json=?,last_refreshed_at=CURRENT_TIMESTAMP WHERE activity_key=?').bind(jsonText,targetKey));
  }
  if(stmts.length)await d1Batch(env,stmts);
}

function listSort(type,rows){const copy=[...rows];if(type==='upcoming')return copy.sort((a,b)=>num(a.charge_at)-num(b.charge_at));if(type==='failed'||type==='cancelled'||type==='successful'||type==='renewed')return copy.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));return copy.sort((a,b)=>num(b.created_at)-num(a.created_at));}
function assembleData(snap,act,range){
  const fromE=dateToEpoch(range.from),toE=dateToEpoch(range.to,true),now=Math.floor(Date.now()/1000),next30=now+30*DAY;
  const overlapping=r=>num(r.created_at)<=toE&&(!num(r.ended_at)||num(r.ended_at)>=fromE);
  const total=snap.rows.filter(overlapping);
  const active=total.filter(r=>['active','authenticated','trialing'].includes(r.status));
  const fresh=snap.rows.filter(r=>within(inrDate(r.created_at),range.from,range.to));
  const upcoming=snap.rows.filter(r=>num(r.charge_at)>=now&&num(r.charge_at)<=next30&&['active','authenticated','trialing','created'].includes(r.status));
  const cancelled=[...(act.cancelled||[])];
  for(const r of snap.rows.filter(x=>['cancelled','canceled','revoked'].includes(x.status))){const d=inrDate(r.ended_at||r.current_end||r.created_at);if(within(d,range.from,range.to)&&!cancelled.some(x=>x.subscription_id===r.subscription_id&&x.date===d))cancelled.push({...r,date:d,reason:'Subscription cancelled'});}
  const failed=[...(act.failed||[])];
  for(const r of snap.rows.filter(x=>['pending','halted','past_due','unpaid','incomplete'].includes(x.status))){const d=inrDate(r.current_end||r.created_at);if(within(d,range.from,range.to)&&!failed.some(x=>x.subscription_id===r.subscription_id&&x.date===d))failed.push({...r,date:d,reason:r.reason||'Payment needs attention'});}
  const successful=act.success||[],renewed=successful.filter(x=>x.isRenewal);
  const groups={total,active,successful,new:fresh,renewed,upcoming,failed,cancelled};
  const cards=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]));
  const configured=snap.availability.participating.length>0;
  return {...range,cards,groups,sources:snap.sources,configured,truncated:snap.truncated||[],primary_gateway:snap.availability.primary,enabled_gateways:snap.availability.participating,_snapshot:snap};
}
function publicRow(r){return {...r,raw:undefined};}
function mergeCachedSnapshotRow(previous={},fresh={}){
  // A fast cards refresh does not always request payment/invoice detail again.
  // Preserve detail that was already learned by a previous list refresh while
  // allowing live lifecycle/status fields from the fresh gateway snapshot to win.
  const out={...previous,...fresh};
  const keepText=['payment_method','payment_method_label','transaction_id','gateway_name','gateway_phone','gateway_email','client_ref','name','phone','email','plan_name','offer_name','order_id'];
  for(const key of keepText)if(!clean(fresh[key],500)&&clean(previous[key],500))out[key]=previous[key];
  const keepPositive=['previous_bill_at','previous_bill_amount_paise','next_charge_at','charge_at','next_charge_amount_paise','paid_count','total_count','billing_months','auth_attempts','created_at','plan_amount_paise'];
  for(const key of keepPositive)if(num(fresh[key])<=0&&num(previous[key])>0)out[key]=previous[key];
  if(Number(fresh.actual_amount_known||0)===1){out.amount_paise=num(fresh.amount_paise);out.actual_amount_known=1;}
  else if(num(fresh.amount_paise)<=0&&num(previous.amount_paise)>0)out.amount_paise=previous.amount_paise;
  const method=clean(out.payment_method||out.payment_method_label,80).toLowerCase();
  if(method.includes('upi'))out.upi_id=clean(fresh.upi_id,180)||clean(previous.upi_id,180)||'';
  else out.upi_id=clean(fresh.upi_id,180)||'';
  const total=num(out.total_count),paid=num(out.paid_count);
  if(total>0)out.remaining_count=Math.max(0,total-paid);
  return out;
}
async function d1Batch(env,statements){
  for(let i=0;i<statements.length;i+=MAX_D1_BATCH)await env.DB.batch(statements.slice(i,i+MAX_D1_BATCH));
}
function cacheActivityKey(type,r){return [type,clean(r.gateway,20).toLowerCase(),clean(r.subscription_id,180),clean(r.transaction_id,180),clean(r.date,10),clean(r.event_type,120),r.isRenewal?'1':'0'].join('|').slice(0,900);}
function cacheActivitySignature(type,r){return [type,clean(r.gateway,20).toLowerCase(),clean(r.subscription_id,180),clean(r.date,10),clean(r.event_type,120),r.isRenewal?'1':'0'].join('|').slice(0,700);}
async function saveOverviewCache(env,data){
  const snap=data._snapshot;if(!snap)return;
  const okGateways=(snap.sources||[]).filter(x=>!x.error).map(x=>x.gateway).filter(Boolean);
  for(const gateway of okGateways){
    const rows=(snap.rows||[]).filter(r=>r.gateway===gateway),stmts=[];
    const previousRows=(await env.DB.prepare('SELECT subscription_id,status,created_at_epoch,ended_at_epoch,charge_at_epoch,row_json,refresh_token FROM subscription_overview_cache WHERE gateway=?').bind(gateway).all().catch(()=>({results:[]}))).results||[];
    const previousById=Object.fromEntries(previousRows.map(x=>[clean(x.subscription_id,180),x]));
    const currentIds=new Set();
    for(const r of rows){
      const sid=clean(r.subscription_id,180);if(!sid)continue;currentIds.add(sid);
      const priorRaw=previousById[sid]||{},safe=mergeCachedSnapshotRow(safeJson(priorRaw.row_json,{}),publicRow(r)),jsonText=JSON.stringify(safe),status=clean(safe.status,40),created=num(safe.created_at),ended=num(safe.ended_at),charge=num(safe.charge_at);
      const unchanged=!!priorRaw.subscription_id&&String(priorRaw.row_json||'')===jsonText&&clean(priorRaw.status,40)===status&&num(priorRaw.created_at_epoch)===created&&num(priorRaw.ended_at_epoch)===ended&&num(priorRaw.charge_at_epoch)===charge;
      if(unchanged)continue;
      const token=clean(priorRaw.refresh_token,120)||'v16.72';
      stmts.push(env.DB.prepare(`INSERT INTO subscription_overview_cache(gateway,subscription_id,status,created_at_epoch,ended_at_epoch,charge_at_epoch,row_json,refresh_token,last_refreshed_at)
        VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(gateway,subscription_id) DO UPDATE SET status=excluded.status,created_at_epoch=excluded.created_at_epoch,ended_at_epoch=excluded.ended_at_epoch,charge_at_epoch=excluded.charge_at_epoch,row_json=excluded.row_json,refresh_token=excluded.refresh_token,last_refreshed_at=CURRENT_TIMESTAMP`)
        .bind(gateway,sid,status,created,ended,charge,jsonText,token));
    }
    if(!(data.truncated||[]).includes(gateway)){
      for(const x of previousRows){const sid=clean(x.subscription_id,180);if(sid&&!currentIds.has(sid))stmts.push(env.DB.prepare('DELETE FROM subscription_overview_cache WHERE gateway=? AND subscription_id=?').bind(gateway,sid));}
    }
    if(stmts.length)await d1Batch(env,stmts);

    // V16.72: diff activity rows instead of DELETE + reinsert on every background refresh.
    const previousActivityRows=(await env.DB.prepare(`SELECT activity_key,activity_type,event_date,event_epoch,subscription_id,row_json FROM subscription_overview_activity_cache WHERE gateway=? AND event_date BETWEEN ? AND ?`).bind(gateway,data.from,data.to).all().catch(()=>({results:[]}))).results||[];
    const previousActivityByKey={},previousActivityKeyBySignature={};
    for(const x of previousActivityRows){
      const key=clean(x.activity_key,900),type=clean(x.activity_type,30),row=safeJson(x.row_json,{});
      previousActivityByKey[key]={...x,row,row_json:String(x.row_json||'')};
      previousActivityKeyBySignature[cacheActivitySignature(type,row)]=key;
    }
    const activity=[];
    for(const [type,rowsForType] of [['successful',data.groups.successful||[]],['failed',data.groups.failed||[]],['cancelled',data.groups.cancelled||[]]]){
      for(const r of rowsForType)if(r.gateway===gateway&&within(clean(r.date,10),data.from,data.to))activity.push({type,r});
    }
    const currentActivityKeys=new Set(),aStmts=[];
    for(const {type,r} of activity){
      const key=cacheActivityKey(type,r);currentActivityKeys.add(key);
      const priorKey=previousActivityByKey[key]?key:(previousActivityKeyBySignature[cacheActivitySignature(type,r)]||''),prior=priorKey?previousActivityByKey[priorKey]:null,safe=mergeCachedSnapshotRow(prior?.row||{},publicRow(r)),jsonText=JSON.stringify(safe),eventDate=clean(r.date,10),eventEpoch=num(r.created_at_epoch||r.previous_bill_at)||dateToEpoch(eventDate||data.from),sid=clean(r.subscription_id,180);
      if(priorKey===key&&prior&&prior.row_json===jsonText&&clean(prior.activity_type,30)===type&&clean(prior.event_date,10)===eventDate&&num(prior.event_epoch)===eventEpoch&&clean(prior.subscription_id,180)===sid)continue;
      aStmts.push(env.DB.prepare(`INSERT INTO subscription_overview_activity_cache(activity_key,gateway,subscription_id,activity_type,event_date,event_epoch,row_json,last_refreshed_at)
        VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(activity_key) DO UPDATE SET gateway=excluded.gateway,subscription_id=excluded.subscription_id,activity_type=excluded.activity_type,event_date=excluded.event_date,event_epoch=excluded.event_epoch,row_json=excluded.row_json,last_refreshed_at=CURRENT_TIMESTAMP`)
        .bind(key,gateway,sid,type,eventDate,eventEpoch,jsonText));
    }
    for(const x of previousActivityRows){const key=clean(x.activity_key,900);if(key&&!currentActivityKeys.has(key))aStmts.push(env.DB.prepare('DELETE FROM subscription_overview_activity_cache WHERE activity_key=?').bind(key));}
    if(aStmts.length)await d1Batch(env,aStmts);
  }
}

async function buildData(env,range){
  const snap=await liveSnapshot(env),act=await historicalActivity(env,snap,range.from,range.to),data=assembleData(snap,act,range);
  await saveOverviewCache(env,data).catch(()=>{});
  return data;
}
async function buildCachedData(env,range){
  const availability=await getGatewayAvailability(env),gateways=availability.participating||[],rows=[],sources=[],act={success:[],failed:[],cancelled:[]};
  let lastRefreshed='';
  if(gateways.length){
    const ph=gateways.map(()=>'?').join(','),snapQ=await env.DB.prepare(`SELECT gateway,row_json,last_refreshed_at FROM subscription_overview_cache WHERE gateway IN (${ph})`).bind(...gateways).all().catch(()=>({results:[]}));
    for(const x of snapQ.results||[]){const r=safeJson(x.row_json,null);if(r&&r.subscription_id){rows.push(r);if(String(x.last_refreshed_at||'')>lastRefreshed)lastRefreshed=String(x.last_refreshed_at||'');}}
    const actQ=await env.DB.prepare(`SELECT activity_type,row_json,last_refreshed_at FROM subscription_overview_activity_cache WHERE gateway IN (${ph}) AND event_date BETWEEN ? AND ?`).bind(...gateways,range.from,range.to).all().catch(()=>({results:[]}));
    for(const x of actQ.results||[]){const r=safeJson(x.row_json,null);if(!r)continue;if(x.activity_type==='successful')act.success.push(r);else if(x.activity_type==='failed')act.failed.push(r);else if(x.activity_type==='cancelled')act.cancelled.push(r);if(String(x.last_refreshed_at||'')>lastRefreshed)lastRefreshed=String(x.last_refreshed_at||'');}
    for(const g of gateways)sources.push({gateway:g,label:gatewayLabel(g),configured:true,cached:true,fetched:rows.filter(r=>r.gateway===g).length});
  }
  const snap={rows,local:{},availability,sources,truncated:[]},data=assembleData(snap,act,range);
  data.cache_only=true;data.cache_has_data=rows.length>0||act.success.length>0||act.failed.length>0||act.cancelled.length>0;data.cache_last_refreshed_at=lastRefreshed;
  return data;
}
function sourceMessage(data){
  if(!data.configured)return 'Live subscription information will appear here after a Payment Gateway is enabled in Payments.';
  const ok=(data.sources||[]).filter(x=>!x.error).map(x=>x.label),bad=(data.sources||[]).filter(x=>x.error);
  if(data.cache_only){let s=data.cache_has_data?`Saved Subscription Overview data from ${ok.length?ok.join(' + '):'the enabled Payment Gateway'} is shown immediately while a live refresh is prepared.`:'No saved Subscription Overview data is available yet. The enabled Payment Gateway can now be refreshed.';if(data.cache_last_refreshed_at)s+=` Last saved refresh: ${data.cache_last_refreshed_at}.`;return s;}
  let s=`Live subscription information was fetched from ${ok.length?ok.join(' + '):'the enabled Payment Gateway'} for ${data.from} to ${data.to}.`;
  if(bad.length)s+=` ${bad.map(x=>`${x.label} could not be refreshed: ${x.error}`).join(' ')}`;
  return s;
}
function dailyAnalytics(data){
  const dates=rangeDates(data.from,data.to),daily=Object.fromEntries(dates.map(d=>[d,{date:d,new:0,successful:0,renewed:0,failed:0,cancelled:0,amount_paise:0}])),details={};
  const add=(d,t,row)=>{if(!daily[d])return;daily[d][t]++;if(t==='successful')daily[d].amount_paise+=num(row.amount_paise);details[d]??={};details[d][t]??=[];details[d][t].push(publicRow(row));};
  for(const r of data.groups.new)add(inrDate(r.created_at),'new',r);
  for(const r of data.groups.successful)add(r.date,'successful',r);
  for(const r of data.groups.renewed)add(r.date,'renewed',r);
  for(const r of data.groups.failed)add(r.date,'failed',r);
  for(const r of data.groups.cancelled)add(r.date,'cancelled',r);
  const rows=dates.map(d=>daily[d]);const totals=rows.reduce((a,x)=>({new:a.new+x.new,successful:a.successful+x.successful,renewed:a.renewed+x.renewed,failed:a.failed+x.failed,cancelled:a.cancelled+x.cancelled,amount_paise:a.amount_paise+x.amount_paise}),{new:0,successful:0,renewed:0,failed:0,cancelled:0,amount_paise:0});
  return {rows,details,totals,average_amount_paise:rows.length?Math.round(totals.amount_paise/rows.length):0};
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const u=new URL(request.url),range=periodRange(u),mode=clean(u.searchParams.get('mode')||'cards',30),cacheOnly=u.searchParams.get('cache_only')==='1',data=cacheOnly?await buildCachedData(env,range):await buildData(env,range),base={configured:data.configured,cards:data.cards,from:data.from,to:data.to,period:data.period,sources:data.sources,enabled_gateways:data.enabled_gateways,primary_gateway:data.primary_gateway,truncated:data.truncated,source_message:sourceMessage(data),cache_only:!!data.cache_only,cache_has_data:!!data.cache_has_data,cache_last_refreshed_at:data.cache_last_refreshed_at||''};
    if(mode==='list'){const filter=clean(u.searchParams.get('filter')||'total',30),rows=listSort(filter,data.groups[filter]||data.groups.total);if(!cacheOnly){await enrichListPaymentDetails(env,rows);await syncGatewayIdentities(env,rows);if(['total','active','new','upcoming'].includes(filter))await persistOverviewListDetails(env,rows).catch(()=>{});if(['successful','renewed','failed','cancelled'].includes(filter))await persistOverviewActivityDetails(env,rows,filter).catch(()=>{});}return json({...base,filter,rows:rows.map(publicRow)});}
    if(mode==='analytics'){return json({...base,...dailyAnalytics(data)});}
    if(mode==='detail'){const type=clean(u.searchParams.get('type'),30),date=clean(u.searchParams.get('date'),10);const a=dailyAnalytics(data);return json({...base,type,date,rows:(a.details?.[date]?.[type]||[]).map(publicRow)});}
    return json(base);
  }catch(e){return json({error:e.message||'Could not load subscription information.'},500);}
}
