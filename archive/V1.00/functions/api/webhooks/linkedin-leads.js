import { json, getSocialIntegrationSettings, hmacHex } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { constantTimeEqual, socialEventExists, recordSocialEvent, normalizedLeadInput } from '../../_lib/social-leads.js';
import { getLinkedInAccessToken, linkedinHeaders as sharedLinkedInHeaders } from '../../_lib/linkedin.js';

const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
function leadResponseId(urn=''){return clean(String(urn||'').split(':').pop(),240);}
function formIdFromUrn(urn=''){const m=String(urn||'').match(/leadGenForm:(\d+)/);return m?m[1]:'';}
function linkedinHeaders(c,token){return sharedLinkedInHeaders(token,{...c,apiVersion:'202608'});}
async function liGet(c,token,path){
  if(!token)throw new Error('LinkedIn access token is not configured.');
  const r=await fetch(`https://api.linkedin.com/rest${path}`,{headers:linkedinHeaders(c,token)}),d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||d?.errorDetails?.message||`LinkedIn API failed (${r.status}).`);
  return d;
}
function localText(v){
  if(!v)return''; if(typeof v==='string')return v;
  if(v.localized&&typeof v.localized==='object'){const vals=Object.values(v.localized);if(vals.length)return clean(vals[0],500);}
  return clean(v.preferredLocale||'',500);
}
function normKey(v){return clean(v,160).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function optionText(question,id){
  const qd=question?.questionDetails||{};
  const choices=qd.multipleChoiceQuestionDetails?.options||qd.multipleChoiceQuestionDetails?.choices||[];
  const hit=(Array.isArray(choices)?choices:[]).find(o=>String(o?.id??o?.value??'')===String(id));
  return localText(hit?.label||hit?.text||hit?.option||hit?.name)||String(id);
}
function answerValue(a,q){
  const d=a?.answerDetails||{};
  if(d.textQuestionAnswer?.answer!==undefined)return clean(d.textQuestionAnswer.answer,2000);
  const opts=d.multipleChoiceAnswer?.options;
  if(Array.isArray(opts))return opts.map(x=>optionText(q,x)).filter(Boolean).join(', ');
  if(a?.accepted!==undefined&&typeof a.accepted!=='object')return String(a.accepted);
  return'';
}
function responseFields(response,form){
  const qmap=new Map((form?.content?.questions||[]).map(q=>[String(q.questionId),q]));
  const fields={};
  for(const a of response?.formResponse?.answers||[]){
    const q=qmap.get(String(a.questionId))||{};
    const val=answerValue(a,q);if(!val)continue;
    const predefined=String(q.predefinedField||'').toUpperCase();
    const byPre={FIRST_NAME:'first_name',LAST_NAME:'last_name',EMAIL:'email',PHONE_NUMBER:'phone_number',JOB_TITLE:'job_title',COMPANY_NAME:'company_name'};
    const key=byPre[predefined]||normKey(q.name||localText(q.question)||`question_${a.questionId}`);
    fields[key]=val;
  }
  return fields;
}
function ownerMatches(c,n){
  const configured=c.leadOwnerId||c.ownerId||'';if(!configured)return true;
  const owner=n?.owner||{};const urn=owner.sponsoredAccount||owner.organization||'';
  return String(urn).endsWith(`:${configured}`)||String(urn)===String(configured);
}

export async function onRequestGet({request,env}){
  const c=(await getSocialIntegrationSettings(env)).linkedin||{},u=new URL(request.url),challenge=clean(u.searchParams.get('challengeCode'),500);
  if(!c.enabled||!c.clientSecret||!challenge)return json({error:'LinkedIn webhook is not configured.'},403);
  const challengeResponse=await hmacHex(c.clientSecret,challenge);
  return json({challengeCode:challenge,challengeResponse});
}

export async function onRequestPost({request,env}){
  const c=(await getSocialIntegrationSettings(env)).linkedin||{};
  if(!c.enabled||!c.clientSecret)return json({error:'LinkedIn webhook is disabled.'},403);
  if(c.leadSyncEnabled!==true)return json({error:'LinkedIn Lead Sync is not enabled in Social Media API.'},403);
  const raw=await request.text(),sig=clean(request.headers.get('x-li-signature'),500).toLowerCase();
  const expected=(await hmacHex(c.clientSecret,`hmacsha256=${raw}`)).toLowerCase();
  if(!sig||!constantTimeEqual(sig,expected))return json({error:'Invalid LinkedIn webhook signature.'},401);
  let body;try{body=JSON.parse(raw);}catch(_){return json({error:'Invalid JSON'},400);}
  let token='';try{token=await getLinkedInAccessToken(env);}catch(e){return json({error:String(e?.message||e)},401);}
  const notifications=Array.isArray(body)?body:[body];let processed=0,duplicates=0,ignored=0,failed=0;
  for(const n of notifications){
    const leadUrn=clean(n?.leadGenFormResponse,500),occurred=clean(n?.occurredAt,80),eventId=clean(`${leadUrn}_${occurred}`,240)||crypto.randomUUID();
    if(await socialEventExists(env,'linkedin',eventId)){duplicates++;continue;}
    if(String(n?.type||'')!=='LEAD_ACTION'||String(n?.leadAction||'').toUpperCase()!=='CREATED'){
      ignored++;await recordSocialEvent(env,{platform:'linkedin',eventId,externalLeadId:leadUrn,eventType:clean(n?.leadAction||n?.type,120),payload:n,status:'ignored'});continue;
    }
    if(!ownerMatches(c,n)||String(n?.leadType||c.leadType||'').toUpperCase()!==String(c.leadType||'SPONSORED').toUpperCase()){
      ignored++;await recordSocialEvent(env,{platform:'linkedin',eventId,externalLeadId:leadUrn,eventType:'LEAD_ACTION',payload:n,status:'ignored',errorMessage:'Notification does not match the configured LinkedIn owner or lead type.'});continue;
    }
    try{
      const responseId=leadResponseId(leadUrn);if(!responseId)throw new Error('LinkedIn lead response ID is missing.');
      const response=await liGet(c,token,`/leadFormResponses/${encodeURIComponent(responseId)}`);
      const formId=formIdFromUrn(response.versionedLeadGenFormUrn||n.leadGenForm||'');
      const form=formId?await liGet(c,token,`/leadForms/${encodeURIComponent(formId)}`).catch(()=>({id:formId,name:`Lead Form ${formId}`,content:{questions:[]}})):{name:'LinkedIn Lead Form',content:{questions:[]}};
      const fields=responseFields(response,form);
      const campaign=response?.leadMetadataInfo?.sponsoredLeadMetadataInfo?.campaign?.name||'';
      const sourceDetail=['LinkedIn Lead Form',form?.name||'',campaign?`Campaign: ${campaign}`:'',String(response?.leadType||n?.leadType||'')].filter(Boolean).join(' • ');
      const input=normalizedLeadInput(fields,{sourceDetail});input.source_detail=sourceDetail;input.message=input.message||'Lead submitted through LinkedIn.';
      const merged=await mergeLeadSubmission(env,input,{submissionType:'social_lead',source:'linkedin',sourceDetail});
      await recordSocialEvent(env,{platform:'linkedin',eventId,externalLeadId:responseId,leadId:merged.lead?.id||null,eventType:'LEAD_ACTION_CREATED',payload:{notification:n,response,form:{id:form?.id,name:form?.name}},status:'processed'});
      processed++;
    }catch(err){failed++;await recordSocialEvent(env,{platform:'linkedin',eventId,externalLeadId:leadUrn,eventType:'LEAD_ACTION_CREATED',payload:n,status:'error',errorMessage:String(err?.message||err)});}
  }
  return json({ok:true,processed,duplicates,ignored,failed});
}
