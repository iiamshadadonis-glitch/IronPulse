import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const sha256=async path=>createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
const pkg=JSON.parse(await read('package.json'));
assert.equal(pkg.version,'1.38.0');
for(const path of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){
 const html=await read(path);
 assert.equal((html.match(/<script[^>]+dropbeat-dashboard-mobile-v1-38\.js/g)||[]).length,1,path+' one mobile controller');
 assert.doesNotMatch(html,/<script[^>]+dropbeat-dashboard-mobile-v1-(36|37)\.js/,path+' retires conflicting controllers');
 assert.ok(html.includes('dropbeat-1.38-20261013'));
}
const css=await read('public/assets/dropbeat-dashboard-mobile-v1-38.css');
assert.match(css,/@media.*max-width:760px/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
const js=await read('public/assets/dropbeat-dashboard-mobile-v1-38.js');
assert.doesNotMatch(js,/setInterval\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
assert.match(js,/items.length>5\?2:1/);
assert.match(js,/Customer Details/);assert.match(js,/Payment Details/);
assert.match(js,/requestSubmit\(source\)/);
assert.match(js,/disconnect\(/);
const headers=await read('public/_headers');
assert.match(headers,/\/assets\/dropbeat-dashboard-mobile-v1-38\.js[\s\S]*immutable/);
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

for(const [path,expected] of Object.entries(protectedHashes))assert.equal(await sha256(path),expected,path+' business logic preserved');
for(const path of ['public/assets/dropbeat-dashboard-mobile-v1-38.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(path,root).pathname]);
console.log('V1.38 delivery, single controller, mobile scope, syntax and protected business-file hashes passed.');

