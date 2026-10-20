import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const occurrences=(source,needle)=>source.split(needle).length-1;
const sha256=async path=>createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
const BUILD='dropbeat-1.36-20261013';
const CSS=`/assets/dropbeat-dashboard-mobile-v1-36.css?build=${BUILD}`;
const JS=`/assets/dropbeat-dashboard-mobile-v1-36.js?build=${BUILD}`;

const [pkgText,lockText,version,admin,student,coach,css,runtime,middleware,headers]=await Promise.all([
  read('package.json'),read('package-lock.json'),read('DANCE-STUDIO-VERSION.txt'),read('public/admin/index.html'),
  read('public/student-dashboard.html'),read('public/coach-dashboard.html'),read('public/assets/dropbeat-dashboard-mobile-v1-36.css'),
  read('public/assets/dropbeat-dashboard-mobile-v1-36.js'),read('functions/_middleware.js'),read('public/_headers')
]);
const pkg=JSON.parse(pkgText),lock=JSON.parse(lockText);

assert.equal(pkg.version,'1.36.0');
assert.equal(lock.version,'1.36.0');
assert.equal(lock.packages[''].version,'1.36.0');
assert.match(version,/DANCE-STUDIO-V1\.36/);
assert.equal(pkg.scripts['test:dance-v1.36'],'node tests/dance-studio-v1-36-dashboard-mobile-app.mjs && npm run test:v17.09');

assert.match(admin,/<meta name="dropbeat-release" content="1\.36\.0">/);
assert.equal(occurrences(admin,CSS),2,'Admin CSS must be preloaded and applied once');
assert.equal(occurrences(admin,JS),2,'Admin JS must be preloaded and executed once');
for(const [name,source] of [['Student',student],['Coach',coach]]){
  assert.equal(occurrences(source,CSS),1,`${name} dashboard CSS`);
  assert.equal(occurrences(source,JS),1,`${name} dashboard JS`);
  assert.ok(source.indexOf(CSS)>source.indexOf('dropbeat-ui-v1-35.css'),`${name} CSS is the final dashboard layer`);
  assert.ok(source.indexOf(JS)>source.indexOf('dropbeat-ui-v1-35.js'),`${name} JS is the final dashboard layer`);
}

assert.match(middleware,/headers\.set\('X-DropBeat-Release', '1\.36\.0'\)/);
assert.match(middleware,/const dashboardDocument = \['\/student-dashboard','\/coach-dashboard'\]/);
assert.equal(occurrences(middleware,"if(!html.includes('/assets/dropbeat-dashboard-mobile-v1-36.css'))"),1,'Admin fallback CSS');
assert.equal(occurrences(middleware,"dashboardDocument&&!html.includes('/assets/dropbeat-dashboard-mobile-v1-36.css')"),1,'Portal fallback CSS');
assert.match(headers,/\/assets\/dropbeat-dashboard-mobile-v1-36\.css[\s\S]*max-age=31536000, immutable[\s\S]*X-DropBeat-Release: 1\.36\.0/);
assert.match(headers,/\/assets\/dropbeat-dashboard-mobile-v1-36\.js[\s\S]*max-age=31536000, immutable[\s\S]*X-DropBeat-Release: 1\.36\.0/);
assert.doesNotMatch(headers,/X-DropBeat-Release: 1\.35\.0/);

assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'V1.36 CSS braces');
assert.match(css,/@media\(max-width:760px\)/,'structural app styles must be phone scoped');
for(const token of [
  '.db136-card-carousel','.db136-carousel-dots','.uc-dashboard-client-grid',
  '.db136-page-sheet','.db136-bottom-sheet','table.db136-card-table',
  '.db136-stacked-row','form[data-db136-wizard="1"]','.db136-wizard-progress',
  '.db136-wizard-nav','.db136-compact-calendar','.db136-calendar-day.db136-has-event',
  '.db136-calendar-agenda','.db136-agenda-card','.portal-app .portal-grid',
  '.uc-change-star,.uc-zero-pulse,.uc81-recovery-focus'
])assert.ok(css.includes(token),`V1.36 CSS missing ${token}`);
assert.match(css,/grid-auto-flow:column!important/,'metrics use horizontal carousel flow');
assert.match(css,/scroll-snap-type:x mandatory/,'metric carousel snap behavior');
assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/,'compact seven-day calendar');

for(const token of [
  'Customer Details','Subscription & Billing','Class & Schedule','Review & Save',
  'dataset.db136Label','db136-stacked-row','db136-page-sheet','db136-bottom-sheet',
  'db136-card-carousel','db136-carousel-dots','db136-compact-calendar',
  'renderPostAgenda','dropbeat:dashboard-mobile-ready'
])assert.ok(runtime.includes(token),`V1.36 runtime missing ${token}`);
assert.doesNotMatch(runtime,/MutationObserver|setInterval|fetch\s*\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage|document\.cookie/,'presentation runtime must not observe, poll, call APIs or write storage');
assert.match(runtime,/\[80,360,1200,2600\]/,'late-rendered enhancement passes are finite');
assert.match(runtime,/if\(!PHONE\.matches\|\|!isDashboard\(\)\)return/,'runtime must stay dashboard- and phone-scoped');

const publicHtml=(await readdir(new URL('public/',root))).filter(name=>name.endsWith('.html'));
for(const name of publicHtml){
  const source=await read(`public/${name}`);
  if(['student-dashboard.html','coach-dashboard.html'].includes(name))assert.equal(occurrences(source,CSS),1);
  else assert.equal(occurrences(source,CSS),0,`${name} must not receive dashboard-only CSS`);
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

for(const path of ['public/assets/dropbeat-dashboard-mobile-v1-36.js','functions/_middleware.js']){
  execFileSync(process.execPath,['--check',new URL(path,root).pathname],{stdio:'pipe'});
}

console.log('DropBeat V1.36 verified: dashboard mobile app carousels, sheets, stacked grids, form wizards, compact agenda calendars, finite delivery, cache busting and protected business logic all passed.');
