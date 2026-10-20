import { createProviderMeeting } from './marketing-suite.js';
import { ensureV122Schema } from './v1-22-schema.js';
import { WEEK_DAYS } from './portal-auth.js';
import { ensureStudioScheduleSchema } from './studio-schedule.js';

const clean=(value,max=1000)=>String(value??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);
const list=value=>{try{const parsed=Array.isArray(value)?value:JSON.parse(value||'[]');return Array.isArray(parsed)?parsed:[];}catch{return[];}};
const datePlus=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const dayCode=date=>WEEK_DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
const validTime=value=>String(value||'10:00').match(/(?:T|\s)([0-2]\d:[0-5]\d)/)?.[1]||String(value||'10:00').match(/^([0-2]\d:[0-5]\d)/)?.[1]||'10:00';
export const indiaClassIsoV122=(date,time='10:00')=>new Date(`${date}T${validTime(time)}:00+05:30`).toISOString();
const indiaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const online=new Set(['online_class','demo','webinar','trial']);

async function occurrenceBlock(env,row,date){
  await ensureStudioScheduleSchema(env);
  const holiday=await env.DB.prepare("SELECT event_name FROM studio_holidays WHERE status='active' AND start_date<=? AND end_date>=? ORDER BY id LIMIT 1").bind(date,date).first();
  if(holiday)return {blocked:true,reason:`Gym holiday: ${holiday.event_name||'Holiday'}`};
  if(Number(row?.coach_id||0)>0){const leave=await env.DB.prepare("SELECT purpose FROM coach_leave_requests WHERE coach_id=? AND status='approved' AND from_date<=? AND to_date>=? ORDER BY id LIMIT 1").bind(Number(row.coach_id),date,date).first();if(leave)return {blocked:true,reason:`Coach leave: ${leave.purpose||'Approved leave'}`};}
  return {blocked:false,reason:''};
}

export async function sessionSource(env,sourceType,sourceId){
  await ensureV122Schema(env);const source=sourceType==='assignment'?'assignment':'product',id=Number(sourceId||0);if(!id)return null;
  if(source==='assignment')return env.DB.prepare(`SELECT 'assignment' source_type,id source_id,class_name,class_type,event_type,class_time,duration_minutes,class_days_json,timezone,coach_id,meeting_provider,schedule_start_date,access_start_date,access_end_date,status,enabled,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.class_assignment_id=order_class_assignments.id AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.class_assignment_id=order_class_assignments.id AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students FROM order_class_assignments WHERE id=? LIMIT 1`).bind(id).first();
  return env.DB.prepare(`SELECT 'product' source_type,product_id source_id,class_name,class_type,event_type,class_time,duration_minutes,class_days_json,timezone,coach_id,meeting_provider,schedule_start_date,access_start_date,access_end_date,status,enabled,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.product_id=product_class_mappings.product_id AND w.class_assignment_id=0 AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.product_id=product_class_mappings.product_id AND w.class_assignment_id=0 AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students FROM product_class_mappings WHERE product_id=? LIMIT 1`).bind(id).first();
}

export async function meetingForOccurrence(env,{sourceType='product',sourceId=0,date=''}){
  await ensureV122Schema(env);return env.DB.prepare(`SELECT * FROM class_session_meetings WHERE source_type=? AND source_id=? AND session_date=? LIMIT 1`).bind(sourceType==='assignment'?'assignment':'product',Number(sourceId),clean(date,10)).first();
}

