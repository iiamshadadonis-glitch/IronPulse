import { json, readJson } from '../../_lib/utils.js';
import { requirePortalAccount } from '../../_lib/portal-auth.js';
import { confirmIdentityOtp, requestPortalOtp, whatsappOtpAvailable } from '../../_lib/portal-otp.js';

export async function onRequestGet({request,env}){
  try{await requirePortalAccount(request,env,['student','coach']);return json({ok:true,email:true,whatsapp:await whatsappOtpAvailable(env)},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message},401);}
}

export async function onRequestPost({request,env}){
  try{
    const account=await requirePortalAccount(request,env,['student','coach']),body=await readJson(request),action=String(body.action||'request'),purpose=body.field==='phone'?'phone_change':'email_change';
    if(action==='request'){const connected=await whatsappOtpAvailable(env),channel=purpose==='phone_change'&&connected?'whatsapp':'email',out=await requestPortalOtp(env,{purpose,channel,pendingValue:body.value,authenticatedAccount:account});return json({...out,message:purpose==='phone_change'&&!connected?'A verification code was sent to your current email. Confirm it to activate the new phone number.':out.message});}
    if(action==='confirm')return json(await confirmIdentityOtp(env,account,{challengeId:body.challengeId,code:body.code,purpose}));
    return json({error:'Choose request or confirm.'},400);
  }catch(error){return json({error:error.message||'Contact verification could not be completed.'},400);}
}
