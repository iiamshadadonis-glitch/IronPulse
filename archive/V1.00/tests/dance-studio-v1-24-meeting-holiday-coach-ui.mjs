import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {scheduleWebinar,listWebinars} from '../functions/_lib/marketing-suite.js';
import {coachRemunerationReport,saveCoachRemuneration,saveCoachSettings} from '../functions/_lib/coach-remuneration.js';
import {datePlus,getHolidayNoticeForAccount,indiaDate,processStudioHolidayNotifications,saveStudioHoliday} from '../functions/_lib/studio-schedule.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
const sqlite=new DatabaseSync(':memory:');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='studio_holiday_audience_deliveries'").get());
assert.ok(sqlite.prepare("SELECT name FROM pragma_table_info('coach_remuneration_terms') WHERE name='last_payment_date'").get());

class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'};

// Pending and otherwise unapproved portal accounts receive both portal and
// email deliveries. Leads, members and customers without accounts receive one
// deduplicated email delivery per address.
const pendingStudent=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source) VALUES('student','pending.v124@example.test','Pending Student','Pending Student','919100001240','pending','self_signup')").run().lastInsertRowid);
sqlite.prepare("INSERT INTO contact_leads(name,phone,email,message,source,status) VALUES('Pending Duplicate','919100001240','pending.v124@example.test','Existing account','website','new')").run();
sqlite.prepare("INSERT INTO contact_leads(name,phone,email,message,source,status) VALUES('Lead Recipient','919100001241','lead.v124@example.test','Lead','website','new')").run();
sqlite.prepare("INSERT INTO webinar_members(event_type,customer_name,customer_phone,customer_email,status) VALUES('demo','Member Recipient','919100001242','member.v124@example.test','current')").run();
sqlite.prepare("INSERT INTO orders(order_id,customer_name,customer_phone,customer_email) VALUES('V124-HOLIDAY-ORDER','Lead Recipient','919100001241','lead.v124@example.test')").run();
sqlite.prepare("INSERT INTO customers(name,phone,email) VALUES('Customer Recipient','919100001245','customer.v124@example.test')").run();
const holidayStart=datePlus(indiaDate(),4),noticeDate=datePlus(holidayStart,-1),holiday=await saveStudioHoliday(env,{eventName:'V1.24 Studio Holiday',startDate:holidayStart,subject:'Studio holiday notice',message:'The studio will be closed.'},'admin@example.test');
assert.equal(holiday.noticeDate,noticeDate);
const portalDeliveries=sqlite.prepare('SELECT channel,destination FROM studio_holiday_deliveries WHERE holiday_id=? AND account_id=? ORDER BY channel').all(holiday.id,pendingStudent);
assert.deepEqual(portalDeliveries.map(row=>row.channel),['email','portal']);
const audience=sqlite.prepare('SELECT destination FROM studio_holiday_audience_deliveries WHERE holiday_id=? ORDER BY destination').all(holiday.id);
assert.deepEqual(audience.map(row=>row.destination),['customer.v124@example.test','lead.v124@example.test','member.v124@example.test']);
const pendingNotice=await getHolidayNoticeForAccount(env,pendingStudent,noticeDate);
assert.equal(pendingNotice?.eventName,'V1.24 Studio Holiday');
const dueHoliday=await saveStudioHoliday(env,{eventName:'Due Holiday',startDate:indiaDate(),subject:'Holiday today',message:'The studio is closed today.'},'admin@example.test');
sqlite.prepare("INSERT INTO contact_leads(name,phone,email,message,source,status) VALUES('Late Lead','919100001247','late.v124@example.test','Added after holiday creation','website','new')").run();
const deliveryRun=await processStudioHolidayNotifications(env,{holidayId:dueHoliday.id,limit:100});
assert.ok(deliveryRun.processed>0);
assert.ok(sqlite.prepare('SELECT id FROM studio_holiday_audience_deliveries WHERE holiday_id=? AND recipient_key=?').get(dueHoliday.id,'late.v124@example.test'));

