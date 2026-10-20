import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,analytics,analyticsCss,badges,badgeCss,legacyBadges,notes]=await Promise.all([
  read('VERSION.txt'),
  read('public/admin/index.html'),
  read('public/admin/final-v16-89-analytics-calendar.js'),
  read('public/admin/final-v16-89-analytics-calendar.css'),
  read('public/admin/final-v16-87-business-notifications-order-focus.js'),
  read('public/admin/final-v16-87-business-notifications-order-focus.css'),
  read('public/admin/final-v16-86-business-operations-gmail.js'),
  read('D1-OBSERVATION-NOTES.md')
]);

assert.equal(version.trim(),'V16.91');
for(const asset of ['final-v16-86-business-operations-gmail.css','final-v16-87-business-notifications-order-focus.css','final-v16-89-analytics-calendar.css','final-v16-86-business-operations-gmail.js','final-v16-87-business-notifications-order-focus.js','final-v16-89-analytics-calendar.js']){
  assert.match(index,new RegExp(asset.replaceAll('.','\\.')+'\\?v=16\\.91'));
}
assert.match(badges,/if\(!n\)\{[\s\S]*?node\.remove\(\)/,'zero notification elements must be removed');
assert.match(badges,/if\(!value\|\|value==='0'\)node\.remove\(\)/);
assert.match(badges,/function installZeroBadgeGuard\(\)/);
assert.match(badges,/new MutationObserver/,'late empty badge shells must be removed without polling');
assert.match(legacyBadges,/if\(!n\)\{b\?\.remove\(\);return;\}/);
assert.match(badgeCss,/\.uc86-count-badge\[hidden\],\.uc86-count-badge:empty\{display:none!important\}/);
assert.match(analyticsCss,/\.uc89-chart-tooltip\{position:fixed;/);
assert.match(analytics,/visibleBottom/);
assert.match(analytics,/event\.clientY-gap-tr\.height/,'tooltip must flip above the pointer near the visible bottom edge');
assert.match(analytics,/function drawPieOutsideLabels/);
assert.match(analytics,/items\.filter\(x=>x\.side===side\)\.sort/);
assert.match(analytics,/rowTop\+28/,'period heading must have a dedicated row above the pie');
assert.match(analytics,/rowTop\+140/,'pie center must be separated from the period heading');
assert.match(notes,/2026-09-07 11:24 IST \| 246\.51K \| 79 \| 935/);
assert.match(notes,/without changing the D1 safeguards/);
console.log('V16.91 smoke checks passed.');
