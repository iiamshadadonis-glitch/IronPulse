import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import {
  acknowledgePastMemberNotifications,
  archiveDanceCoach,
  ensureDanceStudioSchema,
  getDanceCoachImpact,
  listClassWorkspace,
  listDanceCoaches,
  removeClassMember,
  reorderDanceCoach,
  saveDanceCoach,
  saveSessionOverride,
  setDanceCoachStatus,
  syncDanceMembershipsFromRecentOrders,
  updateScheduledEvent
} from '../../_lib/dance-studio.js';
import { saveCoachRemuneration } from '../../_lib/coach-remuneration.js';

const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
const number=v=>Math.max(0,Number(v)||0);
const coachesAfterMutation=env=>listDanceCoaches(env,{includeInactive:true});

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  try{
    await ensureDanceStudioSchema(env);const url=new URL(request.url),mode=clean(url.searchParams.get('mode')||'coaches',40);
    if(mode==='coaches')return json({ok:true,coaches:await listDanceCoaches(env,{includeInactive:true})},200,{'cache-control':'no-store'});
    if(mode==='coach_impact')return json({ok:true,impact:await getDanceCoachImpact(env,number(url.searchParams.get('id')))},200,{'cache-control':'no-store'});
    if(mode==='workspace')return json({ok:true,...await listClassWorkspace(env,{eventType:url.searchParams.get('eventType')||'online_class',month:url.searchParams.get('month')||''})},200,{'cache-control':'no-store'});
    if(mode==='sync')return json(await syncDanceMembershipsFromRecentOrders(env,{lookbackDays:7}),200,{'cache-control':'no-store'});
    return json({error:'Choose coaches or workspace mode.'},400);
  }catch(error){return json({error:error.message||'Fitness gym data could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  let admin;try{admin=await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  try{
    await ensureDanceStudioSchema(env);const body=await readJson(request),action=clean(body.action,60);
    if(action==='save_coach'){const id=await saveDanceCoach(env,body);if(body.remunerationType||body.remuneration_type||body.rateRupees||body.ratePaise||body.monthlyBaseRupees||body.monthlyBasePaise)await saveCoachRemuneration(env,{...body,coachId:id},admin.email);const coaches=await coachesAfterMutation(env);return json({ok:true,id,coaches,message:'Coach details and approved remuneration terms were saved.'});}
    if(action==='archive_coach'){const result=await archiveDanceCoach(env,number(body.id),number(body.replacementCoachId||body.replacement_coach_id)),coaches=await coachesAfterMutation(env);return json({...result,coaches,message:'Coach removed from active lists. Existing history was kept and active classes were reassigned.'});}
    if(action==='set_coach_status'){const remove=body.remove===true||body.remove===1||String(body.remove||'').toLowerCase()==='true';const result=await setDanceCoachStatus(env,{id:number(body.id),status:body.status,replacementCoachId:number(body.replacementCoachId||body.replacement_coach_id),remove}),coaches=await coachesAfterMutation(env);return json({...result,coaches,message:result.status==='active'?'Coach enabled and visible for new assignments.':result.reassigned?'Coach updated and every active class, member and future session was reassigned.':'Coach status updated.'});}
    if(action==='reorder_coach'){const result=await reorderDanceCoach(env,{id:number(body.id),direction:body.direction}),coaches=await coachesAfterMutation(env);return json({...result,coaches,message:'Coach display order updated.'});}
    if(action==='save_session_override'){const result=await saveSessionOverride(env,body);return json({...result,message:result.notification?.attempted?`Class updated. ${result.notification.sent} notification(s) sent${result.notification.failed?`; ${result.notification.failed} failed`:''}.`:'Class schedule updated.'});}
    if(action==='update_scheduled_event'){const result=await updateScheduledEvent(env,body);return json({...result,message:result.notification?.attempted?`Event updated. ${result.notification.sent} notification(s) sent${result.notification.failed?`; ${result.notification.failed} failed`:''}.`:'Event updated.'});}
    if(action==='acknowledge_past_members')return json({...await acknowledgePastMemberNotifications(env,body.eventType),message:'Past-member notifications marked as reviewed.'});
    if(action==='remove_class_member')return json({...await removeClassMember(env,{memberId:body.memberId,eventType:body.eventType,confirmation:body.confirmation}),message:'Member moved to Past Members. Their class reminders were cancelled and payment history was kept.'});
    if(action==='sync_memberships')return json({...await syncDanceMembershipsFromRecentOrders(env,{orderId:body.orderId||'',lookbackDays:body.lookbackDays||7}),message:'Plan purchases and subscription statuses synchronized with class members.'});
    throw new Error('Choose a supported gym action.');
  }catch(error){return json({error:error.message||'Fitness gym action could not be completed.'},400);}
}
