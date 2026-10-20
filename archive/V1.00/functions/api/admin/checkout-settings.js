import { json, readJson, requireAdmin, getCheckoutSettings, setSetting, rupeesToPaise } from '../../_lib/utils.js';
function clean(b={}){
  const productCouponsEnabled = !!b.productCouponsEnabled || b.couponsEnabled === true;
  const overallCouponsEnabled = !!b.overallCouponsEnabled;
  return {
    paymentMode:b.paymentMode==='one_time'?'one_time':'subscription',
    subscriptionYears:Math.max(1,Math.min(30,Number(b.subscriptionYears||21))),
    yearlyEnabled:!!b.yearlyEnabled,
    productCouponsEnabled,
    overallCouponsEnabled,
    couponsEnabled: productCouponsEnabled || overallCouponsEnabled,
    yearlyOfferMonths:Math.max(1,Math.min(12,Number(b.yearlyOfferMonths||10))),
    membershipDiscountEnabled:!!b.membershipDiscountEnabled,
    membershipDiscountPercent:Math.max(0,Math.min(100,Number(b.membershipDiscountPercent||0))),
    membershipDiscountCode:String(b.membershipDiscountCode||'').trim().toUpperCase().replace(/\s+/g,'-').slice(0,60),
    membershipDiscountNote:String(b.membershipDiscountNote||'Use this member benefit when adding another session.').trim().slice(0,300)
  };
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const settings=await getCheckoutSettings(env);
  const {results}=await env.DB.prepare('SELECT * FROM coupon_codes ORDER BY id DESC LIMIT 300').all();
  return json({settings,coupons:results||[]});
}
export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const b=await readJson(request);
  if(b.type==='settings'){
    const settings=clean(b);
    if(settings.membershipDiscountEnabled&&(!settings.membershipDiscountCode||settings.membershipDiscountPercent<1))return json({error:'Enter a membership coupon code and a discount percentage from 1 to 100.'},400);
    const previous=await getCheckoutSettings(env);
    await setSetting(env,'checkout_settings',settings);
    if(previous.membershipDiscountCode&&previous.membershipDiscountCode!==settings.membershipDiscountCode)await env.DB.prepare("UPDATE coupon_codes SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE code=? AND description='Authenticated member additional-session discount'").bind(previous.membershipDiscountCode).run().catch(()=>{});
    if(settings.membershipDiscountEnabled)await env.DB.prepare(`INSERT INTO coupon_codes(code,description,discount_type,discount_value,applies_to,product_slug,min_cart_paise,max_uses,member_limit,billing_scope,recurring_scope,status) VALUES(?,'Authenticated member additional-session discount','percent',?,'cart','',0,0,0,'both','first','active') ON CONFLICT(code) DO UPDATE SET description=excluded.description,discount_type='percent',discount_value=excluded.discount_value,applies_to='cart',product_slug='',billing_scope='both',recurring_scope='first',status='active',updated_at=CURRENT_TIMESTAMP`).bind(settings.membershipDiscountCode,settings.membershipDiscountPercent).run();
    else if(settings.membershipDiscountCode)await env.DB.prepare("UPDATE coupon_codes SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE code=? AND description='Authenticated member additional-session discount'").bind(settings.membershipDiscountCode).run().catch(()=>{});
    return json({ok:true,settings});
  }
  const code=String(b.code||'').trim().toUpperCase().replace(/\s+/g,'-');
  if(!code)return json({error:'Coupon code is required'},400);
  const discountType=['amount','percent','free_member'].includes(b.discount_type)?b.discount_type:'amount';
  const appliesTo=b.applies_to==='item'?'item':'cart';
  const params=[
    code,b.description||'',discountType,Number(b.discount_value||0),appliesTo,String(b.product_slug||'').trim(),
    rupeesToPaise(b.min_cart_rupees||0),Number(b.max_uses||0),Number(b.member_limit||0),
    ['monthly','yearly','both'].includes(b.billing_scope)?b.billing_scope:'both',
    ['first','all'].includes(b.recurring_scope)?b.recurring_scope:'first',
    b.starts_at||null,b.expires_at||null,b.status==='inactive'?'inactive':'active'
  ];
  if(b.id){
    await env.DB.prepare(`UPDATE coupon_codes SET code=?,description=?,discount_type=?,discount_value=?,applies_to=?,product_slug=?,min_cart_paise=?,max_uses=?,member_limit=?,billing_scope=?,recurring_scope=?,starts_at=?,expires_at=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...params,b.id).run();
    return json({ok:true,id:b.id});
  }
  const r=await env.DB.prepare(`INSERT INTO coupon_codes(code,description,discount_type,discount_value,applies_to,product_slug,min_cart_paise,max_uses,member_limit,billing_scope,recurring_scope,starts_at,expires_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...params).run();
  return json({ok:true,id:r.meta.last_row_id});
}
export async function onRequestDelete({request,env}){
  try{await requireAdmin(request,env)}catch(e){return json({error:e.message},401)}
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return json({error:'Coupon id required'},400);
  await env.DB.prepare('DELETE FROM coupon_codes WHERE id=?').bind(id).run();
  return json({ok:true});
}
