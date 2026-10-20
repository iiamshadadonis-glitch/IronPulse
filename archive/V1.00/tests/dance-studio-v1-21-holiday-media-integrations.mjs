import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {googleDriveInlineImageUrl,parseDriveReference} from '../functions/_lib/google-drive-upload.js';
import {brandAssetUrl,brandedEmailHtml} from '../functions/_lib/branded-email.js';
import {gmailConnectionVerified} from '../functions/_lib/gmail-mailer.js';
import {preferredPublicOrigin} from '../functions/_lib/utils.js';
import {saveDanceCoach,listDanceCoaches} from '../functions/_lib/dance-studio.js';
import {saveStudioHoliday} from '../functions/_lib/studio-schedule.js';
import {onRequestGet as socialIntegrationsGet} from '../functions/api/admin/social-integrations.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

// Existing and newly uploaded Drive images must use an inline image response,
// not the attachment/download response that browsers show as a broken <img>.
const drive='https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp&resourcekey=resource-123';
assert.deepEqual(parseDriveReference(drive),{id:'1AbCdEfGhIjKlMnOp',resourceKey:'resource-123'});
assert.equal(googleDriveInlineImageUrl(drive),'https://drive.google.com/thumbnail?id=1AbCdEfGhIjKlMnOp&sz=w2000&resourcekey=resource-123');
assert.equal(googleDriveInlineImageUrl('https://images.example.test/profile.png'),'https://images.example.test/profile.png');
assert.match(brandAssetUrl({},drive),/drive\.google\.com\/thumbnail\?id=/);
assert.match(brandedEmailHtml({site:{siteName:'Studio',logoUrl:drive},env:{SITE_URL:'https://dance-class-at2.pages.dev'},title:'Notice'}),/drive\.google\.com\/thumbnail\?id=/);
assert.match(read('public/assets/dropbeat-media-v1-21.js'),/MutationObserver/);
assert.match(read('functions/_middleware.js'),/dropbeat-media-v1-21\.js/);

// Request hostname wins over stale Pages settings and every default sitemap is
// the standard /sitemap.xml path.
assert.equal(preferredPublicOrigin(new Request('https://dance-class-at2.pages.dev/api/test'),{PUBLIC_SITE_URL:'https://dance-class.pages.dev'}),'https://dance-class-at2.pages.dev');
assert.equal(preferredPublicOrigin(new Request('https://dropbeatdancestudio.com/admin/'),{SITE_URL:'https://dance-class-at2.pages.dev'}),'https://dropbeatdancestudio.com');
assert.match(read('functions/robots.txt/index.js'),/\$\{origin\}\/sitemap\.xml/);
assert.doesNotMatch(read('public/robots.txt'),/dance-class\.pages\.dev|dance-classes-sitemap\.xml/);
assert.match(read('public/robots.txt'),/dance-class-at2\.pages\.dev\/sitemap\.xml/);
assert.match(read('public/_redirects'),/\/auditions-sitemap\.xml \/sitemap\.xml 301/);
assert.doesNotMatch(read('public/sitemap.xml'),/https:\/\/dance-class\.pages\.dev/);
assert.match(read('public/admin/final-v10-documents-brand-polish.js'),/location\.origin/);

