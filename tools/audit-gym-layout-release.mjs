/* Recreate the explicit V1.07 source audit from the supplied complete V1.06 index. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {digest,collect} from './gym-contract-helpers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),read=path=>readFileSync(join(root,path),'utf8');
const input=JSON.parse(read('verification/ironpulse-v1.07/v106-input-files.json')),current=collect(root);
const purposes={
 'public/assets/layout-registry-v1-57.js':'Bounded plain-data cloning, normalized per-theme documents and immutable footer boundary.',
 'public/assets/gym-layout-v1-57.js':'Validated flat block resolution and same-origin name mapping; permanent Instautomate credit.',
 'public/assets/gym-layout-admin-v1-57.js':'Theme-aware previews, bounded loads, independent viewport hide and typed layout confirmation.',
 'public/assets/gym-pages-workspace-v1-57.js':'Single workspace owner, guarded route activation and idempotent workspace synchronization.',
 'public/admin/gym-admin-v1-29.js':'Theme draft preservation, capability-driven Banners controls and typed publication confirmation.',
 'public/admin/admin.js':'Commit Brand Settings only after successful save; pass transient theme confirmation fields.',
 'public/admin/final-v16-53-navigation-brand-notifications.js':'Preserve addon workspace buttons and avoid repeated unchanged navigation DOM writes.',
 'functions/_lib/layout.js':'Sanitize existing per-theme layout documents through the shared schema without schema changes.',
 'functions/api/admin/settings.js':'Enforce exact confirmation for theme switches and reject a changed expected active theme.',
 'functions/_lib/gym-asset-delivery.js':'Canonical module build URLs avoid duplicate editor/workspace module instances.',
 'functions/_lib/gym-asset-manifest.js':'Generated V1.07 fingerprints for the complete current CSS/JS asset set.',
 'functions/_middleware.js':'Release response header update to 1.7.0 only.'
};
const frontendFiles=[],backendFiles=[];
for(const [path,purpose]of Object.entries(purposes)){
 assert.ok(input.files[path],path);const afterSha256=digest(read(path));assert.notEqual(afterSha256,input.files[path],path+' should have the declared change');
 const entry={path,purpose,beforeSha256:input.files[path],afterSha256};if(path.startsWith('functions/'))backendFiles.push({...entry,shape:current.functionShapes[path],ddl:current.functionDDL[path]});else frontendFiles.push(entry);
}
for(const [path,before]of Object.entries(input.files)){
 assert.ok(existsSync(join(root,path)),'Missing complete input file: '+path);
 if((path.startsWith('public/')||path.startsWith('functions/')||path.startsWith('migrations/'))&&path!=='public/release.json'&&!purposes[path])assert.equal(digest(readFileSync(join(root,path))),before,'Unapproved application change: '+path);
}
const audit={version:'V1.07',inputSha256:input.sourceZipSha256,inputFileCount:input.fileCount,frontendFiles,backendFiles,retainedCssFiles:Object.keys(current.css).length,retainedMigrations:Object.keys(current.migrationDDL).length,applicationRule:'All supplied application bytes outside these explicit changes and public/release.json remain identical. No schema, API path, table/key, payment, membership or scheduling change.'};
writeFileSync(join(root,'verification/ironpulse-v1.07/layout-theme-fixes.json'),JSON.stringify(audit,null,2)+'\n');console.log('V1.07 audit: '+frontendFiles.length+' frontend scripts and '+backendFiles.length+' backend/delivery files; all '+input.fileCount+' supplied paths retained, all other application bytes unchanged.');