export async function ensureOccurrenceMeeting(env,{sourceType='product',sourceId=0,date='',source=null}={}){
  await ensureV122Schema(env);
  const type=sourceType==='assignment'?'assignment':'product',id=Number(sourceId),sessionDate=clean(date,10),row=source||await sessionSource(env,type,id);
  if(!row||Number(row.enabled)!==1||row.status!=='active')throw new Error('This class is no longer active.');
  if(!online.has(row.class_type||row.event_type))throw new Error('This gym class does not need an online meeting.');
  if(Number(row.current_students||0)<1)throw new Error('A meeting is created only after at least one current paid member is enrolled.');
  if(Number(row.coach_id||0)<1)throw new Error('Assign a coach before creating this meeting.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))throw new Error('Choose a valid session date.');
  const effective=row.access_start_date||row.schedule_start_date||row.member_start_date||'';
  if(effective&&sessionDate<effective)throw new Error(`This class starts on ${effective}.`);
  if(row.access_end_date&&sessionDate>row.access_end_date)throw new Error('This class schedule has ended.');
  if(!new Set(list(row.class_days_json)).has(dayCode(sessionDate)))throw new Error('The selected date is not one of this class’s teaching days.');
  const block=await occurrenceBlock(env,row,sessionDate);if(block.blocked)throw new Error(`${block.reason}. Joining is unavailable.`);
  const startsAt=indiaClassIsoV122(sessionDate,row.class_time),provider=['google_meet','zoom','external'].includes(row.meeting_provider)?row.meeting_provider:'google_meet',duration=Number(row.duration_minutes||60),existing=await meetingForOccurrence(env,{sourceType:type,sourceId:id,date:sessionDate});
  if(existing?.status==='ended')throw new Error('This session was already ended.');
  if(existing?.status==='cancelled')throw new Error('This session was cancelled.');
  if(existing&&['scheduled','started'].includes(existing.status)&&/^https:\/\//i.test(existing.meeting_url||'')){
    const current=Number(existing.coach_id)===Number(row.coach_id)&&existing.provider===provider&&existing.starts_at===startsAt&&Number(existing.duration_minutes)===duration;
    if(current)return existing;
    if(existing.status==='started')throw new Error('This live meeting belongs to an earlier coach or schedule. End it before starting the updated class.');
  }
  const event={title:row.class_name||'Fitness Class',eventType:row.class_type||row.event_type||'online_class',deliveryMode:'online',provider,customerName:'',customerEmail:'',startsAt,durationMinutes:duration,timezone:row.timezone||'Asia/Kolkata',notes:`Unique ${type} ${id} occurrence for ${sessionDate}.`,uniqueKey:`${type}-${id}-${sessionDate}-${Number(row.coach_id)}`},created=await createProviderMeeting(env,event);if(!created?.url)throw new Error(`${provider==='zoom'?'Zoom':provider==='external'?'External provider':'Google Meet'} did not return a meeting address.`);
  await env.DB.prepare(`INSERT INTO class_session_meetings(source_type,source_id,session_date,coach_id,provider,starts_at,duration_minutes,provider_event_id,meeting_url,status,revoked_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'scheduled','',CURRENT_TIMESTAMP) ON CONFLICT(source_type,source_id,session_date) DO UPDATE SET coach_id=excluded.coach_id,provider=excluded.provider,starts_at=excluded.starts_at,duration_minutes=excluded.duration_minutes,provider_event_id=excluded.provider_event_id,meeting_url=excluded.meeting_url,status='scheduled',started_at='',ended_at='',revoked_at='',updated_at=CURRENT_TIMESTAMP`).bind(type,id,sessionDate,Number(row.coach_id),provider,startsAt,Number(row.duration_minutes||60),clean(created.id,600),clean(created.url,2400)).run();return meetingForOccurrence(env,{sourceType:type,sourceId:id,date:sessionDate});
}

export async function adminOccurrenceJoinState(env,{sourceType='product',sourceId=0,date=indiaDate(),now=Date.now()}={}){
  const type=sourceType==='assignment'?'assignment':'product',row=await sessionSource(env,type,sourceId),sessionDate=clean(date,10);if(!row)return {joinEnabled:false,joinLabel:'Class unavailable'};
  const startBoundary=row.access_start_date||row.schedule_start_date||row.member_start_date||'',allowed=new Set(list(row.class_days_json)),start=Date.parse(indiaClassIsoV122(sessionDate,row.class_time)),end=start+Math.max(15,Number(row.duration_minutes||60))*60000,nowMs=Number(now)||Date.now();let label='Join unavailable',enabled=false;
  if(Number(row.enabled)!==1||row.status!=='active')label='Class inactive';
  else if(!online.has(row.class_type||row.event_type))label='Gym Class';
  else if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)||startBoundary&&sessionDate<startBoundary||row.access_end_date&&sessionDate>row.access_end_date||!allowed.has(dayCode(sessionDate)))label='Not scheduled today';
  else{const block=await occurrenceBlock(env,row,sessionDate);if(block.blocked)label=block.reason;else if(nowMs<start-5*60000)label='Opens 5 min before';else if(nowMs>=end)label='Session ended';else{enabled=true;label='Join Session';}}
  return {joinEnabled:enabled,joinLabel:label,joinDate:sessionDate,joinUrl:enabled?`/api/portal/session-access?action=admin_join&source=${encodeURIComponent(type)}&sourceId=${Number(row.source_id)}&date=${encodeURIComponent(sessionDate)}`:'',sessionStartsAt:new Date(start).toISOString(),sessionEndsAt:new Date(end).toISOString()};
}

