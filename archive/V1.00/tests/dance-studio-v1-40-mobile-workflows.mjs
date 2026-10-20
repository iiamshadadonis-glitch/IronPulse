import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {onRequest as middleware} from '../functions/_middleware.js';
const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
const pkg=JSON.parse(await read('package.json'));assert.equal(pkg.version,'1.40.0');
for(const file of ['public/admin/index.html','public/student-dashboard.html','public/coach-dashboard.html']){
 const html=await read(file);
 assert.equal((html.match(/<script[^>]+dropbeat-dashboard-mobile-v1-40\.js/g)||[]).length,1,file+' loads one current controller');
 assert.doesNotMatch(html,/<script[^>]+dropbeat-dashboard-mobile-v1-(36|37|38|39)\.js/);
 const path=file.includes('/admin/')?'/admin/':file.includes('student')?'/student-dashboard':'/coach-dashboard';
 for(const source of [html,html.replace('dropbeat-dashboard-mobile-v1-40.js','dropbeat-dashboard-mobile-v1-39.js')]){
  const response=await middleware({request:new Request('https://example.test'+path),env:{},next:async()=>new Response(source,{headers:{'content-type':'text/html'}})});
  const delivered=await response.text();
  assert.equal(response.headers.get('X-DropBeat-Release'),'1.40.0');
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal((delivered.match(/<script[^>]+dropbeat-dashboard-mobile-v1-40\.js/g)||[]).length,1,'middleware does not inject a second owner');
  assert.doesNotMatch(delivered,/<script[^>]+dropbeat-dashboard-mobile-v1-(36|37|38|39)\.js/);
 }
}
const js=await read('public/assets/dropbeat-dashboard-mobile-v1-40.js'),css=await read('public/assets/dropbeat-dashboard-mobile-v1-40.css');
assert.match(css,/@media\(max-width:760px\)/);assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
assert.doesNotMatch(js,/setInterval\s*\(|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
assert.match(js,/Plan Features/);assert.match(js,/Review/);assert.match(js,/Social Status/);
assert.match(js,/fields.length%2===1/);assert.match(js,/requestSubmit\(source\)/);
const hashes={
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
for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,file+' core behavior preserved');
for(const file of ['public/assets/dropbeat-dashboard-mobile-v1-40.js','public/assets/dropbeat-plan-import-v1-40.js','functions/_lib/plan-import.js','functions/api/admin/import-products.js','functions/api/admin/products.js','functions/_middleware.js'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
console.log('V1.40 release and delivery checks passed: one current controller, no stale middleware injection, no-store dashboard HTML, mobile scope, syntax and unchanged core business files.');
