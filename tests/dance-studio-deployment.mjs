import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const [pkgText,config,version,setup]=await Promise.all([
  read('package.json'),read('wrangler.jsonc'),read('DANCE-STUDIO-VERSION.txt'),read('DANCE-STUDIO-SETUP.md')
]);
const pkg=JSON.parse(pkgText);

assert.equal(pkg.version,'1.59.0');
assert.match(version,/DANCE-STUDIO-V1.59/);
assert.equal(pkg.scripts.deploy,'wrangler pages deploy public --project-name dance-class-at2 --branch main');
assert.doesNotMatch(pkg.scripts.deploy,/(^|\s)wrangler deploy(?:\s|$)/);
assert.equal(pkg.scripts['d1:migrate:remote'],'wrangler d1 migrations apply dance-class --remote');
assert.match(config,/"name"\s*:\s*"dance-class-at2"/);
assert.match(config,/"pages_build_output_dir"\s*:\s*"\.\/public"/);
assert.match(config,/"database_name"\s*:\s*"dance-class"/);
assert.match(config,/"database_id"\s*:\s*"16c9361a-625c-4c71-8ecb-6608a8836152"/);
assert.match(config,/"binding"\s*:\s*"DB"/);
assert.doesNotMatch(config,/REPLACE_WITH_NEW_DANCE_D1_DATABASE_ID/);
assert.match(setup,/Pages \+ Pages Functions/);
assert.match(setup,/npm run deploy/);
assert.match(setup,/never `npx wrangler deploy`/i);

const publicRoot=path.resolve(new URL('public/',root).pathname);
const html=[];
async function walk(dir){for(const name of await readdir(dir)){const full=path.join(dir,name);const info=await stat(full);if(info.isDirectory())await walk(full);else if(name.endsWith('.html'))html.push(full);}}
await walk(publicRoot);
const missing=[];
for(const file of html){
  const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:src|href)=["'](\/[^"'#?]+)(?:\?[^"']*)?["']/g)){
    const url=decodeURI(match[1]);
    if(url==='/page/')continue;
    const candidates=[path.join(publicRoot,url),path.join(publicRoot,`${url}.html`),path.join(publicRoot,url,'index.html')];
    let exists=false;
    for(const candidate of candidates){try{await stat(candidate);exists=true;break;}catch{}}
    if(!exists)missing.push(`${path.relative(publicRoot,file)} -> ${url}`);
  }
}
assert.deepEqual(missing,[],`Missing public assets/routes:\n${missing.join('\n')}`);
console.log('Dance Studio Pages deployment, D1 binding and static asset checks passed.');
