import {readGymConfiguration} from './gym-deployment-config.mjs';
import {connectExistingGymDatabase} from './gym-cloudflare.mjs';
try{
 const db=connectExistingGymDatabase(readGymConfiguration());
 console.log('Confirmed existing gym database: '+db.name+' ('+(db.uuid||db.database_id||db.id)+'). DB binding retained; actual database name saved.');
}catch(error){console.error(error.message);console.error('If authentication is required, run npx wrangler login and repeat this check.');process.exitCode=1;}
