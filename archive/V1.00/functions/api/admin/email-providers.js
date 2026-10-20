import { json, readJson, requireAdmin, getSiteSettings } from '../../_lib/utils.js';
import { getOutboundEmailSettings, saveOutboundEmailSettings, publicOutboundEmailSettings, providerCapabilities, sendConfiguredEmail, outboundBool } from '../../_lib/outbound-email.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const PROVIDERS=new Set(['gmail','ses','lambda','mailchimp','mailersend','company','s3']);
const FIELDS={
  ses:['region','accessKeyId','secretAccessKey','fromEmail','fromName','replyTo'],
  lambda:['endpoint','token','fromEmail','fromName'],
  mailchimp:['apiKey','fromEmail','fromName','replyTo'],
  mailersend:['apiKey','fromEmail','fromName','replyTo'],
  company:['relayUrl','relayToken','smtpHost','smtpPort','smtpUser','smtpPassword','fromEmail','fromName'],
  s3:['region','bucket','accessKeyId','secretAccessKey','publicBaseUrl']
};

function catalog(settings){return ['gmail','ses','lambda','mailchimp','mailersend','company','s3'].map(key=>({key,capabilities:providerCapabilities(key),primary:settings.primaryProvider===key,...(key==='gmail'?{}:publicOutboundEmailSettings(settings)[key])}));}
export async function onRequestGet({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}const settings=await getOutboundEmailSettings(env);return json({ok:true,settings:publicOutboundEmailSettings(settings),providers:catalog(settings)});}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const b=await readJson(request),action=clean(b.action,40).toLowerCase(),provider=clean(b.provider,40).toLowerCase();if(!PROVIDERS.has(provider))throw new Error('Choose a supported email integration.');
    const settings=await getOutboundEmailSettings(env);
    if(provider==='gmail'){
      if(action!=='primary'&&action!=='save')throw new Error('Gmail is managed by the existing Gmail integration card.');
      settings.primaryProvider='gmail';
      await saveOutboundEmailSettings(env,settings);
      return json({ok:true,message:'Connected Gmail is now the primary sender.',settings:publicOutboundEmailSettings(settings),providers:catalog(settings)});
    }
    const current=settings[provider]||{};
    if(action==='disconnect'||action==='delete'){
      settings[provider]={...current,enabled:false,otpEnabled:false,connected:false,lastError:'',lastTestedAt:'',...Object.fromEntries((FIELDS[provider]||[]).map(k=>[k,k==='smtpPort'?465:'']))};
      if(settings.primaryProvider===provider)settings.primaryProvider='gmail';await saveOutboundEmailSettings(env,settings);return json({ok:true,message:'Integration disconnected and its saved credentials were cleared.',settings:publicOutboundEmailSettings(settings),providers:catalog(settings)});
    }
    const next={...current};for(const field of FIELDS[provider]||[]){if(Object.prototype.hasOwnProperty.call(b,field)&&clean(b[field],10000)!=='')next[field]=field==='smtpPort'?Math.max(1,Number(b[field]||465)):clean(b[field],10000);}
    if(Object.prototype.hasOwnProperty.call(b,'enabled'))next.enabled=outboundBool(b.enabled);if(Object.prototype.hasOwnProperty.call(b,'otpEnabled'))next.otpEnabled=outboundBool(b.otpEnabled);if(provider==='s3')next.otpEnabled=false;
    if(!next.enabled&&settings.primaryProvider===provider)settings.primaryProvider='gmail';
    settings[provider]=next;
    if(outboundBool(b.primary)&&provider!=='s3')settings.primaryProvider=provider;
    if(action==='test'){
      if(provider==='s3'){
        if(!next.bucket||!next.region||!next.accessKeyId||!next.secretAccessKey)throw new Error('Enter the S3 region, bucket, Access Key ID and Secret Access Key before testing.');
        next.connected=true;next.lastTestedAt=new Date().toISOString();next.lastError='';settings[provider]=next;
      }else{
        next.enabled=true;settings[provider]=next;await saveOutboundEmailSettings(env,settings);
        const site=await getSiteSettings(env),to=clean(b.testEmail||next.fromEmail,240);if(!to)throw new Error('Enter a test recipient email address.');await sendConfiguredEmail(env,{to,subject:`${site.siteName||'IronPulse Gym'} - Email Provider Test`,html:`<p><strong>${site.siteName||'IronPulse Gym'}</strong> successfully sent this provider test.</p>`,text:'Email provider test completed successfully.',fromName:site.siteName||next.fromName||'IronPulse Gym'},{provider});
        next.connected=true;next.lastTestedAt=new Date().toISOString();next.lastError='';settings[provider]=next;
      }
    }
    await saveOutboundEmailSettings(env,settings);return json({ok:true,message:action==='test'?'Connection test completed successfully.':'Email integration saved.',settings:publicOutboundEmailSettings(settings),providers:catalog(settings)});
  }catch(e){return json({error:e.message||'Email integration could not be saved.'},400);}
}
