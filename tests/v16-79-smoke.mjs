import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLeadNurtureActivation } from '../functions/_lib/lead-nurturing.js';
import { validateSocialAutomationActivation } from '../functions/_lib/social-automations.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const client=read('public/admin/final-v16-34-admin-workflow-pages-social.js');
const clientCss=read('public/admin/final-v16-34-admin-workflow-pages-social.css');
const adminIndex=read('public/admin/index.html');
assert.match(client,/createElement\('section'\)/);
assert.doesNotMatch(client,/createElement\('details'\).*uc-v1634-page-history/);
assert.doesNotMatch(clientCss,/uc-v1634-page-history>summary:after/);
assert.match(adminIndex,/final-v16-34-admin-workflow-pages-social\.css\?v=16\.79/);
assert.match(adminIndex,/final-v16-34-admin-workflow-pages-social\.js\?v=16\.79/);
assert.match(adminIndex,/final-v16-76-d1-polls-automation-workspace\.js\?v=16\.(?:80|81|82|83)/);

const ui=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
const uiCss=read('public/admin/final-v16-76-d1-polls-automation-workspace.css');
assert.match(ui,/Live email preview/);
assert.match(ui,/automation-attachment/);
assert.match(ui,/Branded plan \/ offer email \(live\)/);
assert.match(ui,/After \$\{n\} \$\{unit\}/);
assert.match(ui,/d\.enabled\?leadErrors\(d\):\[\]/);
assert.match(uiCss,/\.uc79-email-layout/);
assert.match(uiCss,/\.uc79-required-missing/);
assert.match(uiCss,/fieldset\{max-height:none;overflow:visible/);

const drive=read('functions/_lib/google-drive-upload.js');
const uploadApi=read('functions/api/admin/google-drive-upload.js');
assert.match(drive,/Lead Nurturing Automation Email/);
assert.match(drive,/25\*1024\*1024/);
assert.match(uploadApi,/uploadLeadNurtureEmailAssetToGoogleDrive/);

const nurture=read('functions/_lib/lead-nurturing.js');
assert.match(nurture,/brandedEmailHtml/);
assert.match(nurture,/Live availability/);
assert.match(nurture,/if\(flow\.enabled\)assertActivatable\(flow\)/);
assert.match(nurture,/if\(enabled\).*assertActivatable/s);

const draft={name:'',sources:[],steps:[]};
assert.ok(validateLeadNurtureActivation(draft).length>=3);
const activeReady={name:'Follow-up',sources:['all'],steps:[{name:'Welcome',enabled:true,channel:'email',delayAmount:6,delayUnit:'hours',subject:'Welcome',emailBadge:'Welcome',emailTitle:'Welcome to Urgent Casting',message:'Hello',contentType:'text',buttons:[]}]};
assert.deepEqual(validateLeadNurtureActivation(activeReady),[]);

const socialDraft={name:'',channel:'dm',platform:'instagram',triggerMode:'keyword',triggerValue:'',definition:{startNodeId:'',nodes:[]}};
assert.ok(validateSocialAutomationActivation(socialDraft).length>=3);
const socialReady={name:'Greeting',channel:'dm',platform:'instagram',triggerMode:'keyword',triggerValue:'hi',definition:{startNodeId:'one',nodes:[{id:'one',name:'Reply',type:'text',text:'Hello'}]}};
assert.deepEqual(validateSocialAutomationActivation(socialReady),[]);

for(const p of ['public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-68-automation-flow-workspace.js'])assert.doesNotThrow(()=>new Function(read(p)));

console.log('V16.79 smoke tests: PASS');
