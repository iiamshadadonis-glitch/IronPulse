import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as getAnalytics} from '../functions/api/admin/analytics.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.10'],'node tests/dance-studio-v1-10-fixes.mjs && npm run test:dance-v1.09');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const adminHtml=read('public/admin/index.html');
const adminJs=read('public/admin/dropbeat-admin-v1-13.js');
const adminCss=read('public/admin/dropbeat-admin-v1-13.css');
const analyticsJs=read('public/admin/final-v16-89-analytics-calendar.js');
const analyticsApi=read('functions/api/admin/analytics.js');
const publicJs=read('public/assets/dropbeat-dance-v1-13.js');
const publicCss=read('public/assets/dropbeat-dance-v1-13.css');
const pageBoot=read('public/assets/page-boot.js');

assert.match(adminHtml,/dropbeat-admin-v1-13\.css\?v=1\.13/);
assert.match(adminHtml,/dropbeat-admin-v1-13\.js\?v=1\.29/);
assert.doesNotMatch(adminHtml,/dropbeat-admin-v1-09\.(?:css|js)/);
assert.match(adminHtml,/final-v16-89-analytics-calendar\.js\?v=1\.13/);
assert.doesNotMatch(adminHtml,/final-v16-88-analytics-calendar\.js/,'the superseded analytics controller must not compete with V1.10');
assert.match(pageBoot,/dropbeat-dance-v1-13\.css\?v=1\.13/);
assert.match(pageBoot,/dropbeat-dance-v1-13\.js\?v=1\.13/);
assert.doesNotMatch(pageBoot,/dropbeat-dance-v1-09/);

for(const token of ['Coach Results','Class Type','data-uc110-class-type','mode,classType','state.growthData','state.calendarData','Class breakdown','Failed transactions','uc110Analytics','uc110Calendar'])assert.ok(analyticsJs.includes(token),`analytics UI must include ${token}`);
for(const token of ["mode==='business'","mode==='visitors'","mode==='leads'","mode==='coaches'",'analytics_class_type','analytics_coach_id','private, no-store'])assert.ok(analyticsApi.includes(token),`analytics API must include ${token}`);
for(const phrase of ['Public Batch Start Date','Hide after the start date','ongoing weekly batch','Recurring student reminders','One-time access check','coach is chosen'])assert.ok(adminJs.includes(phrase),`class help must explain ${phrase}`);
assert.match(adminCss,/\.db110-help-guide/);
assert.match(adminCss,/\.uc110-tooltip-breakdown/);

assert.match(publicCss,/\.db109-coach-browser>\[data-db109-coach-prev\]\{grid-column:1;grid-row:1\}/);
assert.match(publicCss,/\.db109-coach-browser>\.db107-coach-grid\{grid-column:2;grid-row:1/);
assert.match(publicCss,/\.db109-coach-browser>\[data-db109-coach-next\]\{grid-column:3;grid-row:1\}/);
assert.match(publicCss,/-webkit-line-clamp:2/);
for(const token of ['data-db109-extra-style','See more','See less','?1:matchMedia','?2:3','coachRenderSequence','v=1.13-'])assert.ok(publicJs.includes(token),`public coach browser must include ${token}`);
assert.match(read('functions/_lib/edge-response-cache.js'),/bootstrap-dropbeat-v113:home/);
assert.match(read('functions/api/public/products.js'),/products-dropbeat-v113/);

const publicHtml=fs.readdirSync(path.join(root,'public')).filter(name=>name.endsWith('.html'));
for(const name of publicHtml){const html=read(`public/${name}`);assert.doesNotMatch(html,/dropbeat=1\.09|v=1\.09/,`${name} must not retain the previous public cache version`);}

const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${file}`));

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql)}};
const request=query=>new Request(`https://example.test/api/admin/analytics?start=2026-09-01&end=2026-09-30${query}`);
const get=async query=>{const response=await getAnalytics({request:request(query),env});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};

const product=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const onlineProduct=Number(product.run('DB110-ON','Online Hip Hop','online-hip-hop','subscription','Online class','Online class',50000,40000,'INR','active','Popular','[]','All levels',1).lastInsertRowid);
const studioProduct=Number(product.run('DB110-OFF','Studio Bharatanatyam','studio-bharatanatyam','one_time','Studio class','Studio class',80000,70000,'INR','active','Premium','[]','All levels',2).lastInsertRowid);
const onlineCoach=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`).run('Ananya Rao','ananya-rao','Online Dance Coach','Coach','Online dance coach.','["Hip Hop"]','["mon","wed"]','["online_class","trial"]','active',1).lastInsertRowid);
const studioCoach=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`).run('Meera Nair','meera-nair','Studio Dance Coach','Senior Coach','Studio dance coach.','["Bharatanatyam"]','["tue","thu"]','["offline_class"]','active',2).lastInsertRowid);

const mapping=sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,class_time,duration_minutes,days_per_week,class_days_json,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
mapping.run(onlineProduct,1,'online_class','online_class','Online Hip Hop Morning',onlineCoach,'["Hip Hop"]','09:00',60,2,'["mon","wed"]','active');
mapping.run(studioProduct,1,'offline_class','offline_class','Studio Bharatanatyam',studioCoach,'["Bharatanatyam"]','10:00',90,2,'["tue","thu"]','active');

