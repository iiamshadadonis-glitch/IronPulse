import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const html=read('public/admin/index.html');
const ui=read('public/admin/final-v16-96-contacts-personalization.js');
const css=read('public/admin/final-v16-96-contacts-personalization.css');
const schema=read('functions/_lib/schema.js');
const contacts=read('functions/api/admin/contacts.js');
const notifications=read('public/admin/final-v16-87-business-notifications-order-focus.js');
const automations=read('functions/_lib/social-automations.js');
const dms=read('functions/_lib/social-dms.js');

assert.match(html,/final-v16-96-contacts-personalization\.css\?v=16\.96/);
assert.match(html,/final-v16-96-contacts-personalization\.js\?v=16\.96/);
assert.match(ui,/Marketing-ready CSV/);
assert.match(ui,/@\$\{opt\[0\]\}/);
assert.match(ui,/Heat Map — where visitors click/);
assert.match(css,/background:#e11d2e!important/);
assert.match(schema,/v16-96-contacts-notification-personalization/);
assert.match(schema,/ALTER TABLE visitor_events ADD COLUMN ip_address/);
assert.match(contacts,/marketing_eligible/);
assert.match(contacts,/comment','article_comment/);
assert.match(notifications,/uc96-notification-badge/);
assert.match(notifications,/writeSeen/);
assert.match(automations,/ClientName/);
assert.match(automations,/value\|\|\(key==='ClientName'\?'there'/);
assert.match(dms,/contact_lead_id/);
console.log('V16.96 smoke checks passed.');
