import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {attendanceReport,recordStudentAttendance,studentAttendanceProfile} from '../functions/_lib/portal-attendance.js';
import {syncDanceMembershipsFromRecentOrders} from '../functions/_lib/dance-studio.js';
import {applyCoachLeave,coachScheduleDetails,listStudioScheduleAdmin,reviewCoachLeave,saveStudioHoliday} from '../functions/_lib/studio-schedule.js';
import {ensureSchema} from '../functions/_lib/schema.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://studio.example.test',PUBLIC_SITE_URL:'https://studio.example.test',ADMIN_DEVELOPMENT_BYPASS:'true'};
await ensureSchema(env);

const coachAccountId=Number(sqlite.prepare(`INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source,approved_at) VALUES('coach','coach.v119@example.test','Manisha Coach','Manisha Coach','919100000119','active','admin',CURRENT_TIMESTAMP)`).run().lastInsertRowid);
const coachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order,portal_account_id,contact_email,experience) VALUES('Manisha Coach','manisha-coach','Senior Dance Coach','Coach','Coach profile','["Hip Hop","Contemporary"]','["mon","tue","wed"]','["online_class"]','active',1,?,'coach.v119@example.test','Eight years')`).run(coachAccountId).lastInsertRowid);
sqlite.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,badge,bio,experience,specialties_json,availability_days_json,availability_slots_json,class_types_json,application_status) VALUES(?,?,'Senior Dance Coach','Coach','Coach profile','Eight years','["Hip Hop","Contemporary"]','["mon","tue","wed"]','[]','["online_class"]','approved')`).run(coachAccountId,coachId);

const productId=Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,features_json) VALUES('DB119-FIRST','First Enrolment Batch','first-enrolment-batch','subscription','Test','Test',50000,40000,'INR','active','[]')`).run().lastInsertRowid);
sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,schedule_start_date,start_mode,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,location_or_link,reminders_enabled,reminder_plan_json,status) VALUES(?,1,'online_class','online_class','First Enrolment Batch',?,'["Hip Hop"]','','purchase_date','10:00',60,3,'["mon","tue","wed"]','Asia/Kolkata','online','',0,'[]','active')`).run(productId,coachId);
const orderPk=Number(sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,payment_mode,gateway,created_at,updated_at) VALUES('DB119-OCT8','Thursday Buyer','919200000119','buyer.v119@example.test',40000,'INR','paid','paid','subscription','razorpay','2026-10-08T05:00:00.000Z','2026-10-08T05:00:00.000Z')`).run().lastInsertRowid);
sqlite.prepare(`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount_paise,status) VALUES(?,?,?,1,40000,'active')`).run(orderPk,productId,'First Enrolment Batch');
await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB119-OCT8'});
const firstMember=sqlite.prepare(`SELECT * FROM webinar_members WHERE order_reference='DB119-OCT8'`).get();
assert.equal(firstMember.start_date,'2026-10-12','a Thursday first purchase must advance to the next permitted Monday');

const september=await attendanceReport(env,{from:'2026-09-01',to:'2026-09-30'});
assert.equal(september.sessions.filter(row=>row.className==='First Enrolment Batch').length,0,'a first-enrolment batch must not appear before its first student start');
const october=await attendanceReport(env,{from:'2026-10-01',to:'2026-10-14'});
assert.deepEqual(october.sessions.filter(row=>row.className==='First Enrolment Batch').map(row=>row.date),['2026-10-12','2026-10-13','2026-10-14']);

const explicitProductId=Number(sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,features_json) VALUES('DB119-EXPLICIT','September Batch','september-batch','subscription','Test','Test',50000,40000,'INR','active','[]')`).run().lastInsertRowid);
sqlite.prepare(`INSERT INTO product_class_mappings(product_id,enabled,class_type,event_type,class_name,coach_id,dance_styles_json,schedule_start_date,start_mode,class_time,duration_minutes,days_per_week,class_days_json,timezone,delivery_mode,location_or_link,reminders_enabled,reminder_plan_json,status) VALUES(?,1,'online_class','online_class','September Batch',?,'["Contemporary"]','2026-09-28','fixed_batch','09:00',75,3,'["mon","tue","wed"]','Asia/Kolkata','online','',0,'[]','active')`).run(explicitProductId,coachId);
const explicitSeptember=await attendanceReport(env,{from:'2026-09-01',to:'2026-09-30'});
assert.deepEqual(explicitSeptember.sessions.filter(row=>row.className==='September Batch').map(row=>row.date),['2026-09-28','2026-09-29','2026-09-30'],'an explicit 28 September batch must never backfill earlier September weekdays');

