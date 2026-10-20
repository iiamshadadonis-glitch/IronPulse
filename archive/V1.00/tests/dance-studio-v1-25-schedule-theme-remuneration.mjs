import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {listWebinars,scheduleWebinar} from '../functions/_lib/marketing-suite.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.25']?.includes('dance-studio-v1-25-schedule-theme-remuneration.mjs'));

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort();
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
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class-at2.pages.dev'};

// Every webinar workspace uses the same proven persistence route. Offline
// delivery keeps this test deterministic and avoids contacting a live meeting
// provider while still exercising Online, Offline and Demo event types.
const startsAt=new Date(Date.now()+3*86400000).toISOString();
const expected=[];
for(const [index,eventType] of ['online_class','offline_class','demo'].entries()){
  const result=await scheduleWebinar(env,{title:`V1.25 ${eventType}`,eventType,deliveryMode:'offline',provider:'offline',customerName:`V1.25 Customer ${index+1}`,customerPhone:`91912500000${index+1}`,customerEmail:`v125-${index+1}@example.test`,startsAt,durationMinutes:45,timezone:'Asia/Kolkata',reminders:[]});
  expected.push(Number(result.id));
}
const events=await listWebinars(env);
for(const [index,eventType] of ['online_class','offline_class','demo'].entries())assert.ok(events.some(row=>Number(row.id)===expected[index]&&row.event_type===eventType&&row.status==='scheduled'),`${eventType} must be returned under Scheduled Events`);

const legacySchedule=read('public/admin/final-v16-99-visitors-email-studio.js');
const schedule=read('public/admin/dropbeat-admin-v1-25.js');
const scheduleCss=read('public/admin/dropbeat-admin-v1-25.css');
const coach=read('public/admin/dropbeat-admin-v1-22.js');
const theme=read('public/assets/dropbeat-color-mode-v1-25.js');
const themeCss=read('public/assets/dropbeat-color-mode-v1-25.css');
const admin=read('public/admin/index.html');

// The capture-phase handler must delegate before the old modal can be created.
const delegation=legacySchedule.indexOf("typeof window.db125OpenScheduleMeeting==='function'");
const fallback=legacySchedule.indexOf('modal=openSchedule98(config)',delegation);
assert.ok(delegation>0&&fallback>delegation,'V1.25 Schedule Meeting must intercept the legacy modal path first');
assert.match(legacySchedule,/window\.db125OpenScheduleMeeting\(config,panel\)/);
assert.match(admin,/final-v16-99-visitors-email-studio\.js\?v=16\.99&cache=17\.04&dropbeat=1\.25&schedule=isolated/);

// The replacement modal is isolated from all #uc97ScheduleModal observers,
// opens before any support request, and can always be dismissed.
assert.match(schedule,/window\.db125OpenScheduleMeeting=open/);
assert.match(schedule,/modal\.id='db125ScheduleModal'/);
assert.match(schedule,/\$\('#uc97ScheduleModal'\)\?\.remove\(\)/);
assert.match(schedule,/AbortController/);
assert.match(schedule,/event\.key==='Escape'/);
assert.match(schedule,/event\.target===modal/);
assert.match(schedule,/action:'schedule_webinar'/);
assert.match(schedule,/window\.ucV1697ReloadWebinars/);
for(const value of ['online_class','offline_class','demo'])assert.match(schedule,new RegExp(value));
const openBlock=schedule.slice(schedule.indexOf('function open('));
assert.ok(openBlock.indexOf('document.body.appendChild(modal)')<openBlock.indexOf('loadSupportingData(modal,safe)'), 'The usable dialog must appear before optional data checks begin');
assert.match(scheduleCss,/#db125ScheduleModal\{z-index:20050!important;display:flex!important/);
assert.match(scheduleCss,/pointer-events:auto!important/);

// System preference is the default; a deliberate click persists the override.
assert.match(theme,/matchMedia\?\.\('\(prefers-color-scheme: dark\)'\)/);
assert.match(theme,/localStorage\.getItem\(KEY\)/);
assert.match(theme,/localStorage\.setItem\(KEY,next\)/);
assert.match(theme,/isDark\?moon:sun/);
assert.match(theme,/Switch to light mode/);
assert.match(theme,/Switch to dark mode/);
assert.match(theme,/system\?\.addEventListener\?\.\('change'/);
assert.match(themeCss,/html\[data-color-mode="dark"\]/);
assert.match(themeCss,/\.db125-color-mode-toggle\.db125-fixed/);

const htmlFiles=[];
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const absolute=path.join(directory,entry.name);if(entry.isDirectory())walk(absolute);else if(entry.name.endsWith('.html')&&/^<!doctype html>/i.test(fs.readFileSync(absolute,'utf8')))htmlFiles.push(absolute);}}
walk(path.join(root,'public'));
assert.equal(htmlFiles.length,27);
for(const file of htmlFiles){const source=fs.readFileSync(file,'utf8'),label=path.relative(root,file);assert.equal((source.match(/dropbeat-color-mode-v1-25\.js/g)||[]).length,1,`${label} must load the mode controller once`);assert.equal((source.match(/dropbeat-color-mode-v1-25\.css/g)||[]).length,1,`${label} must load the dark-mode styles once`);}
assert.ok(admin.indexOf('/admin/dropbeat-admin-v1-22.js?v=1.25')<admin.indexOf('/admin/dropbeat-admin-v1-25.js?v=1.25'));
assert.match(admin,/dropbeat-admin-v1-25\.css\?v=1\.25/);

// Add/Edit Coach now uses a real switch and does not show its fields until on.
assert.match(coach,/Add Approved Remuneration/);
assert.match(coach,/role="switch"/);
assert.match(coach,/data-db122-coach-pay-fields hidden/);
assert.match(coach,/details\.hidden=!on/);
assert.match(coach,/input\.disabled=!on/);
assert.match(coach,/rate\.required=on/);
assert.match(coach,/aria-expanded',String\(on\)/);
assert.doesNotMatch(coach,/Add terms now/);
assert.match(scheduleCss,/\.db125-approved-remuneration-fields\[hidden\]\{display:none!important\}/);

for(const file of ['public/admin/dropbeat-admin-v1-25.js','public/admin/dropbeat-admin-v1-22.js','public/admin/final-v16-99-visitors-email-studio.js','public/assets/dropbeat-color-mode-v1-25.js'])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.25 verified: the three Schedule Meeting entry points use an isolated non-blocking dialog and persist events, light/dark mode covers every full page with system defaults and saved overrides, and Add/Edit Coach remuneration fields remain hidden behind a true switch.');
