import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,nav,ui,css,analyticsApi,subscribers,requests,publicRequests,schema,dashboard,pkg,migration,d1Notes]=await Promise.all([
  read('VERSION.txt'),
  read('public/admin/index.html'),
  read('public/admin/final-v16-62-inbox-nav-automations.js'),
  read('public/admin/final-v16-88-analytics-calendar.js'),
  read('public/admin/final-v16-88-analytics-calendar.css'),
  read('functions/api/admin/analytics.js'),
  read('functions/api/admin/subscribers.js'),
  read('functions/api/admin/requests.js'),
  read('functions/api/public/requests.js'),
  read('functions/_lib/schema.js'),
  read('functions/api/admin/dashboard.js'),
  read('package.json'),
  read('migrations/0038_v16_88_analytics_read_indexes.sql'),
  read('D1-OBSERVATION-NOTES.md')
]);

assert.equal(version.trim(),'V16.88');
assert.match(index,/final-v16-88-analytics-calendar\.css\?v=16\.88/);
assert.match(index,/final-v16-88-analytics-calendar\.js\?v=16\.88/);
assert.match(nav,/\['Analytics',\[\['growthAnalytics','Growth Analytics'\],\['businessCalendar','Calendar'\]\]\]/);

assert.match(ui,/Business Results/);
assert.match(ui,/Visitor Sources/);
assert.match(ui,/Lead Generation/);
assert.match(ui,/Vertical Bar/);
assert.match(ui,/Horizontal Bar/);
assert.match(ui,/data-uc88-view="calendar"/);
assert.match(ui,/data-uc88-view="list"/);
assert.match(ui,/uc-info-btn/);
assert.match(ui,/uc-info-back-btn/);
assert.match(ui,/type="color"/);
assert.match(ui,/role="button" tabindex="0" data-uc88-day/);
assert.doesNotMatch(ui,/setInterval\s*\(/,'V16.88 analytics must remain load-on-demand');
assert.match(css,/\.uc88-day\.selected/);
assert.match(css,/\.uc88-modal-card\{width:min\(1180px,96vw\)/);

assert.match(analyticsApi,/requireAdmin/);
assert.match(analyticsApi,/Math\.max\(0,Number\(row\.total_cycles/);
assert.match(analyticsApi,/COUNT\(DISTINCT visitor_id\)/);
assert.match(analyticsApi,/cache-control':'private, max-age=120/);
assert.match(subscribers,/recurring_orders AS/);
assert.match(subscribers,/'order:'\|\|o\.order_id client_ref/);
assert.match(subscribers,/Reconciled from paid recurring order/);
assert.doesNotMatch(subscribers,/syncSubscriberLifecycleFromOrders/);
const getBody=subscribers.slice(subscribers.indexOf('onRequestGet'),subscribers.indexOf('onRequestPost'));
assert.doesNotMatch(getBody,/\.run\s*\(/,'subscriber GET must never write');

assert.match(publicRequests,/VALUES\([^\n]*'new','website'\)/);
assert.doesNotMatch(schema,/UPDATE service_requests SET status='in_progress'/);
assert.match(requests,/new_count:m\.new/);
assert.match(dashboard,/dashboardMemo/);
assert.match(dashboard,/Date\.now\(\)\+120000/);

assert.match(migration,/idx_orders_subscription_status/);
assert.match(migration,/idx_visitors_ist_day_source/);
assert.match(migration,/PRAGMA optimize/);
assert.match(d1Notes,/2026-09-06 12:15 IST \| 2\.79M/);
assert.match(pkg,/"test:v16\.88"/);
const migrations=(await readdir(new URL('../migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0038_v16_88_analytics_read_indexes.sql');

console.log('V16.88 smoke checks passed.');
