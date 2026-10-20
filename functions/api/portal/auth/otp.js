import { json, readJson } from '../../../_lib/utils.js';
import { requestPortalOtp, resetPasswordWithOtp, verifyLoginOtp, verifyResetOtp, whatsappOtpAvailable } from '../../../_lib/portal-otp.js';

export async function onRequestGet({env}){
  try{return json({ok:true,email:true,whatsapp:await whatsappOtpAvailable(env)},200,{'cache-control':'no-store'});}catch(error){return json({error:error.message||'OTP availability could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  try{
    const body=await readJson(request),action=String(body.action||'request_login');
    if(action==='request_login')return json(await requestPortalOtp(env,{identifier:body.identifier,purpose:'login',channel:body.channel}));
    if(action==='verify_login'){
      const result=await verifyLoginOtp(env,{challengeId:body.challengeId,code:body.code}),headers=result.header?{'set-cookie':result.header}:{};delete result.header;return json(result,200,headers);
    }
    if(action==='request_reset')return json(await requestPortalOtp(env,{identifier:body.identifier,purpose:'password_reset',channel:body.channel}));
    if(action==='verify_reset')return json(await verifyResetOtp(env,{challengeId:body.challengeId,code:body.code}));
    if(action==='reset_password')return json(await resetPasswordWithOtp(env,{challengeId:body.challengeId,resetToken:body.resetToken,password:body.password,confirmPassword:body.confirmPassword}));
    return json({error:'Choose Login with OTP or Forgot Password.'},400);
  }catch(error){return json({error:error.message||'Verification could not be completed.'},400);}
}
