import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import manifest from '../functions/_lib/gym-asset-manifest.js';
import {createAssetManifest} from '../tools/build-gym-assets.mjs';
import {versionGymAsset,versionGymModule,finalizeGymHtml,applyGymAssetHeaders} from '../functions/_lib/gym-asset-delivery.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import {onRequestGet as blog} from '../functions/blog/[[slug]].js';
import {purgeGymCssCache} from '../tools/purge-gym-css-cache.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),read=name=>readFileSync(join(root,name),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const baseline=JSON.parse(read('verification/ironpulse-v1.06/v105-input-files.json'));
const audit=JSON.parse(read('verification/ironpulse-v1.06/asset-delivery-fixes.json'));
const layoutAudit=JSON.parse(read('verification/ironpulse-v1.07/layout-theme-fixes.json'));
const bulkAudit=JSON.parse(read('verification/ironpulse-v1.08/bulk-import-fixes.json'));
const changes=new Map([...layoutAudit.frontendFiles,...layoutAudit.backendFiles,...bulkAudit.frontendFiles,...bulkAudit.backendFiles].map(fix=>[fix.path,fix.afterSha256]));
assert.deepEqual(manifest,createAssetManifest(root),'Build manifest must describe every current CSS/JS source');
assert.equal(manifest.version,'V1.08');assert.equal(Object.keys(manifest.assets).length,415);
for(const [name,digest]of Object.entries(baseline.files))if(name.startsWith('public/')&&/\.(?:js|css)$/.test(name))assert.equal(hash(readFileSync(join(root,name))),changes.get(name)||digest,'Retain audited script/theme bytes: '+name);
for(const [name,digest]of Object.entries(baseline.files))if(name.startsWith('functions/')&&name!=='functions/_middleware.js')assert.equal(hash(readFileSync(join(root,name))),changes.get(name)||digest,name);
const source=read('functions/_middleware.js');assert.equal(hash(source),changes.get('functions/_middleware.js'));
const restored=source
 .replace("import {finalizeGymHtml,applyGymAssetHeaders} from './_lib/gym-asset-delivery.js';\n",'')
 .replace("headers.set('X-IronPulse-Release', '1.8.0');\n  applyGymAssetHeaders(headers,url);","headers.set('X-IronPulse-Release', '1.00.0');")
 .replace("responseBody=finalizeGymHtml(html,context.request.url);\n    headers.set('Cache-Control','no-store, no-cache, max-age=0, must-revalidate');\n    headers.set('CDN-Cache-Control','no-store');\n    headers.set('Cloudflare-CDN-Cache-Control','no-store');",'responseBody=html;');
assert.equal(hash(restored),audit.middleware.beforeSha256,'Only the declared asset/HTML delivery addon may change in middleware');
assert.equal(audit.middleware.beforeSha256,baseline.files['functions/_middleware.js']);
const css=read(audit.stylesheet.path);assert.equal(hash(css),audit.stylesheet.sha256);assert.doesNotMatch(css,/:root|--[a-z][\w-]*\s*:/i);
assert.match(css,/position:absolute;inset:0;grid-area:1\/1/);assert.match(css,/gap:24px;padding:24px/);

