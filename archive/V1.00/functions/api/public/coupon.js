import { json, readJson, getCheckoutSettings, calculateCheckoutLine, applyCouponAmount } from '../../_lib/utils.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';
function err(c,amount,slug,billing,qty){
  if(!c||c.status!=='active')return'Coupon is not active';
  const now=new Date();
  if(c.starts_at&&new Date(c.starts_at)>now)return'Coupon is not active yet';
  if(c.expires_at&&new Date(c.expires_at)<now)return'Coupon has expired';
  if(c.max_uses&&c.used_count>=c.max_uses)return'Coupon usage limit is over';
  if(c.min_cart_paise&&amount<c.min_cart_paise)return'Cart value is too low for this coupon';
  if(c.product_slug&&c.product_slug!==slug)return'Coupon is not valid for this plan';
  if(c.billing_scope&&c.billing_scope!=='both'&&c.billing_scope!==billing)return'Coupon is not valid for this billing option';
  if(c.member_limit&&qty>c.member_limit)return`Coupon is valid up to ${c.member_limit} member(s)`;
  return'';
}
export async function onRequestPost({request,env}){
  const b=await readJson(request);
  const code=String(b.code||'').trim().toUpperCase();
  if(!code)return json({error:'Enter coupon code'},400);
  const settings=await getCheckoutSettings(env);
  const isMemberCode=!!settings.membershipDiscountEnabled&&code===String(settings.membershipDiscountCode||'').toUpperCase();
  if(isMemberCode){
    let account=null;try{account=await requirePortalAccount(request,env,['student']);}catch(_){return json({error:'Login to your active member account to use this member discount.'},403);}
    if(account.status!=='active')return json({error:'This member discount is available after your member account is approved.'},403);
    const membership=await env.DB.prepare("SELECT id FROM webinar_members WHERE lower(customer_email)=? AND status='current' LIMIT 1").bind(String(account.email||'').toLowerCase()).first();
    if(!membership)return json({error:'This discount is for active members adding another session.'},403);
  }
  if(b.applies_to==='item' && !settings.productCouponsEnabled && !isMemberCode) return json({error:'Plan coupon is not enabled for checkout'},400);
  if(b.applies_to==='cart' && !settings.overallCouponsEnabled && !isMemberCode) return json({error:'Overall coupon is not enabled for checkout'},400);
  const c=await env.DB.prepare('SELECT * FROM coupon_codes WHERE code=?').bind(code).first();
  if(!c)return json({error:'Invalid coupon code'},404);
  if(b.applies_to&&c.applies_to!==b.applies_to)return json({error:b.applies_to==='item'?'This coupon is not valid for this plan box':'This coupon is not valid for the full bill'},400);
  const product=b.product_id?await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(b.product_id).first():null;
  const calculation=product?calculateCheckoutLine(product,b.item||{},settings):null;
  const amount=Number(b.amount_paise||0)||Number(calculation?.subtotal||0);
  const billing=['monthly','yearly','both'].includes(b.billing_scope)?b.billing_scope:(calculation?.billingType||(Number(b.billing_months||b.item?.billing_months||1)===12?'yearly':'monthly'));
  const qty=Math.max(1,Number(b.quantity||b.item?.quantity||1));
  const slug=product?.slug||b.product_slug||'';
  const e=err(c,amount,slug,billing,qty);if(e)return json({error:e},400);
  const discount_paise=applyCouponAmount(c,amount,qty);
  const recurringScope=String(c.recurring_scope||'first')==='all'?'all':'first';
  return json({ok:true,coupon:c.code,discount_paise,recurring_scope:recurringScope,message:`Coupon applied${recurringScope==='first'?' to the first payment only':' to all subscription payments'}. Discount: ₹${Math.round(discount_paise/100)}`});
}
