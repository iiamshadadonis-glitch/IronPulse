import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagnoseIntegrationError, integrationRecovery } from '../functions/_lib/integration-diagnostics.js';
import { validateLeadNurtureActivation } from '../functions/_lib/lead-nurturing.js';
import { validateSocialAutomationActivation } from '../functions/_lib/social-automations.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

assert.ok(['V16.81','V16.82','V16.83'].includes(read('VERSION.txt').trim()),'V16.81 regression test must run on V16.81 or an additive successor');

const driveRecovery=integrationRecovery('google_drive');
assert.deepEqual({category:driveRecovery.category,card:driveRecovery.card},{category:'storage',card:'googleDrive'});
assert.match(driveRecovery.url,/integration_category=storage/);
assert.match(driveRecovery.url,/integration=googleDrive/);
assert.deepEqual(integrationRecovery('stripe'),{category:'payments',card:'stripe',label:'Open Stripe Integration',url:'/admin/?integration_category=payments&integration=stripe'});
const driveDiagnostic=diagnoseIntegrationError('google_drive',{status:401,message:'invalid_grant: token revoked'},{action:'upload'});
assert.equal(driveDiagnostic.authenticationInvalid,true);
assert.equal(driveDiagnostic.reconnectRequired,true);
assert.equal(driveDiagnostic.recovery.card,'googleDrive');
assert.match(driveDiagnostic.message,/Connect Google Drive/);

const requiredChannels=[
  ['whatsapp','WhatsApp message'],
  ['email','email message'],
  ['sms','SMS message']
];
for(const [channel,label] of requiredChannels){
  const step={name:`${channel} follow-up`,enabled:true,channel,delayAmount:0,delayUnit:'minutes',subject:channel==='email'?'Subject':'',emailBadge:channel==='email'?'Badge':'',emailTitle:channel==='email'?'Title':'',message:'   ',contentType:'text',buttons:[]};
  const errors=validateLeadNurtureActivation({name:'Required messages',sources:['all'],steps:[step]});
  assert.ok(errors.some(x=>x.field==='message'&&x.message.includes(label)),`${channel} blank message must fail activation`);
  step.message='Hello {{FirstName}}';
  assert.deepEqual(validateLeadNurtureActivation({name:'Required messages',sources:['all'],steps:[step]}),[]);
}

const leadUi=read('public/admin/final-v16-76-d1-polls-automation-workspace.js');
assert.match(leadUi,/name:'Immediate WhatsApp introduction'.*message:''/s);
assert.doesNotMatch(leadUi,/message:'Hi \{\{FirstName\}\}, thank you for contacting Urgent Casting\.'/);
assert.match(leadUi,/e\.validationErrors/);
assert.match(leadUi,/ucV1681ReportIntegrationError/);

const socialUi=read('public/admin/final-v16-68-automation-flow-workspace.js');
assert.match(socialUi,/showFlowActivationErrors\(e\.validationErrors\)/);
assert.match(socialUi,/ucV1681ReportIntegrationError/);
const commentErrors=validateSocialAutomationActivation({name:'Comment DM',enabled:true,channel:'comment_dm',platform:'facebook',triggerMode:'keyword',triggerValue:'LINK',definition:{startNodeId:'one',nodes:[{id:'one',name:'Private DM',type:'private_dm',text:''}]}});
assert.ok(commentErrors.some(x=>x.nodeId==='one'&&x.field==='text'));

const recoveryUi=read('public/admin/final-v16-81-integration-recovery-validation.js');
const recoveryCss=read('public/admin/final-v16-81-integration-recovery-validation.css');
const adminIndex=read('public/admin/index.html');
assert.match(recoveryUi,/ucV1681OpenIntegration/);
assert.match(recoveryUi,/ucV1649EditIntegration/);
assert.match(recoveryUi,/MutationObserver/);
assert.match(recoveryCss,/#e2ad00/);
assert.match(recoveryCss,/#uc64Workspace \.uc79-required-missing/);
assert.match(recoveryCss,/#uc76LeadWorkspace \.uc79-required-missing/);
assert.match(adminIndex,/final-v16-81-integration-recovery-validation\.css\?v=16\.(?:81|82)/);
assert.match(adminIndex,/final-v16-81-integration-recovery-validation\.js\?v=16\.(?:81|82)/);
assert.match(adminIndex,/admin\.js\?v=16\.81/);
assert.match(adminIndex,/final-v16-68-automation-flow-workspace\.js\?v=16\.(?:81|82|83)/);
assert.match(adminIndex,/final-v16-76-d1-polls-automation-workspace\.js\?v=16\.(?:81|82|83)/);

const adminApi=read('public/admin/admin.js');
assert.match(adminApi,/error\.diagnostic=data\.diagnostic/);
assert.match(adminApi,/error\.validationErrors=Array\.isArray/);
const uploadApi=read('functions/api/admin/google-drive-upload.js');
assert.match(uploadApi,/diagnoseIntegrationError\('google_drive'/);
assert.match(uploadApi,/recovery:diagnostic\.recovery/);

const migrations=fs.readdirSync(path.join(root,'migrations')).filter(x=>x.endsWith('.sql')).sort();
assert.equal(migrations.at(-1),'0037_v16_78_comment_dm_lead_timeline.sql');
assert.match(read('FINAL_V16_81_INTEGRATION_RECOVERY_FLOW_VALIDATION.md'),/1\.7 million/);
assert.match(read('FINAL_V16_81_INTEGRATION_RECOVERY_FLOW_VALIDATION.md'),/4\.82 thousand/);

for(const p of ['public/admin/admin.js','public/admin/final-v16-81-integration-recovery-validation.js','public/admin/final-v16-76-d1-polls-automation-workspace.js','public/admin/final-v16-68-automation-flow-workspace.js'])assert.doesNotThrow(()=>new Function(read(p)),p);

console.log('V16.81 smoke tests: PASS');
