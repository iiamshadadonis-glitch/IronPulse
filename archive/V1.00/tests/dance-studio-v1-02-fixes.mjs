import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {onRequestPost as submitTrialRequest} from '../functions/api/public/profile.js';
import {ensureSchema} from '../functions/_lib/schema.js';
import {mergeSiteSettings} from '../functions/_lib/utils.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const files=(dir,ext)=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>{
  const rel=path.join(dir,entry.name);
  return entry.isDirectory()?files(rel,ext):entry.name.endsWith(ext)?[rel]:[];
});

const marketing=read('public/admin/final-v16-93-marketing-ui.js');
assert.match(marketing,/typeof r\.querySelector==='function'/,'marketing helper must tolerate a missing panel root');
assert.match(marketing,/function adminReady\(\)/,'marketing setup must wait for authenticated admin UI');
assert.match(marketing,/dropbeat:admin-ready/,'marketing setup must resume after login');

const emailProviders=read('public/admin/final-v17-06-email-providers.js');
assert.match(emailProviders,/if\(!adminReady\(\)\|\|loading\)return/,'email provider API must not load before login');
assert.match(emailProviders,/dropbeat:admin-ready/,'email providers must initialize after login');

const operations=read('public/admin/final-v16-86-business-operations-gmail.js');
assert.match(operations,/if\(!app\|\|app\.hidden\)return/,'wrapped admin loaders must remain inactive on the login screen');

const admin=read('public/admin/admin.js');
assert.match(admin,/new CustomEvent\('dropbeat:admin-ready'\)/,'successful authentication must announce admin readiness');
const adminExtra=read('public/admin/admin-extra.js');
assert.match(adminExtra,/expectedLoginError/,'expected pre-authentication failures must not become global error toasts');

const form=read('public/submit-profile.html');
for(const field of ['name','date_of_birth','gender','country_code','phone','email','profile_message']){
  assert.match(form,new RegExp(`name=["']${field}["']`),`trial form must include ${field}`);
}
for(const removed of ['instagram_id','current_occupation','experience_level','projects_count','future_goal','role_interest','photo_link_1','video_link_1']){
  assert.doesNotMatch(form,new RegExp(`name=["']${removed}["']`),`trial form must not ask for ${removed}`);
}
assert.doesNotMatch(form,/profile-media-links\.js/,'trial page must not load the removed media-link UI');
assert.match(form,/Book My Free Trial/,'trial page needs a clear free-trial submission action');

const profileApi=read('functions/api/public/profile.js');
assert.match(profileApi,/parseDateOfBirth/,'profile endpoint must validate date of birth');
assert.match(profileApi,/date_of_birth:birth\.dob/,'profile endpoint must preserve date of birth in the existing CRM merge');
assert.match(profileApi,/age:birth\.age/,'profile endpoint must derive the legacy age value for downstream compatibility');
assert.doesNotMatch(profileApi,/if\(!instagram\)return/,'Instagram must not be required for a trial request');

