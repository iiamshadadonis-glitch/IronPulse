import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {digest,collect} from './gym-contract-helpers.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>readFileSync(join(root,p),'utf8');
const input=JSON.parse(read('verification/ironpulse-v1.08/v107-input-files.json')),current=collect(root);
const purposes={
 'public/assets/gym-ui-components-v1-49.js':'Bound upload rendering and drop-event re-entry; update drag highlight only on transitions; reset on exit/drop/end/form reset.',
 'public/admin/final-v16-84-inbox-telegram-sales.js':'Delegate legacy Sales selection to the shared current owner while retaining its original fallback.',
 'public/admin/gym-admin-v1-13.js':'Bound same-pane Sales loader re-entry and avoid unchanged tab/visibility writes.',
 'functions/_middleware.js':'Release response header update to 1.8.0 only.',
 'functions/_lib/gym-asset-manifest.js':'Generated V1.08 fingerprints for the complete current CSS/JS set.'
};
const frontendFiles=[],backendFiles=[];
for(const[path,purpose]of Object.entries(purposes)){
 const afterSha256=digest(read(path));assert.ok(input.files[path],path);assert.notEqual(afterSha256,input.files[path],path);
 const entry={path,purpose,beforeSha256:input.files[path],afterSha256};if(path.startsWith('functions/'))backendFiles.push({...entry,shape:current.functionShapes[path],ddl:current.functionDDL[path]});else frontendFiles.push(entry);
}
for(const[path,before]of Object.entries(input.files)){
 assert.ok(existsSync(join(root,path)),'Missing complete input path: '+path);
 if((path.startsWith('public/')||path.startsWith('functions/')||path.startsWith('migrations/'))&&path!=='public/release.json'&&!purposes[path])assert.equal(digest(readFileSync(join(root,path))),before,'Unapproved application change: '+path);
}
assert.equal(read('functions/_middleware.js').replace("'X-IronPulse-Release', '1.8.0'","'X-IronPulse-Release', '1.7.0'").split('\n').length,read('functions/_middleware.js').split('\n').length);
assert.equal(digest(read('functions/_middleware.js').replace("'X-IronPulse-Release', '1.8.0'","'X-IronPulse-Release', '1.7.0'")),input.files['functions/_middleware.js'],'Middleware remains byte-identical except the release header');
writeFileSync(join(root,'verification/ironpulse-v1.08/bulk-import-fixes.json'),JSON.stringify({version:'V1.08',inputSha256:input.sourceZipSha256,inputFileCount:input.fileCount,frontendFiles,backendFiles,retainedCssFiles:Object.keys(current.css).length,retainedMigrations:Object.keys(current.migrationDDL).length,rule:'All other inherited application bytes, the CSV parser, importer API, schema and themes are unchanged.'},null,2)+'\n');
console.log('V1.08 audit: 3 frontend safeguards, generated asset manifest and release header only; all '+input.fileCount+' supplied paths retained.');
