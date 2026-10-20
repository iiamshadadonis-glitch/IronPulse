import { json, readJson } from '../../_lib/utils.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';
import { applyCoachLeave, cancelCoachLeave, portalStudioSchedule } from '../../_lib/studio-schedule.js';

export async function onRequestGet({request,env}){
  try{const account=await requirePortalAccount(request,env,['student','coach']);return json({ok:true,...await portalStudioSchedule(env,account)},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message||'Schedule details could not be loaded.'},401);}
}

export async function onRequestPost({request,env}){
  try{const account=await requirePortalAccount(request,env,['coach']),body=await readJson(request);if(body.action==='apply_leave')return json(await applyCoachLeave(env,account,body));if(body.action==='cancel_leave')return json(await cancelCoachLeave(env,account,body.leaveId));throw new Error('Choose a supported leave action.');}catch(error){return json({error:error.message||'Leave request could not be completed.'},400);}
}
