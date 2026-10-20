import { json, readJson, requireAdmin, getSocialIntegrationSettings, getSiteSettings, preferredPublicOrigin } from '../../_lib/utils.js';
import { listEmailAutomations, getEmailAutomation, saveEmailAutomation, setEmailAutomationStatus, deleteEmailAutomation, restoreEmailAutomationVersion, emailAutomationTemplates, emailAutomationActivity, processEmailAutomations, renderEmailAutomation, sendEmailAutomationTest, ensureEmailAutomationSchema } from '../../_lib/email-automations.js';
import { getOutboundEmailSettings } from '../../_lib/outbound-email.js';
import { gmailConnectionVerified } from '../../_lib/gmail-mailer.js';

const clean=(v,n=80)=>String(v??'').trim().slice(0,n);
async function senderState(env){const [social,outbound]=await Promise.all([getSocialIntegrationSettings(env).catch(()=>({})),getOutboundEmailSettings(env).catch(()=>({primaryProvider:'gmail'}))]),gmail=social.gmail||{},gmailReady=!!(gmail.enabled&&gmailConnectionVerified(gmail));if(gmailReady)return {ready:true,provider:'Gmail',senderName:gmail.senderName||'',senderEmail:gmail.senderEmail||gmail.connectedEmail||'',adminCopyEmail:gmail.adminCopyEmail||''};const keys=[outbound.primaryProvider,'ses','lambda','mailchimp','mailersend','company'].filter((x,i,a)=>x&&x!=='gmail'&&a.indexOf(x)===i),key=keys.find(x=>outbound[x]?.enabled)||outbound.primaryProvider||'gmail',provider=outbound[key]||{};return {ready:!!(provider.enabled&&provider.connected),provider:key,senderName:provider.fromName||'',senderEmail:provider.fromEmail||'',adminCopyEmail:provider.fromEmail||''};}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    await ensureEmailAutomationSchema(env);
    const u=new URL(request.url),mode=clean(u.searchParams.get('mode')||'list');
    if(mode==='one')return json({ok:true,flow:await getEmailAutomation(env,u.searchParams.get('id'))});
    if(mode==='activity')return json({ok:true,activity:await emailAutomationActivity(env,u.searchParams.get('flowId'))});
    const [flows,sender,site,groups]=await Promise.all([
      listEmailAutomations(env),senderState(env),getSiteSettings(env).catch(()=>({})),
      env.DB.prepare('SELECT g.id,g.name,(SELECT COUNT(*) FROM email_automation_group_members m WHERE m.group_id=g.id) members FROM email_automation_groups g ORDER BY g.name').all().catch(()=>({results:[]}))
    ]);
    return json({ok:true,flows,templates:emailAutomationTemplates(),groups:groups.results||[],brand:{name:site.siteName||'IronPulse Gym',logoUrl:site.logoUrl||'',primaryColor:site.primaryColor||'#4B55BE',accentColor:site.accentColor||'#A469A8'},gmail:{...sender,senderName:sender.senderName||site.siteName||'IronPulse Gym'}});
  }catch(e){return json({error:e.message||'Email automations could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const b=await readJson(request),action=clean(b.action||'save');
    if(action==='save'){
      const candidate=b.flow||b;
      if(candidate.status==='active'){
        const sender=await senderState(env);if(!sender.ready)throw new Error('Connect, test and enable a primary email provider before activating this email automation. You can still save it as a draft.');
      }
      return json({ok:true,flow:await saveEmailAutomation(env,candidate)});
    }
    if(action==='status'){
      if(b.status==='active'){
        const sender=await senderState(env);if(!sender.ready)throw new Error('Connect, test and enable a primary email provider before activating this email automation.');
      }
      await setEmailAutomationStatus(env,b.id,b.status);return json({ok:true});
    }
    if(action==='delete')return json({ok:await deleteEmailAutomation(env,b.id)});
    if(action==='restore')return json({ok:true,flow:await restoreEmailAutomationVersion(env,b.flowId,b.versionId)});
    if(action==='activity')return json({ok:true,activity:await emailAutomationActivity(env,b.flowId)});
    if(action==='run_now')return json(await processEmailAutomations(env,{limit:60}));
    if(action==='test')return json({ok:true,result:await sendEmailAutomationTest(env,{step:b.step,email:b.email})});
    if(action==='preview'){
      const preview={name:b.sample?.name||'Zeenath Afreen',email:b.sample?.email||'zeenath@example.com',phone:b.sample?.phone||'+91 98765 43210',location:b.sample?.location||'Hyderabad, TS, IN',date_of_birth:'1995-09-16',age:31,gender:'Not specified',source:'Preview'};
      const base=preferredPublicOrigin(request,env);
      return json({ok:true,preview:await renderEmailAutomation(env,b.step||{},preview,{flowName:b.flowName||'Email Preview',stepName:b.step?.name||'Email Preview',planName:'Premium Membership',amount:'₹1,250',renewalDate:'30 September 2026',failureReason:'The bank declined the payment',retryPaymentUrl:`${base}/my-orders`,checkoutUrl:`${base}/checkout`,hoursLeft:'24',eventTitle:'Fitness Workshop Webinar',eventUrl:`${base}/webinars`,surveyUrl:`${base}/contact`,courseName:'Fitness Confidence Course'})});
    }
    return json({error:'Unsupported email automation action.'},400);
  }catch(e){return json({error:e.message||'Email automation action failed.',validationErrors:Array.isArray(e.validationErrors)?e.validationErrors:[]},400);}
}
