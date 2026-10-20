import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {File} from 'node:buffer';
import {onRequestPost as saveStory} from '../functions/api/admin/success-stories.js';
import {onRequestGet as publicStories} from '../functions/api/public/success-stories.js';
import {onRequestPost as addStudioImages,onRequestPut as moveStudioImage,onRequestDelete as deleteStudioImage} from '../functions/api/admin/studio-gallery.js';
import {onRequestGet as publicStudioGallery} from '../functions/api/public/studio-gallery.js';
import {dropbeatPublicCacheEntries} from '../functions/_lib/edge-response-cache.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'1.33.0');
const lock=JSON.parse(read('package-lock.json'));
assert.equal(lock.version,'1.33.0');assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.04'],'V1.04 must expose the complete verification command');

const migration=read('migrations/0043_dropbeat_studio_gallery.sql');
assert.match(migration,/CREATE TABLE IF NOT EXISTS studio_gallery_images/);
assert.match(read('functions/_lib/schema.js'),/dropbeat-v1\.27-checkout-runtime-repair/,'the self-healing schema marker must advance for existing deployments');
assert.match(read('functions/_lib/schema.js'),/ALTER TABLE success_stories ADD COLUMN thumbnail_url/,'older Student Story schemas must be repaired');

const adminHtml=read('public/admin/index.html');
for(const asset of ['dropbeat-admin-theme.css?v=1.13','dropbeat-admin-language.js?v=1.13','dropbeat-admin-v1-03.js?v=1.13','dropbeat-admin-v1-04.js?v=1.13']){
  assert.ok(adminHtml.includes(asset),`admin must load cache-busted ${asset}`);
}
assert.doesNotMatch(adminHtml,/dropbeat=1\.02/,'admin assets must not retain the earlier DropBeat cache key');
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-v1-04.js')>adminHtml.lastIndexOf('dropbeat-admin-v1-03.js'),'V1.04 compatibility logic must load last');
const adminFix=read('public/admin/dropbeat-admin-v1-04.js');
for(const phrase of ['Add DropBeat Studio Images','Existing DropBeat Studio Images','data-gallery-action="up"','multiple required','Saving and verifying the Student Story'])assert.ok(adminFix.includes(phrase),`admin V1.04 must include ${phrase}`);

const publicHelper=read('public/assets/final-public-seo-ssl-speed.js');
assert.match(publicHelper,/\/api\/public\/studio-gallery\?dropbeat=1\.13/);
assert.match(publicHelper,/setInterval\(\(\)=>show\(current\+1\),5200\)/,'multiple welcome images must rotate in saved order');
const theme=read('public/assets/dropbeat-theme.css');
assert.match(theme,/\.dropbeat-studio-slide\.active\{opacity:1/);
assert.match(theme,/\.cookie-consent-copy strong\{color:var\(--dropbeat-primary\)!important/,'cookie heading must no longer use the inherited red');
assert.match(theme,/\.footer \.designed\{[\s\S]*?flex-direction:row!important[\s\S]*?justify-content:space-between!important/,'footer copyright and credit must sit at opposite sides');

const home=read('public/index.html');
assert.match(home,/Complete your membership payment securely/);
assert.match(home,/<h3>Join your class<\/h3>/);
assert.doesNotMatch(home,/Stripe fallback can be enabled/);
assert.match(home,/app\.js\?v=17\.03&dropbeat=1\.29/,'the public app must use the current asset URL');
assert.match(home,/dropbeat-theme\.css\?v=1.13/);
assert.match(home,/platform-polish-v2\.css\?v=16\.98&dropbeat=1\.13/,'the updated cookie styling must use a fresh asset URL');
const app=read('public/assets/app.js');
assert.match(app,/cache:fresh\?'no-store':'default'/,'public data requests must bypass private browser caches');
assert.match(app,/Student Stories will appear here soon/);
const edge=read('functions/_lib/edge-response-cache.js');
assert.match(edge,/purgePublicEdgeCaches/);
assert.match(edge,/dropbeatPublicCacheEntries/,'cache purging must include administrator-created page keys');
assert.match(edge,/products-dropbeat-v113:yearly/,'yearly plans must be included in immediate cache purging');
assert.match(edge,/cache-control','no-cache, max-age=0, must-revalidate'/);
assert.match(read('functions/_middleware.js'),/DROPBEAT_PUBLIC_CACHE_ENTRIES/,'successful admin mutations must invalidate shared public snapshots');
const customCacheEntries=await dropbeatPublicCacheEntries({DB:{prepare:()=>({all:async()=>({results:[{page_key:'custom-dance-page'}]})})}});
assert.ok(customCacheEntries.some(entry=>entry.key==='products-dropbeat-v113:custom-dance-page'),'custom page product caches must be invalidated after admin saves');

const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};

let response=await saveStory({request:new Request('https://example.test/api/admin/success-stories',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'First Dance Journey',url:'youtube.com/watch?v=HPQ0oHVtfNA&list=RDHPQ0oHVtfNA',status:'active'})}),env});
assert.equal(response.status,201,'a pasted YouTube URL without https must save');
const savedStory=await response.json();
assert.equal(savedStory.ok,true);
assert.match(savedStory.story.url,/^https:\/\/youtube\.com\/watch\?v=HPQ0oHVtfNA/);
assert.equal(savedStory.story.thumbnail_url,'https://img.youtube.com/vi/HPQ0oHVtfNA/hqdefault.jpg');
response=await publicStories({env});
assert.equal(response.headers.get('cache-control'),'no-store, max-age=0, must-revalidate');
assert.equal((await response.json()).stories.length,1,'the saved active story must appear on the public endpoint');

