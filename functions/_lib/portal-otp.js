import { brandedEmailHtml } from './branded-email.js';
import { sendConfiguredEmail } from './outbound-email.js';
import { createAdminSessionForUser, createPortalSession, ensurePaidStudentPortalAccount, hashPortalPassword, portalRouteFor, publicPortalAccount, recordPortalEvent } from './portal-auth.js';
import { ensureV122Schema } from './v1-22-schema.js';
import { getPaymentSettings, getSiteSettings, sendWhatsAppText, sha256Hex } from './utils.js';
import { syncAuthoritativeIdentity } from './identity-sync.js';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const clean=(value,max=500)=>String(value??'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);
const email=value=>clean(value,240).toLowerCase();
const digits=value=>clean(value,60).replace(/\D/g,'').slice(-15);
const successful=/^(paid|captured|active|successful|success|authenticated|trialing)$/i;
const invalid=/^(cancelled|canceled|failed|expired|refunded|rejected)$/i;
const randomCode=()=>{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return String(100000+(bytes[0]%900000));};
const randomToken=()=>`${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g,'');
const phoneSql=column=>`replace(replace(replace(replace(replace(COALESCE(${column},''),'+',''),' ',''),'-',''),'(',''),')','')`;

function mask(value,channel){
  const text=String(value||'');
  if(channel==='email'){const [left,host='']=text.split('@');return `${left.slice(0,2)}${left.length>2?'•••':''}@${host}`;}
  const only=digits(text);return only.length>4?`••••••${only.slice(-4)}`:'••••';
}

export async function whatsappOtpAvailable(env){
  const settings=await getPaymentSettings(env).catch(()=>({})),provider=String(settings.otpProvider||settings.whatsappConnectedProvider||'').toLowerCase();
  if(provider==='green_api')return !!((env.GREEN_API_INSTANCE_ID||settings.greenApiInstanceId)&&(env.GREEN_API_TOKEN||settings.greenApiToken));
  if(provider==='instautomate')return !!((env.INSTAUTOMATE_VENDOR_UID||settings.instautomateVendorUid)&&(env.INSTAUTOMATE_API_TOKEN||settings.instautomateToken));
  if(provider==='whatsapp_cloud')return !!((env.WHATSAPP_PHONE_NUMBER_ID||settings.whatsappPhoneNumberId)&&(env.WHATSAPP_CLOUD_TOKEN||settings.whatsappCloudToken));
  return false;
}

async function createPortalAccountForAdminCoach(env,coach){
  const address=email(coach.contact_email);if(!EMAIL_RE.test(address))return null;
  const existing=await env.DB.prepare('SELECT * FROM portal_accounts WHERE lower(email)=? LIMIT 1').bind(address).first();if(existing)return existing;
  const password=await hashPortalPassword(randomToken()),status=coach.status==='active'?'active':'pending',usernameBase=address.split('@')[0].replace(/[^a-z0-9._-]/gi,'-').slice(0,50)||`coach-${coach.id}`;
  let username=usernameBase,suffix=2;while(await env.DB.prepare('SELECT id FROM portal_accounts WHERE lower(username)=lower(?) LIMIT 1').bind(username).first())username=`${usernameBase.slice(0,45)}-${suffix++}`;
  const account=await env.DB.prepare(`INSERT INTO portal_accounts(role,email,username,display_name,real_name,phone,password_hash,password_salt,password_iterations,requires_password_setup,status,approval_source,profile_photo_url,profile_photo_object_key,approved_at,approved_by,updated_at) VALUES('coach',?,?,?,?,?,?,?,?,1,?,'admin_created',?,?,CASE WHEN ?='active' THEN CURRENT_TIMESTAMP ELSE '' END,'administrator',CURRENT_TIMESTAMP) RETURNING *`).bind(address,username,coach.name||'Coach',coach.name||'Coach',coach.contact_phone||'',password.hash,password.salt,password.iterations,status,coach.photo_url||'',coach.photo_object_key||'',status).first();
  await env.DB.prepare(`INSERT INTO portal_coach_profiles(account_id,dance_coach_id,designation,badge,bio,experience,specialties_json,availability_days_json,availability_slots_json,class_types_json,instagram_url,facebook_url,application_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id,coach.id,coach.designation||'Dance Coach',coach.badge||'Coach',coach.bio||'',coach.experience||'',coach.dance_styles_json||'[]',coach.availability_json||'[]',coach.availability_slots_json||'[]',coach.class_types_json||'[]',coach.instagram_url||'',coach.facebook_url||'',status==='active'?'approved':'pending').run();
  await env.DB.prepare('UPDATE dance_coaches SET portal_account_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(account.id,coach.id).run();return account;
}

async function paidOrderForIdentifier(env,identifier){
  const address=email(identifier),phone=digits(identifier),where=EMAIL_RE.test(address)?'lower(COALESCE(customer_email,\'\'))=?':phone?`${phoneSql('customer_phone')} LIKE ?`:'';if(!where)return null;
  const row=await env.DB.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY datetime(updated_at) DESC,id DESC LIMIT 30`).bind(EMAIL_RE.test(address)?address:`%${phone}`).all();
  return (row.results||[]).find(item=>(successful.test(item.payment_status||'')||successful.test(item.status||''))&&!invalid.test(item.payment_status||'')&&!invalid.test(item.status||''))||null;
}

export async function resolveOtpAccount(env,identifier){
  await ensureV122Schema(env);const address=email(identifier),phone=digits(identifier);
  if(!address&&!phone)return null;
  if(EMAIL_RE.test(address)){
    const admin=await env.DB.prepare("SELECT * FROM admin_users WHERE lower(email)=? AND status='active' LIMIT 1").bind(address).first();if(admin)return {kind:'admin',account:admin,email:admin.email,phone:'',role:'admin'};
  }
  let portal=EMAIL_RE.test(address)?await env.DB.prepare("SELECT * FROM portal_accounts WHERE lower(email)=? AND status<>'rejected' LIMIT 1").bind(address).first():phone?await env.DB.prepare(`SELECT * FROM portal_accounts WHERE ${phoneSql('phone')} LIKE ? AND status<>'rejected' ORDER BY id LIMIT 1`).bind(`%${phone}`).first():null;
  if(portal)return {kind:'portal',account:portal,email:portal.email,phone:portal.phone,role:portal.role};
  if(EMAIL_RE.test(address)){
    const coach=await env.DB.prepare("SELECT * FROM dance_coaches WHERE lower(contact_email)=? AND status<>'archived' LIMIT 1").bind(address).first().catch(()=>null);if(coach){portal=await createPortalAccountForAdminCoach(env,coach);if(portal)return {kind:'portal',account:portal,email:portal.email,phone:portal.phone,role:'coach'};}
  }
  const order=await paidOrderForIdentifier(env,identifier);if(order&&EMAIL_RE.test(email(order.customer_email))){const made=await ensurePaidStudentPortalAccount(env,order);return {kind:'portal',account:made.account,email:made.account.email,phone:made.account.phone,role:'student'};}
  return null;
}

async function deliverCode(env,record,code){
  const site=await getSiteSettings(env),name=record.account.display_name||record.account.real_name||record.account.name||'Member',subject=`Your ${site.siteName||'studio'} verification code`,text=`Your verification code is ${code}. It expires in 10 minutes. Do not share this code.`;
  if(record.channel==='whatsapp'){
    const sent=await sendWhatsAppText(env,record.destination,`${site.siteName||'DropBeat Dance Studio'}: ${text}`);if(sent?.ok===false)throw new Error(sent.reason||'WhatsApp could not send the verification code.');return;
  }
  const html=brandedEmailHtml({site,env,title:'Verification code',eyebrow:'Secure account access',customerName:name,introHtml:`<p>Use this verification code to continue:</p><p style="font-size:30px;font-weight:800;letter-spacing:8px;text-align:center">${code}</p>`,bodyHtml:'<p>This code expires in 10 minutes. If you did not request it, you can safely ignore this message.</p>'});
  await sendConfiguredEmail(env,{to:record.destination,subject,html,text,fromName:site.siteName},{purpose:'otp'});
}

export async function requestPortalOtp(env,{identifier='',purpose='login',channel='email',pendingValue='',authenticatedAccount=null}={}){
  await ensureV122Schema(env);const accepted=['login','password_reset','email_change','phone_change'];if(!accepted.includes(purpose))throw new Error('Choose a supported verification action.');
  let resolved=authenticatedAccount?{kind:'portal',account:authenticatedAccount,email:authenticatedAccount.email,phone:authenticatedAccount.phone,role:authenticatedAccount.role}:await resolveOtpAccount(env,identifier);
  if(!resolved)throw new Error('No eligible account was found. Register first or use the email from a successful payment. Failed or incomplete payments cannot receive a login code.');
  if(['email_change','phone_change'].includes(purpose)&&!authenticatedAccount)throw new Error('Login is required before changing account contact details.');
  channel=channel==='whatsapp'?'whatsapp':'email';if(channel==='whatsapp'&&!await whatsappOtpAvailable(env))throw new Error('WhatsApp OTP is not connected. Choose Email instead.');
  const pending=clean(pendingValue,320),destination=purpose==='email_change'?email(pending):purpose==='phone_change'?(channel==='whatsapp'?clean(pending,60):resolved.email):(channel==='whatsapp'?resolved.phone:resolved.email);
  if(channel==='email'&&!EMAIL_RE.test(email(destination)))throw new Error('This account does not have a valid email address for OTP delivery.');if(channel==='whatsapp'&&!digits(destination))throw new Error('This account does not have a valid WhatsApp number.');if(purpose==='email_change'&&!EMAIL_RE.test(email(pending)))throw new Error('Enter a valid new email address.');if(purpose==='phone_change'&&!digits(pending))throw new Error('Enter a valid new phone number.');
  const recent=await env.DB.prepare("SELECT created_at FROM portal_login_otp_challenges WHERE account_kind=? AND account_id=? AND purpose=? AND created_at>datetime('now','-60 seconds') ORDER BY id DESC LIMIT 1").bind(resolved.kind,Number(resolved.account.id),purpose).first();if(recent)throw new Error('Please wait one minute before requesting another code.');
  const count=await env.DB.prepare("SELECT COUNT(*) total FROM portal_login_otp_challenges WHERE account_kind=? AND account_id=? AND created_at>datetime('now','-1 hour')").bind(resolved.kind,Number(resolved.account.id)).first();if(Number(count?.total||0)>=5)throw new Error('Too many verification requests. Please try again after one hour.');
  const code=randomCode(),codeHash=await sha256Hex(code),expires=new Date(Date.now()+10*60000).toISOString(),normalized=channel==='email'?email(destination):clean(destination,60);
  const inserted=await env.DB.prepare(`INSERT INTO portal_login_otp_challenges(account_kind,account_id,purpose,channel,destination,code_hash,expires_at,pending_value) VALUES(?,?,?,?,?,?,?,?) RETURNING id`).bind(resolved.kind,Number(resolved.account.id),purpose,channel,normalized,codeHash,expires,pending).first();
  try{await deliverCode(env,{...resolved,channel,destination:normalized},code);}catch(error){await env.DB.prepare('DELETE FROM portal_login_otp_challenges WHERE id=?').bind(Number(inserted.id)).run().catch(()=>{});throw error;}
  return {ok:true,challengeId:Number(inserted.id),channel,destination:mask(normalized,channel),expiresAt:expires,message:`A six-digit code was sent by ${channel==='whatsapp'?'WhatsApp':'email'}.`};
}

async function checkedChallenge(env,{challengeId,code,purpose}){
  await ensureV122Schema(env);const row=await env.DB.prepare("SELECT * FROM portal_login_otp_challenges WHERE id=? AND purpose=? AND consumed_at='' LIMIT 1").bind(Number(challengeId),purpose).first();if(!row)throw new Error('This verification request is no longer available. Request a new code.');if(Date.parse(row.expires_at)<=Date.now())throw new Error('The verification code has expired. Request a new code.');if(Number(row.attempts||0)>=5)throw new Error('Too many incorrect attempts. Request a new code.');
  const hash=await sha256Hex(clean(code,20));if(hash!==row.code_hash){await env.DB.prepare('UPDATE portal_login_otp_challenges SET attempts=attempts+1 WHERE id=?').bind(row.id).run();throw new Error('The verification code is incorrect.');}return row;
}

export async function verifyLoginOtp(env,input={}){
  const row=await checkedChallenge(env,{...input,purpose:'login'});await env.DB.prepare("UPDATE portal_login_otp_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=? AND consumed_at='' ").bind(row.id).run();
  if(row.account_kind==='admin'){
    const account=await env.DB.prepare("SELECT * FROM admin_users WHERE id=? AND status='active' LIMIT 1").bind(row.account_id).first();if(!account)throw new Error('The administrator account is no longer active.');const session=await createAdminSessionForUser(env,account);return {ok:true,role:'admin',route:'/admin/',header:session.header};
  }
  const account=await env.DB.prepare("SELECT * FROM portal_accounts WHERE id=? AND status<>'rejected' LIMIT 1").bind(row.account_id).first();if(!account)throw new Error('The account is no longer available.');const session=await createPortalSession(env,account.id);await recordPortalEvent(env,account.id,'otp_login','Signed in using a one-time verification code.',account.email);return {ok:true,role:account.role,route:portalRouteFor(account.role,account.status),account:publicPortalAccount(account),header:session.header};
}

export async function verifyResetOtp(env,input={}){
  const row=await checkedChallenge(env,{...input,purpose:'password_reset'}),token=randomToken(),hash=await sha256Hex(token),expires=new Date(Date.now()+10*60000).toISOString();await env.DB.prepare("UPDATE portal_login_otp_challenges SET consumed_at=CURRENT_TIMESTAMP,verified_token_hash=?,verified_token_expires_at=? WHERE id=?").bind(hash,expires,row.id).run();return {ok:true,resetToken:token,challengeId:Number(row.id),expiresAt:expires,message:'Code verified. Create your new password now.'};
}

export async function resetPasswordWithOtp(env,{challengeId=0,resetToken='',password='',confirmPassword=''}={}){
  await ensureV122Schema(env);if(password!==confirmPassword)throw new Error('The password confirmation does not match.');const row=await env.DB.prepare("SELECT * FROM portal_login_otp_challenges WHERE id=? AND purpose='password_reset' AND consumed_at<>'' AND verified_token_hash<>'' LIMIT 1").bind(Number(challengeId)).first();if(!row||Date.parse(row.verified_token_expires_at)<=Date.now()||await sha256Hex(String(resetToken||''))!==row.verified_token_hash)throw new Error('Password reset verification expired. Start again.');
  if(row.account_kind==='admin'){
    if(String(password).length<8)throw new Error('Password must contain at least 8 characters.');const salt=crypto.randomUUID(),hash=await sha256Hex(`${salt}:${password}`);await env.DB.prepare('UPDATE admin_users SET password_hash=?,salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(hash,salt,row.account_id).run();await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(row.account_id).run();
  }else{const next=await hashPortalPassword(password);await env.DB.prepare('UPDATE portal_accounts SET password_hash=?,password_salt=?,password_iterations=?,requires_password_setup=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(next.hash,next.salt,next.iterations,row.account_id).run();await env.DB.prepare('DELETE FROM portal_sessions WHERE account_id=?').bind(row.account_id).run();await recordPortalEvent(env,row.account_id,'password_reset','Password reset after OTP verification.','');}
  await env.DB.prepare("UPDATE portal_login_otp_challenges SET verified_token_hash='',verified_token_expires_at='' WHERE id=?").bind(row.id).run();return {ok:true,message:'Your password has been reset. You can now log in with the new password.'};
}

export async function confirmIdentityOtp(env,account,{challengeId=0,code='',purpose=''}){
  if(!['email_change','phone_change'].includes(purpose))throw new Error('Choose email or phone verification.');const row=await checkedChallenge(env,{challengeId,code,purpose});if(row.account_kind!=='portal'||Number(row.account_id)!==Number(account.id))throw new Error('This code does not belong to the signed-in account.');
  if(purpose==='email_change'){
    const next=email(row.pending_value),duplicate=await env.DB.prepare('SELECT id FROM portal_accounts WHERE lower(email)=? AND id<>? LIMIT 1').bind(next,account.id).first();if(duplicate)throw new Error('That email is already used by another account.');const old=email(account.email);await env.DB.prepare('UPDATE portal_accounts SET email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(next,account.id).run();await syncAuthoritativeIdentity(env,{accountId:account.id,role:account.role,email:next,oldEmail:old,phone:account.phone,oldPhone:account.phone,name:account.display_name||account.real_name});
  }else{
    const next=clean(row.pending_value,60),old=clean(account.phone,60);await env.DB.prepare('UPDATE portal_accounts SET phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(next,account.id).run();await syncAuthoritativeIdentity(env,{accountId:account.id,role:account.role,email:account.email,oldEmail:account.email,phone:next,oldPhone:old,name:account.display_name||account.real_name});
  }
  await env.DB.prepare("UPDATE portal_login_otp_challenges SET consumed_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run();await recordPortalEvent(env,account.id,purpose,purpose==='email_change'?'Login email verified and changed.':'Phone number verified and changed.',account.email);return {ok:true,message:purpose==='email_change'?'Your new email address is verified and active.':'Your new phone number is verified and active.'};
}
