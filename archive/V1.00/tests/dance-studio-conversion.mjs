import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';const R=process.cwd();const read=p=>fs.readFileSync(path.join(R,p),'utf8');
const home=read('public/index.html'),admin=read('public/admin/index.html'),utils=read('functions/_lib/utils.js'),wr=read('wrangler.jsonc'),manifest=read('public/manifest.webmanifest');
assert.match(home,/dropbeat-theme\.css/);assert.match(home,/dropbeat-dance-language\.js/);assert.match(home,/Dance memberships for every rhythm/);assert.doesNotMatch(home,/Urgent Casting|Audition Updates|Submit Profile/);
assert.match(admin,/dropbeat-admin-theme\.css/);assert.match(admin,/dropbeat-admin-language\.js/);assert.match(admin,/DropBeat Dance Studio Admin/);
assert.match(utils,/siteName:'DropBeat Dance Studio'/);assert.match(utils,/primaryColor:'#4B55BE'/);assert.match(utils,/accentColor:'#A469A8'/);assert.match(utils,/dropbeat-logo\.svg/);
assert.match(wr,/"database_name"\s*:\s*"dance-class"/);assert.match(wr,/16c9361a-625c-4c71-8ecb-6608a8836152/);assert.doesNotMatch(wr,/urgent-casting-db|REPLACE_WITH_NEW_DANCE_D1_DATABASE_ID/);
assert.match(manifest,/DropBeat Dance Studio/);assert.ok(fs.existsSync(path.join(R,'public/assets/dropbeat-page-title.jpg')));assert.ok(fs.existsSync(path.join(R,'migrations/0042_dance_studio_branding.sql')));
const portalShells=new Set(['login.html','student-dashboard.html','coach-dashboard.html','my-orders.html']);
for(const f of fs.readdirSync(path.join(R,'public')).filter(x=>x.endsWith('.html')&&!x.startsWith('_')&&!portalShells.has(x))){const h=read('public/'+f);assert.match(h,/dropbeat-theme\.css/,`${f} missing theme css`);assert.match(h,/dropbeat-dance-language\.js/,`${f} missing language layer`);}
console.log('Dance Studio conversion checks passed.');
