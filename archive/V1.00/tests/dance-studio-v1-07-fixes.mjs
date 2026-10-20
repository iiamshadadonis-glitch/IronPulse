import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {
  acknowledgePastMemberNotifications,
  listClassWorkspace,
  listDanceCoaches,
  saveDanceCoach,
  saveProductClassMapping,
  saveSessionOverride,
  syncDanceMembershipsFromRecentOrders,
  updateScheduledEvent
} from '../functions/_lib/dance-studio.js';
import {ensureSchema} from '../functions/_lib/schema.js';
import {getPublicProducts} from '../functions/_lib/public-data.js';
import {processWebinarReminders} from '../functions/_lib/marketing-suite.js';
import {onRequestGet as publicCoaches} from '../functions/api/public/coaches.js';
import {onRequestGet as customPage} from '../functions/page/[slug].js';
import {onRequestGet as sitemap} from '../functions/sitemap.xml/index.js';
import {onRequestGet as blogPage} from '../functions/blog/[[slug]].js';
import {onRequestGet as offerDetailsPage} from '../functions/offer-details.js';
import {onRequestGet as robotsRoute} from '../functions/robots.txt/index.js';
import {onRequest as edgeMiddleware} from '../functions/_middleware.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
assert.equal(pkg.version,'1.33.0');
assert.equal(lock.version,'1.33.0');
assert.equal(lock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);
assert.ok(pkg.scripts['test:dance-v1.08']);

