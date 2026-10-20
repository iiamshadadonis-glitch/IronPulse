import { cookieHeader, getSetting, parseCookies, preferredPublicOrigin, sha256Hex, withD1Retry } from './utils.js';
import { ensureAuthSchema } from './auth-schema.js';
import { ensureDanceStudioSchema } from './fitness-platform.js';
import { googleDriveInlineImageUrl } from './google-drive-upload.js';

export const PORTAL_COOKIE='db_portal_session';
export const PORTAL_SCHEMA_VERSION='v1.16.0';
export const PORTAL_SESSION_SECONDS=300*24*60*60;
export const PORTAL_PBKDF2_ITERATIONS=100000;
export const COACH_CLASS_TYPES=['online_class','offline_class','demo','webinar','trial'];
export const WEEK_DAYS=['sun','mon','tue','wed','thu','fri','sat'];

const ready=new WeakSet();
const pending=new WeakMap();
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(value,max=500)=>String(value??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);
const email=value=>clean(value,240).toLowerCase();
const truthy=value=>value===true||value===1||['1','true','yes','on'].includes(String(value??'').toLowerCase());
export const parseJson=(value,fallback)=>{try{const parsed=typeof value==='string'?JSON.parse(value):value;return parsed??fallback;}catch{return fallback;}};
export const uniqueList=(value,allowed=[],limit=30)=>{
  const raw=Array.isArray(value)?value:parseJson(value,[]),allow=new Set(allowed);
  return [...new Set(raw.map(item=>clean(item,120)).filter(item=>item&&(!allow.size||allow.has(item))))].slice(0,limit);
};

