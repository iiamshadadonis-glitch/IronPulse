import { getSetting, setSetting } from '../../../_lib/utils.js';
import { deleteGoogleDriveFile } from '../../../_lib/google-drive-upload.js';
import { consumePortalOAuthState, createAdminSessionForUser, createPortalSession, exchangeGoogleIdentity, googleCallbackRedirect, portalRouteFor, registerPortalAccount } from '../../../_lib/portal-auth.js';
import { syncStudentLeadForAccount } from '../../../_lib/identity-sync.js';

function redirect(origin,path,params={},cookie=''){const headers=new Headers({location:googleCallbackRedirect(origin,path,params),'cache-control':'no-store'});if(cookie)headers.set('set-cookie',cookie);return new Response(null,{status:302,headers});}

export async function onRequestGet({request,env}){
  const url=new URL(request.url),origin=url.origin;let stateRow=null;
  try{
    const error=url.searchParams.get('error');if(error)throw new Error(url.searchParams.get('error_description')||error);
    const code=url.searchParams.get('code'),state=url.searchParams.get('state');if(!code||!state)throw new Error('Google did not return a complete sign-in response.');
    stateRow=await consumePortalOAuthState(env,state);const identity=await exchangeGoogleIdentity(env,request,code);
    if(stateRow.intent==='connect_admin'){
      const admin=await env.DB.prepare("SELECT * FROM admin_users WHERE lower(email)=? AND status='active' LIMIT 1").bind(String(stateRow.admin_email||'').toLowerCase()).first();if(!admin)throw new Error('The administrator who started this connection is no longer active.');
      const current=await getSetting(env,'google_login_settings',{}).catch(()=>({}));await setSetting(env,'google_login_settings',{...current,adminEmail:admin.email,googleEmail:identity.email,googleSub:identity.sub,googlePicture:identity.picture,connectedAt:new Date().toISOString()});
      return redirect(origin,'/admin/?open=security',{google_connected:'1'});
    }
    if(stateRow.intent==='connect_account'){
      const account=await env.DB.prepare("SELECT * FROM portal_accounts WHERE id=? AND status<>'rejected' LIMIT 1").bind(Number(stateRow.account_id)).first();if(!account)throw new Error('The account that started this connection was not found.');
      const duplicate=await env.DB.prepare("SELECT id FROM portal_accounts WHERE google_sub=? AND id<>? LIMIT 1").bind(identity.sub,account.id).first();if(duplicate)throw new Error('This Google account is already connected to another dashboard.');
      await env.DB.prepare("UPDATE portal_accounts SET google_sub=?,google_email=?,google_picture=?,google_connected_at=CURRENT_TIMESTAMP,profile_photo_url=CASE WHEN trim(profile_photo_url)='' THEN ? ELSE profile_photo_url END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(identity.sub,identity.email,identity.picture,identity.picture,account.id).run();
      return redirect(origin,portalRouteFor(account.role,account.status),{google_connected:'1',view:'settings'});
    }
    if(stateRow.intent==='signup_student'||stateRow.intent==='signup_coach'){
      const role=stateRow.intent==='signup_coach'?'coach':'student',payload=stateRow.payload||{},existing=await env.DB.prepare('SELECT id FROM portal_accounts WHERE lower(email)=? LIMIT 1').bind(identity.email).first();if(existing)throw new Error('An account already exists for this Google email. Return to Login and choose Continue with Google.');const duplicate=await env.DB.prepare("SELECT id FROM portal_accounts WHERE google_sub=? AND trim(google_sub)<>'' LIMIT 1").bind(identity.sub).first();if(duplicate)throw new Error('This Google account is already connected to another dashboard.');
      const result=await registerPortalAccount(env,{...payload,role,email:identity.email});if(role==='student')await syncStudentLeadForAccount(env,result.account.id).catch(()=>{});
      await env.DB.prepare("UPDATE portal_accounts SET google_sub=?,google_email=?,google_picture=?,google_connected_at=CURRENT_TIMESTAMP,profile_photo_url=CASE WHEN trim(profile_photo_url)='' THEN ? ELSE profile_photo_url END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(identity.sub,identity.email,identity.picture,identity.picture,result.account.id).run();const session=await createPortalSession(env,result.account.id);return redirect(origin,portalRouteFor(role,result.account.status),{welcome:'1'},session.header);
    }
    if(stateRow.intent==='login'){
      const googleSettings=await getSetting(env,'google_login_settings',{}).catch(()=>({}));let admin=null;
      if((googleSettings.googleSub&&googleSettings.googleSub===identity.sub)||(googleSettings.googleEmail&&String(googleSettings.googleEmail).toLowerCase()===identity.email))admin=await env.DB.prepare("SELECT * FROM admin_users WHERE lower(email)=? AND status='active' LIMIT 1").bind(String(googleSettings.adminEmail||googleSettings.googleEmail||identity.email).toLowerCase()).first();
      if(!admin)admin=await env.DB.prepare("SELECT * FROM admin_users WHERE lower(email)=? AND status='active' LIMIT 1").bind(identity.email).first();
      if(admin){await setSetting(env,'google_login_settings',{...googleSettings,googleEmail:identity.email,googleSub:identity.sub,googlePicture:identity.picture,connectedAt:new Date().toISOString(),adminEmail:admin.email});const session=await createAdminSessionForUser(env,admin);return redirect(origin,'/admin/',{google_login:'1'},session.header);}
      const account=await env.DB.prepare("SELECT * FROM portal_accounts WHERE (google_sub=? AND trim(google_sub)<>'') OR lower(email)=? ORDER BY CASE WHEN google_sub=? THEN 0 ELSE 1 END LIMIT 1").bind(identity.sub,identity.email,identity.sub).first();if(!account)throw new Error('No account is registered for this Google email. Choose Student Sign Up or Coach Sign Up first.');if(account.status==='rejected')throw new Error('This account application was not approved.');
      const duplicate=await env.DB.prepare("SELECT id FROM portal_accounts WHERE google_sub=? AND id<>? LIMIT 1").bind(identity.sub,account.id).first();if(duplicate)throw new Error('This Google account is already connected elsewhere.');
      await env.DB.prepare("UPDATE portal_accounts SET google_sub=?,google_email=?,google_picture=?,google_connected_at=CURRENT_TIMESTAMP,profile_photo_url=CASE WHEN trim(profile_photo_url)='' THEN ? ELSE profile_photo_url END,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(identity.sub,identity.email,identity.picture,identity.picture,account.id).run();
      const session=await createPortalSession(env,account.id);return redirect(origin,portalRouteFor(account.role,account.status),{google_login:'1'},session.header);
    }
    throw new Error('This Google sign-in action is not supported.');
  }catch(error){if(/^signup_/.test(stateRow?.intent||'')&&stateRow?.payload?.profilePhotoAssetId)await deleteGoogleDriveFile(env,stateRow.payload.profilePhotoAssetId).catch(()=>{});const intent=stateRow?.intent||'',path=intent==='connect_admin'?'/admin/?open=security':stateRow?.redirect_path||'/login',canSeeSetup=intent==='connect_admin',message=canSeeSetup?(error.message||'Google sign-in failed.'):'Google sign-in could not be completed right now. Please use email and password, or contact the studio for help.';return redirect(origin,path,{google_error:message});}
}
