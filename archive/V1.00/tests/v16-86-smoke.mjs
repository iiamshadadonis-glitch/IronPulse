import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,nav,ui,css,endpoint,pkg,d1]=await Promise.all([
  read('VERSION.txt'),read('public/admin/index.html'),read('public/admin/final-v16-62-inbox-nav-automations.js'),read('public/admin/final-v16-86-business-operations-gmail.js'),read('public/admin/final-v16-86-business-operations-gmail.css'),read('functions/api/admin/send-payment-offer-email.js'),read('package.json'),read('functions/_lib/d1-read-budget.js')
]);

assert.equal(version.trim(),'V16.86');
assert.match(index,/final-v16-86-business-operations-gmail\.css\?v=16\.86/);
assert.match(index,/final-v16-86-business-operations-gmail\.js\?v=16\.86/);
assert.match(nav,/\['Business Operations',\[\['salesHub','Sales'\],\['operationsHub','Orders & Leads'\],\['customersHub','Customers'\]\]\]/);
assert.doesNotMatch(nav,/\['Orders & Leads',\[\['orders'/);
assert.match(ui,/data-uc84-tg-help/);
assert.match(ui,/uc84-tg-view-actions/);
assert.match(ui,/data-uc84-tg-back/);
assert.match(ui,/operationsHub/);
assert.match(ui,/customersHub/);
for(const label of ['New Orders','Pending Orders','Existing Orders','Cancelled Orders','Cancelled Subscriptions','Razorpay','Stripe','PhonePe','Manual Record','Refund Records','Subscribers','Unsubscribed','One-Time Users','Favorite Clients'])assert.ok(ui.includes(label),`missing ${label}`);
assert.match(ui,/name=\"email_subject\"/);
assert.match(ui,/Send Offer via Gmail/);
assert.match(ui,/ucV1681OpenIntegration/);
assert.doesNotMatch(ui,/new MutationObserver/);
assert.match(css,/\.uc84-tg-view-actions/);
assert.match(css,/\.uc86-field-error/);
assert.match(endpoint,/sendGmailMessage/);
assert.match(endpoint,/brandedEmailHtml/);
assert.match(endpoint,/integrationRecovery\('gmail'\)/);
assert.match(endpoint,/View Offer & Continue to Payment/);
assert.match(pkg,/"test:v16\.86"/);
assert.equal(createHash('sha256').update(d1).digest('hex'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43','D1 read-budget logic changed unexpectedly');
const migrations=(await readdir(new URL('../migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql','unexpected D1 migration added');
console.log('V16.86 smoke checks passed.');
