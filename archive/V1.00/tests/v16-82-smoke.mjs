import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

assert.ok(['V16.82','V16.83'].includes(read('VERSION.txt').trim()),'V16.82 regression test must run on V16.82 or its V16.83 additive successor');

const leadUi=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
const nurture=read('functions/_lib/lead-nurturing.js');
const previewBlock=leadUi.match(/function offerPreview\(offer\)[\s\S]*?function emailPreview/)?.[0]||'';
const deliveryBlock=nurture.match(/const offerPrice=offer\?[\s\S]*?const offerCard=/)?.[0]||'';
assert.match(previewBlock,/>Trial Offer<\/span><b>Try for just/);
assert.doesNotMatch(previewBlock,/trialLabel|trial_value|trial_unit/);
assert.match(deliveryBlock,/>Trial Offer<\/small><strong[^>]*>Try for just/);
assert.doesNotMatch(deliveryBlock,/offer\.trialLabel|offer\.trialValue|offer\.trialUnit/);

const recoveryUi=read('public/admin/final-v16-81-integration-recovery-validation.js');
assert.match(recoveryUi,/FLOW_VALIDATION/);
assert.match(recoveryUi,/isIntegrationFailure/);
assert.match(recoveryUi,/leaveAutomationWorkspace\(\);\s*window\.tab/);
assert.match(recoveryUi,/#uc76LeadWorkspace/);
assert.match(recoveryUi,/#uc64Workspace/);
const fakeDocument={querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},readyState:'loading',body:{classList:{remove(){}},appendChild(){}}};
const context={window:{},document:fakeDocument,MutationObserver:class{observe(){}},URLSearchParams,history:{replaceState(){}},location:{search:'',pathname:'/admin/'},setTimeout(){return 0;},clearTimeout(){},Promise,console};
vm.runInNewContext(recoveryUi,context,{filename:'integration-recovery.js'});
assert.equal(context.window.ucV1682IsIntegrationFailure({message:'Complete the required information before activating: Step 1: write the WhatsApp message.'}),false);
assert.equal(context.window.ucV1682IsIntegrationFailure({message:'WhatsApp connection test failed. Access token expired.',recovery:{category:'email',card:'whatsapp'}}),true);
assert.equal(context.window.ucV1682IsIntegrationFailure({diagnostic:{message:'Google Drive OAuth token revoked.',integration:'google_drive',reconnectRequired:true}}),true);

const socialUi=read('public/admin/final-v16-68-automation-flow-workspace.js');
const helpUi=read('public/admin/final-v16-82-automation-help-diagnostics.js');
const helpCss=read('public/admin/final-v16-82-automation-help-diagnostics.css');
const index=read('public/admin/index.html');
assert.match(socialUi,/data-uc82-automation-help="\$\{H\(channel\)\}"/);
assert.match(leadUi,/data-uc82-automation-help="lead_nurture"/);
for(const label of ['Chatbot DM','Chatbot Comments','Lead Nurturing','Comment Triggers DM','Interactive Buttons','Question','Condition','Set Attribute','API Request','Human Handoff','End Flow','WhatsApp Pay','WhatsApp Template','Public Comment Reply','PDF / Document','Plan / Offer','Stop After Purchase'])assert.ok(helpUi.includes(label),`help must explain ${label}`);
assert.match(helpUi,/data-uc82-help-back/);
assert.match(helpUi,/uc82-help-open/);
assert.match(helpCss,/uc82-help-back/);
assert.match(helpCss,/uc82-flow-error/);
assert.match(helpCss,/uc80-trial-price/);
assert.match(index,/final-v16-82-automation-help-diagnostics\.css\?v=16\.(?:82|83)/);
assert.match(index,/final-v16-82-automation-help-diagnostics\.js\?v=16\.(?:82|83)/);
assert.match(index,/final-v16-68-automation-flow-workspace\.js\?v=16\.(?:82|83)/);
assert.match(index,/final-v16-76-d1-polls-automation-workspace\.js\?v=16\.(?:82|83)/);
assert.match(socialUi,/error uc82-flow-error/);
assert.match(leadUi,/function leadErrorMarkup/);

const budget=read('functions/_lib/d1-read-budget.js');
assert.equal((await import('node:crypto')).createHash('sha256').update(budget).digest('hex'),'5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43');
const migrations=fs.readdirSync(path.join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql');

for(const p of ['public/admin/final-v16-82-automation-help-diagnostics.js','public/admin/final-v16-81-integration-recovery-validation.js','public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-68-automation-flow-workspace.js'])assert.doesNotThrow(()=>new Function(read(p)),p);

console.log('V16.82 smoke tests: PASS');
