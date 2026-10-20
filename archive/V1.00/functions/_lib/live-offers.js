const clean=(v,n=6000)=>String(v??'').trim().slice(0,n);

function siteBase(env={}){
  const raw=clean(env.PUBLIC_SITE_URL||env.SITE_URL||env.APP_URL||'https://ironpulse-gym.pages.dev',1000);
  try{return new URL(raw).origin;}catch{return 'https://ironpulse-gym.pages.dev';}
}

export async function listAutomationOffers(env,{limit=100}={}){
  if(!env?.DB)return [];
  const rows=await env.DB.prepare(`SELECT id,name,slug,short_description,regular_price_paise,offer_price_paise,offer_price_enabled,currency,status,spot_limit,filling_fast_limit,low_spot_limit,payment_type,trial_enabled,trial_amount_paise,trial_value,trial_unit,billing_period,billing_interval
    FROM products WHERE status='active' ORDER BY sort_order,id DESC LIMIT ?`).bind(Math.max(1,Math.min(200,Number(limit||100)))).all().catch(()=>({results:[]}));
  return (rows.results||[]).map(x=>({...x,id:Number(x.id||0),regular_price_paise:Number(x.regular_price_paise||0),offer_price_paise:Number(x.offer_price_paise||0),offer_price_enabled:!!Number(x.offer_price_enabled??1),trial_enabled:!!Number(x.trial_enabled||0),trial_amount_paise:Number(x.trial_amount_paise||0),trial_value:Math.max(0,Number(x.trial_value||0)),spot_limit:Number(x.spot_limit||0),filling_fast_limit:Number(x.filling_fast_limit||0),low_spot_limit:Number(x.low_spot_limit||0)}));
}

export async function resolveLiveOffer(env,productId=0){
  const id=Number(productId||0);if(!id||!env?.DB)return null;
  const p=await env.DB.prepare(`SELECT p.id,p.name,p.slug,p.short_description,p.regular_price_paise,p.offer_price_paise,p.offer_price_enabled,p.currency,p.status,p.spot_limit,p.filling_fast_limit,p.low_spot_limit,p.payment_type,p.trial_enabled,p.trial_amount_paise,p.trial_value,p.trial_unit,p.billing_period,p.billing_interval,
    COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND lower(o.payment_status) IN ('paid','captured','active','successful','success')),0) sold_count
    FROM products p WHERE p.id=? AND p.status='active' LIMIT 1`).bind(id).first().catch(()=>null);
  if(!p)return null;
  const limit=Math.max(0,Number(p.spot_limit||0)),sold=Math.max(0,Number(p.sold_count||0)),left=limit>0?Math.max(0,limit-sold):null,fillAt=Math.max(0,Number(p.filling_fast_limit||0)),lowAt=Math.max(0,Number(p.low_spot_limit||0));
  let availability='Available';if(left===0)availability='Currently full';else if(left!==null&&lowAt>0&&left<=lowAt)availability=`Only ${left} spot${left===1?'':'s'} left`;else if(left!==null&&fillAt>0&&left<=fillAt)availability='Filling fast';
  const saleEnabled=Number(p.offer_price_enabled??1)===1&&Number(p.offer_price_paise||0)>0,regularPricePaise=Math.max(0,Number(p.regular_price_paise||0)),offerPricePaise=saleEnabled?Math.max(0,Number(p.offer_price_paise||0)):regularPricePaise,trialEnabled=Number(p.trial_enabled||0)===1&&clean(p.payment_type||'subscription',40)==='subscription'&&Number(p.trial_amount_paise||0)>0,trialAmountPaise=trialEnabled?Math.max(100,Number(p.trial_amount_paise||100)):0,pricePaise=trialEnabled?trialAmountPaise:offerPricePaise,currency=clean(p.currency||'INR',8).toUpperCase(),symbol=currency==='INR'?'₹':`${currency} `,money=value=>`${symbol}${(Number(value||0)/100).toLocaleString('en-IN',{minimumFractionDigits:Number(value||0)%100?2:0,maximumFractionDigits:2})}`,trialValue=Math.max(1,Number(p.trial_value||1)),trialUnit=clean(p.trial_unit||'days',30).replace(/s$/,'');
  return {id:Number(p.id),name:clean(p.name,240),slug:clean(p.slug,240),description:clean(p.short_description,1000),currency,regularPricePaise,regularPrice:money(regularPricePaise),offerEnabled:saleEnabled,offerPricePaise,offerPrice:money(offerPricePaise),trialEnabled,trialAmountPaise,trialPrice:trialEnabled?money(trialAmountPaise):'',trialValue,trialUnit,trialLabel:trialEnabled?`${trialValue} ${trialUnit}${trialValue===1?'':'s'}`:'',pricePaise,price:money(pricePaise),availability,spotLimit:limit,soldCount:sold,spotsLeft:left,full:left===0,url:`${siteBase(env)}/offer-details?plan=${encodeURIComponent(clean(p.slug,240))}`};
}

export function offerMessage(offer,prefix=''){
  if(!offer)return clean(prefix,6000);
  const prices=offer.trialEnabled?[`Regular price: ${offer.regularPrice}`,offer.offerEnabled?`Offer price: ${offer.offerPrice}`:'',`Try for just ${offer.trialPrice}${offer.trialLabel?` for ${offer.trialLabel}`:''}`]:[offer.offerEnabled?`Regular price: ${offer.regularPrice}`:'',`Price: ${offer.offerEnabled?offer.offerPrice:offer.regularPrice}`];
  return clean([prefix,offer.name,offer.description,...prices,offer.availability,offer.checkoutUrl||offer.url].filter(Boolean).join('\n'),6000);
}
