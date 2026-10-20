import { json } from '../../../_lib/utils.js';
import { getPortalSession, publicPortalAccount } from '../../../_lib/portal-auth.js';

export async function onRequestGet({request,env}){try{const account=await getPortalSession(request,env);if(!account)return json({authenticated:false},401);return json({authenticated:true,account:publicPortalAccount(account)},200,{'cache-control':'no-store'});}catch(error){return json({authenticated:false,error:error.message},401);}}