sqlite.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('social_integration_settings',JSON.stringify({googleDrive:{refreshToken:'test-refresh-token',oauthClientId:'test-client-id',oauthClientSecret:'test-client-secret',rootFolderId:'dropbeat-root-folder'}}));
const originalFetch=globalThis.fetch;
let uploadedFileNumber=0;
globalThis.fetch=async (input,init={})=>{
  const url=String(input);
  if(url.includes('oauth2.googleapis.com/token'))return Response.json({access_token:'test-drive-token'});
  if(url.includes('/drive/v3/files/dropbeat-root-folder'))return Response.json({id:'dropbeat-root-folder',name:'DropBeat Test Root',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}});
  if(url.includes('/drive/v3/files?')&&String(init.method||'GET').toUpperCase()==='GET')return Response.json({files:[{id:'studio-gallery-folder',name:'DropBeat Studio Gallery',mimeType:'application/vnd.google-apps.folder'}]});
  if(url.includes('/upload/drive/v3/files'))return Response.json({id:`studio-image-${++uploadedFileNumber}`,name:`studio-${uploadedFileNumber}.png`,mimeType:'image/png',size:'5',webViewLink:`https://drive.google.com/file/d/studio-image-${uploadedFileNumber}/view`});
  if(url.includes('/permissions'))return Response.json({id:'test-permission',type:'anyone',role:'reader'});
  if(String(init.method||'GET').toUpperCase()==='DELETE')return new Response(null,{status:204});
  throw new Error(`Unexpected Google Drive test request: ${url}`);
};

const form=new FormData();
form.append('images',new File([new Uint8Array([137,80,78,71])],'studio-one.png',{type:'image/png'}));
form.append('images',new File([new Uint8Array([137,80,78,71,1])],'studio-two.png',{type:'image/png'}));
form.append('alt_text','DropBeat students practising together');form.append('visible','1');
response=await addStudioImages({request:new Request('https://example.test/api/admin/studio-gallery',{method:'POST',body:form}),env});
assert.equal(response.status,201,'multiple DropBeat Studio images must upload together');
let galleryData=await response.json();
assert.equal(galleryData.images.length,2);
assert.deepEqual(galleryData.images.map(item=>item.sort_order),[1,2]);
const secondId=galleryData.images[1].id;
response=await moveStudioImage({request:new Request('https://example.test/api/admin/studio-gallery',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({action:'move',id:secondId,dir:-1})}),env});
galleryData=await response.json();
assert.equal(galleryData.images[0].id,secondId,'admin sorting must change the public rotation order');
response=await publicStudioGallery({env});
assert.equal(response.headers.get('cache-control'),'no-store, max-age=0, must-revalidate');
assert.equal((await response.json()).images[0].id,secondId);
response=await deleteStudioImage({request:new Request(`https://example.test/api/admin/studio-gallery?id=${secondId}`,{method:'DELETE'}),env});
assert.equal(response.status,200);
assert.equal((await response.json()).images.length,1,'gallery deletion must remove only the selected image');
globalThis.fetch=originalFetch;

console.log('DropBeat V1.04 focused verification passed: managed studio gallery, Student Stories, content, footer and cache behavior.');
