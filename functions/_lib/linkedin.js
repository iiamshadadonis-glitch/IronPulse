import { getSocialIntegrationSettings, setSetting } from './utils.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const now=()=>new Date().toISOString();

export function linkedinScopeList(v=''){
  return [...new Set(String(v||'').split(/[\s,]+/).map(x=>clean(x,120)).filter(Boolean))];
}
export function linkedinVersion(c={}){return /^20\d{4}$/.test(String(c.apiVersion||''))?String(c.apiVersion):'202608';}
export function linkedinPublishingIdentity(c={}){
  const identity=String(c.publishingIdentity||'').toLowerCase();
  if(identity==='organization'||identity==='member')return identity;
  return c.ownerType==='organization'?'organization':'member';
}
export function linkedinOrganizationId(c={}){return clean(c.organizationId||(c.ownerType==='organization'?c.ownerId:''),240);}
export function linkedinMemberId(c={}){return clean(c.memberId,300);}
export function linkedinActor(c={}){
  if(linkedinPublishingIdentity(c)==='organization'){
    const id=linkedinOrganizationId(c);return id?`urn:li:organization:${id}`:'';
  }
  const id=linkedinMemberId(c);return id?`urn:li:person:${id}`:'';
}
export function linkedinHeaders(token,c={},jsonBody=true){
  const h={authorization:`Bearer ${token}`,'Linkedin-Version':linkedinVersion(c),'X-Restli-Protocol-Version':'2.0.0'};
  if(jsonBody)h['content-type']='application/json';
  return h;
}

async function parseResponse(res,label){
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok){const detail=data?.error_description||data?.message||data?.detail||data?.status||text||`${label} failed (${res.status}).`;const e=new Error(`${label}: ${String(detail).slice(0,1200)}`);e.httpStatus=res.status;e.upstreamPayload=data;e.upstreamMessage=String(detail||'');throw e;}return data;
}

export async function getLinkedInAccessToken(env){
  const social=await getSocialIntegrationSettings(env),c=social.linkedin||{};let token=clean(c.accessToken,10000);
  if(!token)throw new Error('LinkedIn is not connected. Save the Client ID and Client Secret, add the callback URL in LinkedIn Developers, then click Connect LinkedIn.');
  const exp=Date.parse(c.tokenExpiresAt||'');
  if(!Number.isFinite(exp)||exp-Date.now()>5*60*1000)return token;
  if(!c.refreshToken){if(exp>Date.now())return token;throw new Error('The LinkedIn access token has expired. LinkedIn does not issue programmatic refresh tokens to every app, so click Connect LinkedIn again to renew authorization.');}
  if(!c.clientId||!c.clientSecret)throw new Error('The LinkedIn Client ID or Client Secret is missing. Save both values and reconnect LinkedIn.');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:c.refreshToken,client_id:c.clientId,client_secret:c.clientSecret});
  const data=await parseResponse(await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'LinkedIn token refresh');
  token=clean(data.access_token,10000);if(!token)throw new Error('LinkedIn refreshed authorization but did not return an access token. Reconnect LinkedIn.');
  const expires=Number(data.expires_in||5184000),refreshToken=clean(data.refresh_token||c.refreshToken,10000),refreshExpires=Number(data.refresh_token_expires_in||0);
  social.linkedin={...c,accessToken:token,refreshToken,tokenExpiresAt:new Date(Date.now()+expires*1000).toISOString(),refreshTokenExpiresAt:refreshExpires?new Date(Date.now()+refreshExpires*1000).toISOString():c.refreshTokenExpiresAt||'',lastError:'',connectionState:'connected'};
  await setSetting(env,'social_integration_settings',social);return token;
}

export async function saveLinkedInState(env,patch={}){
  const social=await getSocialIntegrationSettings(env);social.linkedin={...(social.linkedin||{}),...patch};await setSetting(env,'social_integration_settings',social);return social.linkedin;
}

export async function linkedinUserInfo(token){
  const data=await parseResponse(await fetch('https://api.linkedin.com/v2/userinfo',{headers:{authorization:`Bearer ${token}`}}),'LinkedIn profile check');
  let id=clean(data?.sub,300);
  let name=clean(data?.name||[data?.given_name,data?.family_name].filter(Boolean).join(' '),300);
  // OIDC `sub` is always safe for identity display, but LinkedIn's posting APIs use a Person URN.
  // When the app has profile permission, prefer the canonical `/v2/me` member id for that URN.
  try{
    const meRes=await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)',{headers:{authorization:`Bearer ${token}`,'X-Restli-Protocol-Version':'2.0.0'}});
    if(meRes.ok){
      const me=await meRes.json().catch(()=>({}));
      if(me?.id)id=clean(me.id,300);
      if(!name)name=clean([me?.localizedFirstName,me?.localizedLastName].filter(Boolean).join(' '),300);
    }
  }catch{}
  return {id,name,email:clean(data?.email,300),picture:clean(data?.picture,2000),raw:data};
}

export function linkedinRequestedScopes(c={}){
  // V16.44: keep the first OAuth connection deliberately minimal. LinkedIn rejects
  // the entire authorization request when even one requested permission has not
  // been provisioned for the developer app. `openid profile` comes from the
  // self-service “Sign in with LinkedIn using OpenID Connect” Product and is enough
  // to establish the connected member identity. Publishing / Community / Lead Sync
  // / Advertising scopes are added only when the matching feature is actually
  // enabled in the admin card, so an Organization selected for future use does not
  // make the basic OAuth connection fail before LinkedIn grants organization access.
  const scopes=new Set(['openid','profile']);
  const identity=linkedinPublishingIdentity(c);
  if(c.autoPublish)scopes.add(identity==='organization'?'w_organization_social':'w_member_social');
  if(c.communityEnabled){
    if(identity==='organization'){
      scopes.add('r_organization_social');
      scopes.add('r_organization_social_feed');
      scopes.add('w_organization_social');
      scopes.add('w_organization_social_feed');
      scopes.add('rw_organization_admin');
    }else{
      // LinkedIn currently exposes member write social-actions through
      // w_member_social_feed. r_member_social is a restricted/private permission,
      // so do not request a made-up r_member_social_feed scope that would cause
      // OAuth to fail with invalid_scope.
      scopes.add('w_member_social');
      scopes.add('w_member_social_feed');
    }
  }
  if(c.leadSyncEnabled){
    scopes.add('r_marketing_leadgen_automation');
    scopes.add('r_organization_admin');
    scopes.add('r_ads');
  }
  if(c.adsEnabled){scopes.add('r_ads');scopes.add('rw_ads');}
  return [...scopes];
}

export function linkedinCapabilitySnapshot(c={}){
  const scopes=linkedinScopeList(c.grantedScopes),has=s=>scopes.includes(s),identity=linkedinPublishingIdentity(c);
  const publishing=identity==='organization'?has('w_organization_social'):has('w_member_social');
  const commentRead=identity==='organization'?(has('r_organization_social_feed')||has('r_organization_social')):has('r_member_social');
  const commentWrite=identity==='organization'?(has('w_organization_social_feed')||has('w_organization_social')):(has('w_member_social_feed')||has('w_member_social'));
  const lead=has('r_marketing_leadgen_automation');
  const ads=has('r_ads')||has('rw_ads');
  return {scopes,identity,publishing,commentRead,commentWrite,lead,ads,checkedAt:now()};
}
