import { json, readJson } from '../../_lib/utils.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';
import { acceptClassChange, pendingClassChangesForAccount } from '../../_lib/class-management.js';
export async function onRequestGet({request,env}){try{const account=await requirePortalAccount(request,env,['student']);return json({ok:true,changes:await pendingClassChangesForAccount(env,account)},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message},401);}}
export async function onRequestPost({request,env}){try{const account=await requirePortalAccount(request,env,['student']),body=await readJson(request);if(body.action!=='accept')throw new Error('Accept the class update to continue.');return json(await acceptClassChange(env,account,body.changeId));}catch(error){return json({error:error.message||'Class update could not be accepted.'},400);}}
