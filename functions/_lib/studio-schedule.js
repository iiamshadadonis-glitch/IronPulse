import { brandedEmailHtml } from './branded-email.js';
import { sendConfiguredEmail } from './outbound-email.js';
import { addPortalNotification, ensurePortalSchema, portalClean } from './portal-auth.js';
import { getSiteSettings, notifyAdmin } from './utils.js';
import { googleDriveInlineImageUrl } from './google-drive-upload.js';

const clean=portalClean;
const emailKey=value=>clean(value,320).toLowerCase();
const DAY_CODES=['sun','mon','tue','wed','thu','fri','sat'];
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const ready=new WeakSet();

const list=value=>{try{const parsed=Array.isArray(value)?value:JSON.parse(value||'[]');return Array.isArray(parsed)?parsed:[];}catch{return[];}};
const unique=values=>[...new Set((values||[]).map(value=>clean(value,180)).filter(Boolean))];
export const indiaDate=(value=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
export const datePlus=(date,count)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+Number(count||0));return value.toISOString().slice(0,10);};
export const dayCode=date=>DAY_CODES[new Date(`${date}T12:00:00Z`).getUTCDay()];
const validDate=value=>DATE_RE.test(String(value||''))?String(value):'';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const cleanMultiline=(value,max=5000)=>String(value??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]+/g,'').split('\n').map(line=>line.replace(/[ \t]+$/g,'')).join('\n').trim().slice(0,max);
const multilineHtml=value=>cleanMultiline(value,5000).split(/\n{2,}/).map(paragraph=>`<p style="margin:0 0 14px;white-space:pre-wrap">${escapeHtml(paragraph).replace(/\n/g,'<br>')}</p>`).join('');

export function nextScheduledDate(startDate,classDays=[]){
  const start=validDate(startDate),days=new Set((classDays||[]).map(value=>clean(value,3).toLowerCase()));
  if(!start||!days.size)return start;
  for(let offset=0;offset<14;offset++){const date=datePlus(start,offset);if(days.has(dayCode(date)))return date;}
  return start;
}

export function effectiveSourceStart(source={}){
  const explicit=validDate(source.access_start_date)||validDate(source.schedule_start_date);
  if(explicit)return explicit;
  return validDate(source.member_start_date)||validDate(source.earliest_member_start)||'';
}

export async function ensureStudioScheduleSchema(env){
  await ensurePortalSchema(env);
  if(ready.has(env.DB))return;
  const statements=[
    `CREATE TABLE IF NOT EXISTS coach_leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL,coach_id INTEGER NOT NULL,leave_type TEXT NOT NULL DEFAULT 'planned' CHECK(leave_type IN ('planned','unplanned')),purpose TEXT NOT NULL DEFAULT '',from_date TEXT NOT NULL,to_date TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','cancelled')),admin_reason TEXT NOT NULL DEFAULT '',suggested_date TEXT NOT NULL DEFAULT '',reviewed_by TEXT NOT NULL DEFAULT '',reviewed_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE,FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS studio_holidays (id INTEGER PRIMARY KEY AUTOINCREMENT,event_name TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL DEFAULT '',image_url TEXT NOT NULL DEFAULT '',image_file_id TEXT NOT NULL DEFAULT '',notice_date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),created_by TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS studio_holiday_deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT,holiday_id INTEGER NOT NULL,account_id INTEGER NOT NULL,channel TEXT NOT NULL DEFAULT 'email' CHECK(channel IN ('email','portal')),destination TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','cancelled')),error_text TEXT NOT NULL DEFAULT '',sent_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(holiday_id,account_id,channel),FOREIGN KEY(holiday_id) REFERENCES studio_holidays(id) ON DELETE CASCADE,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS studio_holiday_audience_deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT,holiday_id INTEGER NOT NULL,recipient_key TEXT NOT NULL,recipient_name TEXT NOT NULL DEFAULT '',destination TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'lead',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','cancelled')),error_text TEXT NOT NULL DEFAULT '',sent_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(holiday_id,recipient_key),FOREIGN KEY(holiday_id) REFERENCES studio_holidays(id) ON DELETE CASCADE)`,
    `CREATE INDEX IF NOT EXISTS idx_coach_leave_status_dates ON coach_leave_requests(status,from_date,to_date,coach_id)`,
    `CREATE INDEX IF NOT EXISTS idx_coach_leave_account ON coach_leave_requests(account_id,created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_studio_holidays_dates ON studio_holidays(status,start_date,end_date,notice_date)`,
    `CREATE INDEX IF NOT EXISTS idx_holiday_delivery_due ON studio_holiday_deliveries(status,channel,holiday_id,account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_holiday_audience_due ON studio_holiday_audience_deliveries(status,holiday_id,recipient_key)`
  ];
  for(const sql of statements)await env.DB.prepare(sql).run();
  ready.add(env.DB);
}

