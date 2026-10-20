import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,nav,ui,css,pkg,d1]=await Promise.all([
  read('VERSION.txt'),
  read('public/admin/index.html'),
  read('public/admin/final-v16-62-inbox-nav-automations.js'),
  read('public/admin/final-v16-87-business-notifications-order-focus.js'),
  read('public/admin/final-v16-87-business-notifications-order-focus.css'),
  read('package.json'),
  read('functions/_lib/d1-read-budget.js')
]);

assert.equal(version.trim(),'V16.87');
assert.match(index,/final-v16-87-business-notifications-order-focus\.css\?v=16\.87/);
assert.match(index,/final-v16-87-business-notifications-order-focus\.js\?v=16\.87/);
assert.match(nav,/\['Business Ops',\[\['salesHub','Sales'\],\['operationsHub','Orders & Leads'\],\['customersHub','Customers'\]\]\]/);
assert.doesNotMatch(nav,/\['Business Operations'/);
assert.match(ui,/uc_v1687_business_ops_seen/);
assert.match(ui,/function acknowledge/);
assert.match(ui,/function applyOrderView/);
assert.match(ui,/card\.hidden=!selected/);
assert.match(ui,/insertBefore\(node,arrow\|\|null\)/);
assert.match(ui,/ordersLoaded=true/);
assert.match(ui,/function wrapApiCapture/);
assert.match(ui,/captureResponse\(path,result\)/);
assert.match(ui,/window\.tab\.__uc86=true/);
assert.doesNotMatch(ui,/new MutationObserver/);
assert.doesNotMatch(ui,/setInterval/);
assert.match(css,/background:#e11d2e!important/);
assert.match(css,/data-group-title="Business Ops"/);
assert.match(css,/padding:14px 20px 6px!important/);
assert.match(pkg,/"test:v16\.87"/);
assert.equal(createHash('sha256').update(d1).digest('hex'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43','D1 read-budget logic changed unexpectedly');
const migrations=(await readdir(new URL('../migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql','unexpected D1 migration added');
console.log('V16.87 smoke checks passed.');
