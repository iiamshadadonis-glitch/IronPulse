import { json, readJson, sha256Hex } from '../_lib/utils.js';
const clean=(v,n=600)=>String(v??'').trim().slice(0,n);
export async function onRequestPost({request,env}){
  const auth=request.headers.get('authorization')||'',token=auth.replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({error:'Your verification session is required. Please verify again.'},401);
  const tokenHash=await sha256Hex(token);
  const session=await env.DB.prepare("SELECT * FROM customer_sessions WHERE token_hash=? AND expires_at > CURRENT_TIMESTAMP").bind(tokenHash).first();
  if(!session)return json({error:'Your verification session has expired. Request a new OTP and try again.'},401);
  const b=await readJson(request),orderId=clean(b.order_id,120);
  if(!orderId)return json({error:'Choose the order that you want to retry.'},400);
  const key=String(session.phone||''),byEmail=key.startsWith('email:'),identity=byEmail?key.slice(6).toLowerCase():key;
  const where=byEmail?'lower(o.customer_email)=?':'o.customer_phone=?';
  const order=await env.DB.prepare(`SELECT o.*,c.city,c.preferred_role FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.order_id=? AND ${where} LIMIT 1`).bind(orderId,identity).first();
  if(!order)return json({error:'This order is not linked to the verified account.'},404);
  const rows=(await env.DB.prepare(`SELECT oi.product_id,oi.variant_id,oi.quantity,oi.billing_months,p.*,pv.id current_variant_id,pv.name current_variant_name,pv.billing_months current_billing_months,pv.regular_price_paise variant_regular_price_paise,pv.offer_price_paise variant_offer_price_paise
    FROM order_items oi JOIN products p ON p.id=oi.product_id LEFT JOIN product_variants pv ON pv.product_id=p.id AND pv.billing_months=oi.billing_months AND pv.status='active'
    WHERE oi.order_id=? ORDER BY oi.id`).bind(order.id).all()).results||[];
  const active=rows.filter(x=>String(x.status||'active').toLowerCase()==='active');
  if(!active.length)return json({error:'This plan is no longer available for online checkout. Please use Contact and the admin will help you choose the current option.'},409);
  const cart=active.map(p=>{
    const offerEnabled=Number(p.offer_price_enabled??1)!==0;
    const reg=Number(p.variant_regular_price_paise||p.regular_price_paise||0);
    const offer=offerEnabled?Number(p.variant_offer_price_paise||p.offer_price_paise||reg):reg;
    const variantId=p.current_variant_id||p.variant_id||null;
    const billing=Number(p.current_billing_months||p.billing_months||1);
    return {key:`${p.product_id}:${variantId||'default'}`,product_id:Number(p.product_id),variant_id:variantId?Number(variantId):null,name:p.name,variant_name:p.current_variant_name||(billing===12?'Yearly':'Monthly'),regular_price_paise:reg,catalog_offer_price_paise:Number(p.variant_offer_price_paise||p.offer_price_paise||reg),offer_price_enabled:offerEnabled?1:0,offer_price_paise:offer,billing_months:billing,quantity:Math.max(1,Number(p.quantity||1)),payment_type:p.payment_type||'subscription',trial_enabled:Number(p.trial_enabled||0),trial_amount_paise:Number(p.trial_amount_paise||0),trial_value:Number(p.trial_value||0),trial_unit:p.trial_unit||''};
  });
  return json({ok:true,cart,customer:{name:order.customer_name||'',phone:order.customer_phone||'',email:order.customer_email||'',city:order.city||'',preferred_role:order.preferred_role||''}});
}
