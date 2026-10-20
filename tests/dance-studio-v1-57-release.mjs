import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {LAYOUT_THEMES,themeBlocks} from '../public/assets/layout-registry-v1-57.js';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
assert.equal(JSON.parse(await read('package.json')).version,'1.57.0');
const protectedFiles=JSON.parse(await read('tests/v157-protected-files.json'));
for(const[file,hash]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash,'Unexpected V1.56 change: '+file);
const modules=['public/assets/layout-registry-v1-57.js','public/assets/dropbeat-layout-v1-57.js','public/assets/dropbeat-layout-admin-v1-57.js','public/assets/dropbeat-pages-workspace-v1-57.js','public/assets/dropbeat-segmented-v1-57.js','public/assets/dropbeat-buttons-admin-v1-57.js','functions/_lib/layout.js','functions/_lib/configuration-cache-v1-57.js','functions/api/admin/layout.js','functions/api/public/layout.js','functions/_middleware.js','public/admin/dropbeat-admin-v1-03.js','public/admin/dropbeat-admin-language.js','public/assets/dropbeat-dance-language.js','tools/v157-layout-cases.mjs','tools/verify-v1-57-layout.mjs'];
modules.push('public/admin/final-v16-54-brand-articles-stability.js');
for(const file of modules)execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
for(const name of (await readdir(new URL('public/',root))).filter(name=>name.endsWith('.html')&&!name.startsWith('_'))){const html=await read('public/'+name);assert.equal((html.match(/type="module" src="\/assets\/dropbeat-layout-v1-57.js/g)||[]).length,1,name);assert.match(html,/dropbeat-button-dictionary-v1-56.js/);}
const admin=await read('public/admin/index.html');assert.match(admin,/dropbeat-layout-admin-v1-57.js/);assert.match(admin,/dropbeat-buttons-admin-v1-57.js/);assert.doesNotMatch(admin,/src="\/assets\/dropbeat-buttons-admin-v1-56.js/);assert.match(admin,/dropbeat-layout-v1-57.css/);
for(const [theme,data]of Object.entries(LAYOUT_THEMES)){const blocks=themeBlocks(theme);assert.equal(new Set(blocks.map(b=>b.id)).size,blocks.length);assert.equal(blocks.some(b=>b.id==='gallery'),data.gallery);}
const server=await read('functions/_lib/layout.js');assert.match(server,/confirmation!=='confirm'/);assert.match(server,/env.DB.batch\(statements\)/);assert.match(server,/WHERE key IN \(\?,\?,\?,\?\)/);assert.match(server,/expectedContextRevision/);
const publicClient=await read('public/assets/dropbeat-layout-v1-57.js');assert.doesNotMatch(publicClient,/setInterval|addEventListener\(['"]focus/);assert.match(publicClient,/DropBeatDataCache.query/);assert.match(publicClient,/delete model.themes/);assert.match(publicClient,/category==='front'/);
const workspace=await read('public/assets/dropbeat-pages-workspace-v1-57.js');assert.match(workspace,/button.dataset.db157Workspace===selected/);
const buttons=await read('public/assets/dropbeat-buttons-admin-v1-57.js');assert.match(buttons,/if\(phone.matches\)/);assert.match(buttons,/db157-button-accordion/);assert.match(buttons,/segmentedControl/);assert.match(buttons,/Reload buttons/);
const middleware=await read('functions/_middleware.js');assert.match(middleware,/X-DropBeat-Release', '1.57.0/);assert.match(middleware,/\/api\/public\/layout/);
for(const path of ['public/assets/dropbeat-layout-v1-57.css','public/assets/dropbeat-buttons-v1-57.css'])assert.doesNotMatch(await read(path),/#[a-f\d]{3,8}\b/i);
assert.equal(JSON.parse(await read('tests/v157-changed-files.json')).length+Object.keys(protectedFiles).length,1646);
console.log('V1.57 release guards passed: '+Object.keys(protectedFiles).length+' unchanged V1.56 files, valid modules/assets, four theme contracts, exact typed confirmation, atomic settings guard, scoped responsive controls and public/private cache separation.');
