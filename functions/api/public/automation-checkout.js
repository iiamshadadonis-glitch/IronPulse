import { json } from '../../_lib/utils.js';
import { verifyAutomationCheckoutToken } from '../../_lib/automation-checkout.js';

const clean=(v,n=600)=>String(v??'').trim().slice(0,n);
export async function onRequestGet({request,env}){
  const u=new URL(request.url),leadId=Number(u.searchParams.get('lead_id')||0),productId=Number(u.searchParams.get('product_id')||0),expires=Number(u.searchParams.get('expires')||0),token=clean(u.searchParams.get('token'),200);
  if(!(await verifyAutomationCheckoutToken(env,{leadId,productId,expires,token})))return json({error:'This personalized checkout link is invalid or has expired.'},401);
  const [lead,product]=await Promise.all([
    env.DB.prepare('SELECT * FROM contact_leads WHERE id=? LIMIT 1').bind(leadId).first().catch(()=>null),
    env.DB.prepare("SELECT * FROM products WHERE id=? AND status='active' LIMIT 1").bind(productId).first().catch(()=>null)
  ]);
  if(!lead)return json({error:'The lead profile linked to this offer could not be found.'},404);
  if(!product)return json({error:'This plan or offer is no longer available.'},409);
  const phone=clean(lead.phone,80),email=clean(lead.email,320),customer=await env.DB.prepare(`SELECT city,preferred_role FROM customers WHERE (?<>'' AND substr(replace(replace(replace(replace(replace(COALESCE(phone,''),'+',''),' ',''),'-',''),'(',''),')',''),-10)=substr(replace(replace(replace(replace(replace(?,'+',''),' ',''),'-',''),'(',''),')',''),-10)) OR (?<>'' AND lower(trim(COALESCE(email,'')))=lower(trim(?))) ORDER BY id DESC LIMIT 1`).bind(phone,phone,email,email).first().catch(()=>null);
  const offerEnabled=Number(product.offer_price_enabled??1)!==0,regular=Math.max(0,Number(product.regular_price_paise||0)),offer=offerEnabled?Math.max(0,Number(product.offer_price_paise||regular)):regular,period=String(product.billing_period||'monthly')==='yearly'?'yearly':'monthly',explicit=product.billing_interval!==null&&product.billing_interval!==undefined&&String(product.billing_interval).trim()!=='',interval=Math.max(1,Math.floor(Number(product.billing_interval||1))||1),billing=explicit?(period==='yearly'?interval*12:interval):(period==='yearly'?12:1),label=period==='yearly'?(interval===1?'Yearly':`Every ${interval} years`):(interval===1?'Monthly':`Every ${interval} months`);
  const cart=[{key:explicit?`${product.id}:billing-${period}-${interval}`:`${product.id}:default`,product_id:Number(product.id),variant_id:null,name:product.name,variant_name:label,regular_price_paise:regular,catalog_offer_price_paise:Number(product.offer_price_paise||regular),offer_price_enabled:offerEnabled?1:0,offer_price_paise:offer,billing_months:billing,billing_period:period,billing_interval:explicit?interval:null,billing_interval_explicit:explicit?1:0,quantity:1,payment_type:product.payment_type||'subscription',trial_enabled:Number(product.trial_enabled||0),trial_amount_paise:Number(product.trial_amount_paise||0),trial_value:Number(product.trial_value||0),trial_unit:product.trial_unit||''}];
  return json({ok:true,cart,customer:{name:clean(lead.name,240),phone,email,city:clean(customer?.city,160),preferred_role:clean(customer?.preferred_role||lead.role_interest,240)},message:'Your selected plan and known contact details are ready.'});
}
