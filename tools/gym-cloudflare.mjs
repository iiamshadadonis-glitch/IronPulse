import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {projectRoot,configPath,validateGymConfiguration,GYM_DATABASE_ID} from './gym-deployment-config.mjs';
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
export function runWrangler(args,{capture=false}={}){
 const result=spawnSync(process.execPath,[wrangler,...args],{cwd:projectRoot,stdio:capture?['ignore','pipe','pipe']:'inherit',encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Cloudflare command failed. '+(capture?result.stderr:'Review the message above.'));
 return result.stdout||'';
}
export function findGymDatabase(databases){
 if(!Array.isArray(databases))throw Error('Cloudflare returned an unexpected database list.');
 const db=databases.find(row=>(row.uuid||row.database_id||row.id)===GYM_DATABASE_ID);
 if(!db)throw Error('Database '+GYM_DATABASE_ID+' is not accessible in the selected Cloudflare account. Select the account that owns this existing database; do not create another database.');
 if(!db.name)throw Error('Cloudflare did not return the existing database name.');
 return db;
}
export function connectExistingGymDatabase(config,{run=runWrangler,save=true}={}){
 validateGymConfiguration(config);
 const db=findGymDatabase(JSON.parse(run(['d1','list','--json'],{capture:true})));
 config.d1_databases.find(row=>row.binding==='DB').database_name=db.name;
 validateGymConfiguration(config);
 if(save)writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
 return db;
}
