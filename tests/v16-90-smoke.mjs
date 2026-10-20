import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,ui,css,dashboard,requests,v11,v12,notes]=await Promise.all([
  read('VERSION.txt'),read('public/admin/index.html'),read('public/admin/final-v16-89-analytics-calendar.js'),read('public/admin/final-v16-89-analytics-calendar.css'),read('functions/api/admin/dashboard.js'),read('functions/api/admin/requests.js'),read('public/admin/final-v11-requests-documents-subscriptions.js'),read('public/admin/final-v12-requests-controls-admin-identity.js'),read('D1-OBSERVATION-NOTES.md')
]);

assert.equal(version.trim(),'V16.90');
assert.match(index,/final-v16-89-analytics-calendar\.css\?v=16\.90/);
assert.match(index,/final-v16-89-analytics-core\.js\?v=16\.90[\s\S]*final-v16-89-analytics-calendar\.js\?v=16\.90/);
assert.match(ui,/function visibleWindow\(data\)/);
assert.match(ui,/data\.series\.flatMap\(x=>x\.values\.slice\(windowed\.from,windowed\.to\)\)/,'horizontal max must use visible period buckets');
assert.match(ui,/const sourceIndex=windowed\.from\+bi/,'horizontal and pie data must map back to the exact source bucket');
assert.match(ui,/series,bucket,value,amount,color/,'hover regions must carry the exact bucket and series value');
assert.match(ui,/No activity/,'zero pie periods must remain visible');
assert.match(ui,/Net received \/ profit view/);
assert.match(ui,/Loss \/ not collected/);
assert.doesNotMatch(ui,/combined value/);
assert.equal((ui.match(/data-uc90-mode-help/g)||[]).length,3,'one active-mode help control plus its binding and label update are expected');
assert.doesNotMatch(ui,/data-uc89-mode-help/,'outside per-pill help controls must be removed');
assert.match(css,/\.uc89-mode-help\{[^}]*margin-left:auto/);
assert.match(css,/\.uc90-chart-pager/);
assert.match(dashboard,/WITH eligible AS/);
assert.equal((dashboard.match(/activeLeadWhere\('l'\)/g)||[]).length,1,'paid-order exclusion must be evaluated from one eligible lead query');
assert.match(dashboard,/v16-90-admin-dashboard-summary/);
assert.match(dashboard,/EDGE_TTL_SECONDS=120/);
assert.match(requests,/searchParams\.get\('summary'\)==='1'/);
assert.match(v11,/\/api\/admin\/requests\?summary=1/);
assert.match(v11,/updateRequestBadges\(Number\(data\.new_count\|\|0\)\);return data/,'full request loader must return its result to decorators');
assert.match(v12,/\/api\/admin\/requests\?summary=1/);
assert.match(notes,/2026-09-06 16:15 IST \| 3\.82M \| 1\.28K \| 148\.94K/);
console.log('V16.90 smoke checks passed.');
