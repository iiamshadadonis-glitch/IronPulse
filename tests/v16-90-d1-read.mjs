import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as getDashboard} from '../functions/api/admin/dashboard.js';
import {onRequestGet as getRequests} from '../functions/api/admin/requests.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
  CREATE TABLE orders(id INTEGER PRIMARY KEY,order_id TEXT,amount_paise INTEGER,status TEXT,payment_status TEXT,payment_mode TEXT,order_stage TEXT,gateway_subscription_id TEXT,customer_email TEXT,customer_phone TEXT,website_phone TEXT,razorpay_phone TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE payment_receipts(id INTEGER PRIMARY KEY,order_id TEXT,amount_paise INTEGER,status TEXT,paid_at TEXT,created_at TEXT);
  CREATE TABLE manual_payments(id INTEGER PRIMARY KEY,order_id TEXT,amount_paise INTEGER,status TEXT,payment_date TEXT);
  CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,order_id TEXT,email TEXT,phone TEXT,status TEXT,interest_level TEXT,outcome TEXT,source TEXT,source_detail TEXT,follow_up_date TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE lead_submissions(id INTEGER PRIMARY KEY,lead_id INTEGER,submission_type TEXT,status TEXT);
  CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,source TEXT);
  CREATE TABLE service_requests(id INTEGER PRIMARY KEY,status TEXT,customer_name TEXT,customer_phone TEXT,customer_email TEXT,request_id TEXT,request_label TEXT,message TEXT,lead_id INTEGER,created_at TEXT);
  INSERT INTO orders VALUES(1,'paid-1',10100,'active','paid','subscription','new','sub-1','paid@example.com','919999999999','','','2026-09-06 08:00:00','2026-09-06 08:00:00');
  INSERT INTO payment_receipts VALUES(1,'paid-1',10100,'paid','2026-09-06 08:00:00','2026-09-06 08:00:00');
  INSERT INTO contact_leads VALUES(1,'','open@example.com','918888888888','new','Warm','','Website','','2026-09-06','2026-09-06 07:00:00','2026-09-06 07:00:00');
  INSERT INTO contact_leads VALUES(2,'','paid@example.com','919999999999','new','Hot','','Website','','2026-09-06','2026-09-06 07:00:00','2026-09-06 07:00:00');
  INSERT INTO visitor_events VALUES(1,'visitor-1','Google');
  INSERT INTO service_requests VALUES(1,'new','Example Customer','918888888888','open@example.com','REQ-1','Support','Help requested',1,'2026-09-06 08:00:00');
  INSERT INTO service_requests VALUES(2,'in_progress','Example Customer','918888888888','open@example.com','REQ-2','Support','Being handled',1,'2026-09-06 08:05:00');
`);

class D1Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
  async run(){return sqlite.prepare(this.sql).run(...this.args);}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new D1Statement(sql)}};

const dashResponse=await getDashboard({request:new Request('https://example.test/api/admin/dashboard'),env});
assert.equal(dashResponse.status,200);
const dash=await dashResponse.json();
assert.equal(dash.stats.totalLeads,1,'the paid customer must be excluded without changing the open-lead result');
assert.equal(dash.stats.activeSubscriptions,1);
assert.equal(dash.stats.paid,1);

const requestResponse=await getRequests({request:new Request('https://example.test/api/admin/requests?summary=1'),env});
assert.equal(requestResponse.status,200);
const requestSummary=await requestResponse.json();
assert.deepEqual(requestSummary,{new_count:1,in_progress_count:1,resolved_count:0,all_count:2,open_count:2});

console.log('V16.90 D1 read-path checks passed.');
