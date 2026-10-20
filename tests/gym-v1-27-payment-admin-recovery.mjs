import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {onRequestPost as createOrder} from '../functions/api/orders/create.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

// Recreate the live upgrade path that V1.26 missed: an existing database has
// every migration through V1.25 and already carries the old schema-ready marker.
const sqlite=new DatabaseSync(':memory:');
const oldMigrations=fs.readdirSync(path.join(root,'migrations'))
  .filter(file=>file.endsWith('.sql')&&file<'0055_dropbeat_billing_interval_first_payment_v1_26.sql')
  .sort();
for(const file of oldMigrations)sqlite.exec(read(`migrations/${file}`));

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={
  DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},
  DEFAULT_CURRENCY:'INR',
  RAZORPAY_KEY_ID:'rzp_test_v127',
  RAZORPAY_KEY_SECRET:'test-secret',
  SITE_URL:'https://dance-class-at2.pages.dev',
  PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'
};

// Build the same complete application schema that an established V1.26 site
// had when its old marker was written. The SQL migration set intentionally does
// not duplicate every table/column from the original runtime bootstrap.
sqlite.prepare("DELETE FROM settings WHERE key='schema_ready'").run();
const bootstrapSchema=(await import('../functions/_lib/schema.js?v127-fixture-bootstrap')).ensureSchema;
await bootstrapSchema(env);
for(const [table,column] of [['products','billing_interval'],['order_items','first_payment_amount_paise'],['order_items','recurring_unit_amount_paise'],['order_items','coupon_recurring_scope']]){
  sqlite.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}
sqlite.prepare("DELETE FROM settings WHERE key='schema_patch_v1_28_checkout_columns'").run();
sqlite.prepare("INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES('schema_ready',?,CURRENT_TIMESTAMP)")
  .run(JSON.stringify({version:'v16-96-contacts-notification-personalization-dropbeat-v1.04'}));

for(const [table,column] of [['products','billing_interval'],['order_items','first_payment_amount_paise'],['order_items','recurring_unit_amount_paise'],['order_items','coupon_recurring_scope']]){
  assert.equal(sqlite.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name=?`).get(column),undefined,`${table}.${column} must be absent in the V1.25 fixture`);
}
const upgradeSchema=(await import('../functions/_lib/schema.js?v127-fixture-upgrade')).ensureSchema;
await upgradeSchema(env);
for(const [table,column] of [['products','billing_interval'],['order_items','first_payment_amount_paise'],['order_items','recurring_unit_amount_paise'],['order_items','coupon_recurring_scope']]){
  assert.ok(sqlite.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name=?`).get(column),`${table}.${column} must self-repair during a replacement-code upgrade`);
}
const schemaMarker=JSON.parse(sqlite.prepare("SELECT value FROM settings WHERE key='schema_ready'").get().value);
assert.match(schemaMarker.version,/v1\.27/i,'the schema marker must advance so an existing database cannot skip the checkout repair');

sqlite.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('payment_settings',?)").run(JSON.stringify({primaryGateway:'razorpay',razorpayEnabled:true}));
const productId=Number(sqlite.prepare("INSERT INTO products(sku,name,slug,type,description,regular_price_paise,offer_price_paise,currency,status,features_json,payment_type,offer_price_enabled,trial_enabled,billing_period,billing_interval) VALUES('V127-M1','V1.27 Monthly Plan','v127-monthly-plan','subscription','Upgrade checkout plan',59900,34900,'INR','active','[]','subscription',1,0,'monthly',1)").run().lastInsertRowid);
sqlite.prepare("INSERT INTO coupon_codes(code,discount_type,discount_value,applies_to,billing_scope,recurring_scope,status) VALUES('V127FIRST50','percent',50,'item','both','first','active')").run();

