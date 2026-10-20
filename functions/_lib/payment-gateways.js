import { getPaymentSettings, razorpayApi } from './utils.js';

const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0;};
let phonePeTokenCache={key:'',token:'',type:'O-Bearer',expiresAt:0};

export async function stripeApi(env,path,{method='GET',params=null}={}){
  const s=await getPaymentSettings(env);
  const key=env.STRIPE_SECRET_KEY||s.stripeSecretKey;
  if(!key)throw new Error('Stripe credentials not configured');
  const init={method,headers:{authorization:`Bearer ${key}`}};
  if(params&&method!=='GET'){
    const body=new URLSearchParams();
    Object.entries(params).forEach(([k,v])=>{
      if(v===undefined||v===null||v==='')return;
      if(Array.isArray(v))v.forEach(x=>body.append(k,String(x)));else body.append(k,String(v));
    });
    init.headers['content-type']='application/x-www-form-urlencoded';
    init.body=body.toString();
  }
  const res=await fetch(`https://api.stripe.com/v1${path}`,init);
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||'Stripe API failed');
  return data;
}

function phonePeBase(settings){
  return String(settings.phonepeEnvironment||'production').toLowerCase()==='sandbox'
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
    : 'https://api.phonepe.com/apis/pg';
}
function phonePeAuthUrl(settings){
  return String(settings.phonepeEnvironment||'production').toLowerCase()==='sandbox'
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
    : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
}
export async function phonePeToken(env){
  const s=await getPaymentSettings(env);
  const clientId=env.PHONEPE_CLIENT_ID||s.phonepeClientId;
  const clientSecret=env.PHONEPE_CLIENT_SECRET||s.phonepeClientSecret;
  const clientVersion=env.PHONEPE_CLIENT_VERSION||s.phonepeClientVersion||'1';
  if(!clientId||!clientSecret)throw new Error('PhonePe credentials not configured');
  const cacheKey=`${s.phonepeEnvironment||'production'}|${clientId}|${clientVersion}`;
  const now=Math.floor(Date.now()/1000);
  if(phonePeTokenCache.key===cacheKey&&phonePeTokenCache.token&&phonePeTokenCache.expiresAt>now+300)return phonePeTokenCache;
  const body=new URLSearchParams({client_id:clientId,client_version:String(clientVersion),client_secret:clientSecret,grant_type:'client_credentials'});
  const res=await fetch(phonePeAuthUrl(s),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.access_token)throw new Error(data?.message||data?.error_description||data?.error||'PhonePe authorization failed');
  phonePeTokenCache={key:cacheKey,token:data.access_token,type:data.token_type||'O-Bearer',expiresAt:num(data.expires_at)||now+3000};
  return phonePeTokenCache;
}
export async function phonePeApi(env,path,{method='GET',payload=null}={}){
  const s=await getPaymentSettings(env);const tok=await phonePeToken(env);
  const headers={'content-type':'application/json',authorization:`${tok.type||'O-Bearer'} ${tok.token}`};
  const merchantId=env.PHONEPE_MERCHANT_ID||s.phonepeMerchantId;
  if(merchantId)headers['X-MERCHANT-ID']=merchantId;
  const init={method,headers};if(payload!==null&&method!=='GET')init.body=JSON.stringify(payload);
  const res=await fetch(`${phonePeBase(s)}${path}`,init);
  if(res.status===204)return {ok:true,status:204};
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.message||data?.error?.message||data?.code||'PhonePe API failed');
  return data;
}
export async function phonePeSubscriptionStatus(env,merchantSubscriptionId){
  return phonePeApi(env,`/checkout/v2/subscriptions/${encodeURIComponent(merchantSubscriptionId)}/status`,{method:'GET'});
}
export async function cancelPhonePeSubscription(env,merchantSubscriptionId){
  return phonePeApi(env,`/checkout/v2/subscriptions/${encodeURIComponent(merchantSubscriptionId)}/cancel`,{method:'POST',payload:{}});
}

