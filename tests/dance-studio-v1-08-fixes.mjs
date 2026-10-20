import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {
  ensureDanceStudioSchema,
  getDanceCoachImpact,
  listClassWorkspace,
  reorderDanceCoach,
  saveDanceCoach,
  saveOrderClassAssignment,
  saveProductClassMapping,
  saveSessionOverride,
  setDanceCoachStatus,
  syncDanceMembershipsFromRecentOrders
} from '../functions/_lib/dance-studio.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.08']);

const adminHtml=read('public/admin/index.html'),adminJs=read('public/admin/dropbeat-admin-v1-13.js'),adminCss=read('public/admin/dropbeat-admin-v1-13.css'),publicJs=read('public/assets/dropbeat-dance-v1-13.js');
assert.match(adminHtml,/dropbeat-admin-v1-13\.js\?v=1\.29/);
assert.doesNotMatch(adminHtml,/dropbeat-admin-v1-07\.js/);
for(const phrase of ['Class or Event Details','Enable class details','Public Batch Start Date Optional','Hide after the start date','One-Time Class Access','Class Access Start Date','Class Access End Date','Replacement Coach'])assert.ok(adminJs.includes(phrase),`V1.08 admin must include ${phrase}`);
assert.doesNotMatch(adminJs,/Class, Batch &amp; Coach Mapping|Link this plan/);
for(const style of ['Mohiniyattam','Andhra Natyam','Yakshagana','Karagattam','Dollu Kunitha'])assert.ok(adminJs.includes(style),`V1.08 must include ${style}`);
for(const selector of ['.db108-switch','.db107-choice:disabled','.db108-coach-order','.db108-member-grid','.db108-impact-grid'])assert.ok(adminCss.includes(selector),`V1.08 CSS must include ${selector}`);
assert.match(read('public/assets/page-boot.js'),/dropbeat-dance-v1-13\.js\?v=1.13/);
assert.match(publicJs,/promotional_until_start/);
assert.match(publicJs,/heading:'Ongoing batch',date:`Started/);
assert.match(read('public/assets/final-v16-5-order-otp-retry.js'),/Today is the last day|Access ends today/);
assert.match(read('functions/api/admin/custom-subscription.js'),/saveOrderClassAssignment/);
assert.match(read('functions/api/admin/custom-payment.js'),/requireAccessDates|class_access_start_date|saveOrderClassAssignment/);
assert.match(read('functions/api/my-orders.js'),/class_access/);

const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};
await ensureDanceStudioSchema(env);
for(const table of ['order_class_assignments','class_assignment_session_overrides'])assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table),`${table} must exist`);
for(const column of ['class_assignment_id','access_end_date','payment_mode'])assert.ok(sqlite.prepare('PRAGMA table_info(webinar_members)').all().some(item=>item.name===column),`webinar_members.${column} must exist`);

const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),dayNames=['sun','mon','tue','wed','thu','fri','sat'],todayDay=dayNames[new Date(`${today}T12:00:00Z`).getUTCDay()];
const coachA=await saveDanceCoach(env,{name:'Ananya Rao',designation:'Senior Coach',badge:'Coach',bio:'Teaches movement, expression and technique.',dance_styles:['Bharatanatyam','Kuchipudi'],availability:[...new Set(['mon','wed','fri',todayDay])],status:'active'});
const coachB=await saveDanceCoach(env,{name:'Meera Iyer',designation:'Dance Coach',badge:'Coach',bio:'Teaches classical and contemporary dance.',dance_styles:['Mohiniyattam','Contemporary'],availability:['sun','mon','tue','wed','thu','fri','sat'],status:'active'});
const product=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('DB108-CLASS','Classical Dance Membership','classical-dance-membership','subscription','Weekly classes.','A recurring classical dance class.',59900,39900,'INR','active','Popular','[]','All levels',1);
const productId=Number(product.lastInsertRowid);
let mapping=await saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'online_class',class_name:'Classical Morning Batch',coach_id:coachA,dance_styles:['Bharatanatyam','Kuchipudi'],schedule_start_date:today,start_mode:'promotional_until_start',class_time:'09:00',duration_minutes:60,days_per_week:1,class_days:[todayDay],reminders_enabled:true,reminder_channels:['email'],reminder_minutes_before:30});
assert.equal(mapping.start_mode,'promotional_until_start');
mapping=await saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'online_class',class_name:'Classical Morning Batch',coach_id:coachA,dance_styles:['Bharatanatyam','Kuchipudi'],schedule_start_date:today,start_mode:'fixed_visible',class_time:'09:00',duration_minutes:60,days_per_week:1,class_days:[todayDay]});
assert.equal(mapping.start_mode,'fixed_visible');

const subscriptionOrder=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB108-SUB-1','Aditi Shah','919900000001','aditi@example.test',29900,'INR','active','paid','subscription','stripe');
const subscriptionAssignment=await saveOrderClassAssignment(env,{orderPk:Number(subscriptionOrder.lastInsertRowid),orderReference:'DB108-SUB-1',paymentMode:'subscription',input:{class_details_enabled:true,class_type:'online_class',class_name:'Private Classical Group',coach_id:coachA,dance_styles_json:'["Bharatanatyam","Kuchipudi"]',schedule_start_date:today,start_mode:'fixed_visible',class_time:'09:00',duration_hours:1,duration_remainder_minutes:0,days_per_week:1,class_days_json:JSON.stringify([todayDay]),reminders_enabled:true,reminder_channels_json:'["email"]',reminder_minutes_before:20}});
assert.ok(subscriptionAssignment.id>0);
let sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB108-SUB-1'});assert.equal(sync.processed,1);assert.equal(sync.changes[0].status,'current');
let member=sqlite.prepare("SELECT * FROM webinar_members WHERE order_reference='DB108-SUB-1'").get();assert.equal(member.class_assignment_id,subscriptionAssignment.id);assert.equal(member.coach_id,coachA);assert.equal(member.enrollment_source,'manual_payment_link');
let workspace=await listClassWorkspace(env,{eventType:'online_class',month:today.slice(0,7)});assert.ok(workspace.occurrences.some(item=>item.assignmentId===subscriptionAssignment.id&&item.memberCount===1));assert.equal(workspace.members.find(item=>item.id===member.id).coach_name,'Ananya Rao');
await saveSessionOverride(env,{assignmentId:subscriptionAssignment.id,sessionDate:today,status:'rescheduled',startsAt:new Date(`${today}T11:30:00+05:30`).toISOString(),durationMinutes:75,coachId:coachA,notifyStudents:false});
workspace=await listClassWorkspace(env,{eventType:'online_class',month:today.slice(0,7)});assert.ok(workspace.occurrences.some(item=>item.assignmentId===subscriptionAssignment.id&&item.durationMinutes===75));

const oneTimeOrder=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB108-ONE-1','Riya Sen','919900000002','riya@example.test',19900,'INR','completed','paid','one_time','razorpay');
await assert.rejects(()=>saveOrderClassAssignment(env,{orderPk:Number(oneTimeOrder.lastInsertRowid),orderReference:'DB108-ONE-1',paymentMode:'one_time',input:{class_details_enabled:true,class_name:'Short Workshop',class_type:'offline_class',dance_styles:['Bollywood'],days_per_week:1,class_days:[todayDay]}}),/start date and class access end date|both the class access start date/i);
const tomorrow=new Date(`${today}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const tomorrowDate=tomorrow.toISOString().slice(0,10);
const oneTimeAssignment=await saveOrderClassAssignment(env,{orderPk:Number(oneTimeOrder.lastInsertRowid),orderReference:'DB108-ONE-1',paymentMode:'one_time',input:{class_details_enabled:true,class_name:'Short Workshop',class_type:'offline_class',coach_id:coachA,dance_styles:['Bharatanatyam'],class_time:'17:00',days_per_week:1,class_days:[todayDay],class_access_start_date:today,class_access_end_date:tomorrowDate}});
sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB108-ONE-1'});assert.equal(sync.changes[0].status,'current');
member=sqlite.prepare("SELECT * FROM webinar_members WHERE order_reference='DB108-ONE-1'").get();assert.equal(member.access_end_date,tomorrowDate);assert.equal(member.payment_mode,'one_time');
sqlite.prepare('UPDATE order_class_assignments SET access_end_date=? WHERE id=?').run('2020-01-01',oneTimeAssignment.id);
sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB108-ONE-1'});assert.equal(sync.changes[0].status,'past');assert.equal(sync.changes[0].expired,true);assert.match(sqlite.prepare('SELECT membership_reason FROM webinar_members WHERE id=?').get(member.id).membership_reason,/access ended/i);

const impact=await getDanceCoachImpact(env,coachA);assert.ok(impact.totalActiveAssignments>0);await assert.rejects(()=>setDanceCoachStatus(env,{id:coachA,status:'draft'}),/replacement coach/i);
await setDanceCoachStatus(env,{id:coachA,status:'draft',replacementCoachId:coachB});
assert.equal(sqlite.prepare('SELECT coach_id FROM product_class_mappings WHERE product_id=?').get(productId).coach_id,coachB);
assert.equal(sqlite.prepare('SELECT coach_id FROM order_class_assignments WHERE id=?').get(subscriptionAssignment.id).coach_id,coachB);
assert.equal(sqlite.prepare("SELECT coach_id FROM webinar_members WHERE order_reference='DB108-SUB-1'").get().coach_id,coachB);
assert.equal(sqlite.prepare('SELECT status FROM dance_coaches WHERE id=?').get(coachA).status,'draft');
await reorderDanceCoach(env,{id:coachB,direction:'up'});

console.log(`DropBeat V1.08 verification passed: ${migrations.length} migrations, start-date modes, manual class links, one-time expiry, calendars, coach visibility and replacement continuity.`);
