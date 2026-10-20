import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

assert.equal(read('VERSION.txt').trim(),'V16.83');

const socialUi=read('public/admin/final-v16-68-automation-flow-workspace.js');
const leadUi=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
const helpUi=read('public/admin/final-v16-82-automation-help-diagnostics.js');
const helpCss=read('public/admin/final-v16-82-automation-help-diagnostics.css');
const themeCss=read('public/admin/final-v5-admin-guidance-theme.css');
const index=read('public/admin/index.html');

for(const ui of [socialUi,leadUi]){
  assert.match(ui,/class="uc-info-btn uc82-automation-info"/);
  assert.match(ui,/class="uc-info-svg" viewBox="0 0 32 32"/);
}
assert.match(helpUi,/class="uc-info-back-btn uc82-help-back-button"/);
assert.match(helpUi,/class="uc-back-svg" viewBox="0 0 32 32"/);
assert.doesNotMatch(helpUi,/>i<\/button>|>←<\/button>/);
assert.match(themeCss,/\.uc-info-btn,\.uc-info-back-btn\{[\s\S]*?width:34px;height:34px;min-width:34px/);
assert.doesNotMatch(helpCss,/width:42px|height:42px|font-size:20px/);
assert.match(helpCss,/\.uc82-help-back-button\{position:static!important;float:none;margin:0!important/);

for(const text of ['Keyword “LINK” starts the information journey.','ProductInterest = Premium Plan','ProductLaunchLink','product and service FAQs','current product guide PDF'])assert.ok(helpUi.includes(text),`missing generic help example: ${text}`);
assert.doesNotMatch(helpUi,/audition|casting|celebrity|modeling|actor|telugu|reel/i);
for(const label of ['Chatbot DM','Chatbot Comments','Lead Nurturing','Comment Triggers DM','WhatsApp Pay','Public Comment Reply','Plan / Offer'])assert.ok(helpUi.includes(label),`help regression: ${label}`);

for(const asset of ['final-v16-68-automation-flow-workspace.js','final-v16-76-d1-polls-automation-workspace.js','final-v16-82-automation-help-diagnostics.css','final-v16-82-automation-help-diagnostics.js'])assert.match(index,new RegExp(asset.replaceAll('.','\\.')+'\\?v=16\\.83'));

const budget=read('functions/_lib/d1-read-budget.js');
assert.equal(crypto.createHash('sha256').update(budget).digest('hex'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql');

for(const p of ['public/admin/final-v16-68-automation-flow-workspace.js','public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-82-automation-help-diagnostics.js'])assert.doesNotThrow(()=>new Function(read(p)),p);

console.log('V16.83 smoke tests: PASS');
