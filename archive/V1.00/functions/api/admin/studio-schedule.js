import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { cancelStudioHoliday, coachScheduleDetails, listStudioScheduleAdmin, requestCoachLeaveInformation, reviewCoachLeave, saveStudioHoliday } from '../../_lib/studio-schedule.js';
import { cancelClassChange, listClassManagement, saveClassChange } from '../../_lib/class-management.js';
import { coachRemunerationReport } from '../../_lib/coach-remuneration.js';

export async function onRequestGet({request,env}){
  try{
    await requireAdmin(request,env);
    const url=new URL(request.url),coachId=Number(url.searchParams.get('coachId')||0);
    const paged=url.searchParams.get('view')==='mobile',options=paged?{page:Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1))),pageSize:Math.max(10,Math.min(100,Math.floor(Number(url.searchParams.get('pageSize'))||50)))}:undefined;
    let data;
    if(coachId)data=await coachScheduleDetails(env,coachId);
    else if(paged){
      const [schedule,classes]=await Promise.all([listStudioScheduleAdmin(env,options),listClassManagement(env,options)]);
      data={...schedule,...classes,mobilePagination:{...options,hasMore:Boolean(schedule._mobileHasMore||classes._mobileHasMore)}};delete data._mobileHasMore;
    }else data={...await listStudioScheduleAdmin(env),...await listClassManagement(env)};
    if(coachId)data.remuneration=(await coachRemunerationReport(env,{coachId})).rows[0]||null;
    return json({ok:true,...data},200,{'cache-control':'no-store'});
  }catch(error){return json({error:error.message||'Schedule could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  try{
    const admin=await requireAdmin(request,env),body=await readJson(request),action=String(body.action||'');
    if(action==='review_leave')return json(await reviewCoachLeave(env,{leaveId:body.leaveId,status:body.status,adminEmail:admin.email,adminReason:body.adminReason,suggestedDate:body.suggestedDate}));
    if(action==='request_leave_information')return json(await requestCoachLeaveInformation(env,{leaveId:body.leaveId,adminEmail:admin.email,message:body.message}));
    if(action==='save_holiday')return json(await saveStudioHoliday(env,body,admin.email));
    if(action==='cancel_holiday')return json(await cancelStudioHoliday(env,body.holidayId,admin.email));
    if(action==='save_class_change')return json(await saveClassChange(env,body,admin.email));
    if(action==='cancel_class_change')return json(await cancelClassChange(env,body.changeId,admin.email));
    throw new Error('Choose a supported schedule action.');
  }catch(error){return json({error:error.message||'Schedule action could not be completed.'},400);}
}