export async function scheduleBlocksForRange(env,{from,to,coachId=0}={}){
  await ensureStudioScheduleSchema(env);
  const start=validDate(from)||indiaDate(),finish=validDate(to)||start;
  const [holidayResult,leaveResult]=await Promise.all([
    env.DB.prepare(`SELECT id,event_name,start_date,end_date,subject,message,image_url FROM studio_holidays WHERE status='active' AND start_date<=? AND end_date>=? ORDER BY start_date,id`).bind(finish,start).all(),
    Number(coachId)>0
      ?env.DB.prepare(`SELECT l.id,l.coach_id,l.from_date,l.to_date,l.purpose,l.reason,c.name coach_name FROM coach_leave_requests l LEFT JOIN dance_coaches c ON c.id=l.coach_id WHERE l.status='approved' AND l.coach_id=? AND l.from_date<=? AND l.to_date>=? ORDER BY l.from_date,l.id`).bind(Number(coachId),finish,start).all()
      :env.DB.prepare(`SELECT l.id,l.coach_id,l.from_date,l.to_date,l.purpose,l.reason,c.name coach_name FROM coach_leave_requests l LEFT JOIN dance_coaches c ON c.id=l.coach_id WHERE l.status='approved' AND l.from_date<=? AND l.to_date>=? ORDER BY l.from_date,l.id`).bind(finish,start).all()
  ]);
  return {holidays:holidayResult.results||[],leaves:leaveResult.results||[]};
}

export function blockForDate(blocks,date,coachId=0){
  const holiday=(blocks?.holidays||[]).find(row=>row.start_date<=date&&row.end_date>=date);
  if(holiday)return {status:'holiday',reason:holiday.event_name||holiday.subject||'Studio holiday',holidayId:Number(holiday.id),eventName:holiday.event_name||'',subject:holiday.subject||'',message:holiday.message||'',imageUrl:googleDriveInlineImageUrl(holiday.image_url||'')};
  const leave=(blocks?.leaves||[]).find(row=>(!Number(coachId)||Number(row.coach_id)===Number(coachId))&&row.from_date<=date&&row.to_date>=date);
  if(leave)return {status:'leave',reason:leave.purpose||leave.reason||`${leave.coach_name||'Coach'} is on approved leave`,leaveId:Number(leave.id),coachId:Number(leave.coach_id),coachName:leave.coach_name||''};
  return null;
}

async function sourceRows(env,coachIds){
  if(Array.isArray(coachIds)&&!coachIds.length)return [];
  const ids=Array.isArray(coachIds)?coachIds.map(Number).filter(id=>Number.isSafeInteger(id)&&id>0):null;
  const coachFilter=alias=>ids?` AND ${alias}.coach_id IN (${ids.join(',')||'0'})`:'';
  const [plans,manual]=await Promise.all([
    env.DB.prepare(`SELECT 'product' source,m.product_id source_id,m.product_id,0 assignment_id,m.class_name,m.class_type,m.event_type,m.class_time,m.duration_minutes,m.class_days_json,m.dance_styles_json,m.schedule_start_date,m.access_start_date,m.access_end_date,m.coach_id,c.name coach_name,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.product_id=m.product_id AND w.class_assignment_id=0 AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.product_id=m.product_id AND w.class_assignment_id=0 AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students,(SELECT COUNT(*) FROM webinar_members w WHERE w.product_id=m.product_id AND w.class_assignment_id=0 AND w.status='past') past_students FROM product_class_mappings m LEFT JOIN dance_coaches c ON c.id=m.coach_id WHERE m.enabled=1 AND m.status='active'${coachFilter('m')}`).all(),
    env.DB.prepare(`SELECT 'assignment' source,a.id source_id,0 product_id,a.id assignment_id,a.class_name,a.class_type,a.event_type,a.class_time,a.duration_minutes,a.class_days_json,a.dance_styles_json,a.schedule_start_date,a.access_start_date,a.access_end_date,a.coach_id,c.name coach_name,(SELECT MIN(NULLIF(w.start_date,'')) FROM webinar_members w WHERE w.class_assignment_id=a.id AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) member_start_date,(SELECT COUNT(*) FROM webinar_members w WHERE w.class_assignment_id=a.id AND w.status='current' AND lower(COALESCE(w.payment_status,'')) NOT IN ('failed','cancelled','canceled','expired','refunded','unpaid','past_due')) current_students,(SELECT COUNT(*) FROM webinar_members w WHERE w.class_assignment_id=a.id AND w.status='past') past_students FROM order_class_assignments a LEFT JOIN dance_coaches c ON c.id=a.coach_id WHERE a.enabled=1 AND a.status='active'${coachFilter('a')}`).all()
  ]);
  return [...(plans.results||[]),...(manual.results||[])].map(row=>({...row,sourceId:Number(row.source_id),coachId:Number(row.coach_id||0),durationMinutes:Number(row.duration_minutes||60),classDays:list(row.class_days_json),danceStyles:list(row.dance_styles_json),effectiveStart:effectiveSourceStart(row),currentStudents:Number(row.current_students||0),pastStudents:Number(row.past_students||0)}));
}

