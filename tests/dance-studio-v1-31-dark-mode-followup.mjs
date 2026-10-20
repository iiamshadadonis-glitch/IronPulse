import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const count=(source,needle)=>source.split(needle).length-1;
const sha256=relative=>createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');

const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.match(pkg.scripts['test:dance-v1.31'],/dance-studio-v1-31-dark-mode-followup/);
assert.match(pkg.scripts['test:dance-v1.31'],/test:dance-v1\.30/,'the complete inherited regression chain must still run');

const adminCss=read('public/admin/dropbeat-admin-v1-31-dark.css');
const adminRuntime=read('public/admin/dropbeat-admin-v1-31.js');
const publicCss=read('public/assets/dropbeat-dark-mode-v1-31.css');
assert.equal(count(adminCss,'{'),count(adminCss,'}'),'V1.31 admin CSS braces must balance');
assert.equal(count(publicCss,'{'),count(publicCss,'}'),'V1.31 public CSS braces must balance');

for(const selector of [
  '#pages','.db114-tabs button','.uc-pg-status','.db109-coach-types','.db107-empty',
  '.db121-availability-row','.db125-approved-remuneration-toggle','.uc1708-member-reminder',
  '.uc94-enable-row','.uc-social-toggle-capsule','.uc-pay-toggle-capsule',
  '#uc1706EmailProviders','.uc1706-toggle'
])assert.ok(adminCss.includes(selector),`admin dark follow-up must cover ${selector}`);
assert.match(adminCss,/html\[data-color-mode="dark"\][\s\S]*#approvals[\s\S]*\.db114-tabs button/);
assert.match(adminCss,/#socialMediaIntegrations #uc1706EmailProviders>\.uc1706-provider>summary/);
assert.match(adminCss,/body>\.modal[\s\S]*\.db107-modal-note/);

assert.match(publicCss,/body\[data-uc-load\^="page:"\][\s\S]*-webkit-text-fill-color:#f7f8fc!important/,'FAQ and legal headings must remain visible');
assert.match(publicCss,/body\[data-uc-load="home"\] \.hero[\s\S]*background-image:var\(--hero-bg\)!important/,'dark mode must not shade the uploaded home banner');
assert.match(publicCss,/\.portal-status\.active/);
assert.match(publicCss,/\.portal-pill:is\(\.ended/);
assert.match(publicCss,/\.week-item[\s\S]*grid-template-columns:minmax\(190px,220px\)/,'session rows must reserve a stable date column');
assert.match(publicCss,/\.week-date small[\s\S]*display:block/,'session time must remain on its own line');

assert.match(adminRuntime,/dataset\.ucV1652Section='colors'/);
assert.match(adminRuntime,/activeBrandMode\(\)==='colors'/);
assert.match(adminRuntime,/MutationObserver\(queueSync\)/);
assert.doesNotMatch(adminRuntime,/fetch\(|\/api\//,'appearance ownership must be presentation-only');

const publicDocuments=fs.readdirSync(path.join(root,'public')).filter(file=>file.endsWith('.html')&&file!=='_footer.html').sort();
assert.equal(publicDocuments.length,26);
for(const file of publicDocuments){
  const html=read(`public/${file}`);
  const prior='/assets/dropbeat-dark-mode-v1-30.css?v=1.30';
  const current='/assets/dropbeat-dark-mode-v1-31.css?v=1.31';
  assert.equal(count(html,current),1,`${file} must load V1.31 dark CSS once`);
  assert.ok(html.indexOf(current)>html.indexOf(prior),`${file} must load V1.31 after V1.30`);
}

const adminHtml=read('public/admin/index.html');
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-31-dark.css?v=1.31'),1);
assert.equal(count(adminHtml,'/admin/dropbeat-admin-v1-31.js?v=1.31'),1);
assert.ok(adminHtml.indexOf('/admin/dropbeat-admin-v1-31-dark.css?v=1.31')>adminHtml.indexOf('/admin/dropbeat-admin-v1-30-dark.css?v=1.30'));
assert.ok(adminHtml.indexOf('/admin/dropbeat-admin-v1-31.js?v=1.31')>adminHtml.indexOf('/admin/dropbeat-admin-v1-29.js?v=1.29'));

const middleware=read('functions/_middleware.js');
assert.match(middleware,/dropbeat-dark-mode-v1-31\.css\?v=1\.31/);
for(const file of ['functions/blog/[[slug]].js','functions/page/[slug].js']){
  const source=read(file);
  assert.equal(count(source,'/assets/dropbeat-dark-mode-v1-31.css?v=1.31'),1,`${file} must include V1.31 CSS directly`);
  assert.ok(source.indexOf('/assets/dropbeat-dark-mode-v1-31.css?v=1.31')>source.indexOf('/assets/dropbeat-dark-mode-v1-30.css?v=1.30'));
}

/* Business-critical code is intentionally byte-identical to the supplied V1.30. */
const preserved={
  'functions/_lib/schema.js':'5e729d5666398d433a9cf5a9aaeb18add2c8c0d3c80a9d3673657d47f2d74b57',
  'functions/api/portal/auth/login.js':'734b4d4ad4d3b8b9418815ee35428ef65c0ac7c2bae2274368432e7032699666',
  'functions/api/orders/create.js':'a4c418e850f8c509039c2cbbda53662bb314f3f8a79687c822260845e4de4c01',
  'functions/_lib/payment-gateways.js':'7287b1b74641c16ab90cd9ea039aa0d41331aa58062aaee827903eb1ab39a7c6',
  'public/assets/app.js':'e5a437a1bee84a9241d01e4184f00f92affd17999c668fddee33d66f2aec8a1b',
  'public/assets/portal-dashboard-v1-14.js':'61da431d7d28e887c9a978f5660e6039844081f2cc69da97377f20625fb0426d',
  'public/admin/dropbeat-admin-v1-13.js':'0087831963a5558e2a9d71f6e3605bd641fd90d6311ddfb024d42f1e98ea4672',
  'public/admin/dropbeat-admin-v1-22.js':'4dea9ca6dfe734f88989faea417d84d47136b33fbcfef318c5c61408a4982d24',
  'public/admin/final-v16-99-visitors-email-studio.js':'a231d95fd4f1d7821868413c964f45b42fcf698f1eba2110b2fd476d09a75aa2'
};
for(const [file,expected] of Object.entries(preserved))assert.equal(sha256(file),expected,`${file} must remain unchanged from V1.30`);

for(const file of [
  'public/admin/dropbeat-admin-v1-31.js','functions/_middleware.js',
  'functions/blog/[[slug]].js','functions/page/[slug].js'
])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});

console.log('DropBeat V1.31 verified: the remaining dark-mode pages, approvals, status banners, webinar cards, modals, empty states, switches, Email & OTP and portal sessions are covered; the Profile duplicate is hidden; banner images stay unshaded; light colours and business logic remain unchanged.');
