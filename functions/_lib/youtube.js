import { getSocialIntegrationSettings, setSetting } from './utils.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
export const YOUTUBE_SCOPES=[
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

async function save(env,patch={}){
  const social=await getSocialIntegrationSettings(env);
  social.youtube={...(social.youtube||{}),...patch};
  await setSetting(env,'social_integration_settings',social);
  return social.youtube;
}

export async function getYouTubeAccessToken(env){
  const social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  const expires=Date.parse(c.tokenExpiresAt||'')||0;
  if(c.accessToken&&expires>Date.now()+120000)return c.accessToken;
  if(!c.refreshToken||!c.clientId||!c.clientSecret)throw new Error('YouTube is not connected. Save the OAuth Client ID and Client Secret, then click Connect YouTube.');
  const body=new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
  if(!res.ok||!data.access_token)throw Object.assign(new Error(data.error_description||data.error||text||`YouTube token refresh failed (HTTP ${res.status}).`),{httpStatus:res.status});
  const accessToken=clean(data.access_token),tokenExpiresAt=new Date(Date.now()+Number(data.expires_in||3600)*1000).toISOString();
  await save(env,{accessToken,tokenExpiresAt,lastError:''});
  return accessToken;
}

export async function getYouTubeChannel(env){
  const token=await getYouTubeAccessToken(env);
  const res=await fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',{headers:{authorization:`Bearer ${token}`}});
  const text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
  if(!res.ok){const msg=data?.error?.message||text||`YouTube channel lookup failed (HTTP ${res.status}).`;throw Object.assign(new Error(msg),{httpStatus:res.status});}
  const item=Array.isArray(data.items)?data.items[0]:null;
  if(!item?.id)throw new Error('YouTube OAuth is valid, but no YouTube channel was returned for this Google account. Create/select a YouTube channel, then reconnect.');
  return {token,id:clean(item.id,200),name:clean(item.snippet?.title||'YouTube Channel',300),raw:item};
}

export async function testYouTubeConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  const channel=await getYouTubeChannel(env),scopes=clean(c.grantedScopes||'',5000).split(/\s+/).filter(Boolean);
  const upload=scopes.includes('https://www.googleapis.com/auth/youtube.upload');
  const comments=scopes.includes('https://www.googleapis.com/auth/youtube.force-ssl');
  const message=`YouTube authentication is working for ${channel.name}. Channel read: Ready. Video upload: ${upload?'Ready':'permission not granted'}. Comment reading/reply/moderation: ${comments?'Ready':'permission not granted'}. Text-only Community posts are not exposed by the YouTube Data API.`;
  await save(env,{connectionState:'connected',channelId:channel.id,channelName:channel.name,lastTestedAt:new Date().toISOString(),lastTestMessage:message,lastError:''});
  return {ok:true,message,channelId:channel.id,channelName:channel.name,grantedScopes:scopes,capabilities:{channelRead:true,videoUpload:upload,comments}};
}
