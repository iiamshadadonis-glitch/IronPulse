import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {ensureSchema} from '../functions/_lib/schema.js';
import {calculateCheckoutLine} from '../functions/_lib/utils.js';
import {createGatewayCheckout} from '../functions/_lib/payment-gateways.js';
import {onRequestPost as createOrder} from '../functions/api/orders/create.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.length,55);
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
const sqlite=new DatabaseSync(':memory:');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},DEFAULT_CURRENCY:'INR',RAZORPAY_KEY_ID:'rzp_test_v126',RAZORPAY_KEY_SECRET:'test-secret',SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'};
await ensureSchema(env);

for(const [table,column] of [['products','billing_interval'],['order_items','first_payment_amount_paise'],['order_items','recurring_unit_amount_paise'],['order_items','coupon_recurring_scope']]){
  assert.ok(sqlite.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name=?`).get(column),`${table}.${column} must exist`);
}

const settings={subscriptionYears:21,yearlyOfferMonths:10};
const quarterly=calculateCheckoutLine({regular_price_paise:59900,offer_price_paise:34900,billing_period:'monthly',billing_interval:3},{billing_months:1},settings);
assert.deepEqual({months:quarterly.billingMonths,interval:quarterly.billingInterval,unit:quarterly.unitAmount,regular:quarterly.originalUnitAmount,count:quarterly.totalCount,scope:quarterly.billingType,explicit:quarterly.billingIntervalExplicit},{months:3,interval:3,unit:34900,regular:59900,count:84,scope:'monthly',explicit:true});
const twoYear=calculateCheckoutLine({regular_price_paise:119900,offer_price_paise:99900,billing_period:'yearly',billing_interval:2},{billing_months:1},settings);
assert.deepEqual({months:twoYear.billingMonths,interval:twoYear.billingInterval,unit:twoYear.unitAmount,regular:twoYear.originalUnitAmount,count:twoYear.totalCount,scope:twoYear.billingType},{months:24,interval:2,unit:99900,regular:119900,count:11,scope:'yearly'});
const legacy=calculateCheckoutLine({regular_price_paise:59900,offer_price_paise:34900,billing_period:'monthly',billing_interval:null},{billing_months:12},settings);
assert.equal(legacy.billingIntervalExplicit,false,'pre-upgrade plans must retain the established variant calculation');
assert.equal(legacy.unitAmount,349000);

sqlite.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('payment_settings',?)").run(JSON.stringify({primaryGateway:'razorpay',razorpayEnabled:true}));
const productId=Number(sqlite.prepare("INSERT INTO products(sku,name,slug,type,description,regular_price_paise,offer_price_paise,currency,status,features_json,payment_type,offer_price_enabled,trial_enabled,billing_period,billing_interval) VALUES('V126-Q3','Quarterly Dance Plan','quarterly-dance-plan','subscription','Quarterly plan',59900,34900,'INR','active','[]','subscription',1,0,'monthly',3)").run().lastInsertRowid);
const monthlyProductId=Number(sqlite.prepare("INSERT INTO products(sku,name,slug,type,description,regular_price_paise,offer_price_paise,currency,status,features_json,payment_type,offer_price_enabled,trial_enabled,billing_period,billing_interval) VALUES('V126-M1','Monthly Dance Plan','monthly-dance-plan','subscription','Monthly plan',59900,34900,'INR','active','[]','subscription',1,0,'monthly',1)").run().lastInsertRowid);
sqlite.prepare("INSERT INTO coupon_codes(code,discount_type,discount_value,applies_to,billing_scope,recurring_scope,status) VALUES('FIRST50','percent',50,'item','both','first','active')").run();
sqlite.prepare("INSERT INTO coupon_codes(code,discount_type,discount_value,applies_to,billing_scope,recurring_scope,status) VALUES('ALL50','percent',50,'item','both','all','active')").run();

const gatewayCalls=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
  let payload=null;if(init.body){try{payload=JSON.parse(init.body);}catch(_){payload=String(init.body);}}
  const call={url:String(url),payload,method:String(init.method||'GET').toUpperCase()};gatewayCalls.push(call);
  if(call.url.endsWith('/v1/oauth/token'))return new Response(JSON.stringify({access_token:'phonepe-v126-token',token_type:'O-Bearer',expires_at:Math.floor(Date.now()/1000)+3600}),{status:200,headers:{'content-type':'application/json'}});
  if(call.url.endsWith('/checkout/v2/pay'))return new Response(JSON.stringify({redirectUrl:'https://phonepe.test/v126'}),{status:200,headers:{'content-type':'application/json'}});
  if(call.url.endsWith('/plans'))return new Response(JSON.stringify({id:`plan_v126_${gatewayCalls.length}`}),{status:200,headers:{'content-type':'application/json'}});
  if(call.url.endsWith('/subscriptions'))return new Response(JSON.stringify({id:`sub_v126_${gatewayCalls.length}`,short_url:'https://rzp.test/v126'}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
};
async function checkout(code,index,selectedProductId=productId){
  const request=new Request('https://dance-class-at2.pages.dev/api/orders/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customer:{name:`V126 Customer ${index}`,phone:`91910000126${index}`,email:`v126-${index}@example.test`},items:[{product_id:selectedProductId,quantity:1,billing_months:1,coupon_code:code}]})});
  const response=await createOrder({request,env});const data=await response.json();assert.equal(response.status,200,data.error||'checkout must succeed');return data;
}
try{
  const first=await checkout('FIRST50',1);
  assert.equal(first.first_payment_amount_paise,17450);
  assert.equal(first.recurring_amount_paise,34900);
  const firstItem=sqlite.prepare("SELECT * FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.customer_email='v126-1@example.test'").get();
  assert.equal(firstItem.unit_amount_paise,17450);
  assert.equal(firstItem.first_payment_amount_paise,17450);
  assert.equal(firstItem.recurring_unit_amount_paise,34900);
  assert.equal(firstItem.coupon_recurring_scope,'first');
  assert.equal(firstItem.billing_months,3);
  const firstPlan=gatewayCalls.find(call=>call.url.endsWith('/plans'))?.payload,firstSubscription=gatewayCalls.find(call=>call.url.endsWith('/subscriptions'))?.payload;
  assert.equal(firstPlan.period,'monthly');assert.equal(firstPlan.interval,3);assert.equal(firstPlan.item.amount,34900);
  assert.equal(firstSubscription.addons[0].item.amount,17450);assert.ok(firstSubscription.start_at>Math.floor(Date.now()/1000));assert.equal(firstSubscription.total_count,83);

  const callStart=gatewayCalls.length,all=await checkout('ALL50',2),allCalls=gatewayCalls.slice(callStart);
  assert.equal(all.first_payment_amount_paise,17450);
  assert.equal(all.recurring_amount_paise,17450);
  const allItem=sqlite.prepare("SELECT * FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.customer_email='v126-2@example.test'").get();
  assert.equal(allItem.recurring_unit_amount_paise,17450);
  assert.equal(allItem.coupon_recurring_scope,'all');
  const allPlan=allCalls.find(call=>call.url.endsWith('/plans'))?.payload,allSubscription=allCalls.find(call=>call.url.endsWith('/subscriptions'))?.payload;
  assert.equal(allPlan.item.amount,17450);
  assert.equal(allSubscription.addons,undefined);
  assert.equal(allSubscription.start_at,undefined);

  const monthlyStart=gatewayCalls.length,monthly=await checkout('FIRST50',3,monthlyProductId),monthlyCalls=gatewayCalls.slice(monthlyStart);
  assert.equal(monthly.first_payment_amount_paise,17450,'the exact monthly example must charge ₹174.50 today');
  assert.equal(monthly.recurring_amount_paise,34900,'the exact monthly example must renew at ₹349');
  const monthlyPlan=monthlyCalls.find(call=>call.url.endsWith('/plans'))?.payload,monthlySubscription=monthlyCalls.find(call=>call.url.endsWith('/subscriptions'))?.payload;
  assert.equal(monthlyPlan.period,'monthly');assert.equal(monthlyPlan.interval,1);assert.equal(monthlyPlan.item.amount,34900);
  assert.equal(monthlySubscription.addons[0].item.amount,17450);assert.equal(monthlySubscription.total_count,251);

  const phonePeStart=gatewayCalls.length;
  const phonePe=await createGatewayCheckout({...env,PHONEPE_CLIENT_ID:'phonepe-v126-client',PHONEPE_CLIENT_SECRET:'phonepe-v126-secret'},{gateway:'phonepe',kind:'subscription',orderId:'V126-PHONEPE-FIRST',amountPaise:34900,currency:'INR',customer:{name:'PhonePe Test',phone:'919100001263',email:'phonepe-v126@example.test'},description:'Quarterly Dance Plan',billingMonths:3,totalCount:83,quantity:1,initialCharge:{enabled:true,amountPaise:17450,startAt:Math.floor(Date.now()/1000)+7776000}});
  assert.equal(phonePe.url,'https://phonepe.test/v126');
  const phonePeCall=gatewayCalls.slice(phonePeStart).find(call=>call.url.endsWith('/checkout/v2/pay')),phonePePayload=phonePeCall?.payload;
  assert.equal(phonePeCall.method,'POST','PhonePe checkout must send its payment payload with POST');
  assert.equal(phonePePayload.amount,17450,'PhonePe mandate setup must debit only the discounted first payment');
  assert.equal(phonePePayload.paymentFlow.subscriptionDetails.maxAmount,34900,'PhonePe mandate must retain the full future renewal amount');
}finally{globalThis.fetch=originalFetch;}

const planUi=read('public/admin/final-v14-4-plan-billing.js'),planCss=read('public/admin/final-v14-4-plan-billing.css'),checkoutUi=read('public/assets/app-extra.js'),paymentUi=read('public/assets/final-v16-2-payment.js'),themeCss=read('public/assets/dropbeat-color-mode-v1-25.css');
assert.match(planUi,/Billing Length/);assert.match(planUi,/name="billing_interval"/);assert.match(planUi,/ucBillingIntervalHint/);assert.match(planUi,/This is a yearly plan\. Please confirm/);assert.match(planUi,/syncTrialPreview\(\)/,'existing trial preview must remain');
assert.match(planCss,/\.uc-billing-length-field\{grid-column:2\}/);assert.match(planCss,/uc-billing-year-warning\{color:#b42318/);
assert.match(checkoutUi,/function basketPriceHtml/);assert.match(checkoutUi,/coupon_recurring_scope=res\.recurring_scope/);assert.match(paymentUi,/Future renewals are/);assert.match(paymentUi,/first_payment_only_coupon/);
assert.match(themeCss,/width:30px;height:30px;min-width:30px/);assert.match(themeCss,/svg\{width:16px;height:16px/);assert.match(themeCss,/#adminApp \.panel>\.top\{box-sizing:border-box;padding-right:52px!important\}/);
for(const file of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html','public/index.html']){
  assert.match(read(file),/dropbeat-color-mode-v1-25\.css\?v=1\.26/,`${file} must load the compact theme control without a stale cache`);
  assert.match(read(file),/dropbeat-color-mode-v1-25\.js\?v=1\.26/,`${file} must load the V1.26 colour-mode behaviour`);
}
assert.match(read('public/admin/index.html'),/final-v14-4-plan-billing\.js\?v=1\.29/);
assert.match(read('public/student-dashboard.html'),/portal-dashboard-v1-16\.js\?v=1\.26/);
assert.match(read('public/coach-dashboard.html'),/portal-dashboard-v1-16\.js\?v=1\.26/);

for(const file of ['functions/api/orders/create.js','functions/_lib/payment-gateways.js','functions/api/payment-session.js','public/admin/final-v14-4-plan-billing.js','public/assets/app.js','public/assets/app-extra.js','public/assets/final-v16-2-payment.js','public/assets/portal-dashboard-v1-16.js'])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.26 verified: admin billing length is explicit and dynamic, configured frequencies reach checkout and payment gateways, first-payment coupons do not reduce Razorpay or PhonePe renewals, all-payment coupons still recur, paid-trial code remains present, and the shared colour-mode control is compact with admin action clearance.');
