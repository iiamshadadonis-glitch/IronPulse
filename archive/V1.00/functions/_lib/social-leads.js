const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);

export function splitCsv(value='') {
  return String(value || '').split(',').map(x=>x.trim()).filter(Boolean);
}

export function constantTimeEqual(a='',b='') {
  a=String(a||''); b=String(b||'');
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

export async function socialEventExists(env,platform,eventId){
  if(!eventId)return false;
  const row=await env.DB.prepare('SELECT id FROM social_webhook_events WHERE platform=? AND external_event_id=? LIMIT 1').bind(clean(platform,40),clean(eventId,240)).first().catch(()=>null);
  return !!row;
}

export async function recordSocialEvent(env,{platform,eventId,externalLeadId='',leadId=null,eventType='',payload={},status='received',errorMessage=''}={}){
  if(!eventId)eventId=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO social_webhook_events(platform,external_event_id,external_lead_id,lead_id,event_type,payload_json,status,error_message,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(platform,external_event_id) DO UPDATE SET external_lead_id=COALESCE(NULLIF(excluded.external_lead_id,''),social_webhook_events.external_lead_id),lead_id=COALESCE(excluded.lead_id,social_webhook_events.lead_id),event_type=COALESCE(NULLIF(excluded.event_type,''),social_webhook_events.event_type),payload_json=excluded.payload_json,status=excluded.status,error_message=excluded.error_message,updated_at=CURRENT_TIMESTAMP`)
    .bind(clean(platform,40),clean(eventId,240),clean(externalLeadId,240),leadId||null,clean(eventType,120),JSON.stringify(payload||{}),clean(status,40),clean(errorMessage,1200)).run().catch(()=>{});
  return eventId;
}

export function normalizedLeadInput(fields={},meta={}){
  const first=clean(fields.first_name||fields.firstname||'',120);
  const last=clean(fields.last_name||fields.lastname||'',120);
  const name=clean(fields.full_name||fields.name||[first,last].filter(Boolean).join(' ')||fields.company_name||fields.organization||'Customer',160);
  return {
    name,
    phone:clean(fields.phone_number||fields.phone||fields.mobile_number||fields.mobile||fields.whatsapp||fields.whatsapp_number||'',80),
    email:clean(fields.email||fields.email_address||'',220),
    instagram_id:clean(fields.instagram_id||fields.instagram_username||fields.instagram_handle||fields.ig_username||'',160).replace(/^@/,''),
    facebook_id:clean(fields.facebook_id||fields.facebook_username||fields.facebook_handle||fields.fb_username||fields.facebook_profile||'',500),
    threads_id:clean(fields.threads_id||fields.threads_username||fields.threads_handle||fields.threads_profile||'',500),
    snapchat_id:clean(fields.snapchat_id||fields.snapchat_username||fields.snapchat_handle||fields.snapchat_profile||'',500),
    linkedin_id:clean(fields.linkedin_id||fields.linkedin_username||fields.linkedin_handle||fields.linkedin_profile||fields.linkedin_url||'',500),
    twitter_id:clean(fields.twitter_id||fields.twitter_username||fields.twitter_handle||fields.x_id||fields.x_username||fields.x_handle||fields.twitter_profile||fields.x_profile||'',500),
    pinterest_id:clean(fields.pinterest_id||fields.pinterest_username||fields.pinterest_handle||fields.pinterest_profile||'',500),
    youtube_id:clean(fields.youtube_id||fields.youtube_username||fields.youtube_handle||fields.youtube_channel||fields.youtube_profile||'',500),
    tiktok_id:clean(fields.tiktok_id||fields.tiktok_username||fields.tiktok_handle||fields.tiktok_profile||'',500),
    telegram_id:clean(fields.telegram_id||fields.telegram_username||fields.telegram_handle||fields.telegram_profile||'',500),
    age:clean(fields.age||'',20),
    gender:clean(fields.gender||'',80),
    current_occupation:clean(fields.current_occupation||fields.occupation||fields.job_title||fields.jobtitle||fields.profession||'',220),
    experience_level:clean(fields.experience_level||fields.experience||'',220),
    projects_count:clean(fields.projects_count||fields.projects_worked||'',20),
    future_goal:clean(fields.future_goal||fields.goal||'',500),
    role_interest:clean(fields.role_interest||fields.interested_role||fields.role||'',500),
    profile_message:clean(fields.profile_message||'',5000),
    message:clean(fields.message||fields.comments||fields.comment||fields.notes||meta.message||'',5000),
    source_detail:clean(meta.sourceDetail||meta.source_detail||'',300),
    interest_level:clean(meta.interestLevel||'Warm',40),
    assigned_to:clean(meta.assignedTo||'Admin',80)
  };
}

export function flattenMetaFieldData(fieldData=[]){
  const out={};
  for(const item of Array.isArray(fieldData)?fieldData:[]){
    const key=clean(item?.name,120).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    if(!key)continue;
    const values=Array.isArray(item?.values)?item.values:[];
    out[key]=values.map(v=>String(v??'').trim()).filter(Boolean).join(', ');
  }
  return out;
}

export function answerText(answer){
  if(answer===null||answer===undefined)return'';
  if(typeof answer==='string'||typeof answer==='number'||typeof answer==='boolean')return String(answer);
  if(Array.isArray(answer))return answer.map(answerText).filter(Boolean).join(', ');
  if(typeof answer==='object'){
    for(const k of ['text','value','localizedName','name','label'])if(answer[k]!==undefined){const v=answerText(answer[k]);if(v)return v;}
    for(const k of ['values','selectedOptions','multipleChoiceAnswer','textQuestionAnswer'])if(answer[k]!==undefined){const v=answerText(answer[k]);if(v)return v;}
  }
  return'';
}
