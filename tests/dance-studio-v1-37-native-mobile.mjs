import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const occurrences=(source,needle)=>source.split(needle).length-1;
const sha256=async path=>createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
const BUILD='dropbeat-1.37-20261013';
const CSS=`/assets/dropbeat-dashboard-mobile-v1-37.css?build=${BUILD}`;
const JS=`/assets/dropbeat-dashboard-mobile-v1-37.js?build=${BUILD}`;

const [pkgText,lockText,version,admin,student,coach,css,runtime,middleware,headers,legacyAnalytics,growthAnalytics,marketingAnalytics]=await Promise.all([
  read('package.json'),read('package-lock.json'),read('DANCE-STUDIO-VERSION.txt'),read('public/admin/index.html'),
  read('public/student-dashboard.html'),read('public/coach-dashboard.html'),read('public/assets/dropbeat-dashboard-mobile-v1-37.css'),
  read('public/assets/dropbeat-dashboard-mobile-v1-37.js'),read('functions/_middleware.js'),read('public/_headers'),
  read('public/admin/final-v16-88-analytics-calendar.js'),read('public/admin/final-v16-89-analytics-calendar.js'),read('public/admin/final-v16-92-marketing-webinars.js')
]);
const pkg=JSON.parse(pkgText),lock=JSON.parse(lockText);

assert.equal(pkg.version,'1.37.0');
assert.equal(lock.version,'1.37.0');
assert.equal(lock.packages[''].version,'1.37.0');
assert.match(version,/DANCE-STUDIO-V1\.37/);
assert.equal(pkg.scripts['test:dance-v1.37'],'node tests/dance-studio-v1-37-native-mobile.mjs && npm run test:v17.09');

assert.match(admin,/<meta name="dropbeat-release" content="1\.37\.0">/);
assert.equal(occurrences(admin,CSS),2,'Admin CSS is preloaded and applied once');
assert.equal(occurrences(admin,JS),2,'Admin JS is preloaded and executed once');
for(const [name,source] of [['Student',student],['Coach',coach]]){
  assert.equal(occurrences(source,CSS),1,`${name} V1.37 CSS`);
  assert.equal(occurrences(source,JS),1,`${name} V1.37 JS`);
  assert.ok(source.indexOf(CSS)>source.indexOf('dropbeat-dashboard-mobile-v1-36.css'),`${name} V1.37 CSS is last`);
  assert.ok(source.indexOf(JS)>source.indexOf('dropbeat-dashboard-mobile-v1-36.js'),`${name} V1.37 JS is last`);
}
assert.match(middleware,/headers\.set\('X-DropBeat-Release', '1\.37\.0'\)/);
assert.equal(occurrences(middleware,"if(!html.includes('/assets/dropbeat-dashboard-mobile-v1-37.css'))"),1,'Admin fallback CSS');
assert.equal(occurrences(middleware,"dashboardDocument&&!html.includes('/assets/dropbeat-dashboard-mobile-v1-37.css')"),1,'Portal fallback CSS');
assert.match(headers,/\/assets\/dropbeat-dashboard-mobile-v1-37\.css[\s\S]*max-age=31536000, immutable[\s\S]*X-DropBeat-Release: 1\.37\.0/);
assert.match(headers,/\/assets\/dropbeat-dashboard-mobile-v1-37\.js[\s\S]*max-age=31536000, immutable[\s\S]*X-DropBeat-Release: 1\.37\.0/);

assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'V1.37 CSS braces');
assert.match(css,/@media\(max-width:760px\)/,'structural changes are phone scoped');
for(const token of [
  'grid-template-rows:repeat(var(--db137-rows,1)','grid-auto-columns:calc((100% - 10px)/2)',
  '.db137-fullscreen-sheet','.db137-choice-sheet','.db137-wizard-progress','.db137-wizard-number',
  '#customSubscription.active.db137-form-page','.payment-mode-box[hidden]',
  '.db137-compact-record','.db137-primary-nav','.db137-secondary-nav','.db137-collapsible-search',
  '.db137-client-fullscreen','.uc-history-grid:before','.db137-expandable-payment',
  '.db137-mobile-calendar','.db137-calendar-fab','.db137-chart-readout','.db137-donut-canvas'
])assert.ok(css.includes(token),`V1.37 CSS missing ${token}`);
assert.match(css,/border:0!important;border-radius:0!important;background:transparent!important/,'calendar cells are borderless');
assert.match(css,/aspect-ratio:1\/1!important/,'donut/calendar ratios are locked');
assert.match(css,/html\[data-color-mode="dark"\][\s\S]*\.db137-wizard-number/,'generated controls have dark contrast');

for(const token of [
  'items.length>5?2:1','perPage=rows*2','db137-carousel-dots','Last changed:',
  'openChoiceSheet','enhanceSelect','enhanceTemporal','enhanceChoiceGrid',
  'specializedStep','subscriptionBox','oneTimeBox','productForm','validateWizardStep',
  'db137-form-page','db137-segmented-modes','db137-client-fullscreen','enhanceClientPayments',
  'enhanceCalendarFab','DropBeatMobileChart','paintMobileChart','db137-chart-readout',
  '[70,260,700,1500]','dropbeat:dashboard-mobile-v137-ready'
])assert.ok(runtime.includes(token),`V1.37 runtime missing ${token}`);
assert.doesNotMatch(runtime,/MutationObserver|setInterval|fetch\s*\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage|document\.cookie/,'mobile presentation layer must not observe, poll, call APIs or write storage');
assert.match(legacyAnalytics,/window\.DropBeatMobileChart\?\.paint\?/,'legacy analytics keeps desktop painter and delegates phone presentation');
assert.match(growthAnalytics,/window\.DropBeatMobileChart\?\.paint\?/,'loaded Growth Analytics delegates phone presentation');
assert.match(marketingAnalytics,/window\.DropBeatMobileChart\?\.paintMarketing\?/,'loaded Marketing Analytics delegates phone presentation');

const publicHtml=(await readdir(new URL('public/',root))).filter(name=>name.endsWith('.html'));
for(const name of publicHtml){
  const source=await read(`public/${name}`);
  if(['student-dashboard.html','coach-dashboard.html'].includes(name))assert.equal(occurrences(source,CSS),1);
  else assert.equal(occurrences(source,CSS),0,`${name} must not receive dashboard-only V1.37 CSS`);
}

const protectedHashes={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
  'public/admin/admin.js':'1e07d2a94f787fb14dc3cfa4ae80ad07959236d48165f64dfd31c5ff73b474eb',
  'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
  'public/admin/dropbeat-admin-v1-22.js':'d95234fb1b73ae6c3aff45d0d14ea4fc328a4061c0c21bf8bc1cb50d56ff72e3',
  'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d'
};
for(const [path,expected] of Object.entries(protectedHashes))assert.equal(await sha256(path),expected,`${path} changed unexpectedly`);

for(const path of ['public/assets/dropbeat-dashboard-mobile-v1-37.js','public/admin/final-v16-88-analytics-calendar.js','public/admin/final-v16-89-analytics-calendar.js','public/admin/final-v16-92-marketing-webinars.js','functions/_middleware.js']){
  execFileSync(process.execPath,['--check',new URL(path,root).pathname],{stdio:'pipe'});
}

console.log('DropBeat V1.37 verified: two-card/two-row metrics, real form steps, compact selectors, premium client details, borderless agenda calendars, touch charts, cache busting and protected business logic passed.');
