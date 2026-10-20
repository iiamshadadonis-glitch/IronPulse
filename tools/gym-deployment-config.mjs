import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export const configPath=new URL('../wrangler.jsonc',import.meta.url);
export const GYM_DATABASE_ID='893e7d29-fa72-413d-9415-5d93b1c3bc6e';
export const OLD_DATABASE_ID='16c9361a-625c-4c71-8ecb-6608a8836152';
export function validateGymConfiguration(config){
 if(!/^[a-z0-9][a-z0-9-]{1,57}$/.test(config.name||'')||/dropbeat|dance-class|urgent-casting/i.test(config.name))throw Error('Choose the gym Pages project. The original project is blocked.');
 const bindings=config.d1_databases?.filter(row=>row.binding==='DB')||[];
 if(bindings.length!==1)throw Error('Exactly one D1 binding named DB is required.');
 const db=bindings[0];
 if(db.database_id===OLD_DATABASE_ID)throw Error('The original database is blocked. Use the existing gym database.');
 if(db.database_id!==GYM_DATABASE_ID)throw Error('DB must use the existing gym database '+GYM_DATABASE_ID+'. Do not create a replacement database.');
 if(!db.database_name?.trim())throw Error('Keep the D1 database_name in wrangler.jsonc. npm run check:cloudflare can resolve its actual name.');
 if(config.pages_build_output_dir!=='./public')throw Error('Pages build output must be ./public.');
 if(!/^https:\/\//.test(config.vars?.SITE_URL||'')||config.vars?.SITE_NAME!=='IronPulse Gym')throw Error('Check the gym SITE_NAME and HTTPS SITE_URL.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.vars?.ADMIN_LOGIN_EMAIL||'')||config.vars.ADMIN_LOGIN_EMAIL==='you@example.com')throw Error('Set the gym administrator login email.');
 if(config.vars.ADMIN_DEVELOPMENT_BYPASS!=='false')throw Error('ADMIN_DEVELOPMENT_BYPASS must be false for deployment.');
 if(config.vars.ADMIN_LOGIN_PASSWORD)throw Error('Put ADMIN_LOGIN_PASSWORD in Cloudflare Pages secrets, never in wrangler.jsonc.');
 return db;
}
export const readGymConfiguration=()=>JSON.parse(readFileSync(configPath,'utf8'));