// Holiday list layout, message formatting and the optional end date are all
// deliberately separate concerns in the admin interface.
const scheduleUi=read('public/admin/dropbeat-admin-v1-19.js');
const holidayTableSource=scheduleUi.slice(scheduleUi.indexOf('function holidayTable'),scheduleUi.indexOf('function renderHolidays'));
assert.match(holidayTableSource,/row\.event_name/);
assert.doesNotMatch(holidayTableSource,/row\.subject/);
assert.match(scheduleUi,/class="field db119-end-date" hidden/);
assert.match(scheduleUi,/\+ Add an end date/);
assert.match(scheduleUi,/db121-holiday-message/);
const scheduleCss=read('public/admin/dropbeat-admin-v1-21.css');
assert.match(scheduleCss,/db119-end-date\[hidden\]\{display:none!important\}/);
assert.match(scheduleCss,/table-layout:fixed/);
assert.match(scheduleCss,/white-space:pre-wrap/);
assert.match(read('public/assets/portal-schedule-v1-19.css'),/notice-item>span\{display:block;white-space:pre-wrap/);

// Admin Add/Edit Coach mirrors coach sign-up while intentionally excluding a
// password field for admin-created records.
const coachUi=read('public/admin/dropbeat-admin-v1-13.js');
const coachModalSource=coachUi.slice(coachUi.lastIndexOf('coachModalMarkup=function'),coachUi.lastIndexOf('openCoachModal=function'));
for(const required of ['contact_email','contact_phone','photo_file','designation','badge','bio','experience','availability_slots_json','instagram_url','facebook_url','+ Sessions'])assert.match(coachModalSource,new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.doesNotMatch(coachModalSource,/name="password"/);
assert.match(read('public/admin/index.html'),/dropbeat-admin-v1-13\.js\?v=1\.29/);
const login=read('public/login.html');assert.match(login,/\+ Sessions/);assert.doesNotMatch(login,/Add More Sessions/);

// Gmail connection state is truthful only after Google identity + gmail.send
// scope verification. The narrow send scope must not call users.getProfile,
// because that endpoint causes the reported insufficient-scope 403.
const verifiedGmail={clientId:'client',clientSecret:'secret',refreshToken:'refresh',connectedEmail:'urgentcasting33@gmail.com',connectionState:'connected',scopeStatus:'verified_send'};
assert.equal(gmailConnectionVerified(verifiedGmail),true);
assert.equal(gmailConnectionVerified({...verifiedGmail,scopeStatus:'missing_send'}),false);
assert.doesNotMatch(read('functions/api/admin/gmail-auth.js'),/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/profile/);
assert.match(read('functions/api/admin/gmail-auth.js'),/googleapis\.com\/oauth2\/v2\/userinfo/);
assert.match(read('functions/api/admin/gmail-oauth/callback.js'),/GMAIL_SEND_SCOPE/);

const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(root,'migrations')).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={DB:{prepare:sql=>new Statement(sql),async batch(items){return Promise.all(items.map(item=>item.run()));}},SITE_URL:'https://dance-class-at2.pages.dev',PUBLIC_SITE_URL:'https://dance-class.pages.dev',ADMIN_DEVELOPMENT_BYPASS:'true'};

await saveStudioHoliday(env,{eventName:'Formatting Day',startDate:'2099-10-02',endDate:'',subject:'Studio Holiday',message:'Dear students and parents,\n\nGreetings from the studio.\nPlease enjoy the holiday.',imageUrl:drive},'admin@example.test');
const holiday=sqlite.prepare("SELECT * FROM studio_holidays WHERE event_name='Formatting Day'").get();
assert.equal(holiday.end_date,'2099-10-02');
assert.equal(holiday.message,'Dear students and parents,\n\nGreetings from the studio.\nPlease enjoy the holiday.');
assert.match(holiday.image_url,/drive\.google\.com\/thumbnail\?id=/);

const coachId=await saveDanceCoach(env,{name:'Schedule Coach',contact_email:'coach@example.test',contact_phone:'+919100000000',designation:'Senior Dance Coach',badge:'Senior Coach',bio:'Teaches students with a clear step-by-step method.',experience:'Eight years',photo_url:drive,instagram_url:'https://instagram.com/schedulecoach',facebook_url:'https://facebook.com/schedulecoach',availability_slots_json:JSON.stringify([{day:'mon',start:'10:00',end:'11:00',classTypes:['online_class'],danceStyles:['Hip Hop']},{day:'fri',start:'18:00',end:'19:30',classTypes:['offline_class'],danceStyles:['Bollywood']}]),status:'active'});
const savedCoach=sqlite.prepare('SELECT * FROM dance_coaches WHERE id=?').get(coachId);
assert.equal(savedCoach.contact_email,'coach@example.test');
assert.equal(savedCoach.contact_phone,'+919100000000');
assert.deepEqual(JSON.parse(savedCoach.availability_json),['mon','fri']);
assert.deepEqual(JSON.parse(savedCoach.class_types_json),['online_class','offline_class']);
assert.equal(JSON.parse(savedCoach.availability_slots_json).length,2);
assert.match((await listDanceCoaches(env,{includeInactive:true}))[0].photo_url,/drive\.google\.com\/thumbnail\?id=/);

// Saved stale host/identity data is repaired at read time. It cannot appear as
// a connected Gmail account without the verified state and scope.
const stale={searchConsole:{propertyUrl:'https://dance-class.pages.dev/',sitemapUrl:'https://dance-class.pages.dev/dance-classes-sitemap.xml'},gmail:{enabled:true,clientId:'client',clientSecret:'secret',refreshToken:'old-token',connectedEmail:'dropbeatdance33@gmail.com',senderEmail:'urgentcasting33@gmail.com'}};
sqlite.prepare("INSERT INTO settings(key,value,updated_at) VALUES('social_integration_settings',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(stale));
const integrationsResponse=await socialIntegrationsGet({request:new Request('https://dance-class-at2.pages.dev/api/admin/social-integrations'),env});
assert.equal(integrationsResponse.status,200);
const integrations=(await integrationsResponse.json()).settings;
assert.equal(integrations.searchConsole.propertyUrl,'https://dance-class-at2.pages.dev/');
assert.equal(integrations.searchConsole.sitemapUrl,'https://dance-class-at2.pages.dev/sitemap.xml');
assert.equal(integrations.gmail.connected,false);
assert.equal(integrations.gmail.connectedEmail,'');

console.log('DropBeat V1.21 verified: holiday layout/formatting, inline Drive images, coach availability parity, runtime domains, standard sitemap URL and truthful Gmail scope identity.');
