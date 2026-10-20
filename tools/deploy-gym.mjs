import {readGymConfiguration} from './gym-deployment-config.mjs';
import {runWrangler,connectExistingGymDatabase} from './gym-cloudflare.mjs';
try{
 const config=readGymConfiguration(),db=connectExistingGymDatabase(config);
 console.log('Gym destination: '+config.name+' → '+db.name+' ('+config.d1_databases[0].database_id+')');
 if(process.argv.includes('--migrate-only'))runWrangler(['d1','migrations','apply','DB','--remote']);
 else{
  runWrangler(['pages','functions','build','--outdir','.build']);
  runWrangler(['pages','deploy','public','--project-name',config.name,'--branch','main']);
 }
}catch(error){console.error(error.message);process.exitCode=1;}
