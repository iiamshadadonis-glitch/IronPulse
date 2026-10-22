import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from '@babel/parser';
import {DatabaseSync} from 'node:sqlite';
import {collect,files,sqlStatements,digest} from '../tools/gym-contract-helpers.mjs';
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
const publicFixes=JSON.parse(text('verification/ironpulse-v1.05/public-fitness-tips-fixes.json'));
const deliveryFixes=JSON.parse(text('verification/ironpulse-v1.06/asset-delivery-fixes.json'));
const layoutFixes=JSON.parse(text('verification/ironpulse-v1.07/layout-theme-fixes.json'));
const expectedCss={...baseline.css,[publicFixes.stylesheet.path]:publicFixes.stylesheet.sha256,[deliveryFixes.stylesheet.path]:deliveryFixes.stylesheet.sha256};
assert.deepEqual(current.css,expectedCss,'Retain every inherited theme file; only the audited public Fitness Tips stylesheet is added');
const expectedDDL={...baseline.functionDDL},expectedBackend={...baseline.backendSource};
for(const fix of deliveryFixes.backendFiles){if(fix.added){assert.equal(fix.ddl,digest('[]'));expectedDDL[fix.path]=digest('[]');}else assert.equal(fix.ddl,baseline.functionDDL[fix.path]);expectedBackend[fix.path]=fix.sha256;}
for(const fix of layoutFixes.backendFiles){assert.equal(expectedBackend[fix.path],fix.beforeSha256);assert.equal(expectedDDL[fix.path],fix.ddl);expectedBackend[fix.path]=fix.afterSha256;}
assert.deepEqual(current.functionDDL,expectedDDL,'Runtime schema definitions must remain identical; delivery helpers have no schema statements');
for(const[name,value]of Object.entries(baseline.migrationDDL))assert.equal(current.migrationDDL[name],value,name);
assert.deepEqual(current.apiPaths,baseline.apiPaths,'API endpoint paths stay compatible');
assert.deepEqual(current.backendSource,expectedBackend,'Backend remains unchanged except the separately audited delivery and layout/theme safeguards');
const uiFixes=JSON.parse(text('verification/ironpulse-v1.04/frontend-fixes.json'));
const expectedFrontend={...baseline.frontendSource};
for(const fix of uiFixes.files){assert.equal(expectedFrontend[fix.path],fix.beforeSha256,'A UI exception must identify its original source');expectedFrontend[fix.path]=fix.afterSha256;}
assert.equal(expectedFrontend[publicFixes.renderer.path],publicFixes.renderer.beforeSha256);
expectedFrontend[publicFixes.renderer.path]=publicFixes.renderer.afterSha256;
for(const fix of layoutFixes.frontendFiles){assert.equal(expectedFrontend[fix.path],fix.beforeSha256);expectedFrontend[fix.path]=fix.afterSha256;}
assert.deepEqual(current.frontendSource,expectedFrontend,'Frontend must retain compatibility except the explicit V1.04/V1.05/V1.07 presentation fixes');
const exceptions=layoutFixes.backendFiles.map(fix=>fix.path);for(const fix of layoutFixes.backendFiles)assert.equal(current.functionShapes[fix.path],fix.shape);
for(const[name,value]of Object.entries(baseline.functionShapes))if(!exceptions.includes(name))assert.equal(current.functionShapes[name],value,'Business logic, keys, roles and enums changed: '+name);
console.log('Compatibility with supplied gym V1.00: '+Object.keys(current.css).length+' matching CSS/theme files after path normalization, '+Object.keys(current.functionDDL).length+' runtime-schema fingerprints, '+Object.keys(current.migrationDDL).length+' migration DDL sets, '+current.apiPaths.length+' API paths and '+Object.keys(current.functionShapes).length+' backend structures.');

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
const config=JSON.parse(text('wrangler.jsonc'));validateGymConfiguration(config);assert.equal(config.d1_databases[0].database_id,'893e7d29-fa72-413d-9415-5d93b1c3bc6e');


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
const stylesAst=parse(text('public/admin/gym-admin-v1-11.js'),{sourceType:'script'});let specialties;
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