const studentAccountId=Number(sqlite.prepare(`INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source,approved_at) VALUES('student','history.v119@example.test','Attendance Student','Attendance Student','919300000119','active','payment',CURRENT_TIMESTAMP)`).run().lastInsertRowid);
const historyMemberId=Number(sqlite.prepare(`INSERT INTO webinar_members(event_type,customer_name,customer_phone,customer_email,class_time,fees_paid_paise,status,last_payment_at,start_date,duration_minutes,days_per_week,class_days_json,plan_name,product_id,coach_id,order_reference,dance_styles_json,payment_status,payment_mode) VALUES('online_class','Attendance Student','919300000119','history.v119@example.test','09:00',40000,'current','2026-09-01','2026-09-01',75,3,'["mon","tue","wed"]','September Batch',?,?,'DB119-HISTORY','["Contemporary"]','paid','subscription')`).run(explicitProductId,coachId).lastInsertRowid);
const studentAccount=sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(studentAccountId);
await recordStudentAttendance(env,studentAccount,{memberId:historyMemberId,productId:explicitProductId,assignmentId:0,className:'September Batch',eventType:'online_class',durationMinutes:75,coach:{id:coachId,name:'Manisha Coach'}},'2026-09-28','2026-09-28T03:30:00.000Z');
const profile=await studentAttendanceProfile(env,{accountId:studentAccountId,memberId:historyMemberId});
assert.equal(profile.summary.totalAttended,1);assert.ok(profile.summary.totalScheduled>=1);assert.equal(profile.student.membershipStartDate,'2026-09-01');

const leave=await applyCoachLeave(env,sqlite.prepare('SELECT * FROM portal_accounts WHERE id=?').get(coachAccountId),{leaveType:'planned',purpose:'Family commitment',fromDate:'2026-10-14',toDate:'2026-10-14',reason:'Unavailable for the scheduled class.'});
await reviewCoachLeave(env,{leaveId:leave.id,status:'approved',adminEmail:'admin@example.test'});
const holiday=await saveStudioHoliday(env,{eventName:'Festival Holiday',startDate:'2026-10-13',subject:'Studio holiday tomorrow',message:'The studio will remain closed for the festival.'},'admin@example.test');
assert.equal(holiday.noticeDate,'2026-10-12');
const blocked=await attendanceReport(env,{from:'2026-10-12',to:'2026-10-14'});
assert.equal(blocked.sessions.find(row=>row.className==='First Enrolment Batch'&&row.date==='2026-10-13').status,'holiday');
assert.equal(blocked.sessions.find(row=>row.className==='First Enrolment Batch'&&row.date==='2026-10-14').status,'leave');
assert.ok(blocked.markers.some(row=>row.date==='2026-10-13'&&row.type==='holiday'));
assert.ok(blocked.markers.some(row=>row.date==='2026-10-14'&&row.type==='leave'));
const overview=await listStudioScheduleAdmin(env);assert.ok(overview.coaches.some(row=>row.id===coachId));assert.equal(overview.leaves.upcoming.length,1);assert.equal(overview.holidays.upcoming.length,1);
const coachDetails=await coachScheduleDetails(env,coachId);assert.equal(coachDetails.coach.name,'Manisha Coach');assert.ok(coachDetails.schedule.length>=2);assert.equal(coachDetails.summary.currentStudents,2);assert.equal(coachDetails.currentStudents.some(row=>row.memberId===historyMemberId),true);
const idleCoachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,badge,bio,dance_styles_json,availability_json,class_types_json,status,sort_order) VALUES('Idle Coach','idle-coach','Dance Coach','Coach','','["Kathak"]','[]','["offline_class"]','draft',9)`).run().lastInsertRowid),withIdle=await listStudioScheduleAdmin(env),idle=withIdle.coaches.find(row=>row.id===idleCoachId);assert.ok(idle,'a coach without a schedule must still be listed');assert.equal(idle.sessionCount,0);

const attendanceJs=read('public/admin/dropbeat-admin-v1-16.js'),adminCss=read('public/admin/dropbeat-admin-v1-19.css'),scheduleJs=read('public/admin/dropbeat-admin-v1-19.js'),coachHtml=read('public/coach-dashboard.html'),studentHtml=read('public/student-dashboard.html');
for(const phrase of ['Class / Event Name','Duration','Coach Attendance','db119-selected-card','data-coach-detail','studentProfile'])assert.match(attendanceJs,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(adminCss,/min-width:1120px/);assert.match(adminCss,/table-layout:fixed/);assert.match(scheduleJs,/Add Holiday/);assert.match(scheduleJs,/Current Students/);assert.match(scheduleJs,/Past Students/);assert.match(scheduleJs,/Deny Leave Request/);assert.match(coachHtml,/Apply for Leave/);assert.match(coachHtml,/portal-schedule-v1-19/);assert.match(studentHtml,/portal-schedule-v1-19/);

console.log('DropBeat V1.19 verified: effective batch starts, non-backfilled attendance, fixed grids, clickable profiles, coach schedules, leave approvals, holiday markers and portal notices.');
