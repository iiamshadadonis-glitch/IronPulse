import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {fileURLToPath} from 'node:url';
import {projectRoot,configPath,readGymConfiguration,validateGymConfiguration} from './gym-deployment-config.mjs';
const prompt=createInterface({input:stdin,output:stdout});
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
function run(args,{capture=false}={}){
 const result=spawnSync(process.execPath,[wrangler,...args],{cwd:projectRoot,stdio:capture?['ignore','pipe','pipe']:'inherit',encoding:'utf8'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Cloudflare setup step failed. '+(capture?result.stderr:'Review the message above.'));
 return result.stdout||'';
}
async function answer(label,defaultValue){return (await prompt.question(label+' ['+defaultValue+']: ')).trim()||defaultValue;}
try{
 console.log('Create a separate gym project and database. Your dance instance is not used.');
 const config=readGymConfiguration();
 const project=await answer('New Pages project name',config.name);
 const database=await answer('New D1 database name',config.d1_databases[0].database_name);
 const email=await answer('Your gym administrator email',config.vars.ADMIN_LOGIN_EMAIL);
 if(!/^[a-z0-9][a-z0-9-]{2,57}$/.test(project)||!/^[a-z0-9][a-z0-9-]{2,57}$/.test(database))throw Error('Use 3–58 lowercase letters, numbers and hyphens for the project and database.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email==='you@example.com')throw Error('Enter your real administrator email.');
 config.name=project;config.d1_databases[0].database_name=database;
 config.vars.SITE_URL='https://'+project+'.pages.dev';config.vars.ADMIN_LOGIN_EMAIL=email;config.vars.ADMIN_EMAILS=email;
 validateGymConfiguration(config,{configured:false});
 if(!process.env.CLOUDFLARE_API_TOKEN)run(['login']);
 const projects=JSON.parse(run(['pages','project','list','--json'],{capture:true}));
 const exists=projects.find(row=>row.name===project);
 if(exists&&!await answer('Existing gym project found. Type USE to reuse it','').then(x=>x==='USE'))throw Error('Choose a different new project name and run setup again.');
 if(!exists)run(['pages','project','create',project,'--production-branch','main']);
 const databases=JSON.parse(run(['d1','list','--json'],{capture:true}));
 let db=databases.find(row=>row.name===database);
 if(db&&config.d1_databases[0].database_id!==(db.uuid||db.database_id))throw Error('That database already exists and is not this configured gym database. Run setup with a new database name.');
 if(!db){
  const output=run(['d1','create',database,'--location','apac','--update-config=false'],{capture:true});
  const id=output.match(/(?:database_id["']?\s*[:=]\s*["']?)([0-9a-f-]{36})/i)?.[1];
  if(!id)throw Error('The database was created. Copy its database_id from Cloudflare D1 into wrangler.jsonc, then continue with npm run deploy.');
  db={uuid:id};
 }
 config.d1_databases[0].database_id=db.uuid||db.database_id;
 validateGymConfiguration(config);writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
 console.log('Project and separate D1 binding configured. Set the first-login password next; it is stored as a Cloudflare secret.');
 prompt.close();
 run(['pages','secret','put','ADMIN_LOGIN_PASSWORD','--project-name',project]);
 console.log('Setup complete. Run npm run deploy. Then open '+config.vars.SITE_URL+'/login and sign in with your administrator email and the password you just set.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{prompt.close();}