const order=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,gateway_subscription_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const onlineOrder=Number(order.run('DB110-ONLINE-1','Nisha','919900000001','nisha@example.test',40000,'INR','active','paid','subscription','stripe','sub_db110','2026-09-05 04:00:00','2026-09-05 04:00:00').lastInsertRowid);
const studioOrder=Number(order.run('DB110-STUDIO-1','Aditi','919900000002','aditi@example.test',70000,'INR','active','paid','one_time','razorpay','','2026-09-06 04:00:00','2026-09-06 04:00:00').lastInsertRowid);
const cancelledOrder=Number(order.run('DB110-STUDIO-CANCEL','Rhea','919900000003','rhea@example.test',70000,'INR','cancelled','cancelled','subscription','razorpay','sub_cancel','2026-09-07 04:00:00','2026-09-07 04:00:00').lastInsertRowid);
const failedOrder=Number(order.run('DB110-ONLINE-FAIL','Tara','919900000004','tara@example.test',40000,'INR','failed','failed','subscription','stripe','sub_fail','2026-09-08 04:00:00','2026-09-08 04:00:00').lastInsertRowid);
const item=sqlite.prepare(`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount_paise,total_count,status) VALUES(?,?,?,?,?,?,?)`);
item.run(onlineOrder,onlineProduct,'Online Hip Hop',1,40000,12,'active');item.run(studioOrder,studioProduct,'Studio Bharatanatyam',1,70000,1,'active');item.run(cancelledOrder,studioProduct,'Studio Bharatanatyam',1,70000,12,'cancelled');item.run(failedOrder,onlineProduct,'Online Hip Hop',1,40000,12,'failed');

const receipt=sqlite.prepare(`INSERT INTO payment_receipts(gateway,transaction_id,order_id,subscription_id,amount_paise,currency,status,payment_kind,paid_at_epoch,paid_at) VALUES(?,?,?,?,?,?,?,?,?,?)`);
receipt.run('stripe','pay_db110_1','DB110-ONLINE-1','sub_db110',40000,'INR','paid','subscription',1,'2026-09-05 05:00:00');
receipt.run('stripe','pay_db110_2','DB110-ONLINE-1','sub_db110',40000,'INR','paid','subscription',2,'2026-09-12 05:00:00');
receipt.run('razorpay','pay_db110_3','DB110-STUDIO-1','',70000,'INR','paid','one_time',3,'2026-09-06 05:00:00');
sqlite.prepare(`INSERT INTO refund_requests(order_id,provider,payment_id,refund_id,amount_paise,customer_name,customer_phone,reason,mode,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run('DB110-ONLINE-1','stripe','pay_db110_1','refund_db110',5000,'Nisha','919900000001','Partial refund','partial','processed','2026-09-15 05:00:00');

sqlite.prepare(`INSERT INTO visitor_events(visitor_id,path,source,created_at) VALUES(?,?,?,?)`).run('visitor-1','/','Google','2026-09-05 06:00:00');
sqlite.prepare(`INSERT INTO visitor_events(visitor_id,path,source,created_at) VALUES(?,?,?,?)`).run('visitor-2','/offers','Instagram','2026-09-05 06:05:00');
sqlite.prepare(`INSERT INTO contact_leads(name,phone,email,message,source,status,created_at) VALUES(?,?,?,?,?,?,?)`).run('Priya','919900000005','priya@example.test','Interested in an online trial class','Book a Trial','new','2026-09-05 07:00:00');
sqlite.prepare(`INSERT INTO contact_leads(name,phone,email,message,source,status,created_at) VALUES(?,?,?,?,?,?,?)`).run('','','','','Website','new','2026-09-05 07:05:00');

const business=await get('&mode=business&classType=all');
assert.equal(business.mode,'business');
assert.ok(business.rows.some(row=>row.category==='new_subscriber'&&row.class_type==='online_class'));
assert.ok(business.rows.some(row=>row.category==='renewal'&&row.class_type==='online_class'));
assert.ok(business.rows.some(row=>row.category==='one_time'&&row.class_type==='offline_class'));
assert.ok(business.rows.some(row=>row.category==='cancelled'&&row.class_type==='offline_class'));
assert.ok(business.rows.some(row=>row.category==='failed'&&row.class_type==='online_class'));
assert.ok(business.rows.some(row=>row.category==='refund'&&row.class_type==='online_class'));

const onlineBusiness=await get('&mode=business&classType=online_class');
assert.ok(onlineBusiness.rows.length>0);
assert.ok(onlineBusiness.rows.every(row=>row.class_type==='online_class'));
assert.ok(!onlineBusiness.rows.some(row=>row.category==='one_time'));

const visitors=await get('&mode=visitors');
assert.deepEqual(visitors.rows.map(row=>row.source).sort(),['Google','Instagram']);
assert.ok(!visitors.rows.some(row=>'category' in row));

const leads=await get('&mode=leads&classType=trial');
assert.equal(leads.rows.reduce((sum,row)=>sum+Number(row.count||0),0),1,'only the identified trial lead should be counted');
assert.ok(leads.rows.every(row=>row.class_type==='trial'));

const coaches=await get('&mode=coaches');
const ananya=coaches.rows.filter(row=>row.coach_name==='Ananya Rao');
const meera=coaches.rows.filter(row=>row.coach_name==='Meera Nair');
assert.ok(ananya.length,'online coach must receive coach-result rows');
assert.ok(meera.length,'studio coach must receive coach-result rows');
assert.ok(ananya.some(row=>row.new_subscribers===1));
assert.ok(ananya.some(row=>row.renewals===1));
assert.ok(ananya.some(row=>row.failed===1));
assert.ok(meera.some(row=>row.one_time===1));
assert.ok(meera.some(row=>row.cancelled===1));

const all=await get('');
for(const key of ['business','visitors','leads','coaches'])assert.ok(Array.isArray(all[key]),`calendar-compatible response must retain ${key}`);

console.log(`DropBeat V1.10 verification passed: isolated business/visitor/lead/coach analytics, class filters, detailed help, cache busting and visible responsive coach cards.`);
