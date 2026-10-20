import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {
  removeClassMember,
  saveProductClassMapping,
  syncDanceMembershipsFromRecentOrders,
  validateProductClassDetails
} from '../functions/_lib/dance-studio.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));

assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.equal(pkg.scripts['test:dance-v1.11'],'node tests/dance-studio-v1-11-fixes.mjs && npm run test:dance-v1.10');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const adminHtml=read('public/admin/index.html');
const adminJs=read('public/admin/dropbeat-admin-v1-13.js');
const adminCss=read('public/admin/dropbeat-admin-v1-13.css');
const publicJs=read('public/assets/dropbeat-dance-v1-13.js');
const publicCss=read('public/assets/dropbeat-dance-v1-13.css');
const pageBoot=read('public/assets/page-boot.js');
const danceLib=read('functions/_lib/dance-studio.js');
const productsApi=read('functions/api/admin/products.js');
const ordersApi=read('functions/api/my-orders.js');

assert.match(adminHtml,/dropbeat-admin-v1-13\.css\?v=1\.13/);
assert.match(adminHtml,/dropbeat-admin-v1-13\.js\?v=1\.29/);
assert.doesNotMatch(adminHtml,/dropbeat-admin-v1-10\.(?:css|js)/);
assert.match(pageBoot,/dropbeat-dance-v1-13\.css\?v=1\.13/);
assert.match(pageBoot,/dropbeat-dance-v1-13\.js\?v=1\.13/);
assert.doesNotMatch(pageBoot,/dropbeat-dance-v1-10/);
assert.match(read('functions/_lib/edge-response-cache.js'),/bootstrap-dropbeat-v113:home/);
assert.match(read('functions/api/public/products.js'),/products-dropbeat-v113/);

for(const token of [
  'coachDateError','enforceCoachDate','Public Batch Start Date','Unavailable dates are rejected',
  'data-db111-feature-input','maxlength="80"','data-db111-feature-add','data-db111-feature-remove',
  'data-db111-plan-access','Class Start Date *','Class End Date *','remove_class_member',
  'Type <strong>REMOVE</strong>','Payment / Status Date','Status Date'
])assert.ok(adminJs.includes(token),`V1.11 admin controller must include ${token}`);

for(const token of [
  '.db111-feature-grid','.db111-student-grid','.db111-student-count','.db111-plan-access',
  '.db111-member-grid','.db107-event-row{grid-template-columns'
])assert.ok(adminCss.includes(token),`V1.11 admin styles must include ${token}`);

for(const token of [
  "heading:'New batch starts'",'Enrolment is open now','db111-start-lines',
  '<strong>Class days</strong>','<strong>Batch time</strong>','<strong>Duration</strong>',
  'today>date)return null','subject to coach and class availability','latest official ${H(brandName())} notice'
])assert.ok(publicJs.includes(token),`V1.11 public controller must include ${token}`);

for(const token of [
  '.db111-start-lines','#offerDetail .uc-offer-detail-title-row h1',
  '#offerDetail .uc-offer-book-card h2','#offerDetail .uc-offer-about h2',
  '#offerDetail .uc-recommended h2'
])assert.ok(publicCss.includes(token),`V1.11 public styles must include ${token}`);

for(const token of [
  'weekdayForDate','must fall on one of',
  'access_start_date','access_end_date','removeClassMember','removed_by_admin',
  "trim(m.access_end_date)<>''"
])assert.ok(danceLib.includes(token),`V1.11 class service must include ${token}`);
for(const token of ['planFeatures','slice(0,80)','validateProductClassDetails','Class or Event Details are required for a one-time payment plan'])assert.ok(productsApi.includes(token),`V1.11 product API must include ${token}`);
for(const token of ['class_access','last day of your one-time class access','contact_url','pm.access_start_date','pm.access_end_date'])assert.ok(ordersApi.includes(token),`V1.11 Track Order API must include ${token}`);
assert.match(read('migrations/0047_dropbeat_plan_access_dates.sql'),/ADD COLUMN access_start_date/);
assert.match(read('migrations/0047_dropbeat_plan_access_dates.sql'),/ADD COLUMN access_end_date/);

for(const relative of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(relative);
  assert.doesNotMatch(source,/dropbeat=1\.10|v=1\.10/,`${relative} must not emit stale V1.10 cache URLs`);
  assert.match(source,/dropbeat=1\.29|v=1\.13/,`${relative} must emit V1.11 cache URLs`);
}

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

const coachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
  'Ananya Rao','ananya-rao','Dance Coach','Coach','Kuchipudi coach.','["Kuchipudi"]','["mon","tue","wed"]','["online_class"]','active',1
).lastInsertRowid);

const baseClass={
  class_mapping_enabled:1,
  payment_type:'subscription',
  class_name:'Beginner Kuchipudi',
  class_type:'online_class',
  coach_id:coachId,
  dance_styles_json:'["Kuchipudi"]',
  days_per_week:3,
  class_days_json:'["mon","tue","wed"]',
  class_time:'10:00',
  duration_hours:1,
  duration_remainder_minutes:0,
  timezone:'Asia/Kolkata'
};

await assert.rejects(
  validateProductClassDetails(env,{...baseClass,schedule_start_date:'2026-09-27'}),
  /Public Batch Start Date must fall on one of Ananya Rao’s available days: Monday, Tuesday, Wednesday/
);
const validClass=await validateProductClassDetails(env,{...baseClass,schedule_start_date:'2026-09-28'});
assert.equal(validClass.scheduleStart,'2026-09-28');
await assert.rejects(
  validateProductClassDetails(env,{...baseClass,payment_type:'one_time'},{requireAccessDates:true}),
  /Choose both the class access start date and class access end date/
);

const productId=Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,sort_order,payment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  'DB111-KUCHI','Beginner Kuchipudi','beginner-kuchipudi','subscription','Beginner sessions.','Instructor-led Kuchipudi classes.',50000,40000,'INR','active','New Batch','["Live coaching","Weekly classes"]','Beginners',1,'one_time'
).lastInsertRowid);

await saveProductClassMapping(env,productId,{
  ...baseClass,
  payment_type:'one_time',
  schedule_start_date:'2026-09-01',
  start_mode:'promotional_until_start',
  class_access_start_date:'2026-09-01',
  class_access_end_date:'2026-09-02'
});
const mapping=sqlite.prepare('SELECT * FROM product_class_mappings WHERE product_id=?').get(productId);
assert.equal(mapping.access_start_date,'2026-09-01');
assert.equal(mapping.access_end_date,'2026-09-02');
assert.equal(mapping.start_mode,'promotional_until_start');

const orderPk=Number(sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(
  'DB111-ONE-TIME','Priya','919900001111','priya@example.test',40000,'INR','active','paid','one_time','razorpay'
).lastInsertRowid);
sqlite.prepare(`INSERT INTO order_items(order_id,product_id,product_name,variant_name,quantity,unit_amount_paise,total_count,status) VALUES(?,?,?,?,?,?,?,?)`).run(
  orderPk,productId,'Beginner Kuchipudi','One Month',1,40000,1,'active'
);
const sync=await syncDanceMembershipsFromRecentOrders(env,{lookbackDays:1});
assert.ok(sync.changes.some(change=>change.orderId==='DB111-ONE-TIME'&&change.expired&&change.status==='past'));
const expired=sqlite.prepare('SELECT * FROM webinar_members WHERE order_reference=?').get('DB111-ONE-TIME');
assert.equal(expired.status,'past');
assert.match(expired.membership_reason,/One-time class access ended on 2026-09-02/);
assert.ok(expired.moved_to_past_at);

const memberId=Number(sqlite.prepare(`INSERT INTO webinar_members(event_type,customer_name,customer_phone,status,order_reference,payment_status,plan_name) VALUES(?,?,?,?,?,?,?)`).run(
  'online_class','Rhea','919900002222','current','DB111-MANUAL','paid','Beginner Kuchipudi'
).lastInsertRowid);
await assert.rejects(removeClassMember(env,{memberId,eventType:'online_class',confirmation:'NO'}),/Type REMOVE/);
const removed=await removeClassMember(env,{memberId,eventType:'online_class',confirmation:'REMOVE'});
assert.equal(removed.status,'past');
const archivedMember=sqlite.prepare('SELECT status,payment_status,moved_to_past_at FROM webinar_members WHERE id=?').get(memberId);
assert.equal(archivedMember.status,'past');
assert.equal(archivedMember.payment_status,'removed_by_admin');
assert.ok(archivedMember.moved_to_past_at);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM class_member_status_events WHERE member_id=? AND new_status='past'").get(memberId).n,1);

console.log('DropBeat V1.11 verification passed: coach-safe dates, one-time plan expiry, dynamic plan features, public schedule hierarchy, student roster removal, status dates and V1.11 cache busting.');