function coachView(row,assignments,studentCounts,reviewCounts,attendanceCounts){
  const coachAssignments=assignments.filter(item=>item.coachId===Number(row.id)),days=unique(coachAssignments.flatMap(item=>item.classDays)),styles=unique([...list(row.dance_styles_json),...coachAssignments.flatMap(item=>item.danceStyles)]),student=studentCounts.get(Number(row.id))||{current:0,past:0},review=reviewCounts.get(Number(row.id))||{count:0,average:0};
  return {id:Number(row.id),name:row.name||row.display_name||'Coach',photoUrl:row.photo_url||row.profile_photo_url||'',designation:row.designation||'Dance Coach',status:row.status||row.account_status||'draft',accountStatus:row.account_status||'',danceStyles:styles,days,sessionCount:coachAssignments.length,currentStudents:Number(student.current||0),pastStudents:Number(student.past||0),ratingCount:Number(review.count||0),averageRating:Math.round(Number(review.average||0)*10)/10,sessionsTaken:Number(attendanceCounts.get(Number(row.id))||0)};
}

export async function listStudioScheduleAdmin(env,options){
  await ensureStudioScheduleSchema(env);
  const size=options?Math.max(10,Math.min(100,Math.floor(Number(options.pageSize)||50))):0,offset=size*Math.max(0,Math.floor(Number(options?.page)||1)-1),pageSql=size?` LIMIT ${size+1} OFFSET ${offset}`:'',historySql=size?`LIMIT ${size+1} OFFSET ${offset}`:'LIMIT 500';
  const coachRead=env.DB.prepare(`SELECT c.*,a.status account_status,a.display_name,a.profile_photo_url FROM dance_coaches c LEFT JOIN portal_accounts a ON a.id=c.portal_account_id WHERE c.status<>'archived' ORDER BY c.sort_order,c.name,c.id${pageSql}`).all();
  const today=indiaDate(),[coachesResult,assignments,studentsResult,reviewsResult,attendanceResult,leavesResult,holidaysResult]=await Promise.all([
    coachRead,
    size?coachRead.then(result=>sourceRows(env,(result.results||[]).slice(0,size).map(row=>row.id))):sourceRows(env),
    env.DB.prepare(`SELECT coach_id,status,COUNT(*) total FROM webinar_members WHERE coach_id>0 GROUP BY coach_id,status`).all(),
    env.DB.prepare(`SELECT coach_id,COUNT(*) total,AVG(NULLIF(rating,0)) average FROM portal_session_reviews WHERE coach_id>0 GROUP BY coach_id`).all(),
    env.DB.prepare(`SELECT coach_id,COUNT(DISTINCT session_key) total FROM portal_session_attendance WHERE participant_role='coach' AND status IN ('present','late') GROUP BY coach_id`).all(),
    env.DB.prepare(`SELECT l.*,c.name coach_name,a.email coach_email FROM coach_leave_requests l LEFT JOIN dance_coaches c ON c.id=l.coach_id LEFT JOIN portal_accounts a ON a.id=l.account_id ORDER BY CASE l.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'denied' THEN 2 ELSE 3 END,l.from_date DESC,l.id DESC ${historySql}`).all(),
    env.DB.prepare(`SELECT * FROM studio_holidays ORDER BY start_date DESC,id DESC ${historySql}`).all()
  ]);
  const studentCounts=new Map();for(const row of studentsResult.results||[]){const item=studentCounts.get(Number(row.coach_id))||{current:0,past:0};item[row.status==='past'?'past':'current']+=Number(row.total||0);studentCounts.set(Number(row.coach_id),item);}
  const reviewCounts=new Map((reviewsResult.results||[]).map(row=>[Number(row.coach_id),{count:Number(row.total||0),average:Number(row.average||0)}])),attendanceCounts=new Map((attendanceResult.results||[]).map(row=>[Number(row.coach_id),Number(row.total||0)]));
  const coaches=(size?(coachesResult.results||[]).slice(0,size):(coachesResult.results||[])).map(row=>coachView({...row,photo_url:googleDriveInlineImageUrl(row.photo_url||''),profile_photo_url:googleDriveInlineImageUrl(row.profile_photo_url||'')},assignments,studentCounts,reviewCounts,attendanceCounts));
  const leaves=size?(leavesResult.results||[]).slice(0,size):(leavesResult.results||[]),holidays=(size?(holidaysResult.results||[]).slice(0,size):(holidaysResult.results||[])).map(row=>({...row,image_url:googleDriveInlineImageUrl(row.image_url||'')}));
  return {...(size?{_mobileHasMore:[coachesResult,leavesResult,holidaysResult].some(result=>(result.results||[]).length>size)}:{}),today,coaches,assignments,leaves:{pending:leaves.filter(row=>row.status==='pending'),today:leaves.filter(row=>row.status==='approved'&&row.from_date<=today&&row.to_date>=today),upcoming:leaves.filter(row=>row.status==='approved'&&row.from_date>today),unplanned:leaves.filter(row=>row.leave_type==='unplanned'&&row.status!=='cancelled'),past:leaves.filter(row=>row.to_date<today||['denied','cancelled'].includes(row.status))},holidays:{upcoming:holidays.filter(row=>row.status==='active'&&row.end_date>=today).sort((a,b)=>a.start_date.localeCompare(b.start_date)),past:holidays.filter(row=>row.status!=='active'||row.end_date<today)}};
}

