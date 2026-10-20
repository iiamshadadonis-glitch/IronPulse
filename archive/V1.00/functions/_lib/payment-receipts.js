import { parseTaxSnapshot, aggregateTaxBreakdowns } from './taxes.js';
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?Math.max(0,Math.round(n)):0;};
const lower=v=>String(v??'').trim().toLowerCase();

export async function ensurePaymentReceiptsTable(env){
  if(!env?.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS payment_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gateway TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    order_id TEXT NOT NULL DEFAULT '',
    subscription_id TEXT NOT NULL DEFAULT '',
    amount_paise INTEGER NOT NULL DEFAULT 0,
    base_amount_paise INTEGER NOT NULL DEFAULT 0,
    gst_amount_paise INTEGER NOT NULL DEFAULT 0,
    service_charge_paise INTEGER NOT NULL DEFAULT 0,
    other_tax_paise INTEGER NOT NULL DEFAULT 0,
    tax_snapshot_json TEXT NOT NULL DEFAULT '{}',
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'paid',
    payment_kind TEXT NOT NULL DEFAULT 'payment',
    payment_method TEXT NOT NULL DEFAULT '',
    upi_id TEXT NOT NULL DEFAULT '',
    paid_at_epoch INTEGER NOT NULL DEFAULT 0,
    paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gateway, transaction_id)
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_receipts_order ON payment_receipts(order_id,paid_at_epoch)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_receipts_order_status_latest ON payment_receipts(order_id,status,paid_at_epoch DESC,id DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_receipts_subscription ON payment_receipts(subscription_id,paid_at_epoch)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_receipts_paid_at ON payment_receipts(paid_at)').run().catch(()=>{});
  for(const sql of [
    "ALTER TABLE payment_receipts ADD COLUMN base_amount_paise INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_receipts ADD COLUMN gst_amount_paise INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_receipts ADD COLUMN service_charge_paise INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_receipts ADD COLUMN other_tax_paise INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_receipts ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE payment_receipts ADD COLUMN email_notice_sent INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_receipts ADD COLUMN email_notice_sent_at TEXT NOT NULL DEFAULT ''"
  ]) await env.DB.prepare(sql).run().catch(()=>{});
}

function blankTax(amount){return {enabled:false,basePaise:num(amount),gstPaise:0,serviceChargePaise:0,otherTaxPaise:0,totalTaxPaise:0,totalPaise:num(amount)};}
function candidateTax(value){const x=parseTaxSnapshot(value);return x&&Number(x.totalPaise||0)>0?x:null;}
async function resolveReceiptTax(env,row,amount){
  const explicit=candidateTax(row.tax_snapshot_json||row.tax_snapshot);if(explicit)return explicit;
  const oid=clean(row.order_id,120),sid=clean(row.subscription_id,220);if(!oid&&!sid)return blankTax(amount);
  let items=[];
  if(sid){const r=await env.DB.prepare(`SELECT oi.tax_snapshot_json FROM order_items oi WHERE oi.gateway_subscription_id=? ORDER BY oi.id ASC`).bind(sid).all().catch(()=>({results:[]}));items=r.results||[];}
  if(!items.length&&oid){const r=await env.DB.prepare(`SELECT oi.tax_snapshot_json FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.order_id=? ORDER BY oi.id ASC`).bind(oid).all().catch(()=>({results:[]}));items=r.results||[];}
  const all=[];for(const it of items){const snap=parseTaxSnapshot(it.tax_snapshot_json);for(const k of ['trial','setup','oneTime','firstPayment','recurring']){const c=candidateTax(snap?.[k]);if(c)all.push(c);}}
  const exact=all.find(x=>Math.abs(num(x.totalPaise)-num(amount))<=2);if(exact)return exact;
  if(items.length>1){const ones=items.map(it=>candidateTax(parseTaxSnapshot(it.tax_snapshot_json)?.oneTime)).filter(Boolean);if(ones.length){const agg=aggregateTaxBreakdowns(ones);if(Math.abs(num(agg.totalPaise)-num(amount))<=2)return agg;}}
  return blankTax(amount);
}

export async function recordPaymentReceipt(env,row={}){
  // /api middleware runs ensureSchema before handlers, so the receipts table is already ready here.
  // Avoid replaying CREATE/INDEX/ALTER statements on every payment write. 
  const gateway=lower(row.gateway),transactionId=clean(row.transaction_id||row.transactionId,220),amount=num(row.amount_paise??row.amount);
  if(!gateway||!transactionId||amount<=0)return null;
  const paidAtEpoch=Math.max(0,Math.floor(Number(row.paid_at_epoch||row.created_at_epoch||0)));
  const paidAt=clean(row.paid_at||'',40)||(paidAtEpoch?new Date(paidAtEpoch*1000).toISOString():new Date().toISOString());
  const payload=typeof row.payload_json==='string'?row.payload_json:JSON.stringify(row.payload_json||row.payload||{});
  let tax=await resolveReceiptTax(env,row,amount);
  // A later webhook/status refresh may contain less context than the first paid
  // event. Never replace a previously saved tax breakdown for the same real
  // transaction with an empty breakdown just because that refresh omitted the
  // order/subscription reference.
  const existing=await env.DB.prepare('SELECT amount_paise,tax_snapshot_json,gst_amount_paise,service_charge_paise,other_tax_paise FROM payment_receipts WHERE gateway=? AND transaction_id=?').bind(gateway,transactionId).first().catch(()=>null);
  if(existing&&num(existing.amount_paise)===amount&&num(tax?.totalTaxPaise)===0&&(num(existing.gst_amount_paise)+num(existing.service_charge_paise)+num(existing.other_tax_paise)>0)){
    const saved=parseTaxSnapshot(existing.tax_snapshot_json);if(saved&&typeof saved==='object')tax=saved;
  }
  const taxJson=JSON.stringify(tax||{});
  await env.DB.prepare(`INSERT INTO payment_receipts(gateway,transaction_id,order_id,subscription_id,amount_paise,base_amount_paise,gst_amount_paise,service_charge_paise,other_tax_paise,tax_snapshot_json,currency,status,payment_kind,payment_method,upi_id,paid_at_epoch,paid_at,payload_json,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(gateway,transaction_id) DO UPDATE SET
      order_id=CASE WHEN excluded.order_id<>'' THEN excluded.order_id ELSE payment_receipts.order_id END,
      subscription_id=CASE WHEN excluded.subscription_id<>'' THEN excluded.subscription_id ELSE payment_receipts.subscription_id END,
      amount_paise=CASE WHEN excluded.amount_paise>0 THEN excluded.amount_paise ELSE payment_receipts.amount_paise END,
      base_amount_paise=CASE WHEN excluded.base_amount_paise>0 THEN excluded.base_amount_paise ELSE payment_receipts.base_amount_paise END,
      gst_amount_paise=CASE WHEN excluded.gst_amount_paise>0 OR excluded.tax_snapshot_json<>'{}' THEN excluded.gst_amount_paise ELSE payment_receipts.gst_amount_paise END,
      service_charge_paise=CASE WHEN excluded.service_charge_paise>0 OR excluded.tax_snapshot_json<>'{}' THEN excluded.service_charge_paise ELSE payment_receipts.service_charge_paise END,
      other_tax_paise=CASE WHEN excluded.other_tax_paise>0 OR excluded.tax_snapshot_json<>'{}' THEN excluded.other_tax_paise ELSE payment_receipts.other_tax_paise END,
      tax_snapshot_json=CASE WHEN excluded.tax_snapshot_json<>'{}' THEN excluded.tax_snapshot_json ELSE payment_receipts.tax_snapshot_json END,
      currency=CASE WHEN excluded.currency<>'' THEN excluded.currency ELSE payment_receipts.currency END,
      status=CASE WHEN excluded.status<>'' THEN excluded.status ELSE payment_receipts.status END,
      payment_kind=CASE WHEN excluded.payment_kind<>'' THEN excluded.payment_kind ELSE payment_receipts.payment_kind END,
      payment_method=CASE WHEN excluded.payment_method<>'' THEN excluded.payment_method ELSE payment_receipts.payment_method END,
      upi_id=CASE WHEN excluded.upi_id<>'' THEN excluded.upi_id ELSE payment_receipts.upi_id END,
      paid_at_epoch=CASE WHEN excluded.paid_at_epoch>0 THEN excluded.paid_at_epoch ELSE payment_receipts.paid_at_epoch END,
      paid_at=CASE WHEN excluded.paid_at<>'' THEN excluded.paid_at ELSE payment_receipts.paid_at END,
      payload_json=CASE WHEN excluded.payload_json<>'{}' THEN excluded.payload_json ELSE payment_receipts.payload_json END,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(gateway,transactionId,clean(row.order_id,120),clean(row.subscription_id,220),amount,num(tax.basePaise),num(tax.gstPaise),num(tax.serviceChargePaise),num(tax.otherTaxPaise),taxJson,clean(row.currency||'INR',12),clean(row.status||'paid',30),clean(row.payment_kind||'payment',50),clean(row.payment_method,100),clean(row.upi_id,200),paidAtEpoch,paidAt,payload).run();
  if(!existing&&!row.notificationSilent){try{const push=await import('./notification-events-v1-58.js');await push.financialNotification(env,{event:'payment_success',orderId:clean(row.order_id,120),eventKey:`receipt:${gateway}:${transactionId}`});}catch{}}
  return env.DB.prepare('SELECT * FROM payment_receipts WHERE gateway=? AND transaction_id=?').bind(gateway,transactionId).first().catch(()=>null);
}

function razorpayReceipt(eventRow,p){
  const e=lower(eventRow.event_type),pay=p?.payload?.payment?.entity||{},sub=p?.payload?.subscription?.entity||{};
  const status=lower(pay.status),captured=pay.captured===true||status==='captured'||e==='payment.captured'||e.includes('subscription.charged');
  const amount=num(pay.amount); if(!captured||amount<=0)return null;
  const tx=clean(pay.id,220);if(!tx)return null;
  return {gateway:'razorpay',transaction_id:tx,order_id:eventRow.order_id||pay.notes?.order_id||sub.notes?.order_id||'',subscription_id:sub.id||pay.notes?.subscription_id||'',amount_paise:amount,currency:pay.currency||'INR',status:'paid',payment_kind:e==='payment.captured'?'payment':e.includes('charged')?'subscription_charge':'payment',payment_method:pay.method||'',upi_id:pay.vpa||pay.upi?.vpa||'',paid_at_epoch:Number(pay.created_at||0),payload_json:p};
}
function stripeReceipt(eventRow,p){
  const e=lower(eventRow.event_type),o=p?.data?.object||{};
  // For subscriptions, invoice.paid/invoice.payment_succeeded is the money-received
  // event. A Checkout Session is used directly only for a one-time payment.
  const invoicePaid=(e==='invoice.paid'||e==='invoice.payment_succeeded')&&num(o.amount_paid||o.amount_received)>0;
  const checkoutPaid=e==='checkout.session.completed'&&String(o.mode||'').toLowerCase()==='payment'&&lower(o.payment_status)==='paid'&&num(o.amount_total||o.amount_received)>0;
  if(!invoicePaid&&!checkoutPaid)return null;
  const amount=num(invoicePaid?(o.amount_paid||o.amount_received):(o.amount_total||o.amount_received));
  const tx=clean(o.payment_intent||o.charge||o.id,220);if(!tx||amount<=0)return null;
  const sid=typeof o.subscription==='string'?o.subscription:(o.parent?.subscription_details?.subscription||'');
  return {gateway:'stripe',transaction_id:tx,order_id:eventRow.order_id||o.metadata?.order_id||o.subscription_details?.metadata?.order_id||o.parent?.subscription_details?.metadata?.order_id||o.client_reference_id||'',subscription_id:sid,amount_paise:amount,currency:String(o.currency||'INR').toUpperCase(),status:'paid',payment_kind:checkoutPaid?'one_time':'subscription_charge',payment_method:o.payment_method_types?.[0]||'',upi_id:'',paid_at_epoch:Number(o.status_transitions?.paid_at||o.created||0),payload_json:p};
}
function phonePeReceipt(eventRow,payload){
  const p=payload?.payload||payload||{},e=lower(eventRow.event_type),details=Array.isArray(p.paymentDetails)?p.paymentDetails:[],pay=details[0]||{};
  const state=String(pay.state||p.state||'').toUpperCase(),completed=e.includes('completed')&&['COMPLETED','SUCCESS','SUCCEEDED','PAID'].some(v=>state.includes(v));
  const amount=num(pay.amount||p.amount||p.redemptionAmount);if(!completed||amount<=0)return null;
  const tx=clean(pay.transactionId||p.transactionId||p.orderId||p.merchantOrderId,220);if(!tx)return null;
  return {gateway:'phonepe',transaction_id:tx,order_id:eventRow.order_id||p.metaInfo?.udf1||pay.metaInfo?.udf1||'',subscription_id:p.merchantSubscriptionId||p.paymentFlow?.merchantSubscriptionId||p.subscriptionDetails?.merchantSubscriptionId||'',amount_paise:amount,currency:'INR',status:'paid',payment_kind:e.includes('redemption')?'subscription_charge':e.includes('setup')?'authentication':'one_time',payment_method:pay.paymentMode||'',upi_id:pay.vpa||pay.utr||'',paid_at_epoch:Math.floor(Number(pay.timestamp||p.timestamp||0)/((Number(pay.timestamp||p.timestamp||0)>1e12)?1000:1)),payload_json:payload};
}

export function receiptFromPaymentEvent(eventRow){
  let p={};try{p=JSON.parse(String(eventRow?.payload_json||'{}'));}catch{return null;}
  const g=lower(eventRow?.gateway);
  if(g==='razorpay')return razorpayReceipt(eventRow,p);
  if(g==='stripe')return stripeReceipt(eventRow,p);
  if(g==='phonepe')return phonePeReceipt(eventRow,p);
  return null;
}

export async function backfillPaymentReceipts(env,{limit=5000,orderId=''}={}){
  await ensurePaymentReceiptsTable(env);
  const max=Math.max(1,Math.min(20000,Number(limit||5000))),oid=clean(orderId,120);
  const query=oid?env.DB.prepare('SELECT * FROM payment_events WHERE verified=1 AND order_id=? ORDER BY id ASC LIMIT ?').bind(oid,max):env.DB.prepare('SELECT * FROM payment_events WHERE verified=1 ORDER BY id ASC LIMIT ?').bind(max);
  const rows=(await query.all().catch(()=>({results:[]}))).results||[];
  let saved=0;
  for(const row of rows){const r=receiptFromPaymentEvent(row);if(!r)continue;await recordPaymentReceipt(env,{...r,notificationSilent:true}).catch(()=>{});saved++;}
  return saved;
}

export async function paymentReceiptsForOrders(env,orderIds=[]){
  // Schema is guaranteed by /api middleware; keep this hot read path DML-only for fast Client Details. 
  const ids=[...new Set((orderIds||[]).map(x=>clean(x,120)).filter(Boolean))];if(!ids.length)return[];
  const ph=ids.map(()=>'?').join(',');
  const r=await env.DB.prepare(`SELECT * FROM payment_receipts WHERE order_id IN (${ph}) AND lower(status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(paid_at_epoch,0),strftime('%s',paid_at)) DESC,id DESC`).bind(...ids).all().catch(()=>({results:[]}));
  return r.results||[];
}

export async function latestPaymentReceipt(env,{orderId='',subscriptionId='',transactionId=''}={}){
  // Schema is guaranteed by /api middleware; avoid DDL on every payment-result refresh. 
  // When a gateway sends a concrete payment/transaction reference, prefer that
  // exact receipt. This prevents a customer reopening an older success URL later
  // and seeing a newer recurring charge from the same subscription/order instead.
  if(transactionId){
    const exact=await env.DB.prepare(`SELECT * FROM payment_receipts WHERE transaction_id=? AND lower(status) IN ('paid','captured','successful','success') ORDER BY id DESC LIMIT 1`).bind(clean(transactionId,220)).first().catch(()=>null);
    if(exact)return exact;
  }
  const where=[],binds=[];
  if(orderId){where.push('order_id=?');binds.push(clean(orderId,120));}
  if(subscriptionId){where.push('subscription_id=?');binds.push(clean(subscriptionId,220));}
  if(!where.length)return null;
  return env.DB.prepare(`SELECT * FROM payment_receipts WHERE (${where.join(' OR ')}) AND lower(status) IN ('paid','captured','successful','success') ORDER BY COALESCE(NULLIF(paid_at_epoch,0),strftime('%s',paid_at)) DESC,id DESC LIMIT 1`).bind(...binds).first().catch(()=>null);
}
