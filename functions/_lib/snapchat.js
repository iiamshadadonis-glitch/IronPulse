import { getSocialIntegrationSettings, setSetting } from './utils.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
export const SNAPCHAT_PROFILE_SCOPE='snapchat-profile-api';
const API='https://businessapi.snapchat.com';
const TOKEN='https://accounts.snapchat.com/login/oauth2/access_token';

function messageFrom(data,text,status,label){
  const sub=Array.isArray(data?.public_profiles)?data.public_profiles.find(x=>x?.sub_request_status==='ERROR'||x?.sub_request_error_reason):null;
  return clean(data?.display_message||data?.debug_message||data?.error_description||data?.error?.message||data?.message||sub?.sub_request_error_reason||text||`${label} failed (HTTP ${status}).`,2200);
}
async function snapJson(res,label){
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok||String(data?.request_status||'SUCCESS').toUpperCase()==='ERROR'){
    const e=new Error(`${label}: ${messageFrom(data,text,res.status,label)}`);e.httpStatus=res.status;e.upstreamPayload=data;e.upstreamCode=clean(data?.error_code||'',200);throw e;
  }
  return data;
}
async function save(env,patch={}){const social=await getSocialIntegrationSettings(env);social.snapchat={...(social.snapchat||{}),...patch};await setSetting(env,'social_integration_settings',social);return social.snapchat;}
const b64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};

export async function getSnapchatAccessToken(env){
  const social=await getSocialIntegrationSettings(env),c=social.snapchat||{},exp=Date.parse(c.tokenExpiresAt||'')||0;
  if(c.accessToken&&exp>Date.now()+120000)return c.accessToken;
  if(!c.refreshToken||!c.oauthClientId||!c.oauthClientSecret)throw new Error('Snapchat Business OAuth is not connected. Save the Business OAuth Client ID and Client Secret, then click Connect Snapchat.');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:c.refreshToken,client_id:c.oauthClientId,client_secret:c.oauthClientSecret});
  const data=await snapJson(await fetch(TOKEN,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Snapchat OAuth token refresh');
  if(!data.access_token)throw new Error('Snapchat refreshed authorization but did not return an access token. Reconnect Snapchat.');
  const patch={accessToken:clean(data.access_token),refreshToken:clean(data.refresh_token||c.refreshToken),tokenExpiresAt:new Date(Date.now()+Number(data.expires_in||3600)*1000).toISOString(),grantedScopes:clean(data.scope||c.grantedScopes,1000),lastError:''};
  await save(env,patch);return patch.accessToken;
}

function profileFrom(data){
  const rows=Array.isArray(data?.public_profiles)?data.public_profiles:[];
  return rows.map(x=>x?.public_profile||x).find(Boolean)||null;
}
export async function resolveSnapchatPublicProfile(env){
  const social=await getSocialIntegrationSettings(env),c=social.snapchat||{},token=await getSnapchatAccessToken(env);let profile=null;
  if(clean(c.publicProfileId,200)){
    const data=await snapJson(await fetch(`${API}/public/v1/public_profiles/${encodeURIComponent(clean(c.publicProfileId,200))}`,{headers:{authorization:`Bearer ${token}`}}),'Snapchat Public Profile lookup');profile=profileFrom(data);
  }else{
    const q=clean(c.publicProfileQuery,300);if(!q)throw new Error('Enter your Snapchat Public Profile username or display name, or paste the Public Profile ID, then run Test Connection.');
    const u=new URL(`${API}/public/v1/public_profiles/search`);u.searchParams.set('query',q);u.searchParams.set('limit','20');u.searchParams.set('includeStandard','true');
    const data=await snapJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'Snapchat Public Profile search');const rows=(Array.isArray(data?.public_profiles)?data.public_profiles:[]).map(x=>x?.public_profile||x).filter(Boolean);
    const ql=q.toLowerCase();profile=rows.find(x=>clean(x.snap_user_name,300).toLowerCase()===ql)||rows.find(x=>clean(x.display_name,300).toLowerCase()===ql)||rows[0]||null;
  }
  if(!profile?.id)throw new Error('Snapchat OAuth is working, but no matching Public Profile was found. Confirm the username/display name or paste the Public Profile ID and try again.');
  const patch={publicProfileId:clean(profile.id,200),publicProfileName:clean(profile.display_name||'Snapchat Public Profile',300),publicProfileUsername:clean(profile.snap_user_name||'',300)};await save(env,patch);return {...patch,token,raw:profile};
}