function studentView(row){return {memberId:Number(row.member_id||row.id),accountId:Number(row.account_id||0),name:row.display_name||row.customer_name||row.customer_email||'Student',email:row.customer_email||row.email||'',phone:row.customer_phone||row.phone||'',profilePhotoUrl:googleDriveInlineImageUrl(row.profile_photo_url||''),startDate:row.start_date||'',status:row.member_status||row.status||'',planName:row.plan_name||'',paymentStatus:row.payment_status||'',lastAttendanceAt:row.last_attendance_at||''};}

export async function coachScheduleDetails(env,coachId){
  await ensureStudioScheduleSchema(env);const id=Number(coachId||0);if(!id)throw new Error('Choose a coach.');
  const [coach,assignments,currentResult,pastResult,reviewsResult,attendanceResult,leaveResult]=await Promise.all([
    env.DB.prepare(`SELECT c.*,a.id account_id,a.email account_email,a.phone account_phone,a.status account_status,a.display_name,a.profile_photo_url,p.bio profile_bio,p.experience profile_experience,p.specialties_json,p.availability_days_json,p.availability_slots_json,p.class_types_json FROM dance_coaches c LEFT JOIN portal_accounts a ON a.id=c.portal_account_id LEFT JOIN portal_coach_profiles p ON p.account_id=a.id WHERE c.id=? LIMIT 1`).bind(id).first(),
    sourceRows(env).then(rows=>rows.filter(row=>row.coachId===id)),
    env.DB.prepare(`SELECT m.id member_id,m.customer_name,m.customer_email,m.customer_phone,m.start_date,m.plan_name,m.payment_status,m.last_attendance_at,m.status member_status,a.id account_id,a.display_name,a.phone,a.profile_photo_url FROM webinar_members m LEFT JOIN portal_accounts a ON a.role='student' AND lower(a.email)=lower(m.customer_email) WHERE m.coach_id=? AND m.status='current' ORDER BY m.customer_name,m.id`).bind(id).all(),
    env.DB.prepare(`SELECT m.id member_id,m.customer_name,m.customer_email,m.customer_phone,m.start_date,m.plan_name,m.payment_status,m.last_attendance_at,m.status member_status,a.id account_id,a.display_name,a.phone,a.profile_photo_url FROM webinar_members m LEFT JOIN portal_accounts a ON a.role='student' AND lower(a.email)=lower(m.customer_email) WHERE m.coach_id=? AND m.status='past' ORDER BY datetime(m.moved_to_past_at) DESC,m.id DESC`).bind(id).all(),
    env.DB.prepare(`SELECT r.session_key,r.session_date,r.rating,r.comment,r.created_at,COALESCE(MAX(a.class_name),'Dance Class') class_name,COALESCE(MAX(pa.display_name),MAX(pa.real_name),MAX(m.customer_name),MAX(pa.email),'Student') student_name,MAX(pa.id) student_account_id,MAX(m.id) member_id FROM portal_session_reviews r LEFT JOIN portal_session_attendance a ON a.session_key=r.session_key AND a.participant_role='student' AND a.account_id=r.student_account_id LEFT JOIN portal_accounts pa ON pa.id=r.student_account_id LEFT JOIN webinar_members m ON m.id=r.member_id WHERE r.coach_id=? GROUP BY r.id ORDER BY r.session_date DESC,r.id DESC LIMIT 200`).bind(id).all(),
    env.DB.prepare(`SELECT COUNT(DISTINCT session_key) total,MIN(session_date) first_session,MAX(session_date) latest_session FROM portal_session_attendance WHERE participant_role='coach' AND coach_id=? AND status IN ('present','late')`).bind(id).first(),
    env.DB.prepare(`SELECT * FROM coach_leave_requests WHERE coach_id=? ORDER BY from_date DESC,id DESC LIMIT 100`).bind(id).all()
  ]);
  if(!coach)throw new Error('Coach was not found.');
  const reviews=reviewsResult.results||[],rated=reviews.filter(row=>Number(row.rating)>0),specialties=unique([...list(coach.dance_styles_json),...list(coach.specialties_json)]),availableDays=unique([...list(coach.availability_json),...list(coach.availability_days_json)]),availabilitySlots=list(coach.availability_slots_json||coach.availability_slots_json),classTypes=list(coach.class_types_json);
  return {coach:{id,name:coach.name||coach.display_name||'Coach',photoUrl:googleDriveInlineImageUrl(coach.photo_url||coach.profile_photo_url||''),designation:coach.designation||'Dance Coach',badge:coach.badge||'Coach',bio:coach.profile_bio||coach.bio||'',experience:coach.profile_experience||coach.experience||'',email:coach.account_email||coach.contact_email||'',phone:coach.account_phone||coach.contact_phone||'',status:coach.status||'',accountStatus:coach.account_status||'',specialties,availableDays,availabilitySlots,classTypes,instagramUrl:coach.instagram_url||'',facebookUrl:coach.facebook_url||'',createdAt:coach.created_at||''},schedule:assignments.map(row=>({source:row.source,sourceId:row.sourceId,className:row.class_name||'Dance Class',classType:row.class_type||row.event_type||'',classTime:row.class_time||'',durationMinutes:row.durationMinutes,classDays:row.classDays,danceStyles:row.danceStyles,effectiveStart:row.effectiveStart,accessEnd:row.access_end_date||'',currentStudents:row.currentStudents,pastStudents:row.pastStudents})),currentStudents:(currentResult.results||[]).map(studentView),pastStudents:(pastResult.results||[]).map(studentView),reviews,leaves:leaveResult.results||[],summary:{sessionsTaken:Number(attendanceResult?.total||0),firstSession:attendanceResult?.first_session||'',latestSession:attendanceResult?.latest_session||'',currentStudents:(currentResult.results||[]).length,pastStudents:(pastResult.results||[]).length,ratingCount:rated.length,averageRating:rated.length?Math.round(rated.reduce((sum,row)=>sum+Number(row.rating),0)/rated.length*10)/10:0,studioSince:coach.created_at||''}};
}

