import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as getOrders} from '../functions/api/admin/orders.js';
import {onRequestGet as getVisitors} from '../functions/api/admin/visitor-info.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ordersUi=read('public/admin/final-v16-3-orders-payment-accuracy.js');
const legacyOrderUi=read('public/admin/final-v16-34-admin-workflow-pages-social.js');
const extra=read('public/admin/admin-extra.js');
const ordersApi=read('functions/api/admin/orders.js');
const dashboardApi=read('functions/api/admin/dashboard.js');
const index=read('public/admin/index.html');

assert.match(ordersUi,/activity\?scope=orders/);
assert.match(ordersUi,/orders\?summary=1/);
assert.equal((ordersUi.match(/setInterval\(pollOrderRevision/g)||[]).length,1,'there must be one Orders watcher');
assert.doesNotMatch(ordersUi,/setInterval\(silentOrderSync/);
assert.doesNotMatch(legacyOrderUi,/setInterval\([^\n]*refreshOrderBadgesOnly/);
assert.doesNotMatch(extra,/load_dashboard[^\n]+api\('\/api\/admin\/orders'\)/);
assert.equal((extra.match(/orders\?summary=1/g)||[]).length,0,'legacy dashboard decorators must not duplicate the final summary request');
assert.match(ordersApi,/WITH selected_orders AS/);
assert.match(ordersApi,/receipt_totals AS/);
assert.match(ordersApi,/item_totals AS/);
assert.match(ordersApi,/subscription_ranked AS/);
assert.doesNotMatch(ordersApi,/SELECT SUM\(pr\.amount_paise\) FROM payment_receipts pr WHERE pr\.order_id=o\.order_id/);
assert.match(dashboardApi,/WITH payment_rows AS/);
assert.match(dashboardApi,/commerceMetrics/);
assert.doesNotMatch(dashboardApi,/const (orders|orderBuckets|failed|revenue|activeSubs|pendingCollections|todayRevenue) = await one/);
for(const asset of ['admin-extra.js?cache=17.01','final-admin-homepage-polish.js?cache=17.03','final-v16-3-orders-payment-accuracy.js?v=16.71&cache=17.01','final-v16-34-admin-workflow-pages-social.js?v=16.79&cache=17.01','final-v16-87-business-notifications-order-focus.js?v=16.96&cache=17.04'])assert.ok(index.includes(asset),`${asset} must be cache-busted`);

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
  CREATE TABLE orders(id INTEGER PRIMARY KEY,order_id TEXT,customer_name TEXT,customer_phone TEXT,customer_email TEXT,website_phone TEXT,razorpay_phone TEXT,amount_paise INTEGER,status TEXT,payment_status TEXT,payment_mode TEXT,order_stage TEXT,gateway TEXT,gateway_subscription_id TEXT,created_at TEXT,updated_at TEXT);
  CREATE TABLE payment_receipts(id INTEGER PRIMARY KEY,order_id TEXT,amount_paise INTEGER,status TEXT,paid_at_epoch INTEGER,paid_at TEXT,payment_kind TEXT,gateway TEXT);
  CREATE TABLE manual_payments(id INTEGER PRIMARY KEY,order_id TEXT,amount_paise INTEGER,status TEXT);
  CREATE TABLE products(id INTEGER PRIMARY KEY,trial_enabled INTEGER);
  CREATE TABLE order_items(id INTEGER PRIMARY KEY,order_id INTEGER,product_id INTEGER,product_name TEXT,quantity INTEGER,unit_amount_paise INTEGER,setup_amount_paise INTEGER,tax_snapshot_json TEXT,recurring_unit_amount_paise INTEGER);
  CREATE TABLE subscription_overview_cache(gateway TEXT,subscription_id TEXT,row_json TEXT,last_refreshed_at TEXT);
  CREATE TABLE visitor_events(id INTEGER PRIMARY KEY,visitor_id TEXT,path TEXT,source TEXT,device_id TEXT,ip_address TEXT,country_code TEXT,city TEXT,region_code TEXT,duration_ms INTEGER,analytics_consent INTEGER,ads_consent INTEGER,created_at TEXT);
  CREATE TABLE contact_leads(id INTEGER PRIMARY KEY,visitor_id TEXT,name TEXT,phone TEXT,email TEXT,status TEXT,location TEXT,updated_at TEXT);
  INSERT INTO products VALUES(1,1);
  INSERT INTO orders VALUES(1,'ORD-1','Example','919000000000','example@test.invalid','','',49900,'authenticated','authenticated','subscription','new','razorpay','sub-1','2026-09-18 08:00:00','2026-09-18 08:00:00');
  INSERT INTO orders VALUES(2,'ORD-2','Manual','918000000000','manual@test.invalid','','',25000,'active','paid','one_time','existing','manual','','2026-09-18 09:00:00','2026-09-18 09:00:00');
  INSERT INTO payment_receipts VALUES(1,'ORD-1',112,'paid',1000,'2026-09-18 08:00:00','authentication','razorpay');
  INSERT INTO manual_payments VALUES(1,'ORD-2',25000,'recorded');
  INSERT INTO order_items VALUES(1,1,1,'Membership',1,49900,100,'{"trial":{"totalPaise":112}}',49900);
  INSERT INTO order_items VALUES(2,2,NULL,'Consultation',1,25000,0,'{}',25000);
  INSERT INTO subscription_overview_cache VALUES('razorpay','sub-1','{"next_charge_amount_paise":49900}','2026-09-18 08:01:00');
  INSERT INTO visitor_events VALUES
    (1,'v1','/','Google','d1','203.0.113.1','IN','Hyderabad','TS',3000,1,1,'2026-09-18 10:00:00'),
    (2,'v1','/offers','Google','d1','203.0.113.1','IN','Hyderabad','TS',5000,1,1,'2026-09-18 10:01:00'),
    (3,'v2','/','Direct','','203.0.113.2','IN','Mumbai','MH',2000,1,0,'2026-09-18 10:02:00');
`);

let queryCount=0,lastSql='',fullOrdersSql='';
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){queryCount++;lastSql=this.sql;if(this.sql.includes('WITH selected_orders AS'))fullOrdersSql=this.sql;return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(){queryCount++;lastSql=this.sql;return sqlite.prepare(this.sql).get(...this.args)||null;}
  async run(){queryCount++;lastSql=this.sql;return sqlite.prepare(this.sql).run(...this.args);}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql)}};

let response=await getOrders({request:new Request('https://example.test/api/admin/orders'),env});
assert.equal(response.status,200);
let data=await response.json();
assert.equal(data.orders.length,2);
assert.equal(data.orders.find(x=>x.order_id==='ORD-1').received_paise,112);
assert.equal(data.orders.find(x=>x.order_id==='ORD-1').order_type,'trial');
assert.equal(data.orders.find(x=>x.order_id==='ORD-1').recurring_charge_paise,49900);
assert.equal(data.orders.find(x=>x.order_id==='ORD-2').received_paise,25000);
assert.ok(fullOrdersSql,'the consolidated Orders statement must execute');
const plan=sqlite.prepare(`EXPLAIN QUERY PLAN ${fullOrdersSql}`).all().map(x=>String(x.detail||'')).join('\n');
assert.doesNotMatch(plan,/CORRELATED SCALAR SUBQUERY/i,'the Orders plan must not walk supporting tables once per order');

queryCount=0;
response=await getOrders({request:new Request('https://example.test/api/admin/orders?summary=1&refresh=1'),env});
data=await response.json();
assert.equal(data.counts.new_orders,1);
assert.equal(data.counts.existing_orders,1);
const firstSummaryQueries=queryCount;
response=await getOrders({request:new Request('https://example.test/api/admin/orders?summary=1'),env});
await response.json();
assert.equal(queryCount,firstSummaryQueries,'stacked dashboard summary calls must reuse the short memo');

const cacheMemory=new Map(),oldCaches=globalThis.caches;
globalThis.caches={default:{async match(req){return cacheMemory.get(req.url)?.clone()||null;},async put(req,res){cacheMemory.set(req.url,res.clone());}}};
queryCount=0;
response=await getVisitors({request:new Request('https://example.test/api/admin/visitor-info?refresh=1'),env,waitUntil:p=>p});
data=await response.json();
assert.equal(data.summary.visitors,2);
assert.equal(data.summary.repeat_visitors,1);
assert.equal(data.summary.total_events,3);
assert.equal(data.sources[0].source,'Google');
const firstVisitorQueries=queryCount;
response=await getVisitors({request:new Request('https://example.test/api/admin/visitor-info'),env,waitUntil:p=>p});
await response.json();
assert.equal(queryCount-firstVisitorQueries,0,'cached visitor analytics and visitor list must avoid repeated full-history reads');
if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches;

console.log('V17.01 D1 read optimization checks passed.');