const gatewayCalls=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
  let payload={};
  try{payload=JSON.parse(init.body||'{}');}catch(_){payload={};}
  gatewayCalls.push({url:String(url),payload});
  if(String(url).endsWith('/plans'))return new Response(JSON.stringify({id:`plan_v127_${gatewayCalls.length}`}),{status:200,headers:{'content-type':'application/json'}});
  if(String(url).endsWith('/subscriptions'))return new Response(JSON.stringify({id:`sub_v127_${gatewayCalls.length}`}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
};
async function checkout(index,couponCode=''){
  const request=new Request('https://dance-class-at2.pages.dev/api/orders/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customer:{name:`V127 Customer ${index}`,phone:`91910000270${index}`,email:`v127-${index}@example.test`},items:[{product_id:productId,quantity:1,billing_months:1,coupon_code:couponCode}]})});
  const response=await createOrder({request,env});
  const data=await response.json();
  assert.equal(response.status,200,data.error||'Continue to payment must succeed after an in-place V1.25/V1.26 upgrade');
  assert.ok(data.redirect_url,'checkout must return a usable payment URL');
  return data;
}
try{
  const regular=await checkout(1);
  assert.equal(regular.first_payment_amount_paise,34900);
  assert.equal(regular.recurring_amount_paise,34900);
  const discounted=await checkout(2,'V127FIRST50');
  assert.equal(discounted.first_payment_amount_paise,17450);
  assert.equal(discounted.recurring_amount_paise,34900);
}finally{
  globalThis.fetch=originalFetch;
}

// Execute the actual billing-preview function and verify that a second observer
// pass performs no DOM write. V1.26 rewrote textContent every time; because the
// same script observes childList changes, that formed an endless microtask loop
// and starved the admin session request.
const billingSource=read('public/admin/final-v14-4-plan-billing.js').replace(/\}\)\(\);\s*$/, 'window.__v127SyncBillingPreview=syncBillingPreview;})();');
let hintText='',textWrites=0,classWrites=0,yearWarning=false;
const hint={
  get textContent(){return hintText;},
  set textContent(value){textWrites++;hintText=String(value);},
  classList:{contains(name){return name==='uc-billing-year-warning'&&yearWarning;},toggle(name,force){if(name==='uc-billing-year-warning'){classWrites++;yearWarning=Boolean(force);}return yearWarning;}}
};
const form={
  billing_interval:{value:'1'},
  billing_period:{value:'monthly'},
  offer_price_enabled:{checked:true},
  regular_price_rupees:{value:'599'},
  offer_price_rupees:{value:'349'}
};
const document={
  readyState:'loading',
  querySelector(selector){if(selector==='#productForm')return form;if(selector==='#ucBillingIntervalHint')return hint;return null;},
  addEventListener(){}
};
class MutationObserver{constructor(callback){this.callback=callback;}observe(){}disconnect(){}}
const sandbox={document,MutationObserver,Intl,console,setTimeout(){return 1;},clearTimeout(){},queueMicrotask(){}};
sandbox.window=sandbox;
vm.runInNewContext(billingSource,sandbox,{filename:'final-v14-4-plan-billing.js'});
sandbox.__v127SyncBillingPreview();
sandbox.__v127SyncBillingPreview();
assert.equal(textWrites,1,'an unchanged billing preview must not retrigger its own MutationObserver');
assert.equal(classWrites,0,'monthly preview must not rewrite an already-absent yearly warning class');
form.billing_period.value='yearly';
sandbox.__v127SyncBillingPreview();
sandbox.__v127SyncBillingPreview();
assert.equal(textWrites,2,'yearly preview text must update exactly once');
assert.equal(classWrites,1,'yearly warning class must update exactly once');

const adminSource=read('public/admin/admin.js');
assert.match(adminSource,/AbortController/,'admin session verification must have a finite network timeout');
assert.match(adminSource,/Admin session check timed out/,'a stalled session request must replace the permanent loading screen with a recoverable error');
const adminHtml=read('public/admin/index.html');
assert.match(adminHtml,/admin\.js\?v=17\.04&dropbeat=1\.29/,'the repaired admin bootstrap must bypass the cached V1.26 script');
assert.match(adminHtml,/final-v14-4-plan-billing\.js\?v=1\.29/,'the idempotent billing observer must bypass the cached V1.26 script');

console.log('DropBeat V1.27 verified: existing V1.25/V1.26 databases self-repair checkout columns, payment links work with and without a first-payment coupon, and the admin billing observer remains idle after an unchanged render.');
