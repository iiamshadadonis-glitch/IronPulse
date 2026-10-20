import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const occurrences=(source,needle)=>source.split(needle).length-1;
const sha256=async path=>createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');

const [pkgText,lockText,version,headers,middleware,adminHtml,adminRuntime,publicCss,publicJs,adminCss,attendance,remuneration]=await Promise.all([
  read('package.json'),read('package-lock.json'),read('DANCE-STUDIO-VERSION.txt'),read('public/_headers'),
  read('functions/_middleware.js'),read('public/admin/index.html'),read('public/admin/dropbeat-admin-v1-34.js'),read('public/assets/dropbeat-ui-v1-35.css'),
  read('public/assets/dropbeat-ui-v1-35.js'),read('public/admin/dropbeat-admin-v1-35-dark.css'),
  read('public/admin/dropbeat-admin-v1-16.js'),read('public/admin/dropbeat-admin-v1-22.js')
]);
const pkg=JSON.parse(pkgText),lock=JSON.parse(lockText);

assert.equal(pkg.version,'1.35.0');
assert.equal(lock.version,'1.35.0');
assert.equal(lock.packages[''].version,'1.35.0');
assert.match(version,/DANCE-STUDIO-V1\.35/);
assert.equal(pkg.scripts['test:dance-v1.35'],'node tests/dance-studio-v1-35-dark-attendance-mobile.mjs && npm run test:v17.09');

// A new URL and no-store document headers make V1.35 discoverable without
// changing the existing V1.34 assets in-place.
assert.match(headers,/\/assets\/dropbeat-ui-v1-35\.css[\s\S]*max-age=31536000, immutable/);
assert.match(headers,/\/assets\/dropbeat-ui-v1-35\.js[\s\S]*max-age=31536000, immutable/);
assert.match(headers,/\/admin\/dropbeat-admin-v1-35-dark\.css[\s\S]*no-store/);
assert.doesNotMatch(headers,/X-DropBeat-Release: 1\.34\.0/);
assert.match(headers,/X-DropBeat-Release: 1\.35\.0/);
assert.match(middleware,/headers\.set\('X-DropBeat-Release', '1\.35\.0'\)/);
assert.equal(occurrences(middleware,"if(!html.includes('/assets/dropbeat-ui-v1-35.css'))"),1);
assert.equal(occurrences(middleware,"if(!html.includes('/assets/dropbeat-ui-v1-35.js'))"),1);

// Every full static public shell gets the final files exactly once. The shared
// footer fragment is deliberately excluded because it is not an HTML shell.
const publicNames=(await readdir(new URL('public/',root))).filter(name=>name.endsWith('.html')&&name!=='_footer.html');
assert.ok(publicNames.length>=26);
for(const name of publicNames){
  const source=await read(`public/${name}`);
  assert.equal(occurrences(source,'/assets/dropbeat-ui-v1-35.css?build=dropbeat-1.35-20261012'),1,`${name} V1.35 CSS`);
  assert.equal(occurrences(source,'/assets/dropbeat-ui-v1-35.js?build=dropbeat-1.35-20261012'),1,`${name} V1.35 JS`);
  assert.ok(source.indexOf('dropbeat-ui-v1-35.css')>source.indexOf('dropbeat-mobile-v1-34.css'),`${name} final CSS order`);
  assert.ok(source.indexOf('dropbeat-ui-v1-35.js')>source.indexOf('dropbeat-mobile-v1-34.js'),`${name} final JS order`);
}
for(const name of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=await read(name);
  assert.equal(occurrences(source,'/assets/dropbeat-ui-v1-35.css?build=dropbeat-1.35-20261012'),1,`${name} CSS`);
  assert.equal(occurrences(source,'/assets/dropbeat-ui-v1-35.js?build=dropbeat-1.35-20261012'),1,`${name} JS`);
}

assert.match(adminHtml,/<meta name="dropbeat-release" content="1\.35\.0">/);
assert.equal(occurrences(adminHtml,'/admin/dropbeat-admin-v1-35-dark.css?build=dropbeat-1.35-20261012'),2);
assert.match(adminHtml,/dropbeat-admin-v1-16\.js\?build=dropbeat-1\.35-20261012/);
assert.match(adminHtml,/dropbeat-admin-v1-22\.js\?build=dropbeat-1\.35-20261012/);
assert.doesNotMatch(adminRuntime,/MutationObserver|setInterval|setTimeout|requestAnimationFrame|fetch\(|\/api\//);
assert.equal((publicCss.match(/\{/g)||[]).length,(publicCss.match(/\}/g)||[]).length);
assert.equal((adminCss.match(/\{/g)||[]).length,(adminCss.match(/\}/g)||[]).length);

// Dark heading recovery, mobile contact/checkout spacing, non-stretched media,
// hidden duplicate class card and three-item plan summary.
for(const token of [
  'body[data-uc-load="home"]', '.section .section-head h2', '-webkit-text-fill-color:#f7f8fc!important',
  '.db134-session-details>summary::after', 'display:none!important;content:none!important',
  'aspect-ratio:16/9!important', 'object-fit:contain!important',
  '#offerDetail .uc-offer-book-card>.db107-offer-class', '.db134-class-glance',
  '.contact-form{grid-template-columns:1fr!important', '.checkout-form{column-gap:10px!important',
  'html[data-color-mode="dark"] .qty-controls>span'
]) assert.ok(publicCss.includes(token),`public CSS missing ${token}`);

for(const token of ['Batch Time','Duration','Coach','data-db135-class-glance',"getElementById('offerDetail')"])assert.ok(publicJs.includes(token),`public JS missing ${token}`);
assert.doesNotMatch(publicJs,/\bfetch\s*\(/);
assert.doesNotMatch(publicJs,/(?:localStorage|sessionStorage|document\.cookie)/);
assert.doesNotMatch(publicJs,/\.observe\s*\(\s*(?:document\.body|document\.documentElement)/);
assert.doesNotMatch(publicJs,/\.innerHTML\s*=/);

// Student/coach views reload independently, expose role-appropriate columns,
// and allow the absent count to open directly on the absent roster.
assert.match(attendance,/if\(participant\)\{state\.participant=participant\.dataset\.attendanceParticipant;load\(\);return;\}/);
for(const token of ['Students Present','Students Absent','Coach Started','Coach Attendance',"data-roster-tab=\"absent\"","initialTab='present'"]){
  assert.ok(attendance.includes(token),`attendance source missing ${token}`);
}
assert.match(remuneration,/classList\.toggle\('db135-remuneration-mode',on\)/);
assert.match(adminCss,/#attendance\.db135-remuneration-mode \.db116-view-tabs\{display:none!important\}/);

// Exact late-rendered surfaces from the supplied dark-mode screenshots.
for(const token of [
  '.uc-v1624-media-options','.uc94-conversion-row','.custom-network-row','.uc68-ai-model-note',
  '.uc-v1649-marquee-master','.uc-v9-legal-toggle','.uc-storage-hero','.uc-v167-connection-state',
  '.uc-social-toggle-item','.db121-style-picker','.db125-approved-remuneration-fields',
  '.db119-calendar-card','.db119-selected-card','.db119-list-card'
]) assert.ok(adminCss.includes(token),`admin dark CSS missing ${token}`);

// The requested presentation/attendance release must not modify protected
// account, payment, schema or established app modules.
const protectedHashes={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
  'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
  'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d'
};
for(const [path,expected] of Object.entries(protectedHashes))assert.equal(await sha256(path),expected,`${path} changed unexpectedly`);

console.log('DropBeat V1.35 dark-mode, attendance separation, mobile layout and protected-logic checks passed.');