export async function adminOccurrenceRedirect(env,identity={}){
  const state=await adminOccurrenceJoinState(env,identity);if(!state.joinEnabled)throw new Error(state.joinLabel||'This session cannot be joined now.');const meeting=await ensureOccurrenceMeeting(env,identity);if(!/^https:\/\//i.test(meeting?.meeting_url||''))throw new Error('The live meeting link is not ready.');return meeting.meeting_url;
}

export async function startOccurrenceMeeting(env,identity){
  const meeting=await ensureOccurrenceMeeting(env,identity);await env.DB.prepare("UPDATE class_session_meetings SET status='started',started_at=CASE WHEN trim(started_at)='' THEN CURRENT_TIMESTAMP ELSE started_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(meeting.id).run();return {...meeting,status:'started'};
}

export async function endOccurrenceMeeting(env,account,{sourceType='product',sourceId=0,date=''}={}){
  await ensureV122Schema(env);const profile=await env.DB.prepare('SELECT dance_coach_id FROM portal_coach_profiles WHERE account_id=?').bind(Number(account.id)).first(),coachId=Number(profile?.dance_coach_id||0),source=await sessionSource(env,sourceType,sourceId);if(!coachId||!source||Number(source.coach_id)!==coachId)throw new Error('Only the currently assigned coach can end this session.');const meeting=await meetingForOccurrence(env,{sourceType,sourceId,date});if(!meeting)throw new Error('The meeting has not been created yet.');await env.DB.prepare("UPDATE class_session_meetings SET status='ended',ended_at=CURRENT_TIMESTAMP,meeting_url='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(meeting.id).run();return {ok:true,message:'The session was ended and member access to its meeting link was closed.'};
}

export async function revokeSourceMeetings(env,{sourceType='product',sourceId=0,from='',to='',reason='Class assignment changed'}={}){
  await ensureV122Schema(env);const where=['source_type=?','source_id=?',"status IN ('scheduled','started')"],args=[sourceType==='assignment'?'assignment':'product',Number(sourceId)];if(from){where.push('session_date>=?');args.push(from);}if(to){where.push('session_date<=?');args.push(to);}const result=await env.DB.prepare(`UPDATE class_session_meetings SET status='revoked',meeting_url='',revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE ${where.join(' AND ')}`).bind(...args).run();return {revoked:Number(result?.meta?.changes||0),reason};
}

export async function provisionUpcomingMeetings(env,{daysAhead=2,limit=100}={}){
  await ensureV122Schema(env);const start=indiaDate(),days=Math.max(0,Math.min(14,Number(daysAhead||2))),[products,assignments]=await Promise.all([env.DB.prepare("SELECT *, 'product' source_type,product_id source_id,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.product_id=product_class_mappings.product_id AND w.class_assignment_id=0 AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.product_id=product_class_mappings.product_id AND w.class_assignment_id=0 AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students FROM product_class_mappings WHERE enabled=1 AND status='active' AND class_type IN ('online_class','demo','webinar','trial')").all(),env.DB.prepare("SELECT *, 'assignment' source_type,id source_id,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.class_assignment_id=order_class_assignments.id AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.class_assignment_id=order_class_assignments.id AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students FROM order_class_assignments WHERE enabled=1 AND status='active' AND class_type IN ('online_class','demo','webinar','trial')").all()]),results=[];
  outer:for(const source of [...(products.results||[]),...(assignments.results||[])]){if(Number(source.current_students||0)<1||Number(source.coach_id||0)<1)continue;const allowed=new Set(list(source.class_days_json)),effective=source.access_start_date||source.schedule_start_date||source.member_start_date||'';for(let offset=0;offset<=days;offset++){const date=datePlus(start,offset);if(effective&&date<effective||source.access_end_date&&date>source.access_end_date||!allowed.has(dayCode(date)))continue;try{const meeting=await ensureOccurrenceMeeting(env,{sourceType:source.source_type,sourceId:Number(source.source_id),date,source});results.push({ok:true,sourceType:source.source_type,sourceId:Number(source.source_id),date,provider:meeting.provider});}catch(error){results.push({ok:false,sourceType:source.source_type,sourceId:Number(source.source_id),date,error:error.message});}if(results.length>=Math.max(1,Math.min(500,Number(limit||100))))break outer;}}
  return {ok:results.some(row=>row.ok),processed:results.length,created:results.filter(row=>row.ok).length,failed:results.filter(row=>!row.ok).length,results};
}
