import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from '@babel/parser';
import {DatabaseSync} from 'node:sqlite';
import {collect,files,sqlStatements} from '../tools/gym-contract-helpers.mjs';
import {LAYOUT_NAMES,LAYOUT_THEMES} from '../public/assets/layout-registry-v1-57.js';
import {dictionaryButtons} from '../public/assets/button-dictionary-defaults-v1-56.js';
import {dashboardFor} from '../functions/_lib/app-session-v1-58.js';
import {safeNotificationPath} from '../functions/_lib/notifications-v1-58.js';
import {onRequest as middleware} from '../functions/_middleware.js';
import {validateGymConfiguration} from '../tools/gym-deployment-config.mjs';
import {database,request} from './fixtures-v158.mjs';
import {onRequestPost as login} from '../functions/api/admin/auth/login.js';

const root=fileURLToPath(new URL('../',import.meta.url)),text=name=>readFileSync(join(root,name),'utf8');
const baseline=JSON.parse(text('tests/gym-baseline-contracts.json')),current=collect(root);
assert.deepEqual(current.css,baseline.css,'Every inherited CSS/theme file must be byte-identical');
assert.deepEqual(current.functionDDL,baseline.functionDDL,'Runtime schema definitions must remain identical');
for(const[name,value]of Object.entries(baseline.migrationDDL))assert.equal(current.migrationDDL[name],value,name);
assert.deepEqual(current.apiPaths,baseline.apiPaths,'API endpoint paths stay compatible');
const exceptions=['functions/_lib/notifications-v1-58.js','functions/_middleware.js','functions/api/admin/auth/login.js'];
for(const[name,value]of Object.entries(baseline.functionShapes))if(!exceptions.includes(name))assert.equal(current.functionShapes[name],value,'Business logic, keys, roles and enums changed: '+name);
console.log('Compatibility: 177 unchanged CSS files, 268 matching runtime-schema fingerprints, 55 unchanged migration DDL sets, 183 API paths and 265 backend structures. Three small routing/authentication changes are tested separately.');

for(const old of ['/student-dashboard','/student-dashboard.html','/student-dashboard/']){
 const response=await middleware({request:new Request('https://gym.example'+old+'?view=memberships'),env:{}});
 assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://gym.example/member-dashboard?view=memberships');
}
for(const path of ['/member-dashboard','/member-dashboard.html']){
 const response=await middleware({request:new Request('https://gym.example'+path,{headers:{accept:'text/html'}}),env:{},data:{},next:async()=>new Response('<!doctype html><html><head></head><body>Member</body></html>',{headers:{'content-type':'text/html'}})});
 assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(response.headers.get('cache-control'),/no-store/);
}
assert.equal(dashboardFor('student'),'/member-dashboard');assert.equal(dashboardFor('coach'),'/coach-dashboard');
assert.equal(safeNotificationPath('/member-dashboard?view=notifications','student'),'/member-dashboard?view=notifications');
for(const path of ['/coach-dashboard','https://evil.example/member-dashboard','/member-dashboard/../admin/'])assert.throws(()=>safeNotificationPath(path,'student'));
const fixture=database();
try{
 fixture.sql.exec('DELETE FROM admin_sessions; DELETE FROM admin_users;');
 const env={...fixture.env,ADMIN_LOGIN_EMAIL:'gym-admin@example.test',ADMIN_LOGIN_PASSWORD:''};
 const attempt=password=>login({request:request('/api/admin/auth/login',{body:{email:env.ADMIN_LOGIN_EMAIL,password}}),env});
 assert.equal((await attempt('ChangeMe@123')).status,401);assert.equal(fixture.sql.prepare('SELECT COUNT(*) n FROM admin_users').get().n,0,'No shared bootstrap password');
 env.ADMIN_LOGIN_PASSWORD='Synthetic-unique-gym-password-462';assert.equal((await attempt(env.ADMIN_LOGIN_PASSWORD)).status,200);assert.equal((await attempt('wrong-password')).status,401);
}finally{fixture.close();}
const config=JSON.parse(text('wrangler.jsonc'));validateGymConfiguration(config,{configured:false});assert.throws(()=>validateGymConfiguration(config),/setup:gym/);
const provisioned=structuredClone(config);provisioned.d1_databases[0].database_id='12345678-1234-1234-1234-123456789abc';provisioned.vars.ADMIN_LOGIN_EMAIL='owner@example.test';validateGymConfiguration(provisioned);
for(const change of [c=>c.name='dance-class-at2',c=>c.d1_databases[0].database_id='16c9361a-625c-4c71-8ecb-6608a8836152']){const bad=structuredClone(provisioned);change(bad);assert.throws(()=>validateGymConfiguration(bad),/original/i);}