const sqlite=new DatabaseSync(':memory:');
for(const migration of fs.readdirSync(path.join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${migration}`));
class D1Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const testEnv={DB:{prepare(sql){return new D1Statement(sql);},async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}}};
await ensureSchema(testEnv);
const trialResponse=await submitTrialRequest({request:new Request('https://dance-class.pages.dev/api/public/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Trial Student',date_of_birth:'2000-02-29',gender:'Prefer not to say',country_code:'91',phone:'9876543210',email:'trial.student@example.test',profile_message:'Interested in a beginner free trial.'})}),env:testEnv});
assert.equal(trialResponse.status,200,'the simplified trial request must be accepted without Instagram, occupation or media');
const trialResult=await trialResponse.json();
assert.equal(trialResult.ok,true,'the simplified trial request must return success');
const savedTrial=sqlite.prepare('SELECT date_of_birth,age,gender,profile_message FROM contact_leads WHERE id=?').get(trialResult.lead_id);
assert.equal(savedTrial.date_of_birth,'2000-02-29','date of birth must reach the existing contact record');
assert.ok(Number.isInteger(savedTrial.age)&&savedTrial.age>=25&&savedTrial.age<=27,'legacy age must be derived from date of birth');
assert.equal(savedTrial.profile_message,'Interested in a beginner free trial.');
const badDobResponse=await submitTrialRequest({request:new Request('https://dance-class.pages.dev/api/public/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Future Student',date_of_birth:'2999-01-01',gender:'Female',country_code:'91',phone:'9876543211',email:'future@example.test'})}),env:testEnv});
assert.equal(badDobResponse.status,400,'future dates of birth must be rejected');

const theme=read('public/assets/dropbeat-theme.css');
for(const token of ['#4B55BE','#A469A8','#1a1a1a','#454545','#313131'])assert.ok(theme.includes(token),`frontend theme must include original Dropbeat token ${token}`);
for(const structure of ['.dropbeat-quick-strip','.dropbeat-welcome-grid','.dropbeat-welcome-visual','.ssl-badge','.standalone-credit'])assert.ok(theme.includes(structure),`frontend theme must style ${structure}`);
assert.match(theme,/\.ssl-badge[\s\S]*background:#fff!important/,'SSL certificate badge must use a clearly visible high-contrast surface');

const publicHelper=read('public/assets/final-public-seo-ssl-speed.js');
assert.match(publicHelper,/addDropbeatHomeSections/,'home page must receive the structural Dropbeat sections');
assert.match(publicHelper,/Studio &amp; Online/,'home page must include the floating class information strip');

const adminTheme=read('public/admin/dropbeat-admin-theme.css');
for(const selector of ['.side{','.main{','.login-overlay{','.login-card{'])assert.ok(adminTheme.includes(selector),`admin override must target actual ${selector} structure`);
for(const token of ['#4B55BE','#A469A8'])assert.ok(adminTheme.includes(token),`admin theme must use Dropbeat token ${token}`);
assert.match(adminTheme,/\.side\{[\s\S]*#202249[\s\S]*#4B55BE/,'admin sidebar must use the Dropbeat indigo family');

const portalShells=new Set(['public/login.html','public/student-dashboard.html','public/coach-dashboard.html','public/my-orders.html']);
const htmlFiles=files('public','.html').filter(rel=>!rel.startsWith('public/admin/')&&!rel.endsWith('_footer.html')&&!portalShells.has(rel));
for(const rel of htmlFiles){
  const html=read(rel);
  assert.doesNotMatch(html,/Inst Automate/,`${rel} must not contain the incorrect Inst Automate spelling`);
  assert.match(html,/dropbeat-theme\.css\?v=1.13/,`${rel} must load the current V1.08 frontend theme`);
  assert.match(html,/Website designed by[\s\S]*Instautomate/,`${rel} must show the corrected Instautomate credit`);
}
for(const rel of ['functions/page/[slug].js','functions/blog/[[slug]].js']){
  const source=read(rel);
  assert.doesNotMatch(source,/Inst Automate/,`${rel} must not contain the incorrect spelling`);
  assert.match(source,/Instautomate/,`${rel} must render the corrected dynamic-page credit`);
  assert.match(source,/dropbeat-theme\.css\?v=1.13/,`${rel} must load the current V1.08 theme`);
}

const adminHtml=read('public/admin/index.html');
assert.match(adminHtml,/dropbeat-admin-theme\.css\?v=1.13/,'admin must load the current corrected theme last');
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-theme.css')>adminHtml.lastIndexOf('final-v17-09-navigation-email-parity.js'),'admin theme must follow inherited admin assets');

const danceMigration=read('migrations/0042_dance_studio_branding.sql');
assert.doesNotMatch(danceMigration,/Inst Automate/,'fresh databases must not seed the incorrect footer spelling');
assert.match(danceMigration,/Website designed by Instautomate/,'fresh databases must seed the corrected footer credit');
assert.doesNotMatch(danceMigration,/\("(?:about|contact|privacy|terms|refund|faq|404)"/,'content page seeds must use portable SQL string quoting');
assert.equal(mergeSiteSettings({footerText:'Website designed by Inst Automate'}).footerText,'Website designed by Instautomate','existing saved footer settings must be normalized without another migration');

console.log(`DropBeat V1.02 focused verification passed (${htmlFiles.length} frontend HTML pages checked).`);