function bytesToBase64Url(bytes){
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64UrlToBytes(value){
  const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(String(value||'').length/4)*4,'=');
  const binary=atob(normalized),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;
}
function randomToken(size=32){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return bytesToBase64Url(bytes);}
function safePath(value,fallback='/login'){
  const path=clean(value,200);return /^\/(?:admin\/?|member-dashboard|coach-dashboard|login)(?:[?#].*)?$/.test(path)?path:fallback;
}
function usernameSeed(value){return clean(value,80).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'member';}

export async function ensurePortalSchema(env){
  if(!env?.DB)throw new Error('The account database binding (DB) is not available.');
  const db=env.DB;if(ready.has(db))return;if(pending.has(db))return pending.get(db);
  const task=(async()=>{
    await ensureAuthSchema(env);
    try{
      const marker=await withD1Retry(()=>db.prepare("SELECT value FROM settings WHERE key='portal_schema_ready'").first(),1);
      if(String(marker?.value||'')===PORTAL_SCHEMA_VERSION){ready.add(db);return;}
    }catch(_){ }
    await ensureDanceStudioSchema(env).catch(()=>{});
    const tables=[
      `CREATE TABLE IF NOT EXISTS portal_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT,role TEXT NOT NULL CHECK(role IN ('student','coach')),email TEXT NOT NULL COLLATE NOCASE UNIQUE,username TEXT COLLATE NOCASE UNIQUE,display_name TEXT NOT NULL DEFAULT '',real_name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',password_hash TEXT NOT NULL DEFAULT '',password_salt TEXT NOT NULL DEFAULT '',password_iterations INTEGER NOT NULL DEFAULT 100000,requires_password_setup INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','past','rejected')),approval_source TEXT NOT NULL DEFAULT 'admin_review',profile_photo_url TEXT NOT NULL DEFAULT '',profile_photo_object_key TEXT NOT NULL DEFAULT '',theme_primary TEXT NOT NULL DEFAULT '',theme_accent TEXT NOT NULL DEFAULT '',google_sub TEXT NOT NULL DEFAULT '',google_email TEXT NOT NULL DEFAULT '',google_picture TEXT NOT NULL DEFAULT '',google_connected_at TEXT NOT NULL DEFAULT '',meet_notice_seen INTEGER NOT NULL DEFAULT 0,last_login_at TEXT NOT NULL DEFAULT '',approved_at TEXT NOT NULL DEFAULT '',approved_by TEXT NOT NULL DEFAULT '',removed_at TEXT NOT NULL DEFAULT '',removed_reason TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS portal_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS portal_coach_profiles (account_id INTEGER PRIMARY KEY,dance_coach_id INTEGER,designation TEXT NOT NULL DEFAULT 'Dance Coach',badge TEXT NOT NULL DEFAULT 'Coach',bio TEXT NOT NULL DEFAULT '',experience TEXT NOT NULL DEFAULT '',specialties_json TEXT NOT NULL DEFAULT '[]',availability_days_json TEXT NOT NULL DEFAULT '[]',availability_slots_json TEXT NOT NULL DEFAULT '[]',class_types_json TEXT NOT NULL DEFAULT '[]',instagram_url TEXT NOT NULL DEFAULT '',facebook_url TEXT NOT NULL DEFAULT '',application_status TEXT NOT NULL DEFAULT 'pending',review_notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE,FOREIGN KEY(dance_coach_id) REFERENCES dance_coaches(id) ON DELETE SET NULL)`,
      `CREATE TABLE IF NOT EXISTS portal_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL,notification_type TEXT NOT NULL DEFAULT 'information',title TEXT NOT NULL,message TEXT NOT NULL DEFAULT '',effective_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,session_event_id INTEGER NOT NULL DEFAULT 0,read_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS portal_oauth_states (id INTEGER PRIMARY KEY AUTOINCREMENT,state_hash TEXT NOT NULL UNIQUE,intent TEXT NOT NULL,role TEXT NOT NULL DEFAULT '',account_id INTEGER NOT NULL DEFAULT 0,admin_email TEXT NOT NULL DEFAULT '',payload_json TEXT NOT NULL DEFAULT '{}',redirect_path TEXT NOT NULL DEFAULT '/login',expires_at TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS portal_account_events (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL,event_type TEXT NOT NULL,event_detail TEXT NOT NULL DEFAULT '',actor_email TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS portal_coach_schedule_requests (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL,dance_coach_id INTEGER NOT NULL DEFAULT 0,source_type TEXT NOT NULL DEFAULT 'product' CHECK(source_type IN ('product','assignment')),source_id INTEGER NOT NULL DEFAULT 0,request_type TEXT NOT NULL DEFAULT 'add' CHECK(request_type IN ('add','change','remove')),session_date TEXT NOT NULL,start_time TEXT NOT NULL DEFAULT '',end_time TEXT NOT NULL DEFAULT '',class_type TEXT NOT NULL DEFAULT 'online_class',class_name TEXT NOT NULL DEFAULT '',reason TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','cancelled')),reviewed_by TEXT NOT NULL DEFAULT '',reviewed_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS portal_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT,ticket_number TEXT NOT NULL UNIQUE,account_id INTEGER NOT NULL,account_role TEXT NOT NULL CHECK(account_role IN ('student','coach')),subject TEXT NOT NULL,category TEXT NOT NULL DEFAULT 'general',message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),admin_reply TEXT NOT NULL DEFAULT '',assigned_to TEXT NOT NULL DEFAULT '',resolved_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS portal_session_attendance (id INTEGER PRIMARY KEY AUTOINCREMENT,session_key TEXT NOT NULL,session_date TEXT NOT NULL,source_type TEXT NOT NULL CHECK(source_type IN ('product','assignment')),source_id INTEGER NOT NULL,participant_role TEXT NOT NULL CHECK(participant_role IN ('student','coach')),participant_key TEXT NOT NULL,account_id INTEGER NOT NULL DEFAULT 0,member_id INTEGER NOT NULL DEFAULT 0,coach_id INTEGER NOT NULL DEFAULT 0,class_name TEXT NOT NULL DEFAULT '',coach_name TEXT NOT NULL DEFAULT '',class_type TEXT NOT NULL DEFAULT '',starts_at TEXT NOT NULL DEFAULT '',duration_minutes INTEGER NOT NULL DEFAULT 60,status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','excused')),joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,marked_by TEXT NOT NULL DEFAULT 'session_access',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(session_key,participant_role,participant_key))`,
      `CREATE TABLE IF NOT EXISTS portal_session_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT,session_key TEXT NOT NULL,session_date TEXT NOT NULL,student_account_id INTEGER NOT NULL,member_id INTEGER NOT NULL DEFAULT 0,coach_id INTEGER NOT NULL DEFAULT 0,rating INTEGER NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),comment TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(session_key,student_account_id),FOREIGN KEY(student_account_id) REFERENCES portal_accounts(id) ON DELETE CASCADE)`
    ];
    for(const sql of tables)await withD1Retry(()=>db.prepare(sql).run(),1);
    const coachColumns={portal_account_id:'INTEGER',contact_email:"TEXT NOT NULL DEFAULT ''",contact_phone:"TEXT NOT NULL DEFAULT ''",instagram_url:"TEXT NOT NULL DEFAULT ''",facebook_url:"TEXT NOT NULL DEFAULT ''",experience:"TEXT NOT NULL DEFAULT ''",availability_slots_json:"TEXT NOT NULL DEFAULT '[]'"};
    for(const [name,spec] of Object.entries(coachColumns))await db.prepare(`ALTER TABLE dance_coaches ADD COLUMN ${name} ${spec}`).run().catch(()=>{});
    await db.prepare('ALTER TABLE portal_accounts ADD COLUMN requires_password_setup INTEGER NOT NULL DEFAULT 0').run().catch(()=>{});
    const indexes=[
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_accounts_google_sub ON portal_accounts(google_sub) WHERE trim(google_sub)<>''`,
      `CREATE INDEX IF NOT EXISTS idx_portal_accounts_role_status ON portal_accounts(role,status,created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_sessions_token_expiry ON portal_sessions(token_hash,expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_notifications_account ON portal_notifications(account_id,read_at,effective_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_oauth_state_expiry ON portal_oauth_states(state_hash,consumed,expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_coach_lifecycle ON portal_coach_profiles(application_status,dance_coach_id,account_id)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_coach_schedule_requests ON portal_coach_schedule_requests(status,session_date,account_id)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_tickets_account ON portal_tickets(account_id,updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_tickets_status ON portal_tickets(status,priority,updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_attendance_date ON portal_session_attendance(session_date,participant_role,coach_id,source_type,source_id)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_attendance_account ON portal_session_attendance(account_id,session_date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_reviews_coach ON portal_session_reviews(coach_id,session_date DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_portal_reviews_session ON portal_session_reviews(session_key,student_account_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_dance_coaches_portal_account ON dance_coaches(portal_account_id) WHERE portal_account_id IS NOT NULL`
    ];
    for(const sql of indexes)await db.prepare(sql).run().catch(()=>{});
    await db.prepare(`INSERT INTO settings(key,value,updated_at) VALUES('portal_schema_ready',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(PORTAL_SCHEMA_VERSION).run();
    ready.add(db);
  })().finally(()=>pending.delete(db));
  pending.set(db,task);return task;
}

export async function hashPortalPassword(password,salt=randomToken(16),iterations=PORTAL_PBKDF2_ITERATIONS){
  const value=String(password||'');if(value.length<8)throw new Error('Password must contain at least 8 characters.');if(value.length>200)throw new Error('Password is too long.');
  iterations=Math.max(10000,Math.min(PORTAL_PBKDF2_ITERATIONS,Number(iterations||PORTAL_PBKDF2_ITERATIONS)));
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:base64UrlToBytes(salt),iterations},material,256);
  return {hash:bytesToBase64Url(new Uint8Array(bits)),salt,iterations};
}
export async function verifyPortalPassword(password,row){
  if(!row?.password_hash||!row?.password_salt)return false;
  const savedIterations=Number(row.password_iterations||PORTAL_PBKDF2_ITERATIONS);
  if(savedIterations>PORTAL_PBKDF2_ITERATIONS)throw new Error('This account needs a one-time password update. Please contact the gym administrator.');
  const computed=await hashPortalPassword(password,row.password_salt,savedIterations);
  if(computed.hash.length!==String(row.password_hash).length)return false;
  let difference=0;for(let i=0;i<computed.hash.length;i++)difference|=computed.hash.charCodeAt(i)^String(row.password_hash).charCodeAt(i);return difference===0;
}

async function availableUsername(env,requested,emailAddress){
  const base=usernameSeed(requested||emailAddress.split('@')[0]),exists=async candidate=>env.DB.prepare('SELECT id FROM portal_accounts WHERE lower(username)=lower(?) LIMIT 1').bind(candidate).first();
  if(!await exists(base))return base;for(let suffix=2;suffix<1000;suffix++){const candidate=`${base.slice(0,Math.max(1,60-String(suffix).length-1))}-${suffix}`;if(!await exists(candidate))return candidate;}return `member-${randomToken(8).toLowerCase()}`;
}

export function publicPortalAccount(row){
  if(!row)return null;return {id:Number(row.id),role:row.role,email:row.email,username:row.username||'',displayName:row.display_name||'',realName:row.real_name||'',phone:row.phone||'',status:row.status,approvalSource:row.approval_source||'',profilePhotoUrl:googleDriveInlineImageUrl(row.profile_photo_url||row.google_picture||''),themePrimary:row.theme_primary||'',themeAccent:row.theme_accent||'',googleConnected:!!row.google_sub,meetNoticeSeen:Number(row.meet_notice_seen||0)===1,requiresPasswordSetup:Number(row.requires_password_setup||0)===1,approvedAt:row.approved_at||'',removedAt:row.removed_at||'',removedReason:row.removed_reason||'',createdAt:row.created_at||''};
}

export async function findPaidStudentMatch(env,emailAddress){
  await ensurePortalSchema(env);const address=email(emailAddress);if(!EMAIL_RE.test(address))return null;
  const member=await env.DB.prepare(`SELECT m.id,m.customer_name,m.customer_phone,m.product_id,m.coach_id,m.event_type,m.payment_status,m.plan_name,m.order_reference FROM webinar_members m WHERE lower(m.customer_email)=? AND m.status='current' AND lower(COALESCE(m.payment_status,'')) NOT IN ('cancelled','canceled','failed','expired','refunded','past_due','unpaid') ORDER BY datetime(m.updated_at) DESC,m.id DESC LIMIT 1`).bind(address).first().catch(()=>null);
  if(member)return {source:'current_class_member',...member};
  const order=await env.DB.prepare(`SELECT id,order_id,customer_name,customer_phone,payment_status,status,gateway_subscription_id FROM orders WHERE lower(COALESCE(customer_email,''))=? AND lower(COALESCE(payment_status,'')) IN ('paid','captured','active','successful','success','authenticated','trialing') AND lower(COALESCE(status,'')) NOT IN ('cancelled','canceled','failed','expired','refunded') ORDER BY datetime(updated_at) DESC,id DESC LIMIT 1`).bind(address).first().catch(()=>null);
  return order?{source:'verified_payment',...order}:null;
}

function phoneDigits(value){return clean(value,60).replace(/\D/g,'').slice(-15);}

/**
 * Links a verified paid order to one student account. Existing accounts keep
 * their credentials. A first-time buyer receives a session immediately and is
 * required to choose a password inside the dashboard before doing anything
 * else. Callers must verify the gateway transaction before using this helper.
 */
export async function ensurePaidStudentPortalAccount(env,order={}){
  await ensurePortalSchema(env);const address=email(order.customer_email),phone=clean(order.customer_phone,40),digits=phoneDigits(phone),name=clean(order.customer_name,180)||'Member';
  if(!EMAIL_RE.test(address))throw new Error('The paid order does not contain a valid customer email address.');
  let row=await env.DB.prepare(`SELECT * FROM portal_accounts WHERE role='student' AND (lower(email)=? OR (?<>'' AND replace(replace(replace(replace(replace(phone,'+',''),' ',''),'-',''),'(',''),')','') LIKE ?)) ORDER BY CASE WHEN lower(email)=? THEN 0 ELSE 1 END,id LIMIT 1`).bind(address,digits,`%${digits}`,address).first();
  let created=false;
  if(row){
    await env.DB.prepare("UPDATE portal_accounts SET status='active',approval_source='verified_payment',approved_at=CASE WHEN trim(approved_at)='' THEN CURRENT_TIMESTAMP ELSE approved_at END,removed_at='',removed_reason='',display_name=CASE WHEN trim(display_name)='' THEN ? ELSE display_name END,real_name=CASE WHEN trim(real_name)='' THEN ? ELSE real_name END,phone=CASE WHEN trim(phone)='' THEN ? ELSE phone END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,name,phone,row.id).run();
  }else{
    const credentials=await hashPortalPassword(randomToken(48)),username=await availableUsername(env,'',address);
    row=await env.DB.prepare(`INSERT INTO portal_accounts(role,email,username,display_name,real_name,phone,password_hash,password_salt,password_iterations,requires_password_setup,status,approval_source,approved_at,updated_at) VALUES('student',?,?,?,?,?,?,?,?,1,'active','verified_payment',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`).bind(address,username,name,name,phone,credentials.hash,credentials.salt,credentials.iterations).first();created=true;
  }
  row=await env.DB.prepare('SELECT * FROM portal_accounts WHERE id=?').bind(row.id).first();
  await recordPortalEvent(env,row.id,created?'paid_account_created':'paid_account_linked',`Verified payment order ${clean(order.order_id,120)} linked to this member account.`,address);
  return {account:row,created,requiresPasswordSetup:Number(row.requires_password_setup||0)===1};
}

export async function registerPortalAccount(env,input={}){
  await ensurePortalSchema(env);const role=input.role==='coach'?'coach':'student',address=email(input.email),password=String(input.password||''),displayName=clean(input.displayName||input.name||input.realName,180),realName=clean(input.realName||displayName,180),phone=clean(input.phone,40);
  if(!EMAIL_RE.test(address))throw new Error('Enter a valid email address.');if(!displayName)throw new Error('Enter your name.');if(!phone)throw new Error('Enter your phone or WhatsApp number.');
  // Validate a coach application before creating its login row. This keeps a
  // partially completed application from reserving the email address when a
  // required profile field is missing.
  let coachProfile=null;
  if(role==='coach'){
    const requestedSlots=Array.isArray(input.availabilitySlots)?input.availabilitySlots:parseJson(input.availabilitySlots,[]),slotDays=requestedSlots.map(x=>x?.day),slotTypes=requestedSlots.flatMap(x=>Array.isArray(x?.classTypes)?x.classTypes:[]),slotStyles=requestedSlots.flatMap(x=>Array.isArray(x?.danceStyles)?x.danceStyles:[]);
    const specialties=uniqueList([...(Array.isArray(input.specialties)?input.specialties:parseJson(input.specialties,[])),...slotStyles],[],30),days=uniqueList([...(Array.isArray(input.availableDays)?input.availableDays:parseJson(input.availableDays,[])),...slotDays],WEEK_DAYS,7),classTypes=uniqueList([...(Array.isArray(input.classTypes)?input.classTypes:parseJson(input.classTypes,[])),...slotTypes],COACH_CLASS_TYPES,5),bio=clean(input.bio,5000);
    if(!bio)throw new Error('Write a short introduction about your coaching experience.');if(!specialties.length)throw new Error('Select at least one fitness specialty.');if(!days.length)throw new Error('Select at least one available day.');if(!classTypes.length)throw new Error('Select at least one class type you conduct.');
    const expectationType=['per_session','per_day','per_week','per_month'].includes(clean(input.remunerationExpectationType,30))?clean(input.remunerationExpectationType,30):'',expectationMin=Math.max(0,Math.round(Number(input.remunerationExpectationMin||0)*100)),expectationMax=Math.max(0,Math.round(Number(input.remunerationExpectationMax||0)*100));if(expectationMax&&expectationMin>expectationMax)throw new Error('The maximum remuneration expectation must be equal to or higher than the minimum.');
    coachProfile={specialties,days,classTypes,bio,slots:normalizeAvailabilitySlots(input.availabilitySlots,days,classTypes,specialties),expectationType,expectationMin,expectationMax};
  }
  if(await env.DB.prepare('SELECT id FROM portal_accounts WHERE lower(email)=? LIMIT 1').bind(address).first())throw new Error('An account already exists for this email. Use Login or reset the password.');
  const supplied=input.passwordCredentials||{},credentials=supplied.hash&&supplied.salt
    ?{hash:clean(supplied.hash,200),salt:clean(supplied.salt,200),iterations:Math.max(10000,Math.min(PORTAL_PBKDF2_ITERATIONS,Number(supplied.iterations||PORTAL_PBKDF2_ITERATIONS)))}
    :await hashPortalPassword(password),username=await availableUsername(env,input.username,address);let status='pending',approvalSource='admin_review',match=null;
  if(!credentials.hash||!credentials.salt)throw new Error('Secure login credentials could not be prepared. Please try Sign Up again.');
  if(role==='student'){match=await findPaidStudentMatch(env,address);if(match){status='active';approvalSource='matched_verified_payment';}}
  const row=await env.DB.prepare(`INSERT INTO portal_accounts(role,email,username,display_name,real_name,phone,password_hash,password_salt,password_iterations,status,approval_source,profile_photo_url,profile_photo_object_key,approved_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CASE WHEN ?='active' THEN CURRENT_TIMESTAMP ELSE '' END,CURRENT_TIMESTAMP) RETURNING *`).bind(role,address,username,displayName,realName,phone,credentials.hash,credentials.salt,credentials.iterations,status,approvalSource,clean(input.profilePhotoUrl,2400),clean(input.profilePhotoObjectKey,1000),status).first();
  if(role==='coach'){
    await env.DB.prepare(`INSERT INTO portal_coach_profiles(account_id,designation,badge,bio,experience,specialties_json,availability_days_json,availability_slots_json,class_types_json,instagram_url,facebook_url,application_status,remuneration_expectation_type,remuneration_expectation_min_paise,remuneration_expectation_max_paise) VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?)`).bind(row.id,clean(input.designation,120)||'Fitness Coach',clean(input.badge,80)||'Coach',coachProfile.bio,clean(input.experience,1000),JSON.stringify(coachProfile.specialties),JSON.stringify(coachProfile.days),JSON.stringify(coachProfile.slots),JSON.stringify(coachProfile.classTypes),cleanSocialUrl(input.instagramUrl,'instagram'),cleanSocialUrl(input.facebookUrl,'facebook'),coachProfile.expectationType,coachProfile.expectationMin,coachProfile.expectationMax).run();
  }
  await recordPortalEvent(env,row.id,'account_created',role==='student'&&match?'Member account automatically approved after a verified payment match.':'Account submitted for admin approval.',address);
  return {account:publicPortalAccount(row),paymentMatched:!!match};
}

export function normalizeAvailabilitySlots(value,days=[],fallbackClassTypes=[],fallbackDanceStyles=[]){
  const raw=Array.isArray(value)?value:parseJson(value,[]),allowed=new Set(days),defaultTypes=uniqueList(fallbackClassTypes,COACH_CLASS_TYPES,5),defaultStyles=uniqueList(fallbackDanceStyles,[],30);return raw.slice(0,56).map(slot=>({day:clean(slot?.day,3).toLowerCase(),start:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(slot?.start,5))?clean(slot.start,5):'',end:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(slot?.end,5))?clean(slot.end,5):'',classTypes:uniqueList(slot?.classTypes?.length?slot.classTypes:defaultTypes,COACH_CLASS_TYPES,5),danceStyles:uniqueList(slot?.danceStyles?.length?slot.danceStyles:defaultStyles,[],30)})).filter(slot=>allowed.has(slot.day)&&slot.start&&slot.end&&slot.end>slot.start&&slot.classTypes.length&&slot.danceStyles.length);
}
export function cleanSocialUrl(value,provider=''){
  const raw=clean(value,1000);if(!raw)return'';try{const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);if(url.protocol!=='https:')return'';if(provider==='instagram'&&!/(^|\.)instagram\.com$/i.test(url.hostname))return'';if(provider==='facebook'&&!/(^|\.)facebook\.com$/i.test(url.hostname))return'';return url.toString();}catch{return'';}
}

export async function createPortalSession(env,accountId,{maxAge=PORTAL_SESSION_SECONDS}={}){
  await ensurePortalSchema(env);const token=(maxAge<PORTAL_SESSION_SECONDS?'short.':'')+randomToken(48),tokenHash=await sha256Hex(token),expires=new Date(Date.now()+maxAge*1000).toISOString();
  await env.DB.prepare('DELETE FROM portal_sessions WHERE expires_at<=CURRENT_TIMESTAMP OR (account_id=? AND id NOT IN (SELECT id FROM portal_sessions WHERE account_id=? ORDER BY id DESC LIMIT 4))').bind(accountId,accountId).run().catch(()=>{});
  await env.DB.prepare('INSERT INTO portal_sessions(account_id,token_hash,expires_at) VALUES(?,?,?)').bind(accountId,tokenHash,expires).run();
  await env.DB.prepare('UPDATE portal_accounts SET last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(accountId).run();
  return {token,header:cookieHeader(PORTAL_COOKIE,token,{maxAge,expires:new Date(expires)}),expires};
}
export function clearPortalCookie(){return cookieHeader(PORTAL_COOKIE,'',{maxAge:0,expires:new Date(0)});}

export async function getPortalSession(request,env){
  await ensurePortalSchema(env);const token=parseCookies(request)[PORTAL_COOKIE];if(!token)return null;const tokenHash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT a.*,s.id session_id,s.expires_at session_expires_at FROM portal_sessions s JOIN portal_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') LIMIT 1`).bind(tokenHash).first();
  if(!row)return null;env.DB.prepare('UPDATE portal_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.session_id).run().catch(()=>{});return row;
}
export async function requirePortalAccount(request,env,roles=[]){
  const row=await getPortalSession(request,env);if(!row)throw new Error('Login required.');if(roles.length&&!roles.includes(row.role))throw new Error('This dashboard is not available for your account role.');return row;
}
export async function revokePortalSession(request,env){
  await ensurePortalSchema(env);const token=parseCookies(request)[PORTAL_COOKIE];if(!token)return;if(token)await env.DB.prepare('DELETE FROM portal_sessions WHERE token_hash=?').bind(await sha256Hex(token)).run().catch(()=>{});
}

export async function getPortalGoogleConfig(env){
  await ensurePortalSchema(env);const dedicated=await getSetting(env,'portal_google_login_settings',{}).catch(()=>({})),webinars=await getSetting(env,'webinar_integrations',{}).catch(()=>({})),fallback=webinars?.google||{};
  const clientId=clean(dedicated.clientId||fallback.clientId,1000),clientSecret=clean(dedicated.clientSecret||fallback.clientSecret,4000);
  return {clientId,clientSecret,source:dedicated.clientId&&dedicated.clientSecret?'portal':'webinar_google',configured:!!(clientId&&clientSecret)};
}
export async function createPortalOAuthState(env,request,{intent='login',role='',accountId=0,adminEmail='',payload={},redirectPath='/login'}={}){
  await ensurePortalSchema(env);const config=await getPortalGoogleConfig(env);if(!config.configured)throw new Error('Google sign-in is not configured yet. Save the Google OAuth Client ID and Client Secret in Settings → Integrations → Webinars, then add the login redirect URL shown in Admin Security to that Google OAuth app.');
  const accepted=['login','connect_admin','connect_account','signup_student','signup_coach'];if(!accepted.includes(intent))throw new Error('Choose a supported Google sign-in action.');
  const state=randomToken(36),stateHash=await sha256Hex(state),expires=new Date(Date.now()+10*60*1000).toISOString(),origin=preferredPublicOrigin(request,env),redirectUri=`${origin}/api/portal/google/callback`;
  await env.DB.prepare('DELETE FROM portal_oauth_states WHERE expires_at<=CURRENT_TIMESTAMP OR consumed=1').run().catch(()=>{});
  await env.DB.prepare(`INSERT INTO portal_oauth_states(state_hash,intent,role,account_id,admin_email,payload_json,redirect_path,expires_at) VALUES(?,?,?,?,?,?,?,?)`).bind(stateHash,intent,role,Number(accountId||0),email(adminEmail),JSON.stringify(payload||{}),safePath(redirectPath),expires).run();
  const query=new URLSearchParams({client_id:config.clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid email profile',prompt:'select_account',state,include_granted_scopes:'true'});
  return {authUrl:`https://accounts.google.com/o/oauth2/v2/auth?${query}`,redirectUri,source:config.source};
}
export async function consumePortalOAuthState(env,state){
  await ensurePortalSchema(env);const stateHash=await sha256Hex(String(state||'')),row=await env.DB.prepare('SELECT * FROM portal_oauth_states WHERE state_hash=? AND consumed=0 AND expires_at>CURRENT_TIMESTAMP LIMIT 1').bind(stateHash).first();if(!row)throw new Error('Google sign-in expired or did not match. Return to Login and try again.');
  const result=await env.DB.prepare('UPDATE portal_oauth_states SET consumed=1 WHERE id=? AND consumed=0').bind(row.id).run();if(Number(result?.meta?.changes||1)<1)throw new Error('This Google sign-in request was already used.');return {...row,payload:parseJson(row.payload_json,{})};
}
export async function exchangeGoogleIdentity(env,request,code){
  const config=await getPortalGoogleConfig(env),origin=preferredPublicOrigin(request,env),redirectUri=`${origin}/api/portal/google/callback`,body=new URLSearchParams({code:String(code||''),client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'}),response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),token=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(token.error_description||token.error||'Google could not complete sign-in.');
  const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}}),user=await userResponse.json().catch(()=>({}));if(!userResponse.ok||!user.sub||!user.email)throw new Error(user.error_description||'Google did not return a verified account.');if(user.email_verified===false)throw new Error('Google has not verified this email address.');return {sub:clean(user.sub,255),email:email(user.email),name:clean(user.name,180),picture:clean(user.picture,2400)};
}

export async function recordPortalEvent(env,accountId,eventType,detail='',actorEmail=''){
  await ensurePortalSchema(env);await env.DB.prepare('INSERT INTO portal_account_events(account_id,event_type,event_detail,actor_email) VALUES(?,?,?,?)').bind(Number(accountId),clean(eventType,80),clean(detail,1000),email(actorEmail)).run().catch(()=>{});
}
export async function addPortalNotification(env,accountId,{type='information',title,message='',effectiveAt='',sessionEventId=0}={}){
  await ensurePortalSchema(env);await env.DB.prepare('INSERT INTO portal_notifications(account_id,notification_type,title,message,effective_at,session_event_id) VALUES(?,?,?,?,COALESCE(NULLIF(?,\'\'),CURRENT_TIMESTAMP),?)').bind(Number(accountId),clean(type,80),clean(title,200),clean(message,2000),clean(effectiveAt,50),Number(sessionEventId||0)).run();
  try{const push=await import('./notification-events-v1-58.js');await push.portalEventNotification(env,Number(accountId),{type,title,message,effectiveAt,sessionEventId});}catch{}
}

export function portalRouteFor(role,status='active'){
  if(role==='coach')return '/coach-dashboard';if(role==='student')return '/member-dashboard';return '/admin/';
}
export function googleCallbackRedirect(origin,path,params={}){
  const url=new URL(safePath(path),origin);for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));return url.toString();
}

export async function createAdminSessionForUser(env,user){
  await ensureAuthSchema(env);const token=randomToken(48),tokenHash=await sha256Hex(token),expires=new Date(Date.now()+PORTAL_SESSION_SECONDS*1000).toISOString();await env.DB.prepare('INSERT INTO admin_sessions(user_id,token_hash,expires_at) VALUES(?,?,?)').bind(user.id,tokenHash,expires).run();return {header:cookieHeader('uc_admin_session',token,{maxAge:PORTAL_SESSION_SECONDS,expires:new Date(expires)}),token};
}

export const portalEmail=email;
export const portalClean=clean;
export const portalTruthy=truthy;
export const isPortalEmail=value=>EMAIL_RE.test(email(value));
export const safePortalRedirect=safePath;
