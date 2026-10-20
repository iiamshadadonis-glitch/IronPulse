import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as visitors} from '../functions/api/admin/visitor-info.js';
import {onRequestGet as client} from '../functions/api/admin/client-crm.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,path TEXT,source TEXT,device_id TEXT,ip_address TEXT,country_code TEXT,city TEXT,region_code TEXT,analytics_consent INTEGER,ads_consent INTEGER,created_at TEXT);
  CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT,location TEXT,updated_at TEXT);
  INSERT INTO visitor_events VALUES(1,'returning','/','Direct','d1','203.0.113.4','IN','Hyderabad','TS',1,1,'2026-09-18 10:00:00');
  INSERT INTO visitor_events VALUES(2,'returning','/offers','Search','','','','','',1,1,'2026-09-18 10:05:00');
  INSERT INTO visitor_events VALUES(3,'single','/contact','Direct','d2','203.0.113.5','IN','Mumbai','MH',1,0,'2026-09-18 10:02:00');
  INSERT INTO contact_leads VALUES(7,'returning','Sample Customer','919000000000','sample@example.test','new','','2026-09-18 10:05:00');
`);
let sqlCalls=0;
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){const stmt={args:[],bind(...args){this.args=args;return this;},async all(){sqlCalls++;return {results:sqlite.prepare(sql).all(...this.args)};},async first(){sqlCalls++;return sqlite.prepare(sql).get(...this.args)||null;}};return stmt;}}};
for(const [type,length] of [['all',2],['repeat',1]]){
  const response=await visitors({request:new Request(`https://example.test/api/admin/visitor-info?view=list&type=${type}`),env});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.recent.length,length);
  assert.equal(data.recent.find(row=>row.visitor_id==='returning').ip_address,'203.0.113.4');
  assert.equal(data.recent.find(row=>row.visitor_id==='returning').location,'Hyderabad, TS, IN');
  assert.equal(data.recent.find(row=>row.visitor_id==='returning').lead_name,'Sample Customer');
}
let response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?view=list&export=1'),env});
assert.equal((await response.json()).recent.length,2,'Excel export must receive stored visitor rows');
assert.equal(sqlCalls,3,'each visitor list/export request must use one read on a healthy schema');

const analyticsFailureEnv={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){if(/duration_ms/.test(sql))throw new Error('Analytics calculation unavailable');return env.DB.prepare(sql);}}};
response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?refresh=1'),env:analyticsFailureEnv});
assert.equal(response.status,200);
const partial=await response.json();
assert.equal(partial.recent.length,2,'failed totals must not hide visitor journeys in Tracking');
assert.match(partial.analytics_error,/Analytics calculation unavailable/);

// Earlier installations may not yet have all the optional IP/location columns.
const legacy=new DatabaseSync(':memory:');
legacy.exec("CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,path TEXT,source TEXT,created_at TEXT);CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT);INSERT INTO visitor_events VALUES(1,'old','/','Direct','2026-09-01 10:00:00');");
const legacyEnv={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){return {bind(...args){this.args=args;return this;},async all(){return {results:legacy.prepare(sql).all(...(this.args||[]))};}};}}};
response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?view=list'),env:legacyEnv});
assert.equal(response.status,200);
assert.equal((await response.json()).recent[0].visitor_id,'old','legacy columns must not hide saved visits');

const failedEnv={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(){throw new Error('D1 read quota exceeded');}}};
response=await visitors({request:new Request('https://example.test/api/admin/visitor-info?view=list'),env:failedEnv});
assert.equal(response.status,503,'a failed database read must never be presented as an empty successful report');
assert.match((await response.json()).error,/quota exceeded/);

// Customers can contain a paid recurring order with a synthetic negative id.
const paidOrder={id:42,order_id:'PAID-42',customer_name:'Existing Member',customer_phone:'919000000000',customer_email:'member@example.test',created_at:'2026-09-18 10:00:00',status:'paid',payment_status:'paid',amount_paise:19900};
const customerEnv={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){if(sql==='SELECT * FROM orders WHERE id=?')return this.args[0]===42?paidOrder:null;return null;},async all(){if(sql.startsWith('SELECT * FROM orders WHERE '))return {results:[paidOrder]};return {results:[]};},async run(){return {meta:{changes:0}};}};}}};
response=await client({request:new Request('https://example.test/api/admin/client-crm?subscriber_id=-42'),env:customerEnv});
assert.equal(response.status,200);
const customer=await response.json();
assert.equal(customer.client.name,'Existing Member');
assert.equal(customer.orders[0].order_id,'PAID-42');

const ui=fs.readFileSync(new URL('../public/admin/final-v16-99-visitors-email-studio.js',import.meta.url),'utf8');
assert.match(ui,/view=list&export=1&cache=17\.04/);
assert.match(ui,/if\(data\.error\)throw new Error\(data\.error\)/);
console.log('V17.02 visitor and customer recovery checks passed.');
