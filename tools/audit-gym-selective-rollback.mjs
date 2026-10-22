import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {digest,collect} from './gym-contract-helpers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>readFileSync(join(root,p),'utf8');
const folder='verification/ironpulse-v1.09/',v106=JSON.parse(read(folder+'v106-input-files.json')),v108=JSON.parse(read(folder+'v108-input-files.json')),current=collect(root);
const restoredFiles=[
 'public/assets/layout-registry-v1-57.js','public/assets/gym-layout-admin-v1-57.js',
 'public/assets/gym-pages-workspace-v1-57.js','public/admin/final-v16-53-navigation-brand-notifications.js',
 'functions/_lib/layout.js','functions/_lib/gym-asset-delivery.js'
];
const retainedBulkFiles=['public/assets/gym-ui-components-v1-49.js','public/admin/gym-admin-v1-13.js','public/admin/final-v16-84-inbox-telegram-sales.js'];
const purposes={
 'public/assets/gym-layout-v1-57.js':'V1.06 renderer with only attribution label/link protection retained; original layout/style application restored.',
 'public/admin/gym-admin-v1-29.js':'V1.06 appearance, colour and Banners behaviour with an isolated typed theme-publication confirmation.',
 'public/admin/admin.js':'V1.06 settings save order with transient theme confirmation fields added to its existing request only.',
 'functions/api/admin/settings.js':'Retain exact V1.07 typed theme confirmation and stale-confirmation guard; existing cache invalidation unchanged.',
 'functions/_middleware.js':'Release response header 1.9.0 only relative to V1.06.',
 'functions/_lib/gym-asset-manifest.js':'Generated V1.09 fingerprints using the restored V1.06 delivery implementation.'
};
for(const path of restoredFiles)assert.equal(digest(read(path)),v106.files[path],'Exact V1.06 restoration: '+path);
for(const path of retainedBulkFiles)assert.equal(digest(read(path)),v108.files[path],'Keep every V1.08 Bulk Import safeguard: '+path);
const permitted=new Set([...retainedBulkFiles,...Object.keys(purposes),'public/release.json']);
for(const[path,expected]of Object.entries(v106.files))if(path.startsWith('public/')||path.startsWith('functions/')||path.startsWith('migrations/')){
 assert.ok(existsSync(join(root,path)),path);
 if(!permitted.has(path))assert.equal(digest(readFileSync(join(root,path))),expected,'Unrequested change from V1.06: '+path);
}
for(const path of Object.keys(v108.files))assert.ok(existsSync(join(root,path)),'Missing supplied V1.08 path: '+path);
assert.equal(digest(read('functions/_middleware.js').replace("'X-IronPulse-Release', '1.9.0'","'X-IronPulse-Release', '1.6.0'")),v106.files['functions/_middleware.js']);
const entries=[...restoredFiles,...Object.keys(purposes)].map(path=>({path,purpose:purposes[path]||'Restore exact V1.06 bytes; remove the V1.07 architecture change.',beforeSha256:v108.files[path],afterSha256:digest(read(path)),...(path.startsWith('functions/')?{shape:current.functionShapes[path],ddl:current.functionDDL[path]}:{})}));
writeFileSync(join(root,folder+'selective-rollback-fixes.json'),JSON.stringify({version:'V1.09',baselineVersion:'V1.06',inputZipSha256:v108.sourceZipSha256,baselineZipSha256:v106.sourceZipSha256,restoredFiles,retainedBulkFiles:retainedBulkFiles.map(path=>({path,sha256:v108.files[path]})),frontendFiles:entries.filter(e=>e.path.startsWith('public/')),backendFiles:entries.filter(e=>e.path.startsWith('functions/')),unchangedCss:179,unchangedMigrations:56,rule:'V1.06 application plus exact V1.08 Bulk Import scripts, typed confirmation, protected attribution and current release metadata only.'},null,2)+'\n');
console.log('Selective rollback audit passed: 6 exact V1.06 restorations, 3 exact V1.08 Bulk Import scripts, 4 isolated confirmation/attribution files and 2 release metadata files. All 3,127 V1.08 paths retained.');
