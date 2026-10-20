// V16.72 — throttle the abandoned unpaid-order sweep shared by Dashboard/Orders.
// The older code ran the same UPDATE scan on every dashboard/order read, including
// the Orders page's silent refresh. One sweep every 15 minutes is enough because
// the business rule itself only expires requests after one hour.
const KEY='order_abandoned_sweep_v1672';
const INTERVAL_MS=15*60*1000;
let localCheckedAt=0;

export async function maybeSweepAbandonedOrders(env,{force=false}={}){
  if(!env?.DB)return {ran:false,changes:0};
  const now=Date.now();
  if(!force&&localCheckedAt&&now-localCheckedAt<INTERVAL_MS)return {ran:false,changes:0};
  let saved=0;
  try{const row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(KEY).first();saved=Number(row?.value||0)||0;}catch{}
  if(!force&&saved&&now-saved<INTERVAL_MS){localCheckedAt=now;return {ran:false,changes:0};}
  const res=await env.DB.prepare(`UPDATE orders
    SET status='cancelled',payment_status='cancelled',order_stage='existing',
        failure_reason=COALESCE(NULLIF(failure_reason,''),'Payment request automatically cancelled after 1 hour without a confirmed payment'),
        updated_at=CURRENT_TIMESTAMP
    WHERE datetime(created_at) <= datetime('now','-1 hour')
      AND lower(COALESCE(payment_status,'')) IN ('','awaiting_payment','pending','created','new_checkout')
      AND lower(COALESCE(status,'')) IN ('','new','new_checkout','awaiting_payment','pending','created','incomplete')
      AND NOT EXISTS (SELECT 1 FROM payment_receipts pr WHERE pr.order_id=orders.order_id AND pr.amount_paise>0 AND lower(COALESCE(pr.status,'')) IN ('paid','captured','successful','success'))
      AND NOT EXISTS (SELECT 1 FROM manual_payments mp WHERE mp.order_id=orders.order_id AND mp.amount_paise>0 AND lower(COALESCE(mp.status,'recorded')) NOT IN ('failed','cancelled','canceled'))`).run().catch(()=>({meta:{changes:0}}));
  localCheckedAt=now;
  try{await env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(KEY,String(now)).run();}catch{}
  const changes=Number(res?.meta?.changes||0);
  if(changes>0){
    const {bumpAdminActivity}=await import('./admin-activity.js');
    await bumpAdminActivity(env,'orders').catch(()=>{});
  }
  return {ran:true,changes};
}
