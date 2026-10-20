import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {edgeCachedResponse} from '../functions/_lib/edge-response-cache.js';
import {buildSimpleTextPdf} from '../functions/_lib/simple-text-pdf.js';
import {onRequestGet as getVisitors} from '../functions/api/admin/visitor-info.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const index=read('public/admin/index.html');
const ui=read('public/admin/final-v16-99-visitors-email-studio.js');
const css=read('public/admin/final-v16-99-visitors-email-studio.css');
const schema=read('functions/_lib/schema.js');
const tracking=read('functions/api/track/visit.js');
const notificationApi=read('functions/api/admin/admin-notification-settings.js');
const marketing=read('functions/_lib/marketing-suite.js');
const utils=read('functions/_lib/utils.js');

assert.match(index,/final-v16-99-visitors-email-studio\.css\?v=16\.99&cache=17\.03/);
assert.match(index,/final-v16-99-visitors-email-studio\.js\?v=16\.99&cache=17\.04/);
assert.match(ui,/index>=5\?'uc1700-page-extra'/);
assert.match(ui,/data-pages-toggle/);
assert.match(ui,/target="_blank" rel="noopener" title=/);
assert.match(ui,/\/\^\\\/blog/);
assert.match(ui,/application\/vnd\.ms-excel/);
assert.doesNotMatch(ui,/\$\('\[data-download-visitors\]'\s*,\s*'#listModal'\)/);
assert.match(css,/uc1700-page-extra/);

for(const phrase of ['Enable Editing','Revert to Original','Original / Currently Saved','Edited Version','Warning','Confirm &amp; Save Template'])assert.match(ui,new RegExp(phrase));
assert.match(ui,/data-template-help/);
assert.match(ui,/Payment &amp; Meeting Notifications/);
assert.match(notificationApi,/meetingReminderMinutes:15/);
assert.match(marketing,/processAdminMeetingReminders/);
assert.match(marketing,/buildSimpleTextPdf/);
assert.match(utils,/sendWhatsAppDocument/);
assert.match(schema,/idx_visitor_events_visitor_id_desc/);
assert.match(schema,/idx_contact_leads_visitor_updated/);
assert.match(tracking,/context\.city/);

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,path TEXT,source TEXT,device_id TEXT,ip_address TEXT,country_code TEXT,city TEXT,region_code TEXT,analytics_consent INTEGER,ads_consent INTEGER,created_at TEXT);
CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT,location TEXT,updated_at TEXT);
INSERT INTO visitor_events VALUES
(1,'v1','/','Direct','d1','203.0.113.1','IN','Hyderabad','TS',1,1,'2026-09-16 10:00:00'),
(2,'v1','/blog/very-long-story','Google','d1','203.0.113.1','IN','Hyderabad','TS',1,1,'2026-09-16 10:01:00'),
(3,'v1','/contact','Google','d1','203.0.113.1','IN','Hyderabad','TS',1,1,'2026-09-16 10:02:00');
INSERT INTO contact_leads VALUES(1,'v1','Example Person','919000000000','person@example.test','new','','2026-09-16 10:02:00');
`);
let queryCount=0;
class Statement{constructor(sql){this.sql=sql;this.args=[];}bind(...args){this.args=args;return this;}async all(){queryCount++;return {results:sqlite.prepare(this.sql).all(...this.args)};}async first(){queryCount++;return sqlite.prepare(this.sql).get(...this.args)||null;}async run(){queryCount++;return sqlite.prepare(this.sql).run(...this.args);}}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql)}};
const response=await getVisitors({request:new Request('https://example.test/api/admin/visitor-info?type=all&view=list'),env});
assert.equal(response.status,200);
const data=await response.json();
assert.equal(queryCount,1,'list view must not execute the four analytics scans');
assert.equal(data.recent[0].location,'Hyderabad, TS, IN');
assert.equal(data.recent[0].visits,3);

const memory=new Map(),originalCaches=globalThis.caches;
globalThis.caches={default:{async match(req){return memory.get(req.url)?.clone()||null;},async put(req,res){memory.set(req.url,res.clone());}}};
let loads=0;
const load=async()=>{loads++;return new Response(JSON.stringify({ok:true,loads}),{headers:{'content-type':'application/json'}});};
await edgeCachedResponse({request:new Request('https://example.test/api/public/site?bust=1'),key:'site-v1700',ttl:120,load});
const cached=await edgeCachedResponse({request:new Request('https://example.test/api/public/site?bust=2'),key:'site-v1700',ttl:120,load});
assert.equal(loads,1,'cache-busting query strings must share one edge data response');
assert.equal(cached.headers.get('x-uc-edge-cache'),'HIT');
if(originalCaches===undefined)delete globalThis.caches;else globalThis.caches=originalCaches;

const pdf=buildSimpleTextPdf({title:'Attendee List',lines:['Example Person | 919000000000']});
assert.equal(new TextDecoder().decode(pdf.slice(0,8)),'%PDF-1.4');
assert.ok(pdf.length>400);

console.log('V17.00 smoke checks passed.');
