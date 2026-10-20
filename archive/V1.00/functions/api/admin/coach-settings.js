import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { coachRemunerationReport, getCoachSettings, saveCoachLeaveRule, saveCoachRemuneration, saveCoachSettings } from '../../_lib/coach-remuneration.js';

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);const url=new URL(request.url),[settings,report,coachesResult]=await Promise.all([getCoachSettings(env),coachRemunerationReport(env,{from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||'',coachId:Number(url.searchParams.get('coachId')||0)}),env.DB.prepare("SELECT id,name FROM dance_coaches WHERE status<>'archived' ORDER BY sort_order,name,id").all()]);return json({ok:true,settings,report,coaches:coachesResult.results||[]},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message||'Coach settings could not be loaded.'},400);}
}
export async function onRequestPost({request,env}){
  try{const admin=await requireAdmin(request,env),body=await readJson(request),action=String(body.action||'save_settings');if(action==='save_settings')return json({ok:true,settings:await saveCoachSettings(env,body),message:'Coach settings saved.'});if(action==='save_remuneration')return json(await saveCoachRemuneration(env,body,admin.email));if(action==='save_leave_rule')return json(await saveCoachLeaveRule(env,body,admin.email));return json({error:'Choose coach settings, remuneration or a leave rule.'},400);}catch(error){return json({error:error.message||'Coach settings could not be saved.'},400);}
}
