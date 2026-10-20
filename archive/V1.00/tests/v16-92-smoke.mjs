import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeStages} from '../functions/_lib/marketing-suite.js';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,ui,css,tracker,helper,adminApi,publicEvent,heatApi,migration,nav,boot,notes]=await Promise.all([
  read('VERSION.txt'),read('public/admin/index.html'),read('public/admin/final-v16-92-marketing-webinars.js'),read('public/admin/final-v16-92-marketing-webinars.css'),read('public/assets/final-v16-92-marketing-tracker.js'),read('functions/_lib/marketing-suite.js'),read('functions/api/admin/marketing-suite.js'),read('functions/api/public/marketing-event.js'),read('functions/api/public/heatmap.js'),read('migrations/0039_v16_92_marketing_webinars.sql'),read('public/admin/final-v16-62-inbox-nav-automations.js'),read('public/assets/page-boot.js'),read('RELEASE-NOTES-V16.92.md')
]);

assert.equal(version.trim(),'V16.92');
assert.match(index,/final-v16-92-marketing-webinars\.css\?v=16\.92/);
assert.match(index,/final-v16-92-marketing-webinars\.js\?v=16\.92/);
for(const name of ['Marketing & SEO','Marketing Analytics','Heat Maps','Webinars'])assert.match(nav,new RegExp(name));
for(const feature of ['Marketing Home','Google Ads','Social Media Marketing','Email Marketing','Funnels'])assert.match(ui,new RegExp(feature));
for(const feature of ['Online Classes','Offline Classes','Demo / Webinar'])assert.match(ui,new RegExp(feature.replace('/','\\/')));
assert.match(ui,/Sync Connected Platforms/);
assert.match(css,/\.uc92-tooltip\{position:fixed/);
assert.match(ui,/e\.clientY\+th\+20>innerHeight\?e\.clientY-th-14/,'marketing tooltip must flip above the pointer');
assert.match(ui,/Heat Map[\s\S]*Scroll Map[\s\S]*Attention Map/);
assert.match(ui,/Top Engagement Elements/);
assert.match(tracker,/UCConsent\?\.allows/);
assert.match(tracker,/navigator\.sendBeacon/);
assert.match(tracker,/observeConfirmedPayment/,'purchase tracking must wait for confirmed result UI');
assert.doesNotMatch(tracker,/detectPageEvent/,'a success URL alone must never count as a purchase');
assert.match(boot,/final-v16-92-marketing-tracker\.js\?v=16\.92/);
assert.match(helper,/syncMarketingMetrics/);
assert.match(helper,/conferenceDataVersion=1&sendUpdates=all/);
assert.match(helper,/processWebinarReminders/);
assert.match(helper,/r\.id reminder_id/,'reminder updates must use the reminder row ID, not the webinar event ID');
assert.match(helper,/disconnectWebinarIntegration/);
assert.match(adminApi,/action==='sync_marketing'/);
assert.match(adminApi,/action==='disconnect_webinar'/);
assert.match(ui,/function emptyBuckets/,'marketing analytics must retain empty periods as zero buckets');
assert.match(publicEvent,/purchaserExcluded/);
assert.match(publicEvent,/sendMetaConversion/);
assert.match(publicEvent,/adsConsent/,'server-side advertising conversions must remain Ads-consent gated');
assert.match(heatApi,/events\.slice\(0,30\)/);
for(const table of ['marketing_campaigns','marketing_funnels','marketing_visitor_stage','marketing_daily_metrics','heatmap_daily_cells','webinar_events','webinar_reminders'])assert.match(migration,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
assert.match(notes,/exact cross-platform impression sequence is not guaranteed/i);
const stages=normalizeStages([{name:'Problem awareness',message:'Explain a common problem.',channels:['google','email','invalid'],delayHours:24}]);
assert.deepEqual(stages,[{step:1,name:'Problem awareness',message:'Explain a common problem.',channels:['google','email'],delayHours:24}]);
console.log('V16.92 smoke checks passed.');
