import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as getSubscribers} from '../functions/api/admin/subscribers.js';
import {onRequestGet as getAnalytics} from '../functions/api/admin/analytics.js';

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE orders(id INTEGER PRIMARY KEY,order_id TEXT UNIQUE,customer_name TEXT,customer_phone TEXT,customer_email TEXT,amount_paise INTEGER,status TEXT,payment_status TEXT,payment_mode TEXT,gateway TEXT,gateway_subscription_id TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE order_items(id INTEGER PRIMARY KEY,order_id INTEGER,product_name TEXT,total_count INTEGER);
  CREATE TABLE payment_receipts(id INTEGER PRIMARY KEY,gateway TEXT,transaction_id TEXT,order_id TEXT,subscription_id TEXT,amount_paise INTEGER,status TEXT,paid_at TEXT);
  CREATE TABLE manual_payments(id INTEGER PRIMARY KEY,order_id TEXT,payment_date TEXT,payment_mode TEXT,amount_paise INTEGER,status TEXT);
  CREATE TABLE subscribers(id INTEGER PRIMARY KEY,name TEXT,phone TEXT UNIQUE,email TEXT,city TEXT,plan_name TEXT,subscription_status TEXT,gateway TEXT,gateway_subscription_id TEXT,notes TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE refund_requests(id INTEGER PRIMARY KEY,order_id TEXT,customer_name TEXT,customer_phone TEXT,amount_paise INTEGER,status TEXT,created_at TEXT);
  CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,source TEXT,created_at TEXT);
  CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,source TEXT,created_at TEXT);
  INSERT INTO subscribers VALUES(1,'SYD ARSHD','919181254815','syd@example.com','','Old Plan','cancelled','razorpay','sub_old','Historical cancelled record','2026-07-01 05:00:00','2026-07-01 05:00:00');
  INSERT INTO orders VALUES(11,'UC-20260819-KSNZ','SYD ARSHD','918125485158','syd@example.com',10100,'active','paid','subscription','razorpay','sub_TRflsChmre1Twi','2026-09-06 05:00:00','2026-09-06 05:05:00');
  INSERT INTO order_items VALUES(21,11,'Membership Plan',12);
  INSERT INTO payment_receipts VALUES(31,'razorpay','pay_101','UC-20260819-KSNZ','sub_TRflsChmre1Twi',10100,'paid','2026-09-06 05:05:00');
  INSERT INTO visitor_events VALUES(41,'visitor-a','Google','2026-09-06 05:15:00');
  INSERT INTO contact_leads VALUES(51,'Website','2026-09-06 05:20:00');
`);

class D1Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
  async run(){return sqlite.prepare(this.sql).run(...this.args);}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new D1Statement(sql)}};
const request=url=>new Request(url);

const subscriberResponse=await getSubscribers({request:request('https://example.test/api/admin/subscribers'),env});
assert.equal(subscriberResponse.status,200);
const subscriberData=await subscriberResponse.json();
const active=subscriberData.subscribers.find(row=>row.gateway_subscription_id==='sub_TRflsChmre1Twi');
assert.ok(active,'paid recurring order must be visible in Subscribers');
assert.equal(active.subscription_status,'active');
assert.equal(active.client_ref,'order:UC-20260819-KSNZ');
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM subscribers').get().n,1,'subscriber GET must not create a mirror row');

const summaryResponse=await getAnalytics({request:request('https://example.test/api/admin/analytics?start=2026-09-06&end=2026-09-06'),env});
assert.equal(summaryResponse.status,200);
const summary=await summaryResponse.json();
assert.equal(summary.business.find(row=>row.category==='new_subscriber')?.count,1);
assert.equal(summary.visitors.find(row=>row.source==='Google')?.count,1);
assert.equal(summary.leads.find(row=>row.source==='Website')?.count,1);

const detailResponse=await getAnalytics({request:request('https://example.test/api/admin/analytics?detail=2026-09-06&category=paid'),env});
assert.equal(detailResponse.status,200);
const detail=await detailResponse.json();
assert.equal(detail.rows.length,1);
assert.equal(detail.rows[0].client_ref,'order:UC-20260819-KSNZ');
assert.equal(detail.rows[0].successful_cycles,1);
assert.equal(detail.rows[0].remaining_cycles,11);

console.log('V16.88 data integration checks passed.');
