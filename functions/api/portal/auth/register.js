import { json } from '../../../_lib/utils.js';
import { deleteGoogleDriveFile, uploadPortalProfileImageToGoogleDrive } from '../../../_lib/google-drive-upload.js';
import { createPortalSession, portalRouteFor, registerPortalAccount } from '../../../_lib/portal-auth.js';
import { ensureV122Schema } from '../../../_lib/v1-22-schema.js';
import { syncStudentLeadForAccount } from '../../../_lib/identity-sync.js';

const value=(form,key)=>String(form.get(key)||'').trim();
const parsed=(value,fallback=[])=>{try{return JSON.parse(String(value||''))||fallback;}catch{return fallback;}};

export async function onRequestPost({request,env}){
  let uploaded=null;
  try{
    await ensureV122Schema(env);
    const form=await request.formData(),role=value(form,'role')==='coach'?'coach':'student',file=form.get('profilePhoto');
    if(file&&typeof file!=='string'&&file.size)uploaded=await uploadPortalProfileImageToGoogleDrive(env,file);
    const name=value(form,'name')||value(form,'displayName')||value(form,'realName'),countryCode=value(form,'countryCode')||'+91',nationalPhone=value(form,'phone').replace(/^\+\d{1,4}[\s-]?/,'');
    const input={role,email:value(form,'email'),password:value(form,'password'),displayName:name,realName:name,phone:`${countryCode}${nationalPhone.replace(/[^0-9]/g,'')}`,profilePhotoUrl:uploaded?.url||'',profilePhotoObjectKey:uploaded?.id?`drive:${uploaded.id}`:'',designation:value(form,'designation'),badge:value(form,'badge'),bio:value(form,'bio'),experience:value(form,'experience'),specialties:parsed(value(form,'specialties')),availableDays:parsed(value(form,'availableDays')),availabilitySlots:parsed(value(form,'availabilitySlots')),classTypes:parsed(value(form,'classTypes')),instagramUrl:value(form,'instagramUrl'),facebookUrl:value(form,'facebookUrl'),remunerationExpectationType:value(form,'remunerationExpectationType'),remunerationExpectationMin:value(form,'remunerationExpectationMin'),remunerationExpectationMax:value(form,'remunerationExpectationMax')};
    const result=await registerPortalAccount(env,input),session=await createPortalSession(env,result.account.id);if(role==='student')await syncStudentLeadForAccount(env,result.account.id).catch(()=>{});
    const message=result.account.status==='active'?'Your paid membership was matched and your member dashboard is ready.':'Your account was created. The dashboard will show your approval status while the gym reviews it.';
    return json({ok:true,...result,route:portalRouteFor(result.account.role,result.account.status),message},201,{'set-cookie':session.header});
  }catch(error){if(uploaded?.id)await deleteGoogleDriveFile(env,uploaded.id).catch(()=>{});const uploadProblem=/google drive|destination root folder|oauth|image.*upload/i.test(error.message||'');return json({error:uploadProblem?'Profile photo upload is temporarily unavailable. Please try again without a photo or contact the gym for help.':error.message||'Sign up could not be completed.',contactUrl:'/contact'},400);}
}
