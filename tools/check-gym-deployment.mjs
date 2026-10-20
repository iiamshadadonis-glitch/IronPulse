import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {projectRoot,readGymConfiguration,validateGymConfiguration} from './gym-deployment-config.mjs';
try{
 const config=readGymConfiguration(),db=validateGymConfiguration(config);
 for(const path of ['public/index.html','public/member-dashboard.html','functions/_middleware.js']){
  if(!existsSync(join(projectRoot,path)))throw Error('Missing project file '+path+'. Use the complete ZIP at your repository root.');
 }
 const pkg=JSON.parse(readFileSync(join(projectRoot,'package.json'),'utf8'));
 console.log('IronPulse Gym V1.01 (package '+pkg.version+')');
 console.log('Pages project: '+config.name+' | output: public');
 console.log('D1 binding DB: '+db.database_id);
 console.log('Local configuration check passed. Cloudflare account access is checked separately by npm run check:cloudflare.');
}catch(error){console.error(error.message);process.exitCode=1;}
