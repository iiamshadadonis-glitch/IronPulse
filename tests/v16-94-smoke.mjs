import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_MARKETING} from '../functions/_lib/marketing-suite.js';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [version,index,integrations,upgradeCss,upgradeUi,core,adminApi,heatApi,tracker,app,contact,publicConfig,customLib,customAdmin,customPublic,customLoader,pageBoot,migration,notes,verification]=await Promise.all([
  read('VERSION.txt'),read('public/admin/index.html'),read('public/admin/final-v16-93-marketing-integrations.js'),read('public/admin/final-v16-94-integrations-heatmaps-code-reminders.css'),read('public/admin/final-v16-94-integrations-heatmaps-code-reminders.js'),read('functions/_lib/marketing-suite.js'),read('functions/api/admin/marketing-suite.js'),read('functions/api/public/heatmap.js'),read('public/assets/final-v16-92-marketing-tracker.js'),read('public/assets/app.js'),read('public/assets/final-contact-validation.js'),read('functions/api/public/marketing-config.js'),read('functions/_lib/custom-code.js'),read('functions/api/admin/custom-code.js'),read('functions/api/public/custom-code.js'),read('public/assets/final-v16-94-custom-code-loader.js'),read('public/assets/page-boot.js'),read('migrations/0041_v16_94_custom_code_heatmap_sessions.sql'),read('RELEASE-NOTES-V16.94.md'),read('V16_94_RELEASE_VERIFICATION.md')
]);

assert.match(version.trim(),/^V16\.(?:94|95)$/);
for(const asset of ['final-v16-94-integrations-heatmaps-code-reminders.css','final-v16-94-integrations-heatmaps-code-reminders.js'])assert.ok(index.includes(asset),`${asset} must be loaded by the admin page`);

// One disclosure arrow and proper switches on every provider.
assert.doesNotMatch(integrations,/class="uc94-summary-arrow"/);
assert.doesNotMatch(integrations,/class="uc93-chevron"/);
assert.match(integrations,/uc94-switch/);
assert.match(integrations,/uc49-mini-switch/);
assert.match(upgradeCss,/summary::-webkit-details-marker/);
assert.match(upgradeCss,/\.uc93-chevron\{display:none!important\}/);

// Single-source tracking plus backward-compatible value import.
assert.match(upgradeUi,/Search Verification/);
assert.match(upgradeUi,/single-source tracking|One place for marketing tags/i);
assert.match(core,/legacy\.googleAnalyticsMeasurementId/);
assert.match(core,/legacy\.googleTagManagerId/);
assert.match(core,/legacy\.metaPixelId/);
assert.doesNotMatch(app,/googletagmanager\.com\/gtag\/js/);
assert.doesNotMatch(app,/connect\.facebook\.net\/en_US\/fbevents\.js/);

// Conversion editor and confirmed-event tracking.
for(const token of ['Google Ads send_to','Confirmed Purchase','Confirmed Lead','Destination Page','Open Page','Add Conversion Event'])assert.match(integrations,new RegExp(token));
assert.equal(DEFAULT_MARKETING.googleTag.conversionRules[0].page,'/payment-success');
assert.equal(DEFAULT_MARKETING.googleTag.conversionRules[1].page,'/contact');
assert.match(publicConfig,/conversionRules/);
assert.match(tracker,/fireConfirmedConversionRules/);
assert.match(tracker,/uc-confirmed-lead/);
assert.doesNotMatch(tracker,/closest\?\.\('#contactForm/);
assert.match(app,/dispatchEvent\(new CustomEvent\('uc-confirmed-lead'/);
assert.match(contact,/dispatchEvent\(new CustomEvent\('uc-confirmed-lead'/);

// Custom code management and consent-controlled public loading.
assert.match(core,/CREATE TABLE IF NOT EXISTS custom_code_snippets/);
assert.match(customLib,/\['head','body_start','body_end'\]/);
assert.match(customLib,/\['essential','analytics','ads'\]/);
assert.match(customAdmin,/requireAdmin/);
assert.match(customPublic,/publicCustomCode/);
assert.match(customLoader,/UCConsent\?\.allows/);
assert.match(customLoader,/template\.content\.querySelectorAll\('script'\)/);
assert.match(pageBoot,/final-v16-94-custom-code-loader\.js\?v=16\.94/);
for(const token of ['Custom Code','Header Code','Body Start','Body End','Specific Pages'])assert.match(upgradeUi,new RegExp(token));

// Heat-map sessions, true device frames and interpretable overlays.
assert.match(core,/CREATE TABLE IF NOT EXISTS heatmap_daily_sessions/);
assert.match(heatApi,/sessionId/);
assert.match(heatApi,/heatmap_daily_sessions/);
assert.match(tracker,/sessionId:state\.session/);
for(const width of ['390','768','1440'])assert.ok(upgradeUi.includes(width),`heat-map device width ${width} must be present`);
for(const token of ['scrollReach','topElements','averageScroll','Unique Sessions','Heat Map — where visitors click'])assert.match(core+upgradeUi,new RegExp(token));

// Actionable analytics and truthful provider-specific synchronization.
for(const token of ['ROAS — Return on Ad Spend','CPC — Cost per Click','CPM — Cost per Mille','CPA — Cost per Acquisition','CAC — Customer Acquisition Cost','Platform Sync Status','Advertising can lose money'])assert.match(upgradeUi,new RegExp(token));
assert.match(core,/provider:'Google Ads'/);
assert.match(core,/provider:'Meta Ads'/);
assert.match(core,/no figures were invented/i);

// Dynamic webinar reminders with conditional SMS and admin-call work.
for(const token of ['Enable Reminders','Minutes','Hours','Days','Weeks','Months','Email','WhatsApp','SMS','Call','Mark Call Complete'])assert.match(upgradeUi,new RegExp(token));
assert.match(upgradeUi,/Connect the SMS relay integration first/);
assert.match(core,/\['email','whatsapp','sms','call'\]/);
assert.match(core,/SMS_RELAY_URL/);
assert.match(core,/action_required/);
assert.match(adminApi,/complete_call_reminder/);
assert.match(adminApi,/smsReminders/);

assert.match(migration,/CREATE TABLE IF NOT EXISTS heatmap_daily_sessions/);
assert.match(migration,/CREATE TABLE IF NOT EXISTS custom_code_snippets/);
assert.match(notes,/does not require the administrator to run terminal commands/i);
assert.match(verification,/No terminal.*required/is);
console.log('V16.94 smoke checks passed.');
