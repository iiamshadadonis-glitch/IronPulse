import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { attendanceReport, attendanceRoster, setAttendanceStatus, studentAttendanceProfile } from '../../_lib/portal-attendance.js';
import { coachRemunerationReport } from '../../_lib/coach-remuneration.js';

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);const url=new URL(request.url),sessionKey=url.searchParams.get('sessionKey')||'',studentProfile=url.searchParams.get('studentProfile')||'',participant=url.searchParams.get('participant')||'students';if(studentProfile){const [accountId,memberId]=studentProfile.split(':').map(Number);return json({ok:true,...await studentAttendanceProfile(env,{accountId,memberId})},200,{'cache-control':'no-store'});}if(sessionKey)return json({ok:true,...await attendanceRoster(env,sessionKey)},200,{'cache-control':'no-store'});if(participant==='remuneration')return json(await coachRemunerationReport(env,{from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||'',coachId:Number(url.searchParams.get('coachId')||0)}),200,{'cache-control':'no-store'});return json({ok:true,...await attendanceReport(env,{from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||'',coachId:Number(url.searchParams.get('coachId')||0),classType:url.searchParams.get('classType')||'',participant})},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message||'Attendance could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  try{const admin=await requireAdmin(request,env),body=await readJson(request);return json(await setAttendanceStatus(env,{sessionKey:body.sessionKey,role:body.role,participantKey:body.participantKey,status:body.status,adminEmail:admin.email}));}catch(error){return json({error:error.message||'Attendance could not be updated.'},400);}
}
