import assert from 'node:assert/strict';
import {readGymConfiguration,validateGymConfiguration,GYM_DATABASE_ID,OLD_DATABASE_ID} from '../tools/gym-deployment-config.mjs';
import {findGymDatabase,connectExistingGymDatabase} from '../tools/gym-cloudflare.mjs';
const config=readGymConfiguration();
assert.equal(validateGymConfiguration(config).database_id,GYM_DATABASE_ID);
assert.equal(config.name,'ironpulse-gym');
for(const change of [
 c=>c.d1_databases[0].database_id=OLD_DATABASE_ID,
 c=>c.d1_databases[0].database_id='00000000-0000-0000-0000-000000000000',
 c=>c.d1_databases[0].database_id='12345678-1234-1234-1234-123456789abc',
 c=>c.d1_databases.push({...c.d1_databases[0]}),
 c=>c.d1_databases[0].binding='GYM_DB',
 c=>c.name='dance-class-at2',
 c=>c.vars.ADMIN_DEVELOPMENT_BYPASS='true',
 c=>c.vars.ADMIN_LOGIN_PASSWORD='insecure-inline-password'
]){const bad=structuredClone(config);change(bad);assert.throws(()=>validateGymConfiguration(bad));}
const databases=[{uuid:OLD_DATABASE_ID,name:'unrelated-database'},{uuid:'12345678-1234-1234-1234-123456789abc',name:'ironpulse-gym-db'},{uuid:GYM_DATABASE_ID,name:'actual-gym-database-name'}];
assert.equal(findGymDatabase(databases).name,'actual-gym-database-name');
assert.throws(()=>findGymDatabase(databases.slice(0,2)),/not accessible/);
const commands=[],copy=structuredClone(config);
connectExistingGymDatabase(copy,{save:false,run:(args,options)=>{commands.push({args,options});return JSON.stringify(databases);}});
assert.deepEqual(commands,[{args:['d1','list','--json'],options:{capture:true}}]);
assert.equal(copy.d1_databases[0].database_id,GYM_DATABASE_ID);
assert.equal(copy.d1_databases[0].binding,'DB');
assert.equal(copy.d1_databases[0].database_name,'actual-gym-database-name');
const untouched=structuredClone(config);
assert.throws(()=>connectExistingGymDatabase(untouched,{save:false,run:()=>JSON.stringify([])}),/not accessible/);
assert.deepEqual(untouched,config,'A failed account check must not change the destination');
console.log('Existing gym D1 selection, account mismatch, old/incorrect database rejection, binding compatibility and secret guards passed. No Cloudflare resources created.');
