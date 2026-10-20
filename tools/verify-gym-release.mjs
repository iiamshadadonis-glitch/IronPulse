import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),output=join(root,'verification/ironpulse-v1.01');mkdirSync(output,{recursive:true});
const cases=[
 'gym-release.mjs','gym-deployment.mjs','gym-sessions.mjs','gym-buttons-api.mjs','gym-plan-import.mjs',
 'gym-v1-58-notifications.mjs','gym-v1-58-service-worker.mjs','gym-v1-57-layout-api.mjs','gym-v1-51-cache.mjs','gym-v1-51-sync.mjs','gym-v1-49-schedule.mjs',
 'gym-v1-27-payment-admin-recovery.mjs','gym-v1-28-worker-resource-login-recovery.mjs',
 'v16-88-data-integration.mjs','v16-89-periods.mjs','v16-90-d1-read.mjs','v16-93-smoke.mjs','v16-95-smoke.mjs','v16-96-smoke.mjs','v16-97-smoke.mjs','v16-98-smoke.mjs','v16-99-smoke.mjs','v17-00-smoke.mjs',
 'v17-01-d1-read-optimization.mjs','v17-02-visitor-customer-recovery.mjs','v17-03-visitor-dashboard-freshness.mjs','v17-04-visitor-read-guard.mjs','v17-05-email-automations.mjs','v17-06-email-followup-providers.mjs','v17-07-webinar-email-ui.mjs','v17-08-workflows-members-ui.mjs','v17-09-navigation-email-parity.mjs'
];
const results=[];
for(const name of cases){const started=Date.now(),result=spawnSync(process.execPath,['tests/'+name],{cwd:root,encoding:'utf8',timeout:90000});const log=(result.stdout||'')+(result.stderr||'');writeFileSync(join(output,name+'.log'),log);const pass=result.status===0;results.push({name,pass,durationMs:Date.now()-started});console.log((pass?'PASS ':'FAIL ')+name);if(!pass)console.error(log.slice(-4500));}
writeFileSync(join(output,'release-tests.json'),JSON.stringify({release:'IronPulse Gym V1.01',baseline:'IronPulse Gym V1.00',node:process.version,results},null,2)+'\n');
if(results.some(row=>!row.pass))process.exitCode=1;else console.log('All '+results.length+' current gym release/regression suites passed.');