async function cancelBlockedReminders(env,{from,to,coachId=0}={}){
  const result=await env.DB.prepare(`SELECT r.id,r.send_at,r.minutes_before,m.coach_id FROM webinar_member_reminders r JOIN webinar_members m ON m.id=r.member_id WHERE r.status='pending' AND (?=0 OR m.coach_id=?) ORDER BY r.id LIMIT 5000`).bind(Number(coachId||0),Number(coachId||0)).all().catch(()=>({results:[]})),ids=[];
  for(const row of result.results||[]){const occurrence=new Date(new Date(row.send_at).getTime()+Number(row.minutes_before||0)*60000);if(Number.isNaN(occurrence.getTime()))continue;const date=indiaDate(occurrence);if(date>=from&&date<=to)ids.push(Number(row.id));}
  if(ids.length)await env.DB.prepare(`UPDATE webinar_member_reminders SET status='cancelled',error_text='Session blocked by an approved leave or studio holiday.' WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).run();
  return ids.length;
}

async function notifyCoachStudents(env,coachId,title,message,effectiveAt){
  const result=await env.DB.prepare(`SELECT DISTINCT a.id FROM portal_accounts a JOIN webinar_members m ON lower(m.customer_email)=lower(a.email) WHERE a.role='student' AND a.status='active' AND m.status='current' AND m.coach_id=? LIMIT 1000`).bind(Number(coachId)).all().catch(()=>({results:[]}));
  for(const row of result.results||[])await addPortalNotification(env,Number(row.id),{type:'coach_leave',title,message,effectiveAt,sessionEventId:0}).catch(()=>{});
  return (result.results||[]).length;
}

export async function applyCoachLeave(env,account,input={}){
  await ensureStudioScheduleSchema(env);if(account.role!=='coach'||account.status!=='active')throw new Error('An approved coach account is required to apply for leave.');
  const profile=await env.DB.prepare('SELECT dance_coach_id FROM portal_coach_profiles WHERE account_id=?').bind(Number(account.id)).first(),coachId=Number(profile?.dance_coach_id||0);if(!coachId)throw new Error('This account is not linked to a coach profile.');
  const leaveType=input.leaveType==='unplanned'?'unplanned':'planned',purpose=clean(input.purpose,180),reason=clean(input.reason,2000),fromDate=validDate(input.fromDate),toDate=validDate(input.toDate)||fromDate,today=indiaDate();
  if(!purpose)throw new Error('Enter the purpose of leave.');if(!fromDate||!toDate||toDate<fromDate)throw new Error('Choose a valid leave date range.');if(toDate<today)throw new Error('Leave cannot be requested entirely in the past.');if(!reason)throw new Error('Explain the reason for this leave request.');
  const overlap=await env.DB.prepare(`SELECT id FROM coach_leave_requests WHERE coach_id=? AND status IN ('pending','approved') AND from_date<=? AND to_date>=? LIMIT 1`).bind(coachId,toDate,fromDate).first();if(overlap)throw new Error('A pending or approved leave already covers part of this date range.');
  const row=await env.DB.prepare(`INSERT INTO coach_leave_requests(account_id,coach_id,leave_type,purpose,from_date,to_date,reason) VALUES(?,?,?,?,?,?,?) RETURNING id,created_at`).bind(Number(account.id),coachId,leaveType,purpose,fromDate,toDate,reason).first();
  await notifyAdmin(env,`${account.display_name||account.real_name||account.email} applied for ${leaveType} leave from ${fromDate} to ${toDate}. Purpose: ${purpose}. Reason: ${reason}`,{subject:`Coach leave approval required: ${account.display_name||account.email}`,eventType:'coach_leave_request',eventKey:`coach-leave-${Number(row?.id||0)}`}).catch(()=>{});
  return {ok:true,id:Number(row?.id||0),message:'Your leave request was sent to the administrator for approval.'};
}

export async function cancelCoachLeave(env,account,leaveId){
  await ensureStudioScheduleSchema(env);const result=await env.DB.prepare(`UPDATE coach_leave_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND account_id=? AND status='pending'`).bind(Number(leaveId),Number(account.id)).run();if(Number(result?.meta?.changes||0)<1)throw new Error('Only your pending leave request can be cancelled.');return {ok:true,message:'Leave request cancelled.'};
}

export async function reviewCoachLeave(env,{leaveId,status,adminEmail='',adminReason='',suggestedDate=''}={}){
  await ensureStudioScheduleSchema(env);const target=status==='approved'?'approved':status==='denied'?'denied':'';if(!target)throw new Error('Choose Approve or Deny.');const row=await env.DB.prepare('SELECT l.*,c.name coach_name FROM coach_leave_requests l LEFT JOIN dance_coaches c ON c.id=l.coach_id WHERE l.id=? LIMIT 1').bind(Number(leaveId)).first();if(!row)throw new Error('Leave request was not found.');if(row.status!=='pending')throw new Error('This leave request has already been reviewed.');const reason=clean(adminReason,2000),suggestion=validDate(suggestedDate);if(target==='denied'&&!reason)throw new Error('Explain why the leave request is being denied.');
  await env.DB.prepare(`UPDATE coach_leave_requests SET status=?,admin_reason=?,suggested_date=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(target,reason,suggestion,clean(adminEmail,240),Number(row.id)).run();
  if(target==='approved'){await cancelBlockedReminders(env,{from:row.from_date,to:row.to_date,coachId:Number(row.coach_id)});await notifyCoachStudents(env,Number(row.coach_id),`${row.coach_name||'Your coach'} is on approved leave`,`${row.coach_name||'Your coach'} will be away from ${row.from_date} to ${row.to_date}. Affected sessions are marked as leave in your schedule.`,row.from_date);}
  const message=target==='approved'?`Your leave from ${row.from_date} to ${row.to_date} was approved.`:`Your leave request was denied. ${reason}${suggestion?` Suggested date: ${suggestion}.`:''}`;
  await addPortalNotification(env,Number(row.account_id),{type:'coach_leave',title:`Leave request ${target}`,message,effectiveAt:new Date().toISOString(),sessionEventId:0}).catch(()=>{});
  return {ok:true,message:`Leave request ${target}.`};
}

export async function requestCoachLeaveInformation(env,{leaveId,adminEmail='',message=''}={}){
  await ensureStudioScheduleSchema(env);const question=clean(message,2000);if(!question)throw new Error('Enter the information you need from the coach.');const row=await env.DB.prepare('SELECT l.*,c.name coach_name FROM coach_leave_requests l LEFT JOIN dance_coaches c ON c.id=l.coach_id WHERE l.id=? LIMIT 1').bind(Number(leaveId)).first();if(!row)throw new Error('Leave request was not found.');if(row.status!=='pending')throw new Error('More information can only be requested for a pending leave.');
  await env.DB.prepare(`UPDATE coach_leave_requests SET admin_reason=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(question,clean(adminEmail,240),Number(row.id)).run();
  await addPortalNotification(env,Number(row.account_id),{type:'coach_leave',title:'More information required for your leave',message:`The administrator needs more information about your leave from ${row.from_date} to ${row.to_date}. ${question}`,effectiveAt:new Date().toISOString(),sessionEventId:0}).catch(()=>{});
  return {ok:true,message:'The coach was asked for more information. The leave remains pending.'};
}

function holidayNoticeDate(startDate,today=indiaDate()){return startDate<=today?today:datePlus(startDate,-1);}

async function seedHolidayDeliveries(env,holidayId){
  const [accounts,leads,members,orders,customers,subscribers]=await Promise.all([
    env.DB.prepare(`SELECT id,email FROM portal_accounts WHERE role IN ('student','coach') ORDER BY id LIMIT 10000`).all(),
    env.DB.prepare(`SELECT name,email,'lead' source FROM contact_leads WHERE trim(COALESCE(email,''))<>'' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT customer_name name,customer_email email,'class_member' source FROM webinar_members WHERE trim(COALESCE(customer_email,''))<>'' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT customer_name name,customer_email email,'order_customer' source FROM orders WHERE trim(COALESCE(customer_email,''))<>'' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT name,email,'customer' source FROM customers WHERE trim(COALESCE(email,''))<>'' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]})),
    env.DB.prepare(`SELECT name,email,'subscriber' source FROM subscribers WHERE trim(COALESCE(email,''))<>'' ORDER BY id DESC LIMIT 10000`).all().catch(()=>({results:[]}))
  ]),statements=[],portalEmails=new Set();
  for(const account of accounts.results||[]){const address=emailKey(account.email);if(address)portalEmails.add(address);statements.push(env.DB.prepare(`INSERT INTO studio_holiday_deliveries(holiday_id,account_id,channel,destination,status) VALUES(?,?,'portal','','pending') ON CONFLICT(holiday_id,account_id,channel) DO UPDATE SET status=CASE WHEN studio_holiday_deliveries.status='sent' THEN 'sent' ELSE 'pending' END,error_text=''`).bind(Number(holidayId),Number(account.id)));if(address)statements.push(env.DB.prepare(`INSERT INTO studio_holiday_deliveries(holiday_id,account_id,channel,destination,status) VALUES(?,?,'email',?,'pending') ON CONFLICT(holiday_id,account_id,channel) DO UPDATE SET destination=excluded.destination,status=CASE WHEN studio_holiday_deliveries.status='sent' THEN 'sent' ELSE 'pending' END,error_text=''`).bind(Number(holidayId),Number(account.id),address));}
  const audience=new Map();for(const row of [...(leads.results||[]),...(members.results||[]),...(orders.results||[]),...(customers.results||[]),...(subscribers.results||[])]){const address=emailKey(row.email);if(!address||portalEmails.has(address)||audience.has(address))continue;audience.set(address,{name:clean(row.name,180),source:clean(row.source,40)||'lead'});}
  for(const [address,row] of audience)statements.push(env.DB.prepare(`INSERT INTO studio_holiday_audience_deliveries(holiday_id,recipient_key,recipient_name,destination,source,status) VALUES(?,?,?,?,?,'pending') ON CONFLICT(holiday_id,recipient_key) DO UPDATE SET recipient_name=excluded.recipient_name,destination=excluded.destination,source=excluded.source,status=CASE WHEN studio_holiday_audience_deliveries.status='sent' THEN 'sent' ELSE 'pending' END,error_text=''`).bind(Number(holidayId),address,row.name,address,row.source));
  for(let offset=0;offset<statements.length;offset+=80)await env.DB.batch(statements.slice(offset,offset+80));return statements.length;
}

