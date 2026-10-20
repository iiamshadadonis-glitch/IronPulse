import { json, requireAdmin } from '../../../_lib/utils.js';
import { deleteGoogleDriveFile, uploadPortalProfileImageToGoogleDrive } from '../../../_lib/google-drive-upload.js';
import { COACH_CLASS_TYPES, createPortalOAuthState, hashPortalPassword, parseJson, portalClean, requirePortalAccount, uniqueList, WEEK_DAYS } from '../../../_lib/portal-auth.js';

export async function onRequestGet({request,env}){
  try{
    const url=new URL(request.url),intent=url.searchParams.get('intent')||'login';let accountId=0,adminEmail='',redirectPath='/login';
    if(intent==='connect_admin'){const admin=await requireAdmin(request,env);adminEmail=admin.email;redirectPath='/admin/?open=security';}
    else if(intent==='connect_account'){const account=await requirePortalAccount(request,env,['student','coach']);accountId=Number(account.id);redirectPath=account.role==='coach'?'/coach-dashboard?view=settings':'/member-dashboard?view=settings';}
    else if(intent!=='login')throw new Error('Choose Login before starting Google sign-in.');
    return json({ok:true,...await createPortalOAuthState(env,request,{intent,accountId,adminEmail,redirectPath})},200,{'cache-control':'no-store'});
  }catch(error){const status=/login required/i.test(error.message)?401:400,intent=new URL(request.url).searchParams.get('intent')||'login',canSeeSetup=intent==='connect_admin';return json({error:canSeeSetup?(error.message||'Google sign-in could not start.'):'Google sign-in is temporarily unavailable. Please use email and password, or contact the gym for help.',contactUrl:canSeeSetup?'':'/contact'},status);}
}

const value=(form,key)=>String(form.get(key)||'').trim();
export async function onRequestPost({request,env}){
  let uploaded=null;
  try{
    const form=await request.formData(),role=value(form,'role')==='coach'?'coach':'student',intent=`signup_${role}`,displayName=portalClean(value(form,'name')||value(form,'displayName')||value(form,'realName'),180),realName=displayName,countryCode=value(form,'countryCode')||'+91',nationalPhone=value(form,'phone').replace(/^\+\d{1,4}[\s-]?/,''),phone=portalClean(`${countryCode}${nationalPhone.replace(/[^0-9]/g,'')}`,40),password=value(form,'password'),confirm=value(form,'confirmPassword');
    if(!displayName)throw new Error('Enter your name before continuing with Google.');if(!phone)throw new Error('Enter your phone or WhatsApp number before continuing with Google.');if(password!==confirm)throw new Error('The password confirmation does not match.');
    const credentials=await hashPortalPassword(password),file=form.get('profilePhoto');if(file&&typeof file!=='string'&&file.size)uploaded=await uploadPortalProfileImageToGoogleDrive(env,file);
    const payload={displayName,realName,phone,passwordCredentials:credentials,profilePhotoUrl:uploaded?.url||'',profilePhotoObjectKey:uploaded?.id?`drive:${uploaded.id}`:'',profilePhotoAssetId:uploaded?.id||'',designation:portalClean(value(form,'designation'),120),badge:portalClean(value(form,'badge'),80),bio:portalClean(value(form,'bio'),5000),experience:portalClean(value(form,'experience'),1000),specialties:uniqueList(parseJson(value(form,'specialties'),[]),[],30),availableDays:uniqueList(parseJson(value(form,'availableDays'),[]),WEEK_DAYS,7),availabilitySlots:parseJson(value(form,'availabilitySlots'),[]),classTypes:uniqueList(parseJson(value(form,'classTypes'),[]),COACH_CLASS_TYPES,5),instagramUrl:portalClean(value(form,'instagramUrl'),1000),facebookUrl:portalClean(value(form,'facebookUrl'),1000)};
    if(role==='coach'){if(!payload.bio)throw new Error('Write a short introduction before continuing with Google.');if(!payload.specialties.length)throw new Error('Select at least one fitness specialty.');if(!payload.availableDays.length)throw new Error('Select at least one available day.');if(!payload.classTypes.length)throw new Error('Select at least one class type.');}
    return json({ok:true,...await createPortalOAuthState(env,request,{intent,role,payload,redirectPath:'/login'})},200,{'cache-control':'no-store'});
  }catch(error){if(uploaded?.id)await deleteGoogleDriveFile(env,uploaded.id).catch(()=>{});const configuration=/google sign-in is not configured|oauth client|redirect url/i.test(error.message||'');return json({error:configuration?'Google sign-in is temporarily unavailable. Please use email and password, or contact the gym for help.':error.message||'Google sign-up could not start.',contactUrl:'/contact'},400);}
}
