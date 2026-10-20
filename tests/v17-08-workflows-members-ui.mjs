import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { addWebinarMember, listWebinarMembers } from '../functions/_lib/marketing-suite.js';
import { emailAutomationTemplates } from '../functions/_lib/email-automations.js';

const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('public/admin/index.html');
const ui=read('public/admin/final-v17-05-email-automations.js');
const patchUi=read('public/admin/final-v17-08-workflows-members-ui.js');
const css=read('public/admin/final-v17-08-workflows-members-ui.css');
const marketing=read('functions/_lib/marketing-suite.js');
const api=read('functions/api/admin/marketing-suite.js');

assert.match(index,/final-v17-08-workflows-members-ui\.css\?v=17\.08/);
assert.match(index,/final-v17-08-workflows-members-ui\.js\?v=17\.08/);
assert.match(css,/#uc1706EmailProviders\{display:contents!important\}/,'Provider cards must participate directly in the existing Gmail card stack.');
assert.match(css,/min-height:58px!important/,'Provider summary height must match the existing compact Email & OTP rows.');
assert.match(css,/font-size:18px!important/,'Provider title typography must match the existing integration titles.');
assert.match(css,/uc1708-branches/,'Condition paths need a two-branch layout.');
assert.match(ui,/uc1708-branch-label">Yes/);
assert.match(ui,/uc1708-branch-label">No/);
assert.match(ui,/uc1708-email-followup-active/,'Lead Email Follow-up must own a platform-free landing state.');
assert.match(ui,/Connected to Contacts CRM/,'Birthday trigger must explain its saved Date of Birth source.');
assert.match(patchUi,/\+ Add New Member/);
assert.match(patchUi,/Select exactly/);
assert.match(patchUi,/Asia\/Kolkata/);
assert.match(patchUi,/data-day=/);
assert.match(marketing,/webinar_member_reminders/);
assert.match(marketing,/Trial period ended/);
assert.match(marketing,/Subscription cancelled or payment failed/);
assert.match(api,/action==='add_webinar_member'/);

const birthday=emailAutomationTemplates().find(x=>x.id==='birthday');
assert.ok(birthday,'Birthday automation template must exist.');
assert.equal(birthday.triggerType,'birthday');
assert.equal(birthday.steps[1].type,'delay');
assert.equal(birthday.steps[1].config.amount,3);
assert.equal(birthday.steps[1].config.unit,'days');
const webinar=emailAutomationTemplates().find(x=>x.id==='webinar');
const attendance=webinar.steps.find(x=>x.config?.rules?.some(r=>r.field==='webinar_attended'));
assert.equal(attendance.config.trueAction,'continue');
assert.equal(attendance.config.falseAction,'jump');

const db=new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE customers(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,email TEXT);
  CREATE TABLE subscribers(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,email TEXT,plan_name TEXT,subscription_status TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE orders(id INTEGER PRIMARY KEY,customer_phone TEXT,customer_email TEXT,amount_paise INTEGER DEFAULT 0,payment_status TEXT DEFAULT '',updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,name TEXT,phone TEXT,email TEXT,date_of_birth TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},run(){const out=db.prepare(sql).run(...args);return{meta:{changes:Number(out.changes),last_row_id:Number(out.lastInsertRowid||0)}};},first(){return db.prepare(sql).get(...args)||null;},all(){return{results:db.prepare(sql).all(...args)}}};}};
const env={DB};
const added=await addWebinarMember(env,{eventType:'online_class',customerName:'Test Member',customerPhone:'9000000000',customerEmail:'member@example.com',startDate:'2099-01-01',classTime:'10:00',durationHours:1,durationMinutes:45,daysPerWeek:3,classDays:['mon','wed','fri'],timezone:'Asia/Kolkata',feesPaidPaise:250000,planName:'Acting Class',reminders:[{channel:'email',minutesBefore:60}]});
assert.ok(added.id>0);
let members=await listWebinarMembers(env,{eventType:'online_class',status:'current'});
assert.equal(members.length,1);
assert.equal(members[0].duration_minutes,105);
assert.deepEqual(members[0].class_days,['mon','wed','fri']);
assert.equal(db.prepare('SELECT COUNT(*) count FROM webinar_member_reminders WHERE member_id=? AND status=?').get(added.id,'pending').count,3);
db.prepare("UPDATE webinar_members SET trial_end_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(added.id);
members=await listWebinarMembers(env,{eventType:'online_class',status:'past'});
assert.equal(members.length,1);
assert.equal(members[0].membership_reason,'Trial period ended');

console.log('V17.08 integration parity, automation branches, CRM birthday and member workflow checks passed.');