async function seedDueHolidayDeliveries(env,today,holidayId=0){
  const result=Number(holidayId)>0
    ?await env.DB.prepare(`SELECT id FROM studio_holidays WHERE id=? AND status='active' AND notice_date<=? AND end_date>=? LIMIT 1`).bind(Number(holidayId),today,today).all()
    :await env.DB.prepare(`SELECT id FROM studio_holidays WHERE status='active' AND notice_date<=? AND end_date>=? ORDER BY notice_date,id LIMIT 100`).bind(today,today).all();
  for(const row of result.results||[])await seedHolidayDeliveries(env,Number(row.id));
}

export async function saveStudioHoliday(env,input={},adminEmail=''){
  await ensureStudioScheduleSchema(env);const id=Number(input.id||0),eventName=clean(input.eventName,180),startDate=validDate(input.startDate),endDate=validDate(input.endDate)||startDate,subject=clean(input.subject,240),message=cleanMultiline(input.message,5000),imageUrl=googleDriveInlineImageUrl(clean(input.imageUrl,2400)),imageFileId=clean(input.imageFileId,600),today=indiaDate();
  if(!eventName)throw new Error('Enter the event or festival name.');if(!startDate||!endDate||endDate<startDate)throw new Error('Choose a valid event date range.');if(endDate<today)throw new Error('A new holiday cannot end in the past.');if(!subject)throw new Error('Enter the dashboard and email subject.');if(!message)throw new Error('Enter the holiday message.');const noticeDate=holidayNoticeDate(startDate,today);
  let holidayId=id;if(id){const exists=await env.DB.prepare('SELECT id FROM studio_holidays WHERE id=?').bind(id).first();if(!exists)throw new Error('Holiday was not found.');await env.DB.prepare(`UPDATE studio_holidays SET event_name=?,start_date=?,end_date=?,subject=?,message=?,image_url=?,image_file_id=?,notice_date=?,status='active',created_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(eventName,startDate,endDate,subject,message,imageUrl,imageFileId,noticeDate,clean(adminEmail,240),id).run();}
  else{const inserted=await env.DB.prepare(`INSERT INTO studio_holidays(event_name,start_date,end_date,subject,message,image_url,image_file_id,notice_date,created_by) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id`).bind(eventName,startDate,endDate,subject,message,imageUrl,imageFileId,noticeDate,clean(adminEmail,240)).first();holidayId=Number(inserted?.id||0);}
  await cancelBlockedReminders(env,{from:startDate,to:endDate,coachId:0});await seedHolidayDeliveries(env,holidayId);if(noticeDate<=today)await processStudioHolidayNotifications(env,{holidayId,limit:5000}).catch(()=>{});
  return {ok:true,id:holidayId,noticeDate,message:noticeDate===today?'Holiday saved. Dashboard notices are active and emails are being sent now.':'Holiday saved. The dashboard notice and branded email are scheduled for one day before the event.'};
}

export async function cancelStudioHoliday(env,holidayId,adminEmail=''){
  await ensureStudioScheduleSchema(env);const id=Number(holidayId||0),row=await env.DB.prepare('SELECT * FROM studio_holidays WHERE id=?').bind(id).first();if(!row)throw new Error('Holiday was not found.');await env.DB.batch([env.DB.prepare(`UPDATE studio_holidays SET status='cancelled',created_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(clean(adminEmail,240),id),env.DB.prepare(`UPDATE studio_holiday_deliveries SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE holiday_id=? AND status='pending'`).bind(id),env.DB.prepare(`UPDATE studio_holiday_audience_deliveries SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE holiday_id=? AND status='pending'`).bind(id)]);return {ok:true,message:'Holiday cancelled.'};
}