// Authenticated refreshes stay behind a branded pending shell until /me has
// confirmed the session. A login form is revealed only for a confirmed 401.
const adminHtml=read('public/admin/index.html'),adminJs=read('public/admin/admin.js');
assert.match(adminHtml,/<html[^>]+class="dropbeat-auth-pending"/);
assert.match(adminHtml,/<div id="dropbeatAuthShell"[^>]*>[\s\S]*DropBeat Dance Studio/);
assert.match(adminHtml,/<div id="loginOverlay"[^>]+hidden>/);
assert.match(adminHtml,/<div class="layout" id="adminApp" hidden>/);
assert.match(adminHtml,/html\.dropbeat-auth-pending #loginOverlay,html\.dropbeat-auth-pending #adminApp\{display:none!important\}/);
assert.ok(adminHtml.lastIndexOf('dropbeat-admin-theme.css')>adminHtml.lastIndexOf('final-v17-09-navigation-email-parity.js'),'DropBeat CSS must be the final runtime theme layer');
assert.match(adminJs,/function isConfirmedAdminAuthError\(status,data\)/);
assert.match(adminJs,/if\(Number\(e\?\.status\)===401\)\{showLogin\(\);return false;\}/);
assert.match(adminJs,/A\.user=res\.user;showAdmin\(\);return true/);
assert.match(adminJs,/credentials:'same-origin',cache:'no-store'/);
assert.doesNotMatch(adminHtml,/Urgent Casting|Arjan Casting/i);
for(const token of ['#4B55BE','#A469A8','#202249'])assert.ok((adminHtml+read('public/admin/admin.css')+read('public/admin/dropbeat-admin-theme.css')).includes(token),`admin must use ${token}`);

// Public/admin feature surfaces and cache keys.
const adminV107=read('public/admin/dropbeat-admin-v1-07.js'),adminCss=read('public/admin/dropbeat-admin-v1-07.css'),publicV107=read('public/assets/dropbeat-dance-v1-07.js'),publicCss=read('public/assets/dropbeat-dance-v1-07.css');
for(const phrase of ['Class, Batch &amp; Coach Mapping','Dance Styles','Enable recurring student reminders','Coaches &amp; Founding Team','Scheduled Events','Past Members'])assert.ok(adminV107.includes(phrase),`V1.08 admin must include ${phrase}`);
for(const selector of ['.db107-calendar-grid','.db107-event-row','.db107-member-row','.db107-coach-grid','.db107-round-action'])assert.ok(adminCss.includes(selector),`V1.08 admin CSS must style ${selector}`);
assert.match(adminV107,/setTimeout\(install,60\)/,'the additive admin workspace must initialize without the earlier multi-second delay');
assert.match(publicV107,/href="\/about#coach-/,'plan coach names must link to About profiles');
assert.match(publicV107,/['"]@type['"]:'Course'/);
assert.match(publicV107,/['"]@type['"]:'DanceSchool'/);
assert.match(publicV107,/['"]@type['"]:'BreadcrumbList'/);
assert.match(publicCss,/\.product-card>\.badge[^\n]+background:var\(--db107-deep\)!important/,'plan badges must be opaque and high contrast');
assert.match(read('public/assets/page-boot.js'),/dropbeat-dance-v1-13\.js\?v=1.13/);
assert.doesNotMatch(read('public/assets/final-v16-4-payment-result.js'),/urgent-casting-invoice/i);

// Technical on-page SEO and crawler routing.
const robots=read('public/robots.txt'),redirects=read('public/_redirects'),pageRoute=read('functions/page/[slug].js'),sitemapSource=read('functions/sitemap.xml/index.js');
assert.match(robots,/Disallow: \/admin\//);assert.match(robots,/Disallow: \/api\//);assert.match(robots,/Sitemap: .*\/sitemap\.xml/);
assert.match(redirects,/\/plans\s+\/offers\s+301/);assert.match(redirects,/\/dance-classes\s+\/blog\s+301/);
assert.match(read('public/404.html'),/noindex,\s*follow/i);
assert.match(read('public/custom-page.html'),/noindex,\s*follow/i);
assert.match(pageRoute,/rel="canonical"/);assert.match(pageRoute,/property="og:title"/);assert.match(pageRoute,/name="twitter:card"/);assert.match(pageRoute,/BreadcrumbList/);
assert.match(sitemapSource,/offer-details\?plan=/);assert.match(sitemapSource,/content_pages/);assert.match(sitemapSource,/audition_post_cache/);
for(const page of ['index.html','offers.html','about.html','contact.html','blog.html']){
  const html=read(`public/${page}`);assert.match(html,/rel="canonical"/);assert.match(html,/name="description"/);assert.match(html,/property="og:title"/);
}
const htmlPages=fs.readdirSync(path.join(root,'public')).filter(name=>name.endsWith('.html')&&!name.startsWith('_'));
for(const page of htmlPages){
  const html=read(`public/${page}`),noindex=/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  if(noindex)continue;
  assert.match(html,/<title>[^<]+<\/title>/i,`${page} needs a title`);
  assert.match(html,/name=["']description["']/i,`${page} needs a meta description`);
  assert.match(html,/rel=["']canonical["']/i,`${page} needs a canonical URL`);
  assert.match(html,/property=["']og:title["']/i,`${page} needs Open Graph metadata`);
  assert.match(html,/name=["']twitter:title["']/i,`${page} needs Twitter metadata`);
  assert.match(html,/application\/ld\+json/i,`${page} needs crawler-visible structured data`);
  for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))assert.doesNotThrow(()=>JSON.parse(match[1]),`${page} has invalid JSON-LD`);
}
for(const page of ['checkout.html','my-orders.html','payment.html','payment-success.html','payment-failed.html'])assert.match(read(`public/${page}`),/name=["']robots["'][^>]*content=["'][^"']*noindex/i,`${page} must stay out of search results`);
assert.doesNotMatch(read('public/sample-product-import.csv'),/audition|casting|actor/i);
assert.doesNotMatch(read('public/checkout.html'),/name="preferred_role"/,'checkout must not ask an enrolled student for a redundant dance-style profile');
assert.doesNotMatch(read('public/checkout.html'),/name="preferred_dance style"/);
for(const page of ['public/assets/final-v15-1-audition-blog.js','public/assets/final-v15-3-audition-blog.js','public/assets/final-v15-4-seo-comments-blog.js'])assert.doesNotMatch(read(page),/Audition update|Casting Call|casting call|urgent[ -]?casting/i,`${page} must not render legacy interface copy`);

// Apply every production migration to a clean SQLite database, then use a D1
// adapter for the class-plan, membership, reminder, page and sitemap flows.
const sqlite=new DatabaseSync(':memory:');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(name=>name.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0055_dropbeat_billing_interval_first_payment_v1_26.sql');
for(const file of migrations)sqlite.exec(read(`migrations/${file}`));
class Statement{
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args)||null;return column&&row?row[column]:row;}
  async run(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
}
const env={SITE_URL:'https://dance-class.pages.dev',ADMIN_DEVELOPMENT_BYPASS:'true',DB:{prepare:sql=>new Statement(sql),async batch(statements){return Promise.all(statements.map(statement=>statement.run()));}},ASSETS:{async fetch(){return new Response(read('public/offer-details.html'),{headers:{'content-type':'text/html; charset=utf-8'}});}}};
await ensureSchema(env);
for(const table of ['dance_coaches','product_class_mappings','class_session_overrides','class_member_status_events','class_notification_log'])assert.ok(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table),`${table} migration must exist`);
for(const column of ['product_id','coach_id','order_reference','dance_styles_json','payment_status','enrollment_source'])assert.ok(sqlite.prepare('PRAGMA table_info(webinar_members)').all().some(item=>item.name===column),`webinar_members.${column} must exist`);

const productResult=sqlite.prepare(`INSERT INTO products(sku,name,slug,type,short_description,description,regular_price_paise,offer_price_paise,currency,status,badge,features_json,eligibility,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('DB107-HIPHOP','Morning Hip Hop Membership','morning-hip-hop-membership','subscription','Coach-led morning hip hop classes.','Join a recurring instructor-led hip hop batch.',49900,29900,'INR','active','Popular','["Live coach-led classes","Weekly schedule"]','Beginners',90);
const productId=Number(productResult.lastInsertRowid);
const coachId=await saveDanceCoach(env,{name:'Asha Rao',designation:'Founder & Senior Coach',badge:'Founder',bio:'A dance educator helping students build rhythm, technique and confidence.',photo_url:'https://images.example.test/asha.webp',dance_styles:['Hip Hop','Freestyle'],availability:['sun','mon','tue','wed','thu','fri','sat'],status:'active'});
await saveDanceCoach(env,{name:'Draft Coach',designation:'Guest Coach',badge:'Guest',bio:'A private draft profile.',dance_styles:['Jazz'],availability:['fri'],status:'draft'});
assert.equal((await listDanceCoaches(env)).length,1,'draft coaches must stay off public lists');
assert.equal((await listDanceCoaches(env,{includeInactive:true})).length,2,'admin lists must retain draft coaches');
let response=await publicCoaches({env});assert.equal(response.status,200);assert.equal((await response.json()).coaches.length,1);

const dayNames=['sun','mon','tue','wed','thu','fri','sat'];
const indiaYmd=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const targetDate=indiaYmd(Date.now()+2*86400000),targetDay=dayNames[new Date(`${targetDate}T12:00:00Z`).getUTCDay()];
const mapping=await saveProductClassMapping(env,productId,{class_mapping_enabled:true,class_type:'online_class',class_name:'Morning Hip Hop Batch',coach_id:coachId,dance_styles:['Hip Hop','Freestyle'],schedule_start_date:targetDate,class_time:'12:00',class_duration_minutes:60,days_per_week:1,class_days:[targetDay],location_or_link:'Joining link is shared after onboarding.',reminders_enabled:true,reminder_channels:['email'],reminder_minutes_before:15});
assert.equal(mapping.enabled,true);assert.equal(mapping.coach.name,'Asha Rao');assert.deepEqual(mapping.class_days,[targetDay]);assert.equal(mapping.reminders[0].minutesBefore,15);

const orderResult=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB107-ORDER-1','Mira Shah','919999999991','mira@example.test',29900,'INR','active','paid','razorpay');
sqlite.prepare(`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount_paise,status) VALUES(?,?,?,?,?,?)`).run(Number(orderResult.lastInsertRowid),productId,'Morning Hip Hop Membership',1,29900,'created');
let sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB107-ORDER-1'});assert.equal(sync.processed,1);assert.equal(sync.changes[0].status,'current');
const member=sqlite.prepare("SELECT * FROM webinar_members WHERE order_reference='DB107-ORDER-1'").get();assert.equal(member.status,'current');assert.equal(member.product_id,productId);assert.equal(member.coach_id,coachId);
let pending=sqlite.prepare("SELECT * FROM webinar_member_reminders WHERE member_id=? AND status='pending' ORDER BY send_at").all(member.id);assert.equal(pending.length,1,'a purchased mapped plan must create its next class reminder');
const sessionDate=row=>indiaYmd(new Date(row.send_at).getTime()+Number(row.minutes_before)*60000);
const cancelledDate=sessionDate(pending[0]);
await saveSessionOverride(env,{mappingId:productId,sessionDate:cancelledDate,status:'cancelled',reason:'Studio holiday',notifyStudents:false});
pending=sqlite.prepare("SELECT * FROM webinar_member_reminders WHERE member_id=? AND status='pending' ORDER BY send_at").all(member.id);assert.equal(pending.length,1);assert.notEqual(sessionDate(pending[0]),cancelledDate,'a cancelled occurrence must advance to the next valid recurring class');
sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB107-ORDER-1'});assert.equal(sync.processed,1);
pending=sqlite.prepare("SELECT * FROM webinar_member_reminders WHERE member_id=? AND status='pending' ORDER BY send_at").all(member.id);assert.ok(pending.every(row=>sessionDate(row)!==cancelledDate),'a webhook/dashboard resync must not resurrect a cancelled class reminder');

const rescheduledDate=sessionDate(pending[0]),rescheduledStart=new Date(`${rescheduledDate}T18:30:00+05:30`).toISOString();
await saveSessionOverride(env,{mappingId:productId,sessionDate:rescheduledDate,startsAt:rescheduledStart,status:'rescheduled',durationMinutes:75,coachId,notifyStudents:false});
pending=sqlite.prepare("SELECT * FROM webinar_member_reminders WHERE member_id=? AND status='pending' ORDER BY send_at").all(member.id);assert.equal(pending.length,1);assert.equal(pending[0].send_at,new Date(new Date(rescheduledStart).getTime()-15*60000).toISOString(),'a reschedule must replace the pending reminder time');
let workspace=await listClassWorkspace(env,{eventType:'online_class',month:rescheduledDate.slice(0,7)});assert.ok(workspace.occurrences.some(item=>item.overrideDate===rescheduledDate&&item.durationMinutes===75&&item.memberCount===1));
workspace=await listClassWorkspace(env,{eventType:'online_class',month:cancelledDate.slice(0,7)});assert.ok(!workspace.occurrences.some(item=>item.overrideDate===cancelledDate),'cancelled/holiday/leave sessions must stay out of the class calendar');

const eventStart=new Date(Date.now()+30*86400000).toISOString(),eventNewStart=new Date(Date.now()+31*86400000).toISOString();
const eventResult=sqlite.prepare(`INSERT INTO webinar_events(title,event_type,delivery_mode,provider,starts_at,duration_minutes,status,reminder_plan_json,product_id,coach_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).run('Technique Webinar','demo','online','google_meet',eventStart,60,'scheduled','[{"channel":"email","minutesBefore":60}]',productId,coachId);
const eventId=Number(eventResult.lastInsertRowid),oldEventSend=new Date(new Date(eventStart).getTime()-3600000).toISOString();
sqlite.prepare("INSERT INTO webinar_reminders(webinar_id,channel,send_at,status) VALUES(?,?,?,'pending')").run(eventId,'email',oldEventSend);
await updateScheduledEvent(env,{eventId,status:'rescheduled',startsAt:eventNewStart,durationMinutes:90,coachId,notifyStudents:false});
assert.equal(sqlite.prepare('SELECT status FROM webinar_reminders WHERE webinar_id=? AND send_at=?').get(eventId,oldEventSend).status,'cancelled');
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM webinar_reminders WHERE webinar_id=? AND status='pending' AND send_at=?").get(eventId,new Date(new Date(eventNewStart).getTime()-3600000).toISOString()).n,1);
sqlite.prepare("INSERT INTO webinar_reminders(webinar_id,channel,send_at,status) VALUES(?,?,?,'pending')").run(eventId,'call',new Date(Date.now()-60000).toISOString());

sqlite.prepare("UPDATE orders SET status='failed',payment_status='failed',updated_at=CURRENT_TIMESTAMP WHERE order_id='DB107-ORDER-1'").run();
sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB107-ORDER-1'});assert.equal(sync.changes[0].status,'past');
assert.equal(sqlite.prepare('SELECT status FROM webinar_members WHERE id=?').get(member.id).status,'past');
workspace=await listClassWorkspace(env,{eventType:'online_class',month:rescheduledDate.slice(0,7)});assert.equal(workspace.pastNotifications,1);assert.equal(workspace.members.find(item=>item.id===member.id).status,'past');
await acknowledgePastMemberNotifications(env,'online_class');workspace=await listClassWorkspace(env,{eventType:'online_class',month:rescheduledDate.slice(0,7)});assert.equal(workspace.pastNotifications,0);

const completedOrder=sqlite.prepare(`INSERT INTO orders(order_id,customer_name,customer_phone,customer_email,amount_paise,currency,status,payment_status,gateway,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run('DB107-ORDER-2','Ravi Kumar','919999999992','ravi@example.test',29900,'INR','completed','paid','stripe');
sqlite.prepare(`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount_paise,status) VALUES(?,?,?,?,?,?)`).run(Number(completedOrder.lastInsertRowid),productId,'Morning Hip Hop Membership',1,29900,'created');
sync=await syncDanceMembershipsFromRecentOrders(env,{orderId:'DB107-ORDER-2'});assert.equal(sync.changes[0].status,'current','a completed order with a paid subscription must not be treated as a cancellation');
const completedMember=sqlite.prepare("SELECT * FROM webinar_members WHERE order_reference='DB107-ORDER-2'").get(),dueSend=new Date(Date.now()-60000),dueStarts=new Date(dueSend.getTime()+15*60000),blockedNextDate=indiaYmd(new Date(dueStarts.getTime()+7*86400000));
await saveSessionOverride(env,{mappingId:productId,sessionDate:blockedNextDate,status:'holiday',reason:'Festival holiday',notifyStudents:false});
sqlite.prepare("INSERT INTO webinar_member_reminders(member_id,channel,send_at,minutes_before,status) VALUES(?,?,?,?,'pending')").run(completedMember.id,'call',dueSend.toISOString(),15);
const reminderRun=await processWebinarReminders(env,{limit:20});assert.ok(reminderRun.memberReminders.some(item=>item.status==='action_required'));assert.ok(reminderRun.results.some(item=>item.status==='action_required'),'a rescheduled event must continue processing its replacement reminders');
const nextCall=sqlite.prepare("SELECT * FROM webinar_member_reminders WHERE member_id=? AND channel='call' AND status='pending' ORDER BY send_at LIMIT 1").get(completedMember.id);assert.ok(nextCall);assert.notEqual(sessionDate(nextCall),blockedNextDate,'recurring reminder dispatch must skip a saved holiday instead of recreating it');

const products=await getPublicProducts(env);const publicProduct=products.find(item=>item.id===productId);assert.ok(publicProduct?.class_mapping?.enabled);assert.equal(publicProduct.class_mapping.coach.slug,'asha-rao');assert.deepEqual(publicProduct.class_mapping.dance_styles,['Hip Hop','Freestyle']);
response=await offerDetailsPage({request:new Request('https://dance-class.pages.dev/offer-details?plan=morning-hip-hop-membership'),env});assert.equal(response.status,200);const offerHtml=await response.text();assert.match(offerHtml,/<title>Morning Hip Hop Membership \| DropBeat Dance Studio<\/title>/);assert.match(offerHtml,/rel="canonical" href="https:\/\/dance-class\.pages\.dev\/offer-details\?plan=morning-hip-hop-membership"/);assert.match(offerHtml,/"@type":"Course"/);assert.match(offerHtml,/Asha Rao/);
response=await offerDetailsPage({request:new Request('https://dance-class.pages.dev/offer-details?plan=missing-plan'),env});assert.equal(response.status,404);assert.match(await response.text(),/noindex,follow/);
response=await blogPage({request:new Request('https://dance-class.pages.dev/blog'),params:{slug:''},env});assert.equal(response.status,200);const blogHtml=await response.text();assert.match(blogHtml,/Dance Tips \| DropBeat Dance Studio/);assert.match(blogHtml,/id="db107-blog-schema"/);assert.match(blogHtml,/"@type":"Blog"/);

// Custom pages return server-rendered SEO; aliases use permanent redirects and
// unknown slugs use a real 404 response.
sqlite.prepare(`INSERT INTO content_pages(page_key,page_name,title,body_text,body_html,sort_order,cover_image_url,is_custom,slug,short_description,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run('custom:dance-foundations','Dance Foundations','Dance Foundations','Build rhythm and confidence with our coaches.','<p>Build rhythm and confidence with our coaches.</p>',99,'https://images.example.test/foundations.webp',1,'dance-foundations','Beginner dance foundations with DropBeat coaches.');
response=await customPage({request:new Request('https://dance-class.pages.dev/page/dance-foundations'),params:{slug:'dance-foundations'},env});assert.equal(response.status,200);const customHtml=await response.text();assert.match(customHtml,/<title>Dance Foundations \| DropBeat Dance Studio<\/title>/);assert.match(customHtml,/rel="canonical" href="https:\/\/dance-class\.pages\.dev\/page\/dance-foundations"/);assert.match(customHtml,/application\/ld\+json/);assert.equal(response.headers.get('x-robots-tag'),'index, follow');
sqlite.prepare("INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES('custom_page_slug_aliases',?,CURRENT_TIMESTAMP)").run(JSON.stringify({'old-foundations':'dance-foundations'}));
response=await customPage({request:new Request('https://dance-class.pages.dev/page/old-foundations'),params:{slug:'old-foundations'},env});assert.equal(response.status,301);assert.match(response.headers.get('location'),/\/page\/dance-foundations$/);
response=await customPage({request:new Request('https://dance-class.pages.dev/page/not-found'),params:{slug:'not-found'},env});assert.equal(response.status,404);
response=await sitemap({request:new Request('https://dance-class.pages.dev/sitemap.xml'),env});assert.equal(response.status,200);const sitemapXml=await response.text();assert.match(sitemapXml,/\/page\/dance-foundations/);assert.match(sitemapXml,/\/offer-details\?plan=morning-hip-hop-membership/);
response=await robotsRoute({request:new Request('https://dance-class-at2.pages.dev/robots.txt'),env});const robotsAtCurrentHost=await response.text();assert.match(robotsAtCurrentHost,/Sitemap: https:\/\/dance-class-at2\.pages\.dev\/sitemap\.xml/);
response=await edgeMiddleware({request:new Request('https://dance-class-at2.pages.dev/about',{headers:{accept:'text/html'}}),env,next:async()=>new Response(read('public/about.html'),{headers:{'content-type':'text/html; charset=utf-8'}})});const rewrittenHostHtml=await response.text();assert.match(rewrittenHostHtml,/rel="canonical" href="https:\/\/dance-class-at2\.pages\.dev\/about"/);assert.doesNotMatch(rewrittenHostHtml,/https:\/\/dance-class\.pages\.dev\/about/);

console.log(`DropBeat V1.08 verification passed: ${migrations.length} migrations, auth-shell continuity, class-plan mapping, coaches, reminders, calendar overrides, payment lifecycle and technical SEO.`);
