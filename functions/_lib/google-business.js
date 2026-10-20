import { getSocialIntegrationSettings, setSetting } from './utils.js';
import { brandHomeUrl } from './branded-email.js';
import { diagnoseIntegrationError, successMessage } from './integration-diagnostics.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const stripHtml=v=>String(v||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();
const now=()=>new Date().toISOString();

async function parseResponse(res,label){
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok){
    const detail=data?.error?.message||data?.message||data?.error_description||data?.error||text||`${label} failed.`;
    const e=new Error(`${label} failed (HTTP ${res.status}): ${clean(detail,1200)}`);e.httpStatus=res.status;e.source='google_business';e.upstreamMessage=clean(detail,1200);e.upstreamCode=String(data?.error?.code||'');e.upstreamPayload=data;throw e;
  }
  return data;
}

export async function saveGoogleBusinessState(env,patch={}){
  const s=await getSocialIntegrationSettings(env);s.googleBusiness={...(s.googleBusiness||{}),...patch};await setSetting(env,'social_integration_settings',s);return s.googleBusiness;
}

export async function googleBusinessAccessToken(env,config=null){
  const s=await getSocialIntegrationSettings(env),c=config||s.googleBusiness||{};
  if(!c.clientId||!c.clientSecret||!c.refreshToken)throw new Error('Google Business Profile is not connected. Save the OAuth Client ID/Secret and click Connect Google Business Profile.');
  const body=new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data=await parseResponse(res,'Google Business Profile OAuth token refresh');
  if(!data.access_token)throw new Error('Google Business Profile OAuth did not return an access token. Disconnect and connect again.');
  return data.access_token;
}

function normalizedId(v,prefix){return clean(v,300).replace(new RegExp(`^${prefix}/`,'i'),'');}
export function googleBusinessParent(c={}){
  const accountId=normalizedId(c.accountId,'accounts'),locationId=normalizedId(c.locationId,'locations');
  if(!accountId||!locationId)throw new Error('Choose a Google Business Profile account and business location before using posts or reviews.');
  return `accounts/${accountId}/locations/${locationId}`;
}