export async function getHolidayNoticeForAccount(env,accountId,date=indiaDate()){
  await ensureStudioScheduleSchema(env);const row=await env.DB.prepare(`SELECT h.* FROM studio_holidays h WHERE h.status='active' AND h.notice_date=? AND EXISTS(SELECT 1 FROM portal_accounts a WHERE a.id=? AND a.role IN ('student','coach')) ORDER BY h.start_date,h.id LIMIT 1`).bind(validDate(date)||indiaDate(),Number(accountId)).first();return row?{id:Number(row.id),eventName:row.event_name,subject:row.subject,message:row.message,imageUrl:googleDriveInlineImageUrl(row.image_url||''),startDate:row.start_date,endDate:row.end_date,isToday:row.start_date<=date&&row.end_date>=date}:null;
}

export async function portalStudioSchedule(env,account){
  await ensureStudioScheduleSchema(env);const notice=await getHolidayNoticeForAccount(env,Number(account.id));if(account.role!=='coach')return {holidayNotice:notice,leaves:[]};const profile=await env.DB.prepare('SELECT dance_coach_id FROM portal_coach_profiles WHERE account_id=?').bind(Number(account.id)).first(),result=await env.DB.prepare(`SELECT * FROM coach_leave_requests WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 100`).bind(Number(account.id)).all();return {holidayNotice:notice,coachId:Number(profile?.dance_coach_id||0),leaves:result.results||[]};
}

