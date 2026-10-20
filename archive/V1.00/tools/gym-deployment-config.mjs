import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export const configPath=new URL('../wrangler.jsonc',import.meta.url);
export const OLD_DATABASE_ID='16c9361a-625c-4c71-8ecb-6608a8836152';
export function validateGymConfiguration(config,{configured=true}={}){
 const db=config.d1_databases?.find(row=>row.binding==='DB');
 if(!config.name||/dropbeat|dance-class|urgent-casting/i.test(config.name))throw Error('Choose the new gym Pages project. The original project is blocked.');
 if(!db||/dropbeat|dance-class|urgent-casting/i.test(db.database_name||'')||db.database_id===OLD_DATABASE_ID)throw Error('Bind DB to a separate gym D1 database. The original database is blocked.');
 if(configured&&(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(db.database_id||'')||/^0{8}-/.test(db.database_id)))throw Error('Run npm run setup:gym first, or enter the NEW D1 database ID in wrangler.jsonc.');
 if(!config.vars?.SITE_URL||!/IronPulse/i.test(config.vars.SITE_NAME||''))throw Error('Check the gym SITE_NAME and SITE_URL.');
 if(configured&&(!config.vars.ADMIN_LOGIN_EMAIL||config.vars.ADMIN_LOGIN_EMAIL==='you@example.com'))throw Error('Set your gym administrator email in wrangler.jsonc.');
 return db;
}
export const readGymConfiguration=()=>JSON.parse(readFileSync(configPath,'utf8'));