export async function discoverGoogleBusiness(env,{accountId=''}={}){
  const s=await getSocialIntegrationSettings(env),c=s.googleBusiness||{},token=await googleBusinessAccessToken(env,c);
  try{
    const a=await parseResponse(await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20',{headers:{authorization:`Bearer ${token}`}}),'Google Business Profile Account Management API');
    const accounts=(a.accounts||[]).map(x=>({id:normalizedId(x.name,'accounts'),name:clean(x.accountName||x.name,300),role:clean(x.role,100),type:clean(x.type,100)})).filter(x=>x.id);
    let chosen=normalizedId(accountId||c.accountId,'accounts');if(chosen&&!accounts.some(x=>x.id===chosen))chosen='';if(!chosen&&accounts.length===1)chosen=accounts[0].id;
    let locations=[],businessInformationReady=null;
    if(chosen){
      const url=`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(chosen)}/locations?readMask=name,title,storeCode,websiteUri&pageSize=100`;
      const l=await parseResponse(await fetch(url,{headers:{authorization:`Bearer ${token}`}}),'Google Business Profile Business Information API');
      locations=(l.locations||[]).map(x=>({id:normalizedId(x.name,'locations'),name:clean(x.title||x.storeCode||x.name,300),storeCode:clean(x.storeCode,120),websiteUri:clean(x.websiteUri,1000)})).filter(x=>x.id);
      businessInformationReady=true;
    }
    const msg=`OAuth is connected and the My Business Account Management API is working. Loaded ${accounts.length} Business Profile account(s)${chosen?` and ${locations.length} location(s) for the selected account`:''}.`;
    await saveGoogleBusinessState(env,{lastDiscoveryAt:now(),apiAccessStatus:'account_discovery_ready',accountManagementReady:true,businessInformationReady,lastApiAccessMessage:msg,lastError:''}).catch(()=>{});
    return {ok:true,accounts,locations,selectedAccountId:chosen,apiAccess:{oauthReady:true,accountManagementReady:true,businessInformationReady,postsReviewsReady:c.postsReviewsReady??null},message:msg};
  }catch(e){
    const d=diagnoseIntegrationError('google_business',e,{action:'account/location discovery'});
    const approvalRequired=Number(d.httpStatus)===429||/quota.*0|basic api access|project.*access/i.test(`${d.problem} ${d.solution}`);
    await saveGoogleBusinessState(env,{lastDiscoveryAt:now(),apiAccessStatus:approvalRequired?'approval_required':'discovery_failed',accountManagementReady:false,businessInformationReady:null,postsReviewsReady:null,lastApiAccessMessage:d.message,lastError:d.message}).catch(()=>{});
    throw Object.assign(new Error(d.message),e,{message:d.message,diagnostic:d});
  }
}

export async function testGoogleBusiness(env){
  const s=await getSocialIntegrationSettings(env),c=s.googleBusiness||{},token=await googleBusinessAccessToken(env,c);
  if(!c.accountId||!c.locationId){
    const discovery=await discoverGoogleBusiness(env,{accountId:c.accountId||''});
    const message=`Google OAuth and Account Management API access are working${discovery.accounts?.length?` and ${discovery.accounts.length} Business Profile account(s) were found`:''}. Select a Business Profile account and verified location, click Save Settings, then run Test Connection again to verify Posts and Reviews access.`;
    await saveGoogleBusinessState(env,{lastTestedAt:now(),apiAccessStatus:'account_discovery_ready',accountManagementReady:true,businessInformationReady:discovery.apiAccess?.businessInformationReady??null,postsReviewsReady:null,lastApiAccessMessage:message,lastError:''}).catch(()=>{});
    return {ok:true,ready:false,partial:true,accounts:discovery.accounts||[],locations:discovery.locations||[],selectedAccountId:discovery.selectedAccountId||'',message};
  }
  const parent=googleBusinessParent(c);
  try{
    const posts=await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts?pageSize=1`,{headers:{authorization:`Bearer ${token}`}});
    await parseResponse(posts,'Google Business Profile Posts API');
    const reviews=await fetch(`https://mybusiness.googleapis.com/v4/${parent}/reviews?pageSize=1`,{headers:{authorization:`Bearer ${token}`}});
    await parseResponse(reviews,'Google Business Profile Reviews API');
    const message=`Google Business Profile authentication and API access are working${c.locationName?` for ${c.locationName}`:''}. Account discovery, local Posts and Google Maps Reviews access passed live reads.`;
    await saveGoogleBusinessState(env,{lastTestedAt:now(),apiAccessStatus:'ready',accountManagementReady:true,businessInformationReady:true,postsReviewsReady:true,lastApiAccessMessage:message,lastError:''});
    return {ok:true,ready:true,message};
  }catch(e){
    const d=diagnoseIntegrationError('google_business',e,{action:'Posts / Reviews connection test'});
    const approvalRequired=Number(d.httpStatus)===429||/quota.*0|basic api access|project.*access/i.test(`${d.problem} ${d.solution}`);
    await saveGoogleBusinessState(env,{lastTestedAt:now(),apiAccessStatus:approvalRequired?'approval_required':'posts_reviews_failed',postsReviewsReady:false,lastApiAccessMessage:d.message,lastError:d.message}).catch(()=>{});
    throw Object.assign(new Error(d.message),e,{message:d.message,diagnostic:d});
  }
}

async function logPublish(env,articleKey,{articleUrl='',externalId='',status='pending',details={}}={}){
  await env.DB.prepare(`INSERT INTO social_publish_log(platform,article_key,article_url,external_id,status,details_json,created_at,updated_at)
    VALUES('google_business',?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(platform,article_key) DO UPDATE SET article_url=excluded.article_url,external_id=excluded.external_id,status=excluded.status,details_json=excluded.details_json,updated_at=CURRENT_TIMESTAMP`)
    .bind(articleKey,articleUrl,externalId,status,JSON.stringify(details||{})).run().catch(()=>{});
}

function gbPublishKey(url=''){return clean(`url:${clean(url,260)}`,300);}
async function claimGoogleBusinessPublish(env,articleUrl=''){
  const url=clean(articleUrl,2000),key=gbPublishKey(url),claimId=`${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  const old=await env.DB.prepare("SELECT * FROM social_publish_log WHERE platform='google_business' AND article_url=? ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'publishing' THEN 1 ELSE 2 END,updated_at DESC LIMIT 1").bind(url).first().catch(()=>null);
  if(old?.status==='published')return {claimed:false,key:old.article_key||key,row:old,reason:'published'};
  const age=old?Date.now()-Date.parse(old.updated_at||old.created_at||''):Infinity;if(old?.status==='publishing'&&Number.isFinite(age)&&age<6*60*60*1000)return {claimed:false,key:old.article_key||key,row:old,reason:'publishing'};
  await env.DB.prepare("INSERT OR IGNORE INTO social_publish_log(platform,article_key,article_url,external_id,status,details_json,created_at,updated_at) VALUES('google_business',?,?, '', 'publishing',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(key,url,JSON.stringify({claimId,claimedAt:now()})).run().catch(()=>{});
  let row=await env.DB.prepare("SELECT * FROM social_publish_log WHERE platform='google_business' AND article_key=? LIMIT 1").bind(key).first().catch(()=>null),details={};try{details=JSON.parse(row?.details_json||'{}');}catch{}
  if(row?.status==='publishing'&&details.claimId===claimId)return {claimed:true,key,row};
  if(row?.status==='published')return {claimed:false,key,row,reason:'published'};
  if(row?.status==='publishing'&&Date.now()-Date.parse(row.updated_at||row.created_at||'')<6*60*60*1000)return {claimed:false,key,row,reason:'publishing'};
  await env.DB.prepare("UPDATE social_publish_log SET article_url=?,external_id='',status='publishing',details_json=?,updated_at=CURRENT_TIMESTAMP WHERE platform='google_business' AND article_key=? AND status<>'published' AND (status<>'publishing' OR updated_at<=datetime('now','-6 hours'))").bind(url,JSON.stringify({claimId,claimedAt:now()}),key).run().catch(()=>{});
  row=await env.DB.prepare("SELECT * FROM social_publish_log WHERE platform='google_business' AND article_key=? LIMIT 1").bind(key).first().catch(()=>null);try{details=JSON.parse(row?.details_json||'{}');}catch{details={};}
  return {claimed:row?.status==='publishing'&&details.claimId===claimId,key,row,reason:row?.status||'publishing'};
}

export async function publishGoogleBusinessArticle(env,article={}){
  const s=await getSocialIntegrationSettings(env),c=s.googleBusiness||{};
  if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'Google Business Profile automatic publishing is disabled.'};
  const slug=clean(article.slug||article.post_slug||article.id||'fitness-update',220).replace(/^\/+|\/+$/g,''),home=brandHomeUrl(env),localUrl=`${home}/blog/${encodeURIComponent(slug)}`;
  const title=clean(article.title||'Fitness Tip',240),summary=clean(article.excerpt||article.body_text||stripHtml(article.body_html||''),1200),cover=clean(article.cover_image_url||article.coverImageUrl||'',2000);let logKey=gbPublishKey(localUrl);
  try{
    const claim=await claimGoogleBusinessPublish(env,localUrl);logKey=claim.key;if(!claim.claimed)return {ok:true,skipped:true,reason:claim.reason==='published'?'Already published to Google Business Profile.':'Google Business Profile publishing is already in progress for this fitness tip; duplicate publishing was prevented.',externalId:claim.row?.external_id||''};
    const token=await googleBusinessAccessToken(env,c),parent=googleBusinessParent(c),text=clean(`${title}${summary?`\n\n${summary}`:''}`,1450),payload={languageCode:'en-IN',summary:text,topicType:'STANDARD',callToAction:{actionType:'LEARN_MORE',url:localUrl}};if(/^https:\/\//i.test(cover))payload.media=[{mediaFormat:'PHOTO',sourceUrl:cover}];
    const data=await parseResponse(await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'Google Business Profile local post');const externalId=clean(data?.name||'',500);
    await logPublish(env,logKey,{articleUrl:localUrl,externalId,status:'published',details:{title,cover,searchUrl:data?.searchUrl||'',publishedAt:now()}});await saveGoogleBusinessState(env,{lastPublishedAt:now(),lastError:''});return {ok:true,externalId,searchUrl:data?.searchUrl||'',url:localUrl};
  }catch(e){const d=diagnoseIntegrationError('google_business',e,{action:'automatic local-post publishing'});await logPublish(env,logKey,{articleUrl:localUrl,status:'failed',details:{title,cover,error:d.message}});await saveGoogleBusinessState(env,{lastError:d.message}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}

export async function listGoogleBusinessReviews(env,{pageSize=100}={}){
  const s=await getSocialIntegrationSettings(env),c=s.googleBusiness||{},token=await googleBusinessAccessToken(env,c),parent=googleBusinessParent(c);
  const data=await parseResponse(await fetch(`https://mybusiness.googleapis.com/v4/${parent}/reviews?pageSize=${Math.max(1,Math.min(100,Number(pageSize)||100))}&orderBy=${encodeURIComponent('updateTime desc')}`,{headers:{authorization:`Bearer ${token}`}}),'Google Business Profile reviews');
  await saveGoogleBusinessState(env,{lastReviewsSyncAt:now(),lastError:''}).catch(()=>{});
  return data;
}

export async function replyGoogleBusinessReview(env,reviewId,comment){
  const s=await getSocialIntegrationSettings(env),c=s.googleBusiness||{},token=await googleBusinessAccessToken(env,c),parent=googleBusinessParent(c),id=clean(reviewId,500),text=clean(comment,4096);
  if(!id||!text)throw new Error('Review ID and reply text are required.');
  const name=id.includes('/reviews/')?id:`${parent}/reviews/${id}`;
  const data=await parseResponse(await fetch(`https://mybusiness.googleapis.com/v4/${name}/reply`,{method:'PUT',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({comment:text})}),'Google Business Profile review reply');
  return {ok:true,reply:data};
}
