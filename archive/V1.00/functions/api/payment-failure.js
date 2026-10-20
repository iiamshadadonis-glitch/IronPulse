import { json, readJson } from '../_lib/utils.js';
import { recordPaymentFailure } from '../_lib/payment-recovery.js';
import { bumpAdminActivity } from '../_lib/admin-activity.js';
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
export async function onRequestPost({request,env}){
  const b=await readJson(request),orderId=clean(b.order_id||b.order,120);if(!orderId)return json({error:'Order reference is required.'},400);
  const o=await env.DB.prepare('SELECT id,amount_paise,status,payment_status FROM orders WHERE order_id=?').bind(orderId).first().catch(()=>null);if(!o)return json({error:'Order could not be found.'},404);
  const reason=clean(b.reason||'Payment was not completed.',500),reference=clean(b.reference||'',220),attemptAmount=Math.max(0,Number(b.attempt_amount_paise||0))||Math.max(0,Number(o.amount_paise||0));
  await env.DB.prepare("UPDATE orders SET status=CASE WHEN lower(COALESCE(status,'')) IN ('paid','active','authenticated') THEN status ELSE 'failed' END,payment_status=CASE WHEN lower(COALESCE(payment_status,'')) IN ('paid','captured','successful','success','authenticated') THEN payment_status ELSE 'failed' END,failure_reason=?,order_stage='change',updated_at=CURRENT_TIMESTAMP WHERE order_id=?").bind(reason,orderId).run().catch(()=>{});
  const r=await recordPaymentFailure(env,orderId,{reason,reference,attemptAmountPaise:attemptAmount}).catch(e=>({ok:false,reason:e.message}));
  await bumpAdminActivity(env,'orders').catch(()=>{});return json({ok:true,email:r});
}
