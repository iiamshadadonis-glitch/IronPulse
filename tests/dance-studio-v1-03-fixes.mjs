import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const files=(dir,ext)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>{
  const rel=path.join(dir,entry.name);
  return entry.isDirectory()?files(rel,ext):entry.name.endsWith(ext)?[rel]:[];
});

assert.equal(JSON.parse(read('package.json')).version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const adminTheme=read('public/admin/dropbeat-admin-theme.css');
for(const alias of ['--primary:var(--dropbeat-primary)','--accent:var(--dropbeat-accent)','--brand:var(--dropbeat-primary)','--surface:#fff','--panel:#fff','--border:#e2e2eb']){
  assert.ok(adminTheme.includes(alias),`admin legacy alias must resolve through Dropbeat: ${alias}`);
}
for(const selector of ['.uc-v1652-brand-tab.active','#businessCalendar .uc88-calendar','#socialPosts .uc48-calendar-shell','[class*="-grid-cell"]','#socialMediaIntegrations .uc49-grid-col']){
  assert.ok(adminTheme.includes(selector),`admin V1.03 theme must cover ${selector}`);
}
assert.match(adminTheme,/\.uc-v1652-brand-tab\{[\s\S]*?border-radius:2px!important/,'Brand Settings tabs must no longer use the legacy capsule shape');
assert.match(adminTheme,/#businessCalendar \.uc88-weekday\{background:#efeff7!important/,'Analytics calendar headings must use the Dropbeat neutral surface');
assert.match(adminTheme,/#socialPosts \.uc48-day-name\{[\s\S]*?background:#efeff7!important/,'Scheduling calendar headings must use the Dropbeat neutral surface');

const adminFix=read('public/admin/dropbeat-admin-v1-03.js');
assert.match(adminFix,/setSidebarLabel\([^\n]+Dance Tips/,'Article navigation must be renamed to Dance Tips');
assert.match(adminFix,/Add Advertisements to These Dance Tips/,'advertisement wording must use Dance Tips');
assert.match(adminFix,/function syncPostTabs\(\)/,'dynamic Posts tab rebuilds must be normalized');
assert.match(adminFix,/pollOpen\?tab\.hasAttribute\('data-uc76-polls-tab'\)/,'Polls must be active only while its launcher is open');
assert.match(adminFix,/tab\.setAttribute\('aria-selected',String\(selected\)\)/,'Posts tabs must expose one synchronized selected state');

const adminHtml=read('public/admin/index.html');
for(const asset of ['dropbeat-admin-theme.css?v=1.13','dropbeat-admin-language.js?v=1.13','dropbeat-admin-v1-03.js?v=1.13'])assert.ok(adminHtml.includes(asset),`admin must cache-bust ${asset}`);
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-v1-03.js')>adminHtml.lastIndexOf('dropbeat-admin-language.js'),'V1.03 behavior guard must load after inherited language mutation');

const publicTheme=read('public/assets/dropbeat-theme.css');
assert.match(publicTheme,/body\[data-uc-load="home"\] \.topbar \.navlinks \.nav-dropdown-menu a\{[\s\S]*?color:var\(--dropbeat-menu\)!important/,'home Offers dropdown links must remain readable');
assert.match(publicTheme,/\.topbar \.navlinks>\.nav-dropdown>\.nav-top-link::after\{[\s\S]*?content:""!important/,'Offers must use the theme underline rather than a dropdown arrow');
assert.match(publicTheme,/\.topbar \.navlinks\{gap:clamp\(16px,1\.45vw,24px\)!important/,'top-level navigation spacing must be uniform');

const publicLanguage=read('public/assets/dropbeat-dance-language.js');
assert.match(publicLanguage,/\.navlinks a\[href="\/blog"\],\.footer a\[href="\/blog"\]/,'all public navigation/footer blog links must be labeled at runtime');
assert.match(publicLanguage,/a\.textContent='Dance Tips'/,'the visible label must be Dance Tips');
assert.match(read('functions/_lib/navigation.js'),/key:'blog', label:'Dance Tips'/,'dynamic/custom navigation must also use Dance Tips');

const portalShells=new Set(['public/login.html','public/student-dashboard.html','public/coach-dashboard.html','public/my-orders.html']);
const htmlFiles=files('public','.html').filter(rel=>!rel.startsWith('public/admin/')&&!rel.endsWith('_footer.html')&&!portalShells.has(rel));
for(const rel of htmlFiles){
  const html=read(rel);
  assert.match(html,/dropbeat-theme\.css\?v=1.13/,`${rel} must load the V1.08 public theme`);
  if(html.includes('class="topbar"'))assert.match(html,/final-public-seo-ssl-speed\.js\?v=1.13/,`${rel} must cache-bust the public structure/navigation helper`);
  assert.match(html,/dropbeat-dance-language\.js\?v=1.13/,`${rel} must cache-bust public terminology`);
  assert.doesNotMatch(html,/href="\/blog">Dance Classes<\/a>/,`${rel} must not expose the old menu/footer label`);
}
for(const rel of ['functions/page/[slug].js','functions/blog/[[slug]].js']){
  const source=read(rel);
  assert.match(source,/dropbeat-theme\.css\?v=1.13/,`${rel} must use the V1.08 public theme`);
  assert.match(source,/dropbeat-dance-language\.js\?v=1.13/,`${rel} must use V1.08 terminology cache busting`);
  assert.doesNotMatch(source,/href="\/blog">Dance Classes<\/a>/,`${rel} must not render the old menu/footer label`);
}
assert.match(read('public/blog.html'),/<title>Dance Tips \| DropBeat Dance Studio<\/title>/,'Dance Tips listing must have the corrected title');
assert.match(read('public/blog-post.html'),/<title>Dance Tip \| DropBeat Dance Studio<\/title>/,'Dance Tip detail must have the corrected title');

const headers=read('public/_headers');
for(const asset of ['/assets/dropbeat-theme.css','/assets/dropbeat-dance-language.js','/assets/final-public-seo-ssl-speed.js']){
  assert.match(headers,new RegExp(`${asset.replaceAll('/','\\/')}\\n  Cache-Control: no-cache, must-revalidate`),`${asset} must revalidate even behind an intermediary cache`);
}

console.log(`DropBeat V1.03 focused verification passed (${htmlFiles.length} frontend HTML pages checked).`);
