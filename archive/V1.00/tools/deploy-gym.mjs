import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectRoot,readGymConfiguration,validateGymConfiguration} from './gym-deployment-config.mjs';
try{
 const config=readGymConfiguration();validateGymConfiguration(config);
 const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
 const run=args=>{const result=spawnSync(process.execPath,[wrangler,...args],{cwd:projectRoot,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw Error('Cloudflare command failed; no further deployment steps were run.');};
 console.log('Gym destination: '+config.name+' → '+config.d1_databases[0].database_name);
 run(['d1','migrations','apply','DB','--remote']);
 if(!process.argv.includes('--migrate-only'))run(['pages','deploy','public','--project-name',config.name,'--branch','main']);
}catch(error){console.error(error.message);process.exitCode=1;}