export async function phonePeNotifyRedemption(env,{merchantSubscriptionId,merchantOrderId,amountPaise,customer={},autoDebit=true,expireAt=null}={}){
  const subId=clean(merchantSubscriptionId,63).replace(/[^A-Za-z0-9_-]/g,'-');
  if(!subId)throw new Error('PhonePe merchant subscription ID is required for redemption notify.');
  const amount=Math.max(100,Math.round(Number(amountPaise||0)));
  const order=phonePeMerchantId(merchantOrderId||`UCR-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,'UCR');
  const payload={
    merchantOrderId:order,
    amount,
    customerDetails:{
      name:clean(customer.name,120),
      email:clean(customer.email,220),
      phoneNumber:clean(customer.phone,30)
    },
    expireAt:Number(expireAt)||Date.now()+(48*60*60*1000),
    paymentFlow:{
      type:'SUBSCRIPTION_CHECKOUT_REDEMPTION',
      merchantSubscriptionId:subId,
      redemptionRetryStrategy:'STANDARD',
      autoDebit:autoDebit!==false
    }
  };
  const data=await phonePeApi(env,'/checkout/v2/subscriptions/notify',{method:'POST',payload});
  return {merchantOrderId:order,...data};
}

export function phonePeFrequencyForMonths(months){
  const map={1:'MONTHLY',2:'BIMONTHLY',3:'QUARTERLY',6:'HALFYEARLY',12:'YEARLY'};
  // PhonePe documents ON_DEMAND as a supported recurring frequency. For custom
  // month intervals, DropBeat Dance Studio keeps its own billing-month schedule and the
  // redemption automation triggers the debit on the intended due date.
  return map[Math.max(1,Number(months||1))]||'ON_DEMAND';
}

export function gatewayLabel(g){return ({razorpay:'Razorpay',phonepe:'PhonePe',stripe:'Stripe'})[String(g||'').toLowerCase()]||clean(g,40)||'Payment Gateway';}

export async function getGatewayAvailability(env){
  const s=await getPaymentSettings(env);
  const configured={
    razorpay:!!((env.RAZORPAY_KEY_ID||s.razorpayKeyId)&&(env.RAZORPAY_KEY_SECRET||s.razorpayKeySecret)),
    phonepe:!!((env.PHONEPE_CLIENT_ID||s.phonepeClientId)&&(env.PHONEPE_CLIENT_SECRET||s.phonepeClientSecret)),
    stripe:!!(env.STRIPE_SECRET_KEY||s.stripeSecretKey)
  };
  let primary=clean(s.primaryGateway,20).toLowerCase();
  if(!['razorpay','phonepe','stripe'].includes(primary)){
    if(s.razorpayEnabled)primary='razorpay';else if(s.phonepeEnabled)primary='phonepe';else if(s.stripeEnabled)primary='stripe';else primary='';
  }
  const participating=[];
  if(primary&&configured[primary])participating.push(primary);
  // Preserve the requested priority whenever Razorpay is primary: Razorpay → PhonePe → Stripe.
  if(primary==='razorpay'){
    if(s.phonepeFallbackEnabled&&configured.phonepe)participating.push('phonepe');
    if(s.stripeFallbackEnabled&&configured.stripe)participating.push('stripe');
  }
  // Fallbacks are intentionally available only when Razorpay is the selected primary.
  // If PhonePe or Stripe is selected as primary, it operates as the only live checkout gateway.

  return {settings:s,configured,primary,participating:[...new Set(participating)]};
}

function phonePeMerchantId(value,prefix='UC'){
  const base=clean(value,80).replace(/[^A-Za-z0-9_-]/g,'-').slice(0,52)||`${prefix}-${Date.now()}`;
  return base.slice(0,63);
}
function absoluteUrl(origin,path){try{return new URL(path,origin).toString();}catch(_){return `${String(origin||'').replace(/\/$/,'')}${path}`;}}

async function createRazorpayCheckout(env,ctx){
  const {kind,orderId,amountPaise,currency='INR',customer={},description='DropBeat Dance Studio Membership',billingMonths=1,totalCount=1,setupAmountPaise=0,quantity=1,trial=null,initialCharge=null}=ctx;
  if(kind==='one_time'){
    const link=await razorpayApi(env,'/payment_links',{payload:{amount:amountPaise,currency,accept_partial:false,description:clean(description,250),customer:{name:clean(customer.name,120),contact:clean(customer.phone,30),email:clean(customer.email,220)},notify:{sms:false,email:!!customer.email},reminder_enable:false,expire_by:Math.floor(Date.now()/1000)+86400,callback_url:absoluteUrl(ctx.origin,`/payment-success?order=${encodeURIComponent(orderId)}`),callback_method:'get',notes:{order_id:orderId}}});
    return {gateway:'razorpay',gatewayOrderId:link.id||'',gatewaySubscriptionId:'',url:link.short_url||'',data:link};
  }
  const period=Number(billingMonths)%12===0?'yearly':'monthly';
  const interval=period==='yearly'?Math.max(1,Math.round(Number(billingMonths)/12)):Math.max(1,Number(billingMonths)||1);
  const plan=await razorpayApi(env,'/plans',{payload:{period,interval,item:{name:clean(description,120),amount:amountPaise,currency,description:clean(description,240)},notes:{order_id:orderId}}});
  const payload={
    plan_id:plan.id,
    total_count:Math.max(1,Number(totalCount||1)),
    quantity:Math.max(1,Number(quantity||1)),
    // We present Razorpay Standard Checkout ourselves so the checkout can reuse
    // the already-collected name, email and WhatsApp number without showing the
    // hosted Subscription Link contact form again.
    customer_notify:false,
    expire_by:Math.floor(Date.now()/1000)+86400,
    notes:{order_id:orderId,customer_name:clean(customer.name,120),customer_phone:clean(customer.phone,30),customer_email:clean(customer.email,220),product_name:clean(description,120)}
  };
  if(trial?.enabled){
    const startAt=Math.floor(Number(trial.startAt||0));
    if(startAt>Math.floor(Date.now()/1000)+300)payload.start_at=startAt;
    const trialAmount=Math.max(100,Number(trial.amountPaise||0));
    if(trialAmount>0)payload.addons=[{item:{name:'Trial / authentication amount',amount:trialAmount,currency}}];
  }else if(initialCharge?.enabled){
    const startAt=Math.floor(Number(initialCharge.startAt||0));
    if(startAt>Math.floor(Date.now()/1000)+300)payload.start_at=startAt;
    payload.addons=[{item:{name:clean(initialCharge.label||'First subscription payment',120),amount:Math.max(100,Number(initialCharge.amountPaise||0)),currency}}];
  }else if(setupAmountPaise>0)payload.addons=[{item:{name:'Setup / advance amount',amount:setupAmountPaise,currency}}];
  const sub=await razorpayApi(env,'/subscriptions',{payload});
  const localUrl=absoluteUrl(ctx.origin,`/payment?order=${encodeURIComponent(orderId)}&subscription=${encodeURIComponent(sub.id||'')}`);
  return {gateway:'razorpay',gatewayOrderId:'',gatewaySubscriptionId:sub.id||'',url:localUrl,data:{...sub,hosted_subscription_url:sub.short_url||'',urgent_casting_checkout_url:localUrl}};
}

async function createStripeCheckout(env,ctx){
  const {kind,orderId,amountPaise,currency='INR',customer={},description='DropBeat Dance Studio Membership',billingMonths=1,totalCount=1,setupAmountPaise=0,quantity=1,trial=null,initialCharge=null}=ctx;
  if(kind!=='subscription'){
    const params={
      'line_items[0][price_data][currency]':String(currency||'INR').toLowerCase(),
      'line_items[0][price_data][unit_amount]':amountPaise,
      'line_items[0][price_data][product_data][name]':clean(description,120),
      'line_items[0][quantity]':Math.max(1,Number(quantity||1)),
      'after_completion[type]':'redirect',
      'after_completion[redirect][url]':absoluteUrl(ctx.origin,`/payment-success?order=${encodeURIComponent(orderId)}`),
      'metadata[order_id]':orderId,
      'restrictions[completed_sessions][limit]':1
    };
    if(customer.email)params['customer_creation']='always';
    const link=await stripeApi(env,'/payment_links',{method:'POST',params});
    return {gateway:'stripe',gatewayOrderId:link.id||'',gatewaySubscriptionId:'',url:link.url||'',data:link};
  }

  const months=Math.max(1,Number(billingMonths||1));
  if(months>36)throw new Error(`Stripe does not support a ${months}-month recurring interval. The request can fall back to the next enabled gateway.`);

  // Create a Stripe Customer first. Passing that Customer into Checkout means a
  // known email is prefilled and locked by Stripe, avoiding a second customer
  // identity collection step wherever Stripe can reuse the saved information.
  const custParams={};
  if(customer.email)custParams.email=clean(customer.email,220);
  if(customer.name)custParams.name=clean(customer.name,120);
  if(customer.phone)custParams.phone=clean(customer.phone,30);
  custParams['metadata[order_id]']=orderId;
  const stripeCustomer=await stripeApi(env,'/customers',{method:'POST',params:custParams});

  const params={
    mode:'subscription',
    customer:stripeCustomer.id,
    client_reference_id:orderId,
    success_url:absoluteUrl(ctx.origin,`/payment-success?order=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`),
    cancel_url:absoluteUrl(ctx.origin,`/payment-failed?order=${encodeURIComponent(orderId)}&reason=${encodeURIComponent('Payment was cancelled before completion.')}`),
    expires_at:String(Math.floor(Date.now()/1000)+86340),
    submit_type:'subscribe',
    'line_items[0][price_data][currency]':String(currency||'INR').toLowerCase(),
    'line_items[0][price_data][unit_amount]':amountPaise,
    'line_items[0][price_data][product_data][name]':clean(description,120),
    'line_items[0][price_data][recurring][interval]':'month',
    'line_items[0][price_data][recurring][interval_count]':months,
    'line_items[0][quantity]':Math.max(1,Number(quantity||1)),
    'subscription_data[metadata][order_id]':orderId,
    'subscription_data[metadata][intended_total_count]':String(Math.max(1,Number(totalCount||1))),
    'subscription_data[metadata][intended_billing_months]':String(months),
    'metadata[order_id]':orderId,
    'metadata[intended_total_count]':String(Math.max(1,Number(totalCount||1))),
    'metadata[intended_billing_months]':String(months)
  };
  if(trial?.enabled){
    const startAt=Math.floor(Number(trial.startAt||0));
    const now=Math.floor(Date.now()/1000);
    if(startAt<=now+300)throw new Error('Stripe trial start date must be in the future.');
    if(startAt-now>730*86400)throw new Error('Stripe supports a maximum trial of 730 days. This trial can fall back to another enabled gateway.');
    params['subscription_data[trial_end]']=String(startAt);
    const trialAmount=Math.max(100,Number(trial.amountPaise||0));
    params['line_items[1][price_data][currency]']=String(currency||'INR').toLowerCase();
    params['line_items[1][price_data][unit_amount]']=trialAmount;
    params['line_items[1][price_data][product_data][name]']='Trial access charge today';
    params['line_items[1][quantity]']=1;
  }else if(initialCharge?.enabled){
    const startAt=Math.floor(Number(initialCharge.startAt||0)),now=Math.floor(Date.now()/1000);
    if(startAt<=now+300)throw new Error('The first renewal date must be in the future.');
    params['subscription_data[trial_end]']=String(startAt);
    params['line_items[1][price_data][currency]']=String(currency||'INR').toLowerCase();
    params['line_items[1][price_data][unit_amount]']=Math.max(100,Number(initialCharge.amountPaise||0));
    params['line_items[1][price_data][product_data][name]']=clean(initialCharge.label||'First subscription payment',120);
    params['line_items[1][quantity]']=1;
  }else if(setupAmountPaise>0){
    params['line_items[1][price_data][currency]']=String(currency||'INR').toLowerCase();
    params['line_items[1][price_data][unit_amount]']=setupAmountPaise;
    params['line_items[1][price_data][product_data][name]']='Setup / advance amount';
    params['line_items[1][quantity]']=1;
  }
  const session=await stripeApi(env,'/checkout/sessions',{method:'POST',params});
  return {gateway:'stripe',gatewayOrderId:session.id||'',gatewaySubscriptionId:'',url:session.url||'',data:{...session,customer_id:stripeCustomer.id}};
}

async function createPhonePeCheckout(env,ctx){
  const {kind,orderId,amountPaise,customer={},description='DropBeat Dance Studio Membership',billingMonths=1,totalCount=1,setupAmountPaise=0,quantity=1,trial=null,initialCharge=null}=ctx;
  const totalAmount=Math.max(100,Math.round(Number(amountPaise||0)*Math.max(1,Number(quantity||1))));
  // PhonePe separates the mandate's first debit (`amount`) from the maximum
  // recurring redemption (`maxAmount`). This keeps First Payment Only coupons
  // out of every later AutoPay debit.
  const firstDebitAmount=initialCharge?.enabled
    ? Math.max(100,Math.round(Number(initialCharge.amountPaise||0)))
    : totalAmount;
  const merchantOrderId=phonePeMerchantId(orderId,'UC');
  const common={merchantOrderId,amount:kind==='subscription'?firstDebitAmount:totalAmount,expireAfter:1200,metaInfo:{udf1:clean(orderId,256),udf2:clean(description,256),udf3:clean(customer.phone,256),udf4:String(Math.max(1,Number(totalCount||1))),udf5:String(Math.max(1,Number(billingMonths||1)))}};
  if(kind==='one_time'){
    const payload={...common,
      paymentFlow:{type:'PG_CHECKOUT',merchantUrls:{redirectUrl:absoluteUrl(ctx.origin,`/payment-success?order=${encodeURIComponent(orderId)}`)}},
      disablePaymentRetry:false
    };
    if(customer.name||customer.email||customer.phone)payload.customerDetails={name:clean(customer.name,120),email:clean(customer.email,220),phoneNumber:clean(customer.phone,30)};
    if(customer.phone)payload.prefillUserLoginDetails={phoneNumber:clean(customer.phone,30)};
    const data=await phonePeApi(env,'/checkout/v2/pay',{method:'POST',payload});
    // PhonePe's status/refund APIs are keyed by the merchantOrderId we sent,
    // so keep that stable in our gateway_order_id field. The PG-generated orderId
    // remains available inside the stored response/webhook payload.
    return {gateway:'phonepe',gatewayOrderId:merchantOrderId,gatewaySubscriptionId:'',url:data.redirectUrl||'',data};
  }
  if(trial?.enabled)throw new Error('This paid-trial configuration is not enabled for PhonePe AutoPay in this project. The checkout will use another enabled gateway that supports the trial without changing the offer.');
  if(Number(setupAmountPaise||0)>0)throw new Error('PhonePe AutoPay does not support this project’s separate setup/advance line item. The request can fall back to the next enabled gateway without dropping the setup charge.');
  const frequency=phonePeFrequencyForMonths(billingMonths);
  if(totalAmount>1500000)throw new Error('PhonePe AutoPay allows up to ₹15,000 per recurring billing cycle for this setup. Reduce the recurring amount or use another enabled gateway.');
  const merchantSubscriptionId=phonePeMerchantId(`${orderId}-${Date.now().toString(36)}`,'UCSUB');
  const months=Math.max(1,Number(billingMonths||1))*Math.max(1,Number(totalCount||1));
  if(months>360)throw new Error(`PhonePe subscriptions can expire up to 30 years. This plan is ${months} months. Reduce the billing cycles or use another enabled gateway.`);
  const expiry=new Date();expiry.setUTCMonth(expiry.getUTCMonth()+months);const expireAt=expiry.getTime();
  const data=await phonePeApi(env,'/checkout/v2/pay',{method:'POST',payload:{...common,paymentFlow:{type:'SUBSCRIPTION_CHECKOUT_SETUP',merchantUrls:{redirectUrl:absoluteUrl(ctx.origin,`/payment-success?order=${encodeURIComponent(orderId)}`)},subscriptionDetails:{subscriptionType:'RECURRING',merchantSubscriptionId,authWorkflowType:'TRANSACTION',amountType:'FIXED',maxAmount:totalAmount,frequency,productType:'UPI_MANDATE',expireAt:Math.round(expireAt)}}}});
  return {gateway:'phonepe',gatewayOrderId:merchantOrderId,gatewaySubscriptionId:merchantSubscriptionId,url:data.redirectUrl||'',data};
}

export async function createGatewayCheckout(env,ctx){
  if(ctx.gateway==='razorpay')return createRazorpayCheckout(env,ctx);
  if(ctx.gateway==='phonepe')return createPhonePeCheckout(env,ctx);
  if(ctx.gateway==='stripe')return createStripeCheckout(env,ctx);
  throw new Error('Unsupported payment gateway');
}

export async function createCheckoutWithFallback(env,ctx){
  const a=await getGatewayAvailability(env);const attempts=[];
  if(!a.participating.length)throw new Error('No enabled payment gateway is configured. Enable a primary Payment Gateway in Settings → Payments.');
  for(const gateway of a.participating){
    try{
      const result=await createGatewayCheckout(env,{...ctx,gateway});
      attempts.push({gateway,ok:true});
      return {...result,attempts,primaryGateway:a.primary,fallbackUsed:gateway!==a.primary};
    }catch(e){attempts.push({gateway,ok:false,error:clean(e?.message||e,500)});}
  }
  const err=new Error(`Payment link could not be created. ${attempts.map(x=>`${gatewayLabel(x.gateway)}: ${x.error||'failed'}`).join(' | ')}`);err.attempts=attempts;throw err;
}
