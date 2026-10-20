import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,ui,core,css,api,middleware,maintenance,notes]=await Promise.all([
  read('VERSION.txt'),read('public/admin/index.html'),read('public/admin/final-v16-89-analytics-calendar.js'),read('public/admin/final-v16-89-analytics-core.js'),read('public/admin/final-v16-89-analytics-calendar.css'),read('functions/api/admin/analytics.js'),read('functions/_middleware.js'),read('functions/_lib/traffic-maintenance.js'),read('D1-OBSERVATION-NOTES.md')
]);

assert.match(version.trim(),/^V16\.(?:89|90)$/);
assert.match(index,/final-v16-89-analytics-core\.js\?v=16\.(?:89|90)[\s\S]*final-v16-89-analytics-calendar\.js\?v=16\.(?:89|90)/);
assert.match(index,/final-v16-89-analytics-calendar\.css\?v=16\.(?:89|90)/);
for(const option of ['daily','weekly','monthly','yearly','range'])assert.match(ui,new RegExp(`option value="${option}"`));
for(const chart of ['line','bar','hbar','pie'])assert.match(ui,new RegExp(`data-uc88-chart="${chart}"`));
for(const mode of ['business','visitors','leads'])assert.match(ui,new RegExp(`modeChoice\\('${mode}'\\)`));
assert.match(ui,/Open Help &amp; Instructions/);
assert.match(ui,/data-uc89-chart-tooltip/);
assert.match(ui,/function findHit\(/);
assert.match(ui,/kind:'segment'/,'the full line between points should be hoverable');
assert.match(ui,/addHit\(\{kind:'slice'/);
assert.match(ui,/ctx\.fillText\(String\((?:x\.total|value)\)/,'pie slices should print their actual count');
assert.doesNotMatch(ui,/fillText\(`\$\{data\.series\.reduce\(\(a,x\)=>a\+x\.total,0\)\} total`/,'pie total must not be drawn in the center');
assert.doesNotMatch(ui,/setInterval\s*\(/,'analytics must remain load-on-demand');
assert.match(core,/function buildBuckets/);
assert.match(core,/function aggregate/);
assert.match(css,/\.uc88-empty\[hidden\]/);
assert.match(css,/\.uc89-chart-tooltip/);
assert.match(css,/\.uc89-chart-detail/);
assert.match(api,/setUTCDate\(maxStart\.getUTCDate\(\)-3653\)/);
assert.match(middleware,/runTrafficMaintenance/);
assert.doesNotMatch(middleware,/sweepRecentPublishedAuditions\(context\.env/);
assert.match(maintenance,/LEASE_SECONDS=15\*60/);
assert.match(maintenance,/globalThis\.caches\?\.default/);
assert.match(maintenance,/Promise\.allSettled/);
assert.match(notes,/2026-09-06 14:31 IST \| 3\.22M \| 1\.19K \| 147\.04K/);

console.log('V16.89 smoke checks passed.');