export async function testSnapchatConnection(env){
  try{
    const profile=await resolveSnapchatPublicProfile(env),u=new URL(`${API}/v1/public_profiles/${encodeURIComponent(profile.publicProfileId)}/stories`);u.searchParams.set('limit','1');
    await snapJson(await fetch(u,{headers:{authorization:`Bearer ${profile.token}`}}),'Snapchat Public Profile Story capability check');
    const social=await getSocialIntegrationSettings(env),c=social.snapchat||{},label=profile.publicProfileUsername?`@${profile.publicProfileUsername}`:profile.publicProfileName;
    const message=`Snapchat Business OAuth is working for ${label}. Public Profile read: Ready. Story read: Ready. Server-side Story publishing: Ready for this Public Profile. Optional Snap Kit: ${clean(c.snapKitClientId||c.clientId,600)?'configured for Login Kit / user-confirmed Creative Kit sharing':'not configured (optional)'}. Visitor comment moderation is not enabled by this integration.`;
    await save(env,{connectionState:'connected',connectedAt:c.connectedAt||new Date().toISOString(),publishingReady:true,lastTestedAt:new Date().toISOString(),lastTestMessage:message,lastError:''});
    return {ok:true,message,profileId:profile.publicProfileId,profileName:profile.publicProfileName,profileUsername:profile.publicProfileUsername,publishingReady:true};
  }catch(e){
    const m=clean(e.message,2200),allow=/403|allowlist|permission|authorization_permission_denied/i.test(m);const hint=allow?' Snapchat Public Profile API is allowlist-only. Create the OAuth App in Snapchat Business Details (not the Snap Kit Developer Portal), then send only its Client ID and your use case to your Snap contact for Public Profile API allowlisting.':'';
    const message=`${m}${hint}`;await save(env,{publishingReady:false,lastTestedAt:new Date().toISOString(),lastTestMessage:message,lastError:message}).catch(()=>{});throw Object.assign(new Error(message),e,{message});
  }
}

export async function uploadSnapchatStoryMedia(env,sourceUrl,name='DropBeat Dance Studio Story'){
  const social=await getSocialIntegrationSettings(env),c=social.snapchat||{},profile=await resolveSnapchatPublicProfile(env),token=profile.token,id=profile.publicProfileId,url=clean(sourceUrl,2400);
  if(!/^https:\/\//i.test(url))throw new Error('Snapchat Story publishing requires a public HTTPS image or video URL.');
  const r=await fetch(url,{headers:{accept:'image/*,video/*,application/octet-stream'}});if(!r.ok)throw new Error(`Snapchat could not download the Story media (HTTP ${r.status}).`);
  const len=Number(r.headers.get('content-length')||0);if(len>50*1024*1024)throw new Error('Snapchat Story media is larger than the 50 MB automatic-upload safety limit in this Worker build.');
  const original=new Uint8Array(await r.arrayBuffer());if(!original.byteLength)throw new Error('Snapchat Story media download returned an empty file.');if(original.byteLength>50*1024*1024)throw new Error('Snapchat Story media is larger than the 50 MB automatic-upload safety limit in this Worker build.');
  const mime=clean(r.headers.get('content-type')||'',120).split(';')[0].toLowerCase(),type=mime.startsWith('video/')?'VIDEO':'IMAGE';
  const key=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(16)),cryptoKey=await crypto.subtle.importKey('raw',key,{name:'AES-CBC'},false,['encrypt']),encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-CBC',iv},cryptoKey,original));
  const create=await snapJson(await fetch(`${API}/v1/public_profiles/${encodeURIComponent(id)}/media`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({type,name:clean(name,200)||'DropBeat Dance Studio Story',key:b64(key),iv:b64(iv)})}),'Snapchat media container creation');
  const mediaId=clean(create.media_id,300);if(!mediaId||!create.add_path||!create.finalize_path)throw new Error('Snapchat created no usable media upload container.');
  const chunkSize=32*1024*1024;let part=1;
  for(let off=0;off<encrypted.byteLength;off+=chunkSize,part++){
    const form=new FormData();form.set('action','ADD');form.set('part_number',String(part));form.set('file',new Blob([encrypted.slice(off,Math.min(off+chunkSize,encrypted.byteLength))],{type:'application/octet-stream'}),`story-part-${part}.bin`);
    const endpoint=new URL(clean(create.add_path,1600),API).toString();await snapJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`},body:form}),`Snapchat media upload part ${part}`);
  }
  const fin=new FormData();fin.set('action','FINALIZE');await snapJson(await fetch(new URL(clean(create.finalize_path,1600),API).toString(),{method:'POST',headers:{authorization:`Bearer ${token}`},body:fin}),'Snapchat media upload finalize');
  const story=await snapJson(await fetch(`${API}/v1/public_profiles/${encodeURIComponent(id)}/stories`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({media_id:mediaId})}),'Snapchat Story publish');
  const publicUrl=profile.publicProfileUsername?`https://www.snapchat.com/add/${encodeURIComponent(profile.publicProfileUsername)}`:'';
  await save(env,{connectionState:'connected',publishingReady:true,lastError:'',lastPublishStatus:'published',lastPublishAt:new Date().toISOString(),lastPublishError:'',lastPublishedUrl:publicUrl});
  return {ok:true,mediaId,profileId:id,url:publicUrl,raw:story};
}