const address='https://gym.example/blog';
assert.equal(versionGymAsset('https://other.example/styles.css',address),'https://other.example/styles.css');
assert.equal(versionGymAsset('/api/public/site',address),'/api/public/site');
const versioned=versionGymAsset('/assets/styles.css?existing=1&amp;build=old#fragment',address);
assert.match(versioned,/existing=1&build=old&ip=V1\.08\.[a-f0-9]{20}\.[a-f0-9]{20}#fragment/);
assert.equal(versionGymAsset(versioned,address),versioned);
const canonical=versionGymModule('/assets/gym-layout-v1-57.js?build=1.59&v=old',address);assert.equal(canonical,versionGymModule('/assets/gym-layout-v1-57.js',address));assert.doesNotMatch(canonical,/[?&](?:build|v)=/);assert.match(versionGymModule('/assets/gym-layout-v1-57.js?mode=inspect&build=old',address),/mode=inspect/);assert.equal(versionGymModule('https://external.example/a.js?v=old',address),'https://external.example/a.js?v=old');
const route=await blog({request:new Request(address),params:{slug:[]},env:{}});
const response=await middleware({request:new Request(address,{headers:{accept:'application/json'}}),env:{},data:{},next:async()=>route});
const html=await response.text();assert.match(html,/db107-blog-schema/);assert.match(html,/gym-fitness-tips-v1-06\.css\?ip=V1\.08\./);
assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('cloudflare-cdn-cache-control'),'no-store');
const links=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"<>]+\.(?:css|js)[^"<>]*)"/g)].map(x=>x[1]);
assert.ok(links.length>30);for(const value of links)assert.match(value,/[?&](?:amp;)?ip=V1\.08\./,value);
const styles=links.filter(x=>x.includes('.css'));assert.match(styles.at(-1),/gym-fitness-tips-v1-06\.css/,'Card rules must be the final stylesheet after middleware injections');
assert.equal(finalizeGymHtml(html,address),html,'Final delivery remains idempotent');
const map=JSON.parse(html.match(/id="ironpulse-asset-imports">([^<]+)</)[1]);
for(const name of manifest.modules){assert.equal(map.imports[name],versionGymModule(name,address));assert.match(map.imports[name],/ip=V1\.08\./);}
assert.ok(html.indexOf('type="importmap"')<html.indexOf('type="module"'));
const headers=new Headers({'cache-control':'public, max-age=3600, stale-while-revalidate=86400'});
applyGymAssetHeaders(headers,new URL('https://gym.example/assets/styles.css'));assert.equal(headers.get('cache-control'),'no-cache, max-age=0, must-revalidate');assert.equal(headers.get('x-ironpulse-asset-build'),manifest.build);
const apiHeaders=new Headers({'cache-control':'private'});applyGymAssetHeaders(apiHeaders,new URL('https://gym.example/api/public/blogs'));assert.equal(apiHeaders.get('cache-control'),'private');

const temp=mkdtempSync(join(tmpdir(),'gym-build-hash-'));
try{
 mkdirSync(join(temp,'public/assets'),{recursive:true});writeFileSync(join(temp,'public/release.json'),' {"version":"V1.06"}');
 writeFileSync(join(temp,'public/assets/a.css'),'.card{gap:24px}');writeFileSync(join(temp,'public/assets/b.js'),'import "./c.js?build=old";');writeFileSync(join(temp,'public/assets/c.js'),'export const value=1;');
 const first=createAssetManifest(temp);assert.deepEqual(first,createAssetManifest(temp));assert.deepEqual(first.modules,['/assets/c.js?build=old']);
 writeFileSync(join(temp,'public/assets/a.css'),'.card{gap:25px}');const second=createAssetManifest(temp);assert.notEqual(second.build,first.build);assert.notEqual(second.assets['/assets/a.css'],first.assets['/assets/a.css']);assert.equal(second.assets['/assets/b.js'],first.assets['/assets/b.js']);
}finally{rmSync(temp,{recursive:true,force:true});}

const calls=[];const fake=async(url,options)=>{calls.push({url,...options,body:JSON.parse(options.body)});return {ok:true,status:200,json:async()=>({success:true})};};
const pages=await purgeGymCssCache({origin:'https://gym-fitness-3w8.pages.dev',fetchImpl:fake});assert.equal(pages.requests,0);assert.equal(calls.length,0);
await assert.rejects(()=>purgeGymCssCache({origin:'https://gym.example',fetchImpl:fake}),/Cache Purge permission/);
const result=await purgeGymCssCache({origin:'https://gym.example',zoneId:'a'.repeat(32),token:'synthetic-token',fetchImpl:fake});
assert.equal(result.status,'accepted');assert.equal(result.urls,358);assert.equal(calls.length,15);
for(const call of calls){assert.equal(call.method,'POST');assert.ok(call.body.files.length<=25);assert.equal(call.headers.authorization,'Bearer synthetic-token');assert.deepEqual(Object.keys(call.body),['files']);for(const value of call.body.files)assert.equal(new URL(value).hostname,'gym.example');}
await assert.rejects(()=>purgeGymCssCache({origin:'https://gym.example',zoneId:'b'.repeat(32),token:'synthetic-token',fetchImpl:async()=>({ok:false,status:403,json:async()=>({success:false})})}),/did not accept/);
console.log('Build hashes for all 415 CSS/JS assets, module dependency versions, real Worker shell delivery/order, cache headers, unchanged business middleware, theme preservation and scoped CSS purge checks passed.');