export async function processStudioHolidayNotifications(env,{holidayId=0,limit=300}={}){
  await ensureStudioScheduleSchema(env);const today=indiaDate();await seedDueHolidayDeliveries(env,today,holidayId);const where=Number(holidayId)>0?'AND h.id=?':'',dueLimit=Math.max(1,Math.min(5000,Number(limit||300))),args=Number(holidayId)>0?[today,Number(holidayId),dueLimit]:[today,dueLimit],[accountResult,audienceResult]=await Promise.all([
    env.DB.prepare(`SELECT 'account' delivery_source,d.*,h.event_name,h.start_date,h.end_date,h.subject,h.message,h.image_url,h.notice_date,a.display_name,a.real_name,a.email FROM studio_holiday_deliveries d JOIN studio_holidays h ON h.id=d.holiday_id JOIN portal_accounts a ON a.id=d.account_id WHERE d.status IN ('pending','failed') AND h.status='active' AND h.notice_date<=? ${where} ORDER BY h.notice_date,d.id LIMIT ?`).bind(...args).all(),
    env.DB.prepare(`SELECT 'audience' delivery_source,d.id,d.holiday_id,0 account_id,'email' channel,d.destination,d.status,d.error_text,d.sent_at,d.created_at,d.updated_at,h.event_name,h.start_date,h.end_date,h.subject,h.message,h.image_url,h.notice_date,d.recipient_name display_name,'' real_name,d.destination email FROM studio_holiday_audience_deliveries d JOIN studio_holidays h ON h.id=d.holiday_id WHERE d.status IN ('pending','failed') AND h.status='active' AND h.notice_date<=? ${where} ORDER BY h.notice_date,d.id LIMIT ?`).bind(...args).all()
  ]),rows=[...(accountResult.results||[]),...(audienceResult.results||[])].sort((a,b)=>String(a.notice_date||'').localeCompare(String(b.notice_date||''))||Number(a.id)-Number(b.id)).slice(0,dueLimit),site=await getSiteSettings(env),results=[];
  for(const row of rows){try{if(row.channel==='portal'){await addPortalNotification(env,Number(row.account_id),{type:'studio_holiday',title:row.subject,message:row.message,effectiveAt:new Date().toISOString(),sessionEventId:-Number(row.holiday_id)});}
      else{const range=row.start_date===row.end_date?row.start_date:`${row.start_date} to ${row.end_date}`,inlineImage=googleDriveInlineImageUrl(row.image_url||''),body=brandedEmailHtml({site,env,title:row.subject,eyebrow:'Studio holiday',customerName:row.display_name||row.real_name||'',introHtml:`${multilineHtml(row.message)}${inlineImage?`<p style="text-align:center"><img src="${escapeHtml(inlineImage)}" alt="${escapeHtml(row.event_name)}" style="display:block;max-width:100%;height:auto;margin:18px auto;border-radius:6px"></p>`:''}`,summaryTitle:'Holiday details',summaryRows:[['Event',row.event_name],['Date',range]],bodyHtml:'<p>Classes scheduled during this holiday are marked accordingly in attendance and will not open for joining.</p>'}),sent=await sendConfiguredEmail(env,{to:row.destination||row.email,subject:row.subject,html:body,text:`${row.subject}\n\n${row.message}\n\nEvent: ${row.event_name}\nDate: ${range}`,fromName:site.siteName},{purpose:'email'});if(sent?.ok===false)throw new Error(sent.error||'Holiday email could not be sent.');}
      const table=row.delivery_source==='audience'?'studio_holiday_audience_deliveries':'studio_holiday_deliveries';await env.DB.prepare(`UPDATE ${table} SET status='sent',sent_at=CURRENT_TIMESTAMP,error_text='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(Number(row.id)).run();results.push({id:Number(row.id),status:'sent',channel:row.channel,source:row.delivery_source});
    }catch(error){const table=row.delivery_source==='audience'?'studio_holiday_audience_deliveries':'studio_holiday_deliveries';await env.DB.prepare(`UPDATE ${table} SET status='failed',error_text=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(clean(error.message,800),Number(row.id)).run();results.push({id:Number(row.id),status:'failed',channel:row.channel,source:row.delivery_source,error:error.message});}}
  return {ok:true,processed:results.length,results};
}
