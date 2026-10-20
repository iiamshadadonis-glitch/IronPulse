import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('public/admin/index.html');
const ui=read('public/admin/final-v17-05-email-automations.js');
const uiCss=read('public/admin/final-v17-05-email-automations.css');
const providerUi=read('public/admin/final-v17-06-email-providers.js');
const providerCss=read('public/admin/final-v17-06-email-providers.css');
const providers=read('functions/_lib/outbound-email.js');
const providerApi=read('functions/api/admin/email-providers.js');
const automations=read('functions/_lib/email-automations.js');
const automationApi=read('functions/api/admin/email-automations.js');
const otp=read('functions/api/auth/request-otp.js');
const paymentRecovery=read('functions/_lib/payment-recovery.js');
const marketing=read('functions/_lib/marketing-suite.js');

assert.match(index,/final-v17-05-email-automations\.js\?v=17\.08/);
assert.match(index,/final-v17-06-email-providers\.js\?v=17\.08/);
assert.match(index,/final-v17-06-email-providers\.css\?v=17\.08/);

assert.match(ui,/installAutomationLoadHook/);
assert.match(ui,/__uc1706EmailTab/);
assert.match(ui,/setInterval\(\(\)=>\{if\(document\.getElementById\('socialAutomations'\)\)scan\(\);\},1000\)/);
assert.match(ui,/data-item-field="text"/);
assert.match(ui,/data-item-field="url"/);
assert.match(ui,/data-add-block-item/);
assert.match(ui,/Reset Style/);
assert.doesNotMatch(ui,/Reset to Brand Style<\/button>/);
assert.match(uiCss,/uc1705-actions-menu/);
assert.match(uiCss,/uc1706-item-list/);
assert.match(uiCss,/white-space:nowrap/);

const contentLayoutNames=[...ui.matchAll(/make\('([^']+)'/g)].map(x=>x[1]);
assert.ok(contentLayoutNames.length>=20&&contentLayoutNames.length<=25,`Expected 20-25 branded layouts, found ${contentLayoutNames.length}`);
for(const name of ['Birthday Celebration','Abandoned Checkout','Last Checkout Reminder','Membership Renewal','Payment Failed','Subscription Payment Failed','Cancelled Subscription Win-back'])assert.ok(contentLayoutNames.includes(name),`Missing branded layout: ${name}`);

for(const name of ['Amazon SES','AWS Lambda Email Relay','Mailchimp Transactional','MailerSend / MailerLite','Company Email / GoDaddy','Amazon S3 Email Assets'])assert.match(providerUi,new RegExp(name.replace(/[()]/g,'\\$&')));
assert.match(providerUi,/data-provider-back/);
assert.match(providerUi,/UCEmailProviderSettings/);
assert.doesNotMatch(providerUi,/Use Connected Gmail/);
assert.doesNotMatch(providerCss,/uc1706-provider-grid/);
assert.match(providerApi,/settings\.primaryProvider='gmail'/);
assert.match(providerApi,/if\(!next\.enabled&&settings\.primaryProvider===provider\)settings\.primaryProvider='gmail'/);

for(const key of ['ses','lambda','mailchimp','mailersend','company','s3'])assert.match(providers,new RegExp(`${key}:\\{enabled:false`));
assert.match(providers,/sendConfiguredEmail/);
assert.match(providers,/AWS4-HMAC-SHA256/);
assert.match(providers,/mandrillapp\.com/);
assert.match(providers,/api\.mailersend\.com/);
assert.match(providers,/normalizedAttachments/);
assert.match(providers,/Content:hasAttachments\?\{Raw:/);

for(const id of ['birthday','abandoned-checkout','renewal','payment-failed','subscription-failed','subscription-cancelled'])assert.match(automations,new RegExp(`id:'${id}'`));
assert.match(automations,/Happy Birthday, @FirstName!/);
assert.match(automations,/@RenewalDate/);
assert.match(automations,/Only @HoursLeft hours remain/);
assert.match(automations,/triggerOrderEmailAutomation/);
assert.doesNotMatch(automations,/Sample Client/);
assert.match(automationApi,/Zeenath Afreen/);
assert.match(automationApi,/connect, test and enable a primary email provider/i);

assert.match(otp,/sendConfiguredEmail/);
assert.match(paymentRecovery,/sendConfiguredEmail/);
assert.match(paymentRecovery,/deferredToAutomation:true/);
assert.match(marketing,/sendConfiguredEmail/);
assert.doesNotMatch(paymentRecovery,/sendGmailMessage/);
assert.doesNotMatch(marketing,/sendGmailMessage/);

console.log('V17.06 stable email follow-up UI, branded templates, provider routing, OTP and recovery checks passed.');
