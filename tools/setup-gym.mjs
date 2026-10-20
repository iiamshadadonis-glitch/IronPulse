import {writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {configPath,readGymConfiguration,validateGymConfiguration,GYM_DATABASE_ID} from './gym-deployment-config.mjs';
import {runWrangler,connectExistingGymDatabase} from './gym-cloudflare.mjs';
const prompt=createInterface({input:stdin,output:stdout});
async function answer(label,value){return(await prompt.question(label+' ['+value+']: ')).trim()||value;}
try{
 console.log('Use your existing gym D1: '+GYM_DATABASE_ID+'. This setup never creates a database or Pages project.');
 const config=readGymConfiguration();
 config.name=await answer('Existing gym Pages project name',config.name);
 config.vars.SITE_URL=await answer('Gym website URL','https://'+config.name+'.pages.dev');
 const email=await answer('Administrator login email',config.vars.ADMIN_LOGIN_EMAIL);
 config.vars.ADMIN_LOGIN_EMAIL=email;config.vars.ADMIN_EMAILS=email;validateGymConfiguration(config);
 if(!process.env.CLOUDFLARE_API_TOKEN)runWrangler(['login']);
 const db=connectExistingGymDatabase(config,{save:false});
 writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
 console.log('DB verified: '+db.name+'. Set the first-login password as a Pages secret next.');
 prompt.close();runWrangler(['pages','secret','put','ADMIN_LOGIN_PASSWORD','--project-name',config.name]);
 console.log('Setup complete. For Git-connected Pages, commit/push these files. For CLI deployment, run npm run deploy.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt.close();}