const sqlite=new DatabaseSync(':memory:');
try{
 for(const file of files(join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort())for(const statement of sqlStatements(readFileSync(file,'utf8')))try{sqlite.exec(statement+';');}catch(error){if(!/duplicate column|already exists/.test(error.message))throw error;}
 const settings=JSON.parse(sqlite.prepare("SELECT value FROM settings WHERE key='site_settings'").get().value);assert.equal(settings.siteName,'IronPulse Gym');assert.equal(settings.primaryColor,'#4B55BE');
 for(const product of sqlite.prepare('SELECT name,slug FROM products').all())assert.doesNotMatch(product.name+' '+product.slug,/dance|student|dropbeat/i);
 for(const banner of sqlite.prepare('SELECT desktop_image_url,mobile_image_url FROM banners').all())for(const value of Object.values(banner))assert.ok(existsSync(join(root,'public',value)));
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM studio_gallery_images WHERE image_url LIKE '/assets/gym-%'").get().n,2);
}finally{sqlite.close();}
assert.equal(LAYOUT_NAMES.blog.label,'Fitness Tips');assert.equal(LAYOUT_NAMES.stories.label,'Member Stories');assert.deepEqual(Object.keys(LAYOUT_THEMES),['dropbeat','casting','spotlight','minimal']);
const buttons=dictionaryButtons();assert.equal(buttons.find(x=>x.key==='front.auth.student_tab').label,'Member Sign Up');assert.equal(buttons.find(x=>x.key==='front.home.membership').target,'/member-dashboard');
assert.equal(buttons.find(x=>x.key==='front.auth.signup').target,'/login?signup=student','Account protocol is unchanged');
const stylesAst=parse(text('public/admin/dropbeat-admin-v1-11.js'),{sourceType:'script'});let specialties;
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.id?.name==='STYLES')specialties=node.init.elements.map(x=>x.value);for(const[key,value]of Object.entries(node)){if(['loc','extra','comments','leadingComments','trailingComments'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}walk(stylesAst);
for(const name of ['Weightlifting','Cardio','CrossFit','Personal Training'])assert.ok(specialties.includes(name));assert.ok(!specialties.includes('Hip Hop'));
const manifest=JSON.parse(text('public/manifest.webmanifest'));assert.deepEqual(manifest,JSON.parse(text('public/manifest.json')));assert.equal(manifest.name,'IronPulse Gym');assert.equal(manifest.theme_color,'#4B55BE');assert.equal(manifest.background_color,'#ffffff');
for(const icon of manifest.icons){const bytes=readFileSync(join(root,'public',icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
const apple=readFileSync(join(root,'public/assets/apple-touch-icon.png'));assert.equal(apple.readUInt32BE(16),180);
assert.ok(existsSync(join(root,'public/member-dashboard.html')));assert.ok(!existsSync(join(root,'public/student-dashboard.html')));
let scripts=0,pages=0;
for(const file of [...files(join(root,'public')),...files(join(root,'functions'))]){
 if(file.endsWith('.js')){const source=readFileSync(file,'utf8');parse(source,{sourceType:'unambiguous'});assert.doesNotMatch(source,/<fitness tip[\s>]/);scripts++;}
 if(file.endsWith('.html')&&!file.endsWith('/_footer.html')){const html=readFileSync(file,'utf8');pages++;assert.match(html,/name="theme-color" content="#4B55BE"/);assert.match(html,/apple-touch-icon/);for(const match of html.matchAll(/(?:src|href)="(\/(?:assets|admin)\/[^"?#]+\.(?:js|css|svg|png))(?:\?[^"#]*)?"/g))assert.ok(existsSync(join(root,'public',match[1])),file+': '+match[1]);}
}
console.log('Gym routing, bootstrap isolation, deployment isolation, fresh SQLite defaults, specialties, dictionary defaults, PWA dimensions, '+scripts+' parsed scripts and '+pages+' page asset inventories passed.');