// Offline scheduling exercises the complete event/member persistence path
// without requiring an external meeting provider and confirms that the new
// event is returned to the Scheduled Events workspace.
const startsAt=`${datePlus(indiaDate(),5)}T10:00:00+05:30`;
const scheduled=await scheduleWebinar(env,{title:'V1.24 Demo Session',eventType:'demo',deliveryMode:'offline',provider:'offline',customerName:'Demo Customer',customerPhone:'919100001243',startsAt,durationMinutes:45,timezone:'Asia/Kolkata',reminders:[]});
assert.ok(Number(scheduled.id)>0);
const events=await listWebinars(env);
assert.ok(events.some(row=>Number(row.id)===Number(scheduled.id)&&row.event_type==='demo'&&row.status==='scheduled'));

// Coach Details exposes the approved amount, effective leave rule, allowance
// and the saved last-payment date.
const coachAccount=Number(sqlite.prepare("INSERT INTO portal_accounts(role,email,display_name,real_name,phone,status,approval_source) VALUES('coach','coach.v124@example.test','V124 Coach','V124 Coach','919100001244','active','admin')").run().lastInsertRowid);
const coachId=Number(sqlite.prepare(`INSERT INTO dance_coaches(name,slug,designation,dance_styles_json,availability_json,class_types_json,portal_account_id,status) VALUES('V124 Coach','v124-coach','Dance Coach','["Hip Hop"]','["mon"]','["online_class"]',?,'active')`).run(coachAccount).lastInsertRowid);
sqlite.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,availability_days_json,availability_slots_json,class_types_json,application_status) VALUES(?,?,'Dance Coach','["mon"]','[{"day":"mon","start":"10:00","end":"11:00"}]','["online_class"]','approved')`).run(coachAccount,coachId);
await saveCoachSettings(env,{leaveRulesEnabled:true,paidLeavesPerMonth:2,deductionMethod:'per_session'});
await saveCoachRemuneration(env,{coachId,remunerationType:'per_session',rateRupees:750,effectiveFrom:indiaDate(),lastPaymentDate:indiaDate(),leaveCalculationEnabled:true},'admin@example.test');
await saveCoachRemuneration(env,{coachId,remunerationType:'per_session',rateRupees:750,effectiveFrom:indiaDate(),leaveCalculationEnabled:true},'admin@example.test');
const remuneration=(await coachRemunerationReport(env,{coachId,from:indiaDate(),to:indiaDate()})).rows[0];
assert.equal(remuneration.ratePaise,75000);
assert.equal(remuneration.paidLeavesPerMonth,2);
assert.equal(remuneration.lastPaymentDate,indiaDate());

const meetingUi=read('public/admin/final-v16-99-visitors-email-studio.js'),scheduleUi=read('public/admin/dropbeat-admin-v1-19.js'),settingsUi=read('public/admin/dropbeat-admin-v1-22.js'),layout=read('public/admin/dropbeat-admin-v1-24.css'),adminHtml=read('public/admin/index.html');
const immediateOpen=meetingUi.indexOf('modal=openSchedule98(config)'),capabilityRequest=meetingUi.indexOf("request('/api/admin/marketing-suite?mode=webinars')",immediateOpen);
assert.ok(immediateOpen>0&&capabilityRequest>immediateOpen,'Schedule Meeting must open before the non-blocking capability refresh');
assert.match(meetingUi,/event\.key==='Escape'/);
assert.match(meetingUi,/if\(submit&&modal\.isConnected\)/);
assert.match(meetingUi,/data\.eventType=config\.eventType/);
assert.match(meetingUi,/data\.deliveryMode=config\.delivery/);
assert.match(layout,/#studioSchedule \.db120-subtabs>button/);
assert.match(layout,/#coachSettings \.db123-flip-front/);
assert.match(layout,/overflow:hidden/);
assert.match(layout,/db124-save-coach-settings/);
assert.match(settingsUi,/Last Payment Date \(optional\)/);
assert.match(scheduleUi,/Paid Leaves \/ Month/);
assert.match(scheduleUi,/Last Payment Date/);
assert.match(scheduleUi,/all student and coach accounts, plus saved lead and customer email addresses/);
assert.match(adminHtml,/dropbeat-admin-v1-24\.css\?v=1\.24/);
assert.match(adminHtml,/final-v16-99-visitors-email-studio\.js\?v=16\.99&cache=17\.04&dropbeat=1\.25/);

console.log('DropBeat V1.24 verified: Schedule Meeting opens without a blocking preflight, scheduled events persist, holiday notices reach every saved audience without duplicates, compact layout overrides load, and coach remuneration/leave/payment details are exposed.');
