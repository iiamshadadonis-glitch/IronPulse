import { getSocialIntegrationSettings, getSiteSettings, setSetting } from './utils.js';
import { brandHomeUrl } from './branded-email.js';
import { publishGoogleBusinessArticle } from './google-business.js';
import { diagnoseIntegrationError, isAuthenticationFailure, successMessage } from './integration-diagnostics.js';
import { getYouTubeAccessToken } from './youtube.js';
import { uploadSnapchatStoryMedia } from './snapchat.js';
import { getLinkedInAccessToken, linkedinUserInfo, linkedinCapabilitySnapshot, linkedinPublishingIdentity, linkedinOrganizationId, linkedinMemberId, linkedinActor, linkedinHeaders, linkedinVersion, saveLinkedInState } from './linkedin.js';
import { publishTelegramArticle } from './telegram.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
const now=()=>new Date().toISOString();
const stripHtml=v=>String(v||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();

async function responseJson(res,label){
  const text=await res.text().catch(()=>'');
  let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok||data?.error){
    const firstArrayError=Array.isArray(data?.errors)&&data.errors.length?data.errors[0]:null;
    const detail=data?.error?.message||data?.detail||firstArrayError?.detail||data?.message||data?.error_description||firstArrayError?.message||data?.title||firstArrayError?.title||data?.error||text||`${label} failed.`;
    const e=new Error(`${label}: ${String(detail).slice(0,1200)}`);
    e.httpStatus=Number(res.status||data?.error?.code||firstArrayError?.status||0)||0;
    e.upstreamCode=String(data?.error?.code||data?.code||data?.reason||firstArrayError?.code||'');
    e.upstreamSubcode=String(data?.error?.error_subcode||data?.error_subcode||'');
    e.upstreamMessage=String(detail||'');
    e.upstreamPayload=data;
    e.upstreamType=String(data?.type||firstArrayError?.type||'');
    e.upstreamReason=String(data?.reason||firstArrayError?.reason||'');
    e.upstreamTitle=String(data?.title||firstArrayError?.title||'');
    throw e;
  }
  return data;
}

async function savePlatformState(env,platform,patch={}){
  const social=await getSocialIntegrationSettings(env);
  social[platform]={...(social[platform]||{}),...patch};
  await setSetting(env,'social_integration_settings',social);
  return social[platform];
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function publishFailureState(env,platform,error){
  const diag=diagnoseIntegrationError(platform,error,{action:'automatic publishing'});
  const patch={lastError:diag.message,lastPublishError:diag.message,lastPublishStatus:'failed',lastPublishAt:now()};
  if(isAuthenticationFailure(error))patch.connectionState='disconnected';
  await savePlatformState(env,platform,patch).catch(()=>{});
  return diag;
}

async function waitForInstagramContainer(c,version,containerId){
  const id=clean(containerId,400);if(!id)throw new Error('Instagram media container ID is missing.');
  let lastStatus='';
  for(let attempt=0;attempt<12;attempt++){
    const u=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}`);
    u.searchParams.set('fields','id,status_code,status');u.searchParams.set('access_token',c.pageAccessToken);
    const data=await responseJson(await fetch(u),'Instagram media container status');
    const status=String(data?.status_code||'').toUpperCase();lastStatus=clean(data?.status||status||lastStatus,500);
    if(status==='FINISHED')return data;
    if(status==='ERROR'||status==='EXPIRED')throw new Error(`Instagram media container ${status.toLowerCase()}: ${lastStatus||'Meta could not prepare the image for publishing.'}`);
    if(attempt<11)await sleep(1500);
  }
  throw new Error(`Instagram media container was not ready after the verification window${lastStatus?`: ${lastStatus}`:''}. Meta did not confirm FINISHED, so the website did not call media_publish.`);
}

const INSTAGRAM_CLOUDINARY_CLOUD='dfu0lha8d';
const INSTAGRAM_CLOUDINARY_PRESET='blog_imageuploads';
const INSTAGRAM_WIDTH=1080,INSTAGRAM_HEIGHT=1350;

function cloudinaryText(v=''){return encodeURIComponent(encodeURIComponent(String(v||'').replace(/[\r\n]+/g,' ').trim()));}
function cloudinaryPublicId(v=''){return String(v||'').split('/').map(x=>encodeURIComponent(x)).join('/');}
function cloudinaryOverlayId(v=''){return String(v||'').split('/').map(x=>encodeURIComponent(x)).join(':');}
function normalizeHex(v,fallback='#4B55BE'){const raw=String(v||'').trim();return /^#?[0-9a-f]{6}$/i.test(raw)?`#${raw.replace('#','').toUpperCase()}`:fallback;}
function hexForCloudinary(v,fallback='8A0505'){return normalizeHex(v,`#${fallback}`).replace('#','');}
function brandAssetUrl(env,url=''){const v=clean(url,2000);return /^https?:\/\//i.test(v)?v:`${brandHomeUrl(env)}${v.startsWith('/')?'':'/'}${v||'/assets/dropbeat-logo.svg'}`;}
function wrapInstagramText(value='',maxChars=32,maxLines=4){
  const words=clean(value,400).replace(/\s+/g,' ').split(' ').filter(Boolean),lines=[];let line='';
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(next.length<=maxChars||!line)line=next;
    else{lines.push(line);line=word;if(lines.length===maxLines-1)break;}
  }
  if(line&&lines.length<maxLines)lines.push(line);
  const full=words.join(' '),consumed=lines.join(' ').length;
  if(full.length>consumed&&lines.length){const limit=Math.max(12,maxChars-2);lines[lines.length-1]=`${lines[lines.length-1].replace(/[.…]+$/,'').slice(0,limit).trim()}…`;}
  return lines.filter(Boolean);
}
function instagramTitleLayout(title=''){
  const raw=clean(title,260),len=raw.length;
  if(len>78)return {lines:wrapInstagramText(raw,31,3),size:38,gap:48,start:174};
  if(len>52)return {lines:wrapInstagramText(raw,32,3),size:42,gap:52,start:170};
  return {lines:wrapInstagramText(raw,32,2),size:48,gap:58,start:176};
}
function instagramBrandFont(name=''){const n=clean(name,120).length;return n>28?17:n>20?19:22;}
async function fetchImageBlob(url,label){
  const target=clean(url,2400);if(!/^https:\/\//i.test(target))throw new Error(`${label} must be a public HTTPS image URL.`);
  const res=await fetch(target,{headers:{accept:'image/*'}});if(!res.ok)throw new Error(`${label} download failed (HTTP ${res.status}).`);
  const type=String(res.headers.get('content-type')||'').split(';')[0].toLowerCase();if(!type.startsWith('image/'))throw new Error(`${label} returned ${type||'a non-image response'} instead of an image.`);
  const bytes=await res.arrayBuffer();if(!bytes.byteLength)throw new Error(`${label} returned an empty image.`);if(bytes.byteLength>15*1024*1024)throw new Error(`${label} is larger than 15 MB. Use a smaller public cover image.`);
  return new Blob([bytes],{type});
}
async function uploadInstagramAsset(url,label){
  const blob=await fetchImageBlob(url,label),form=new FormData();
  form.append('file',blob,`${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'instagram-image'}-${Date.now()}`);
  form.append('upload_preset',INSTAGRAM_CLOUDINARY_PRESET);
  const data=await responseJson(await fetch(`https://api.cloudinary.com/v1_1/${INSTAGRAM_CLOUDINARY_CLOUD}/image/upload`,{method:'POST',body:form}),`${label} Cloudinary upload`);
  if(!data?.public_id)throw new Error(`${label} upload did not return a Cloudinary public ID.`);
  return data;
}
async function buildInstagramBrandedImage(env,info){
  const [site,social]=await Promise.all([getSiteSettings(env).catch(()=>({})),getSocialIntegrationSettings(env).catch(()=>({}))]);
  const brandName=clean(site?.siteName,120)||'DropBeat Dance Studio';
  const tagline=clean(site?.tagline,180)||'Online and studio dance classes for every level';
  const primary=hexForCloudinary(site?.primaryColor,'8A0505');
  const accent=hexForCloudinary(site?.accentColor,'FFD45A');
  const background='FFFAF4',muted='755E67';
  const handle=clean(social?.instagram?.username,100).replace(/^@+/,'');
  const followLine=handle?`For more dance class updates, follow @${handle} on Instagram`:`For more dance class updates, follow ${brandName} on Instagram`;
  // Keep the follow helper on one line by reducing its font rather than wrapping it.
  const followFont=followLine.length>112?10:followLine.length>96?11:followLine.length>82?12:13;
  const taglineLines=wrapInstagramText(tagline,42,2);
  const logoUrl=brandAssetUrl(env,site?.logoUrl||'/assets/dropbeat-logo.svg');
  const [source,logo]=await Promise.all([uploadInstagramAsset(info.cover,'Article cover image'),uploadInstagramAsset(logoUrl,`${brandName} logo`)]);
  // V16.25 layout: brand header -> full non-cropped dance class image -> title/footer block.
  // c_fit preserves the complete source image. c_pad places it in the upper-middle portion.
  const title=instagramTitleLayout(info.title),steps=[
    'c_fit,w_1000,h_760',
    `c_pad,w_${INSTAGRAM_WIDTH},h_${INSTAGRAM_HEIGHT},g_north,y_172,b_rgb:${background}`,
    `bo_8px_solid_rgb:${primary}`
  ];
  // Top-left brand identity.
  steps.push(`l_${cloudinaryOverlayId(logo.public_id)},c_fit,w_72,h_72`);steps.push('fl_layer_apply,g_north_west,x_54,y_34');
  steps.push(`l_text:Arial_${instagramBrandFont(brandName)}_bold:${cloudinaryText(brandName)},co_rgb:${primary}`);steps.push('fl_layer_apply,g_north_west,x_144,y_42');
  taglineLines.forEach((line,i)=>{steps.push(`l_text:Arial_11:${cloudinaryText(line)},co_rgb:${muted}`);steps.push(`fl_layer_apply,g_north_west,x_144,y_${76+(i*17)}`);});
  // Top-right application cue.
  steps.push(`l_text:Arial_18_bold:${cloudinaryText('APPLY NOW')},co_rgb:${primary}`);steps.push('fl_layer_apply,g_north_east,x_58,y_42');
  const applyHelper=info.firstCommentEnabled?'Apply link in caption & first comment':'Apply link in caption';
  steps.push(`l_text:Arial_11:${cloudinaryText(applyHelper)},co_rgb:${muted}`);steps.push('fl_layer_apply,g_north_east,x_58,y_76');
  // Lower title block. The title stays centered and automatically reduces for longer titles.
  // Keep the title visually centred in the lower white panel and reserve the final rows for the footer.
  const titleStart=1018;
  title.lines.forEach((line,i)=>{steps.push(`l_text:Arial_${title.size}_bold:${cloudinaryText(line)},co_rgb:${primary}`);steps.push(`fl_layer_apply,g_north,y_${titleStart+(i*title.gap)}`);});
  // V16.27 footer: anchor the final two lines near the bottom edge with a small, consistent safe margin.
  const verifiedY=1244;
  const followY=1292;
  steps.push(`l_text:Arial_18_bold:${cloudinaryText('DANCE CLASS UPDATES')},co_rgb:${primary}`);steps.push(`fl_layer_apply,g_north,y_${verifiedY}`);
  steps.push(`l_text:Arial_20_bold:${cloudinaryText('•')},co_rgb:${accent}`);steps.push(`fl_layer_apply,g_north,x_-170,y_${verifiedY-2}`);
  steps.push(`l_text:Arial_20_bold:${cloudinaryText('•')},co_rgb:${accent}`);steps.push(`fl_layer_apply,g_north,x_170,y_${verifiedY-2}`);
  steps.push(`l_text:Arial_${followFont}:${cloudinaryText(followLine)},co_rgb:${muted}`);steps.push(`fl_layer_apply,g_north,y_${followY}`);
  steps.push('q_auto:good,f_jpg');
  const version=source.version?`v${source.version}/`:'';
  const finalUrl=`https://res.cloudinary.com/${INSTAGRAM_CLOUDINARY_CLOUD}/image/upload/${steps.join('/')}/${version}${cloudinaryPublicId(source.public_id)}.jpg`;
  const check=await fetch(finalUrl,{headers:{accept:'image/jpeg,image/*'}});if(!check.ok)throw new Error(`Branded Instagram image could not be generated (HTTP ${check.status}).`);
  const finalType=String(check.headers.get('content-type')||'').toLowerCase();if(finalType&&!finalType.includes('image/jpeg'))throw new Error(`Branded Instagram image was generated as ${finalType}, but Instagram image publishing requires JPEG.`);
  return {url:finalUrl,width:INSTAGRAM_WIDTH,height:INSTAGRAM_HEIGHT,format:'jpeg',sourcePublicId:source.public_id,logoPublicId:logo.public_id,titleLines:title.lines,brandName,tagline,instagramHandle:handle,followLine,applyHelper,primaryColor:`#${primary}`,accentColor:`#${accent}`,layout:'header-image-footer-v16.27'};
}

async function logRead(env,platform,articleKey){
  return env.DB.prepare('SELECT * FROM social_publish_log WHERE platform=? AND article_key=? LIMIT 1').bind(platform,articleKey).first().catch(()=>null);
}
async function logWrite(env,platform,articleKey,{articleUrl='',externalId='',status='pending',details={}}={}){
  await env.DB.prepare(`INSERT INTO social_publish_log(platform,article_key,article_url,external_id,status,details_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(platform,article_key) DO UPDATE SET article_url=excluded.article_url,external_id=excluded.external_id,status=excluded.status,details_json=excluded.details_json,updated_at=CURRENT_TIMESTAMP`)
    .bind(platform,articleKey,articleUrl,externalId,status,JSON.stringify(details||{})).run().catch(()=>{});
}

function publicationKey(info={}){return clean(`url:${clean(info.localUrl,260)}`,300);}
function rowAgeMs(row){const t=Date.parse(row?.updated_at||row?.created_at||'');return Number.isFinite(t)?Date.now()-t:Number.POSITIVE_INFINITY;}
async function claimPublish(env,platform,info={}){
  const url=clean(info.localUrl,2000),key=publicationKey(info),claimId=`${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  // First honor any existing successful row from older versions, even if it used
  // a Blogger ID as article_key instead of the final URL-derived key.
  const byUrl=url?await env.DB.prepare(`SELECT * FROM social_publish_log WHERE platform=? AND article_url=? ORDER BY CASE status WHEN 'published' THEN 0 WHEN 'publishing' THEN 1 ELSE 2 END,updated_at DESC LIMIT 1`).bind(platform,url).first().catch(()=>null):null;
  if(byUrl?.status==='published')return {claimed:false,articleKey:byUrl.article_key||key,row:byUrl,reason:'published'};
  if(byUrl?.status==='publishing'&&rowAgeMs(byUrl)<6*60*60*1000)return {claimed:false,articleKey:byUrl.article_key||key,row:byUrl,reason:'publishing'};
  await env.DB.prepare(`INSERT OR IGNORE INTO social_publish_log(platform,article_key,article_url,external_id,status,details_json,created_at,updated_at) VALUES(?,?,?,'','publishing',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(platform,key,url,JSON.stringify({claimId,claimedAt:now()})).run().catch(()=>{});
  let row=await logRead(env,platform,key),details=jsonObjSafe(row?.details_json);
  if(row?.status==='published')return {claimed:false,articleKey:key,row,reason:'published'};
  if(row?.status==='publishing'&&details.claimId===claimId)return {claimed:true,articleKey:key,row,claimId};
  if(row?.status==='publishing'&&rowAgeMs(row)<6*60*60*1000)return {claimed:false,articleKey:key,row,reason:'publishing'};
  await env.DB.prepare(`UPDATE social_publish_log SET article_url=?,external_id='',status='publishing',details_json=?,updated_at=CURRENT_TIMESTAMP WHERE platform=? AND article_key=? AND status<>'published' AND (status<>'publishing' OR updated_at<=datetime('now','-6 hours'))`).bind(url,JSON.stringify({claimId,claimedAt:now()}),platform,key).run().catch(()=>{});
  row=await logRead(env,platform,key);details=jsonObjSafe(row?.details_json);
  if(row?.status==='publishing'&&details.claimId===claimId)return {claimed:true,articleKey:key,row,claimId};
  return {claimed:false,articleKey:key,row,reason:row?.status||'publishing'};
}
function jsonObjSafe(v){try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{});}catch{return{};}}
function claimSkip(platform,claim){return {ok:true,skipped:true,reason:claim?.reason==='published'?`This article was already published to ${platform}.`:`${platform} publishing is already in progress for this article; duplicate publishing was prevented.`,externalId:claim?.row?.external_id||''};}

function articleInfo(env,article={}){
  const slug=clean(article.slug||article.post_slug||article.id||'article',220).replace(/^\/+|\/+$/g,'');
  const home=brandHomeUrl(env);
  const localUrl=`${home}/blog/${encodeURIComponent(slug)}`;
  const title=clean(article.title||'Article',240);
  const body=clean(article.excerpt||article.body_text||stripHtml(article.body_html||''),900);
  const cover=clean(article.cover_image_url||article.coverImageUrl||'',2000);
  const video=clean(article.video_url||article.videoUrl||article.video||article.social_video_url||'',2000);
  const articleKey=clean(article.blogger_post_id||article.post_id||article.id||slug,300);
  const firstCommentEnabled=article.social_first_comment_enabled===true||article.socialFirstCommentEnabled===true||Number(article.social_first_comment_enabled||article.socialFirstCommentEnabled||0)===1;
  const firstCommentText=clean(article.social_first_comment_text||article.socialFirstCommentText||'',1800);
  const pollRaw=jsonObjSafe(article.social_poll_json||article.socialPollJson||'{}'),pollOptions=(Array.isArray(pollRaw.options)?pollRaw.options:[]).map(x=>clean(x,25)).filter(Boolean).slice(0,4),poll={enabled:!!pollRaw.enabled&&!!clean(pollRaw.question,140)&&pollOptions.length>=2,question:clean(pollRaw.question,140),options:pollOptions,duration:['one_day','three_days','seven_days','fourteen_days'].includes(clean(pollRaw.duration,30).toLowerCase())?clean(pollRaw.duration,30).toLowerCase():'one_day'};
  const rawTags=Array.isArray(article.tags)?article.tags:String(article.tags||article.labels||'').split(',');
  const hashtags=[...new Set(rawTags.map(v=>clean(v,80).replace(/^#+/,'').trim()).filter(Boolean).map(v=>v.replace(/[\s-]+/g,'').replace(/[^\p{L}\p{N}_]/gu,'')).filter(Boolean))].slice(0,12).map(v=>`#${v}`);
  const hashtagText=hashtags.join(' ');
  return {slug,localUrl,title,body,cover,video,articleKey,firstCommentEnabled,firstCommentText,poll,hashtags,hashtagText};
}
function nativePollAttachment(p={}){const keys=['option_a','option_b','option_c','option_d'],out={};(p.options||[]).forEach((x,i)=>out[keys[i]]=clean(x,25));return JSON.stringify(out);}
function pollDurationMinutes(v){return ({one_day:1440,three_days:4320,seven_days:10080,fourteen_days:20160})[v]||1440;}

const SEARCH_CONSOLE_WRITE_SCOPE='https://www.googleapis.com/auth/webmasters';
const SEARCH_CONSOLE_READONLY_SCOPE='https://www.googleapis.com/auth/webmasters.readonly';

function scopeList(value){return clean(value,12000).split(/\s+/).map(x=>x.trim()).filter(Boolean);}
function hasScope(scopes,scope){return scopes.includes(scope);}
function scopeStatus(scopes){
  if(hasScope(scopes,SEARCH_CONSOLE_WRITE_SCOPE))return 'read_write';
  if(hasScope(scopes,SEARCH_CONSOLE_READONLY_SCOPE))return 'read_only';
  return scopes.length?'missing_write':'unknown';
}
function googleErrorMeta(data,res){
  const first=Array.isArray(data?.error?.errors)?data.error.errors[0]:null;
  return {
    httpStatus:Number(res?.status||data?.error?.code||0)||0,
    googleCode:Number(data?.error?.code||res?.status||0)||0,
    googleStatus:clean(data?.error?.status||'',160),
    googleReason:clean(first?.reason||'',160),
    googleMessage:clean(data?.error?.message||data?.message||data?.error_description||data?.error||'',1200)
  };
}
async function searchConsoleResponse(res,label){
  const text=await res.text().catch(()=>'');
  let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!res.ok){
    const meta=googleErrorMeta(data,res);
    const detail=meta.googleMessage||clean(text,1200)||`${label} failed.`;
    const bits=[`Google Search Console ${label} failed`,meta.httpStatus?`HTTP ${meta.httpStatus}`:'',meta.googleStatus||meta.googleReason].filter(Boolean);
    const err=new Error(`${bits.join(' — ')}: ${detail}`);
    Object.assign(err,meta,{source:'google_search_console'});
    throw err;
  }
  return data;
}
function diagnoseSearchConsoleError(error,{operation='request',propertyUrl='',sitemapUrl=''}={}){
  const raw=clean(error?.message||error,1600);
  const lower=raw.toLowerCase();
  const httpStatus=Number(error?.httpStatus||0)||0;
  const reason=clean(error?.googleReason||error?.googleStatus||'',180);
  let message=raw||`Google Search Console ${operation} failed.`;
  let solution='';
  if(lower.includes('insufficient authentication scopes')||lower.includes('insufficientpermissions')||lower.includes('insufficient permission')||reason.toLowerCase()==='insufficientpermissions'){
    message=`Google OAuth permission error${httpStatus?` (HTTP ${httpStatus})`:''}: the connected Google token does not have the Search Console read/write permission required to submit a sitemap.`;
    solution=`Required scope: ${SEARCH_CONSOLE_WRITE_SCOPE}. Disconnect Google Search Console, connect it again, approve access, then run Test Connection before submitting.`;
  }else if(httpStatus===401||lower.includes('invalid_grant')||lower.includes('invalid credentials')){
    message=`Google OAuth authentication error${httpStatus?` (HTTP ${httpStatus})`:''}: Google rejected the saved authorization.`;
    solution='Disconnect Google Search Console and connect it again with the same Google account that has access to the property.';
  }else if(httpStatus===403){
    message=`Google Search Console rejected the ${operation} (HTTP 403)${reason?` — ${reason}`:''}: ${clean(error?.googleMessage||raw,900)}`;
    solution='Check that the connected Google account has permission for the exact Search Console property and that the OAuth app granted the read/write Search Console scope.';
  }else if(httpStatus===404){
    message=`Google Search Console could not find the configured property or sitemap target (HTTP 404): ${clean(error?.googleMessage||raw,900)}`;
    solution=`Confirm that the property value exactly matches Search Console${propertyUrl?` (${propertyUrl})`:''}. Domain properties must use sc-domain:example.com.`;
  }else if(httpStatus===400){
    message=`Google Search Console rejected the ${operation} as an invalid request (HTTP 400): ${clean(error?.googleMessage||raw,900)}`;
    solution=`Check the exact property URL${propertyUrl?` (${propertyUrl})`:''}${sitemapUrl?` and sitemap URL (${sitemapUrl})`:''}.`;
  }else if(httpStatus===429){
    message='Google Search Console rate-limited the request (HTTP 429).';
    solution='Wait a short time and try Submit Sitemap again.';
  }else if(httpStatus>=500){
    message=`Google Search Console is temporarily unavailable (HTTP ${httpStatus}): ${clean(error?.googleMessage||raw,900)}`;
    solution='This is a Google-side/server error. Try again later; your website publishing remains unaffected.';
  }else if(lower.includes('fetch failed')||lower.includes('network')||lower.includes('connection')){
    message=`Website could not reach Google Search Console while performing the ${operation}: ${raw}`;
    solution='This is a website-to-Google network/runtime error. Retry once; if it continues, check Cloudflare function logs.';
  }
  return clean(solution?`${message} Solution: ${solution}`:message,2000);
}
async function refreshSearchConsoleAccess(env,c){
  if(!c.clientId||!c.clientSecret||!c.refreshToken){
    const e=new Error('Website configuration error: Google Search Console is not connected. Save the OAuth Client ID/Secret and click Connect Google Search Console.');
    e.source='website_configuration';e.httpStatus=400;throw e;
  }
  const body=new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'});
  let res;
  try{res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});}
  catch(error){const e=new Error(`Website could not reach Google's OAuth token service: ${clean(error?.message||error,800)}`);e.source='website_runtime';throw e;}
  const data=await searchConsoleResponse(res,'OAuth token refresh');
  if(!data.access_token){const e=new Error('Google OAuth error: Google did not return an access token. Disconnect and reconnect Google Search Console.');e.source='google_oauth';e.httpStatus=401;throw e;}
  const scopes=scopeList(data.scope||c.grantedScopes||'');
  return {accessToken:data.access_token,scopes,status:scopeStatus(scopes)};
}
async function searchConsoleSiteDetails(token,propertyUrl){
  let res;
  try{res=await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}`,{headers:{authorization:`Bearer ${token}`}});}
  catch(error){const e=new Error(`Website could not reach Google Search Console while checking the property: ${clean(error?.message||error,800)}`);e.source='website_runtime';throw e;}
  return searchConsoleResponse(res,'property check');
}

export async function getSearchConsoleAccessToken(env,config=null){
  const social=await getSocialIntegrationSettings(env),c=config||social.searchConsole||{};
  return (await refreshSearchConsoleAccess(env,c)).accessToken;
}

export async function submitSearchConsoleSitemap(env,{config=null}={}){
  const social=await getSocialIntegrationSettings(env),c=config||social.searchConsole||{};
  const propertyUrl=clean(c.propertyUrl,1000),sitemapUrl=clean(c.sitemapUrl,1000);
  try{
    if(!c.enabled){
      const e=new Error('Website settings error: Google Search Console is currently disabled. Turn on “Enable Google Search Console”, click Save Settings, then click Submit Sitemap again. Test Connection can still succeed while this switch is off.');
      e.source='website_configuration';e.httpStatus=400;throw e;
    }
    if(!propertyUrl||!sitemapUrl){const e=new Error('Website settings error: enter both the Search Console property URL and sitemap URL, then save the settings.');e.source='website_configuration';e.httpStatus=400;throw e;}
    if(!/^sc-domain:[^\s/]+$/i.test(propertyUrl)&&!/^https?:\/\//i.test(propertyUrl)){const e=new Error('Website settings error: the Search Console property must exactly match the website currently shown in the address bar, as either a domain property or an HTTPS URL-prefix property.');e.source='website_configuration';e.httpStatus=400;throw e;}
    try{const u=new URL(sitemapUrl);if(!/^https?:$/.test(u.protocol))throw new Error('protocol');}catch{const e=new Error('Website settings error: the Sitemap URL must be a complete http:// or https:// URL.');e.source='website_configuration';e.httpStatus=400;throw e;}

    const auth=await refreshSearchConsoleAccess(env,c);
    if(auth.scopes.length&&!hasScope(auth.scopes,SEARCH_CONSOLE_WRITE_SCOPE)){
      const granted=auth.scopes.join(' ')||'(none reported)';
      const e=new Error(`Google OAuth scope mismatch: Test Connection can succeed with read-only access, but Submit Sitemap requires read/write access. Required scope: ${SEARCH_CONSOLE_WRITE_SCOPE}. Granted scopes: ${granted}. Disconnect and reconnect Google Search Console, approve access, then try again.`);
      e.source='google_oauth';e.httpStatus=403;e.googleReason='insufficientPermissions';throw e;
    }

    const site=await searchConsoleSiteDetails(auth.accessToken,propertyUrl);
    const permissionLevel=clean(site?.permissionLevel||'',120);
    await savePlatformState(env,'searchConsole',{permissionLevel,grantedScopes:auth.scopes.join(' '),scopeStatus:auth.status,lastTestedAt:now()}).catch(()=>{});

    const endpoint=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
    let res;
    try{res=await fetch(endpoint,{method:'PUT',headers:{authorization:`Bearer ${auth.accessToken}`}});}
    catch(error){const e=new Error(`Website could not reach Google Search Console while submitting the sitemap: ${clean(error?.message||error,800)}`);e.source='website_runtime';throw e;}
    await searchConsoleResponse(res,'sitemap submission');
    await savePlatformState(env,'searchConsole',{lastSubmittedAt:now(),lastError:'',permissionLevel,grantedScopes:auth.scopes.join(' '),scopeStatus:auth.status});
    return {ok:true,propertyUrl,sitemapUrl,permissionLevel,scopeStatus:auth.status,canSubmitSitemap:true,message:'Sitemap submitted to Google Search Console successfully.'};
  }catch(error){
    const detailed=error?.source==='website_configuration'?clean(error.message,2000):diagnoseSearchConsoleError(error,{operation:'sitemap submission',propertyUrl,sitemapUrl});
    await savePlatformState(env,'searchConsole',{lastError:detailed}).catch(()=>{});
    const out=new Error(detailed);out.source=error?.source||'google_search_console';out.httpStatus=Number(error?.httpStatus||0)||0;out.googleReason=error?.googleReason||'';out.googleStatus=error?.googleStatus||'';throw out;
  }
}

export async function testSearchConsoleConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.searchConsole||{};
  const propertyUrl=clean(c.propertyUrl,1000);
  if(!propertyUrl){const e=new Error('Website settings error: enter the Search Console property URL first.');e.source='website_configuration';e.httpStatus=400;throw e;}
  try{
    const auth=await refreshSearchConsoleAccess(env,c);
    const data=await searchConsoleSiteDetails(auth.accessToken,propertyUrl);
    const permissionLevel=clean(data?.permissionLevel||'',120);
    const hasWrite=hasScope(auth.scopes,SEARCH_CONSOLE_WRITE_SCOPE);
    const knownScopes=auth.scopes.length>0;
    const canSubmitSitemap=knownScopes?hasWrite:null;
    const scopeMessage=hasWrite?'OAuth scope: read/write.':knownScopes?'OAuth scope problem: read/write permission is missing. Submit Sitemap will fail until you reconnect with the full Search Console scope.':'OAuth scope could not be confirmed from this older saved connection; reconnect if Submit Sitemap reports a scope error.';
    const enabledMessage=c.enabled?'Automatic sitemap submission is enabled.':'Automatic sitemap submission is currently disabled; Test Connection is read-only and can still pass while the switch is off.';
    const message=`Google Search Console connection is working. Property permission: ${permissionLevel||'available'}. ${scopeMessage} ${enabledMessage}`;
    await savePlatformState(env,'searchConsole',{lastError:'',permissionLevel,grantedScopes:auth.scopes.join(' '),scopeStatus:auth.status,lastTestedAt:now()});
    return {ok:true,site:data?.siteUrl||propertyUrl,permissionLevel,scopeStatus:auth.status,grantedScopes:auth.scopes,requiredWriteScope:SEARCH_CONSOLE_WRITE_SCOPE,canSubmitSitemap,message};
  }catch(error){
    const detailed=error?.source==='website_configuration'?clean(error.message,2000):diagnoseSearchConsoleError(error,{operation:'connection test',propertyUrl});
    await savePlatformState(env,'searchConsole',{lastError:detailed,lastTestedAt:now()}).catch(()=>{});
    const out=new Error(detailed);out.source=error?.source||'google_search_console';out.httpStatus=Number(error?.httpStatus||0)||0;throw out;
  }
}

const THREADS_REQUESTED_PERMISSIONS=['threads_basic','threads_content_publish','threads_read_replies','threads_manage_replies'];

export async function threadsToken(env,c){
  if(!c.accessToken)throw new Error('Threads is not connected. Click Connect Threads first.');
  const exp=Date.parse(c.tokenExpiresAt||'');
  if(!Number.isFinite(exp)||exp-Date.now()>7*24*60*60*1000)return c.accessToken;
  const u=new URL('https://graph.threads.net/refresh_access_token');
  u.search=new URLSearchParams({grant_type:'th_refresh_token',access_token:c.accessToken}).toString();
  const data=await responseJson(await fetch(u,{headers:{authorization:`Bearer ${c.accessToken}`}}),'Threads token refresh');
  const token=clean(data.access_token||c.accessToken,10000);
  const expires=Number(data.expires_in||5184000);
  await savePlatformState(env,'threads',{accessToken:token,tokenExpiresAt:new Date(Date.now()+expires*1000).toISOString(),lastError:''});
  return token;
}
async function latestPublishedSocialId(env,platform){
  const row=await env.DB.prepare("SELECT external_id FROM social_publish_log WHERE platform=? AND status='published' AND external_id<>'' ORDER BY updated_at DESC LIMIT 1").bind(platform).first().catch(()=>null);
  return clean(row?.external_id||'',600);
}
async function threadsMediaDetails(token,id){
  const mediaId=clean(id,600);if(!mediaId)return null;
  const u=new URL(`https://graph.threads.net/${encodeURIComponent(mediaId)}`);u.searchParams.set('fields','id,permalink,shortcode,timestamp,media_type,text,username');u.searchParams.set('access_token',token);
  return responseJson(await fetch(u,{headers:{authorization:`Bearer ${token}`}}),'Threads post details');
}

export async function testThreadsConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.threads||{};
  try{
    const token=await threadsToken(env,c);
    const res=await fetch(`https://graph.threads.net/me?fields=id,username,name&access_token=${encodeURIComponent(token)}`,{headers:{authorization:`Bearer ${token}`}});
    const data=await responseJson(res,'Threads connection check');
    let latestPostId=await latestPublishedSocialId(env,'threads'),latestPermalink='',replyReadReady=null,replyManagementReady=null,replyCheckMessage='';
    if(!latestPostId){
      try{
        const recentUrl=new URL('https://graph.threads.net/me/threads');recentUrl.searchParams.set('fields','id,permalink,timestamp');recentUrl.searchParams.set('limit','1');recentUrl.searchParams.set('access_token',token);
        const recent=await responseJson(await fetch(recentUrl,{headers:{authorization:`Bearer ${token}`}}),'Threads recent-post read check');
        latestPostId=clean(recent?.data?.[0]?.id||'',600);latestPermalink=clean(recent?.data?.[0]?.permalink||'',2000);
      }catch(_){}
    }
    if(latestPostId){
      try{
        if(!latestPermalink){const media=await threadsMediaDetails(token,latestPostId);latestPermalink=clean(media?.permalink||'',2000);}
        const replies=new URL(`https://graph.threads.net/${encodeURIComponent(latestPostId)}/replies`);replies.searchParams.set('fields','id');replies.searchParams.set('limit','1');replies.searchParams.set('access_token',token);
        await responseJson(await fetch(replies,{headers:{authorization:`Bearer ${token}`}}),'Threads reply-read capability check');replyReadReady=true;
        try{
          const pending=new URL(`https://graph.threads.net/${encodeURIComponent(latestPostId)}/replies`);pending.searchParams.set('fields','id');pending.searchParams.set('limit','1');pending.searchParams.set('approval_status','pending');pending.searchParams.set('access_token',token);
          await responseJson(await fetch(pending,{headers:{authorization:`Bearer ${token}`}}),'Threads reply-management capability check');replyManagementReady=true;
        }catch(e){replyManagementReady=false;replyCheckMessage=clean(e.message,1000);}
      }catch(e){replyReadReady=false;replyManagementReady=false;replyCheckMessage=clean(e.message,1000);}
    }
    const publishingReady=String(c.lastPublishStatus||'').toLowerCase()==='published'?true:null;
    const capabilities={identityReady:true,publishingReady,replyReadReady,replyManagementReady,likeVisitorRepliesReady:false,deleteVisitorRepliesReady:false,requestedPermissions:THREADS_REQUESTED_PERMISSIONS,latestPostId,latestPermalink,replyCheckMessage};
    const notes=[
      'Profile read: Ready.',
      publishingReady===true?'Automatic publishing: Ready (a successful Threads publication is recorded).':'Automatic publishing: authorized by the requested threads_content_publish permission; no new test post is created by Test Connection.',
      replyReadReady===true?'Reply reading: Ready.':replyReadReady===false?'Reply reading: Needs attention.':'Reply reading: Not live-tested because no Threads post was available.',
      replyManagementReady===true?'Reply hide/unhide management: Ready.':replyManagementReady===false?'Reply hide/unhide management: Needs attention.':'Reply hide/unhide management: Not live-tested because no Threads post was available.',
      'Native Like on a visitor reply: Not exposed by the current official Threads Reply Moderation API.',
      'Delete another user’s reply: Not exposed by the current official Threads Reply Moderation API; hide/unhide is the supported moderation action.'
    ];
    const message=`Threads authentication and API access are working${data.username?` for @${data.username}`:''}. ${notes.join(' ')}`;
    await savePlatformState(env,'threads',{userId:clean(data.id,200),username:clean(data.username,200),lastError:'',lastTestedAt:now(),lastTestMessage:message,identityReady:true,publishingReady,replyReadReady,replyManagementReady,requestedPermissions:THREADS_REQUESTED_PERMISSIONS,latestPermalink});
    return {ok:true,id:data.id||'',username:data.username||'',capabilities,message};
  }catch(e){const d=diagnoseIntegrationError('threads',e,{action:'connection test'});await savePlatformState(env,'threads',{lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}

export async function publishThreadArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.threads||{};
  if(!c.enabled||c.autoPublish===false)return {ok:true,skipped:true,reason:'Threads automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  try{
    const claim=await claimPublish(env,'threads',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('Threads',claim);
    const token=await threadsToken(env,c);
    // Article distribution on Threads intentionally uses a TEXT post with a link attachment.
    // This produces the clickable article preview instead of a standalone image that merely zooms when tapped.
    const text=clean(`${info.poll.enabled?`${info.poll.question}\n\n`:''}${info.title}${info.body?`\n\n${info.body}`:''}${info.poll.enabled?`\n\n${info.localUrl}`:''}${info.hashtagText?`\n\n${info.hashtagText}`:''}`,480);
    const create=new URL('https://graph.threads.net/me/threads');
    const params={access_token:token,text,media_type:'TEXT',...(info.poll.enabled?{poll_attachment:nativePollAttachment(info.poll)}:{link_attachment:info.localUrl}),auto_publish_text:'false'};
    create.search=new URLSearchParams(params).toString();
    const created=await responseJson(await fetch(create,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads post creation');const creationId=clean(created.id,300);if(!creationId)throw new Error('Threads did not return a media container ID.');
    const publish=new URL('https://graph.threads.net/me/threads_publish');publish.search=new URLSearchParams({creation_id:creationId,access_token:token}).toString();const published=await responseJson(await fetch(publish,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads publish');const externalId=clean(published.id||creationId,300);
    let externalUrl='';try{const media=await threadsMediaDetails(token,externalId);externalUrl=clean(media?.permalink||'',2000);}catch(_){}
    let firstComment={ok:true,skipped:true,reason:'First social comment is disabled.'};const fc=socialFirstCommentMessage(info);if(fc&&externalId){try{const reply=new URL('https://graph.threads.net/me/threads');reply.search=new URLSearchParams({media_type:'TEXT',text:fc,reply_to_id:externalId,auto_publish_text:'true',access_token:token}).toString();const r=await responseJson(await fetch(reply,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads first reply');firstComment={ok:true,id:clean(r.id,300),message:fc};}catch(e){firstComment={ok:false,error:clean(e.message,1200),message:fc};}}
    await logWrite(env,'threads',logKey,{articleUrl:info.localUrl,externalId,status:'published',details:{title:info.title,cover:info.cover,firstComment,externalUrl,publishedAt:now()}});await savePlatformState(env,'threads',{lastError:'',lastPublishError:'',lastPublishStatus:'published',publishingReady:true,lastPublishAt:now(),lastPublishedUrl:externalUrl||info.localUrl,lastPublishedArticleUrl:info.localUrl,latestPermalink:externalUrl});return {ok:true,externalId,url:externalUrl||info.localUrl,articleUrl:info.localUrl,firstComment,message:successMessage('threads','publish',{externalId})};
  }catch(e){const d=diagnoseIntegrationError('threads',e,{action:'automatic publishing'});await logWrite(env,'threads',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:d.message,title:info.title,cover:info.cover}});await savePlatformState(env,'threads',{lastError:d.message,lastPublishError:d.message,lastPublishStatus:'failed',lastPublishAt:now()}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}
const PINTEREST_REQUIRED_SCOPES=['boards:read','boards:write','pins:read','pins:write','user_accounts:read'];
function normalizePinterestScopes(v){
  if(Array.isArray(v))return [...new Set(v.map(x=>clean(x,120)).filter(Boolean))];
  return [...new Set(String(v||'').split(/[\s,]+/).map(x=>clean(x,120)).filter(Boolean))];
}
export async function pinterestToken(env,c){
  if(!c.accessToken)throw new Error('Pinterest is not connected. Click Connect Pinterest first.');
  const exp=Date.parse(c.tokenExpiresAt||'');
  if(!Number.isFinite(exp)||exp-Date.now()>5*24*60*60*1000)return c.accessToken;
  if(!c.refreshToken){
    if(exp>Date.now())return c.accessToken;
    throw new Error('The Pinterest access token has expired and no refresh token is saved. Click Connect Pinterest again.');
  }
  if(!c.appId||!c.appSecret)throw new Error('Pinterest needs the saved App ID and App Secret to refresh its access token. Save both values and reconnect Pinterest.');
  const basic=btoa(`${c.appId}:${c.appSecret}`),body=new URLSearchParams({grant_type:'refresh_token',refresh_token:c.refreshToken});
  const data=await responseJson(await fetch('https://api.pinterest.com/v5/oauth/token',{method:'POST',headers:{authorization:`Basic ${basic}`,'content-type':'application/x-www-form-urlencoded'},body}),'Pinterest token refresh');
  const token=clean(data.access_token||'',10000);if(!token)throw new Error('Pinterest refreshed the connection but did not return an access token.');
  const expires=Number(data.expires_in||2592000),refreshExpires=Number(data.refresh_token_expires_in||0),scopeList=normalizePinterestScopes(data.scope||c.grantedScopes);
  const refreshToken=clean(data.refresh_token||c.refreshToken,10000),refreshTokenExpiresAt=Number(data.refresh_token_expires_at||0)>0?new Date(Number(data.refresh_token_expires_at)*1000).toISOString():(refreshExpires>0?new Date(Date.now()+refreshExpires*1000).toISOString():c.refreshTokenExpiresAt||'');
  const tokenExpiresAt=new Date(Date.now()+expires*1000).toISOString();c.accessToken=token;c.refreshToken=refreshToken;c.tokenExpiresAt=tokenExpiresAt;c.refreshTokenExpiresAt=refreshTokenExpiresAt;c.grantedScopes=scopeList;
  await savePlatformState(env,'pinterest',{accessToken:token,refreshToken,tokenExpiresAt,refreshTokenExpiresAt,grantedScopes:scopeList,lastError:''});
  return token;
}

export async function getPinterestAccessToken(env){const s=await getSocialIntegrationSettings(env);return pinterestToken(env,s.pinterest||{});}
export async function testPinterestConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.pinterest||{};
  try{
    const token=await pinterestToken(env,c);
    const res=await fetch('https://api.pinterest.com/v5/user_account',{headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}});
    const data=await responseJson(res,'Pinterest account read capability check');
    let board=null,boardsReadReady=false,pinsReadReady=false,boardWarning='',pinsWarning='';
    try{
      if(c.boardId){
        const boardRes=await fetch(`https://api.pinterest.com/v5/boards/${encodeURIComponent(c.boardId)}`,{headers:{authorization:`Bearer ${token}`}});
        board=await responseJson(boardRes,'Pinterest board read capability check');boardsReadReady=true;
      }else{
        const bu=new URL('https://api.pinterest.com/v5/boards');bu.searchParams.set('page_size','1');
        await responseJson(await fetch(bu,{headers:{authorization:`Bearer ${token}`}}),'Pinterest boards read capability check');boardsReadReady=true;
      }
    }catch(e){boardWarning=clean(e.message,1000);}
    try{
      const pu=new URL('https://api.pinterest.com/v5/pins');pu.searchParams.set('page_size','1');
      await responseJson(await fetch(pu,{headers:{authorization:`Bearer ${token}`}}),'Pinterest Pins read capability check');pinsReadReady=true;
    }catch(e){pinsWarning=clean(e.message,1000);}
    const scopes=normalizePinterestScopes(c.grantedScopes),scopeKnown=scopes.length>0,has=x=>scopes.includes(x);
    const pinPublishingReady=scopeKnown?(PINTEREST_REQUIRED_SCOPES.filter(x=>x!=='user_accounts:read').every(has)&&boardsReadReady&&pinsReadReady&&!!c.boardId):null;
    const capabilities={accountReadReady:true,boardsReadReady,pinsReadReady,pinPublishingReady,boardId:clean(c.boardId,300),boardName:clean(board?.name||c.boardName,300),grantedScopes:scopes,requiredScopes:PINTEREST_REQUIRED_SCOPES,tokenExpiresAt:c.tokenExpiresAt||'',refreshTokenExpiresAt:c.refreshTokenExpiresAt||'',commentModerationReady:false,boardWarning,pinsWarning};
    const scopeText=scopeKnown?`Granted OAuth scopes recorded by this connection: ${scopes.join(', ')}.`:'Granted OAuth scopes were not recorded by this older connection. Click Connect Pinterest once after this update to capture the exact scopes returned by Pinterest.';
    const publishText=pinPublishingReady===true?'Automatic Pin publishing capability is ready.':pinPublishingReady===false?'Automatic Pin publishing needs the configured Board ID and the boards:read, boards:write, pins:read and pins:write scopes.':'Automatic Pin publishing is not destructively tested by Test Connection; reconnect once to record scopes, then the live read checks plus scope list determine readiness.';
    const commentsText='Pinterest API v5 does not expose a general Pin-comment list/moderation API, so Pinterest visitor comments cannot be loaded, liked, hidden, replied to or deleted from this dashboard.';
    const message=`Pinterest authentication and API access are working${data.username?` for @${data.username}`:''}${board?.name?` with board “${board.name}”`:''}. Account read: Ready. Boards read: ${boardsReadReady?'Ready':'Needs attention'}. Pins read: ${pinsReadReady?'Ready':'Needs attention'}. ${publishText} ${scopeText} ${commentsText}`;
    await savePlatformState(env,'pinterest',{username:clean(data.username,200),boardName:clean(board?.name||c.boardName,300),lastError:'',lastTestedAt:now(),lastTestMessage:message,grantedScopes:scopes,accountReadReady:true,boardsReadReady,pinsReadReady,pinPublishingReady,commentModerationReady:false,boardWarning,pinsWarning});
    return {ok:true,username:data.username||'',boardName:board?.name||c.boardName||'',capabilities,message};
  }catch(e){const d=diagnoseIntegrationError('pinterest',e,{action:'connection test'});await savePlatformState(env,'pinterest',{lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}

export async function publishPinterestArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.pinterest||{};
  if(!c.enabled||c.autoPublish===false)return {ok:true,skipped:true,reason:'Pinterest automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  try{
    if(!c.boardId)throw new Error('Pinterest Board ID is missing. Enter the board that should receive new article Pins.');
    if(!info.cover)throw new Error('Pinterest needs a public cover image URL. Upload an Article Image before automatic Pinterest publishing.');
    const claim=await claimPublish(env,'pinterest',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('Pinterest',claim);
    const token=await pinterestToken(env,c);const payload={board_id:String(c.boardId),title:info.title.slice(0,100),description:clean(`${info.body||info.title}${info.hashtagText?`\n\n${info.hashtagText}`:''}`,800),link:info.localUrl,media_source:{source_type:'image_url',url:info.cover,is_standard:true}};
    const data=await responseJson(await fetch('https://api.pinterest.com/v5/pins',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'Pinterest Pin creation');const externalId=clean(data.id,300);
    await logWrite(env,'pinterest',logKey,{articleUrl:info.localUrl,externalId,status:'published',details:{title:info.title,cover:info.cover,boardId:String(c.boardId),publishedAt:now()}});await savePlatformState(env,'pinterest',{lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:info.localUrl});return {ok:true,externalId,url:info.localUrl,message:successMessage('pinterest','publish',{externalId})};
  }catch(e){const d=diagnoseIntegrationError('pinterest',e,{action:'automatic Pin publishing'});await logWrite(env,'pinterest',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:d.message,title:info.title,cover:info.cover}});await savePlatformState(env,'pinterest',{lastError:d.message,lastPublishError:d.message,lastPublishStatus:'failed',lastPublishAt:now()}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}
export async function inspectFacebookCapabilities(env,config=null){
  const c=config||(await getSocialIntegrationSettings(env)).facebook||{};
  if(!c.pageId||!c.pageAccessToken)throw new Error('Enter the Meta Page ID and Page Access Token first.');
  const version=clean(c.graphVersion||'v26.0',20);
  const me=await responseJson(await fetch(`https://graph.facebook.com/${version}/me?fields=id,name&access_token=${encodeURIComponent(c.pageAccessToken)}`),'Facebook token identity check');
  const tokenIsPage=String(me?.id||'')===String(c.pageId||'');
  if(!tokenIsPage){
    const e=new Error(`The saved Facebook access token is valid, but Meta identifies it as ${me?.name?`${me.name} `:''}(ID ${me?.id||'unknown'}) instead of the configured Page ID ${c.pageId}. This endpoint requires a Page Access Token for that exact Page, not a User/App token. Generate the Page token from a user authorization that includes the required Page permissions, then save/reconnect it.`);
    e.httpStatus=403;e.upstreamCode='210';e.upstreamMessage=e.message;e.metaIdentity=me;throw e;
  }
  const page=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}?fields=id,name&access_token=${encodeURIComponent(c.pageAccessToken)}`),'Facebook Page authentication check');
  let debug=null,debugWarning='';
  if(c.appId&&c.appSecret){
    try{
      const u=new URL(`https://graph.facebook.com/${version}/debug_token`);u.searchParams.set('input_token',c.pageAccessToken);u.searchParams.set('access_token',`${c.appId}|${c.appSecret}`);
      const d=await responseJson(await fetch(u),'Facebook token permission inspection');debug=d?.data||null;
    }catch(e){debugWarning=`Meta token-scope inspection could not be completed: ${clean(e.message,700)}`;}
  }
  const scopes=Array.isArray(debug?.scopes)?debug.scopes.map(String):Array.isArray(c.grantedScopes)?c.grantedScopes.map(String):[];
  const tasks=Array.isArray(c.pageTasks)?c.pageTasks.map(x=>String(x).toUpperCase()):[];
  const has=x=>scopes.includes(x),known=scopes.length>0;
  const canCreate=!tasks.length||tasks.some(t=>['CREATE_CONTENT','MANAGE','PROFILE_PLUS_CREATE_CONTENT','PROFILE_PLUS_MANAGE','PROFILE_PLUS_FULL_CONTROL','PROFILE_PLUS_FACEBOOK_ACCESS'].includes(t));
  const canModerate=!tasks.length||tasks.some(t=>['MODERATE','MANAGE','PROFILE_PLUS_MODERATE','PROFILE_PLUS_MANAGE','PROFILE_PLUS_FULL_CONTROL','PROFILE_PLUS_FACEBOOK_ACCESS'].includes(t));
  const appMatch=!debug?.app_id||!c.appId||String(debug.app_id)===String(c.appId);
  return {
    pageId:String(page?.id||c.pageId),pageName:String(page?.name||me?.name||''),tokenIsPage:true,
    tokenType:String(debug?.type||c.tokenType||'PAGE'),tokenAppId:String(debug?.app_id||c.tokenAppId||''),appMatch,
    scopes,tasks,debugWarning,
    publishingReady:known?(has('pages_manage_posts')&&canCreate):null,
    webhookReady:known?(has('pages_manage_metadata')&&canModerate&&appMatch):null,
    messagingReady:known?(has('pages_manage_metadata')&&has('pages_messaging')&&canModerate&&appMatch):null,
    leadReady:known?has('leads_retrieval'):null,
    engagementReady:known?(has('pages_manage_engagement')&&has('pages_read_user_content')):null
  };
}

export async function testFacebookConnection(env){
  const c=(await getSocialIntegrationSettings(env)).facebook||{};
  try{
    const cap=await inspectFacebookCapabilities(env,c);
    const version=clean(c.graphVersion||'v26.0',20);
    let webhook={checked:false,subscribed:false,warning:'',apps:[],fields:[]};
    try{
      const sub=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}/subscribed_apps?access_token=${encodeURIComponent(c.pageAccessToken)}`),'Facebook webhook subscription check');
      const apps=Array.isArray(sub?.data)?sub.data.map(x=>({id:String(x.id||''),name:String(x.name||''),subscribed_fields:Array.isArray(x.subscribed_fields)?x.subscribed_fields:[]})):[];
      const own=c.appId?apps.find(x=>String(x.id)===String(c.appId)):apps[0];
      webhook={checked:true,subscribed:!!own,apps,fields:own?.subscribed_fields||[],warning:''};
    }catch(w){webhook={checked:false,subscribed:false,apps:[],fields:[],warning:diagnoseIntegrationError('facebook',w,{action:'webhook subscription check'}).message};}
    const missing=[];
    if(cap.publishingReady===false)missing.push('automatic publishing needs pages_manage_posts and Page CREATE_CONTENT/MANAGE access');
    if(cap.webhookReady===false)missing.push('programmatic webhook management needs pages_manage_metadata and Page MODERATE/MANAGE access');
    if(cap.messagingReady===false)missing.push('Messenger needs pages_messaging plus pages_manage_metadata');
    if(cap.leadReady===false)missing.push('Lead Ads retrieval needs leads_retrieval');
    if(cap.engagementReady===false)missing.push('Facebook comment management needs pages_manage_engagement and pages_read_user_content');
    if(cap.appMatch===false)missing.push(`the token was issued by Meta App ${cap.tokenAppId}, not the saved App ${c.appId}`);
    const readiness=missing.length?`Authentication is working, but ${missing.join('; ')}.`:'Authentication and the inspected Facebook capabilities are ready.';
    const scopeNote=cap.scopes.length?` Granted token permissions: ${cap.scopes.join(', ')}.`:(c.appId&&c.appSecret?` ${cap.debugWarning||'Meta did not report token scopes.'}`:' Add the Meta App ID and App Secret if you want the website to inspect the token permissions directly.');
    const webhookNote=webhook.checked?(webhook.subscribed?` Webhook subscription is visible${webhook.fields.length?` for: ${webhook.fields.join(', ')}`:''}.`:' No subscription for this app is visible on the Page.'):` ${webhook.warning||'Webhook subscription could not be verified.'}`;
    const message=`Facebook Page authentication is working for ${cap.pageName||cap.pageId}. The saved token is a Page token for Page ID ${cap.pageId}. ${readiness}${scopeNote}${webhookNote}`;
    await savePlatformState(env,'facebook',{connectionState:'connected',connectedAt:c.connectedAt||now(),lastError:'',lastTestedAt:now(),lastTestMessage:message,pageName:cap.pageName,pageTasks:cap.tasks,tokenType:cap.tokenType,tokenAppId:cap.tokenAppId,grantedScopes:cap.scopes,publishingReady:cap.publishingReady,webhookReady:cap.webhookReady,messagingReady:cap.messagingReady,leadReady:cap.leadReady,engagementReady:cap.engagementReady,lastWebhookFields:webhook.fields,lastWebhookMessage:webhook.warning||''});
    return {ok:true,level:missing.length?'warning':'success',...cap,webhook,message};
  }catch(e){
    const d=diagnoseIntegrationError('facebook',e,{action:'connection test'});
    await savePlatformState(env,'facebook',{connectionState:isAuthenticationFailure(e)||String(e?.upstreamCode||'')==='210'?'disconnected':c.connectionState||'',lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});
    throw Object.assign(new Error(d.message),e,{message:d.message});
  }
}

function socialFirstCommentMessage(info={}){
  if(!info.firstCommentEnabled)return '';
  return clean(info.firstCommentText||`Apply now using this link below 👇\n\n${info.localUrl}`,1800);
}
async function addFacebookApplyComment(c,postId,info){
  const id=clean(postId,600),message=socialFirstCommentMessage(info);if(!id||!message)return {ok:true,skipped:true,reason:'First social comment is disabled or no message is available.'};
  const version=clean(c.graphVersion||'v26.0',20),body=new URLSearchParams({message,access_token:c.pageAccessToken});
  try{const data=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook first public comment');return {ok:true,id:clean(data.id,600),message};}
  catch(e){return {ok:false,error:clean(e.message,1200),message};}
}
async function addInstagramApplyComment(c,mediaId,info){
  const id=clean(mediaId,600),message=socialFirstCommentMessage(info);if(!id||!message)return {ok:true,skipped:true,reason:'First social comment is disabled or no message is available.'};
  const version=clean(c.graphVersion||'v26.0',20),errors=[];
  if(c.pageAccessToken){const body=new URLSearchParams({message,access_token:c.pageAccessToken});try{const data=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Instagram first public comment (Facebook Login)');return {ok:true,id:clean(data.id,600),message,route:'facebook_login'};}catch(e){errors.push(clean(e.message,700));}}
  const igToken=clean(c.instagramLoginToken,8000);if(igToken){try{const data=await responseJson(await fetch(`https://graph.instagram.com/${version}/${encodeURIComponent(id)}/comments`,{method:'POST',headers:{authorization:`Bearer ${igToken}`,'content-type':'application/json'},body:JSON.stringify({message})}),'Instagram first public comment (Instagram Login)');return {ok:true,id:clean(data.id,600),message,route:'instagram_login'};}catch(e){errors.push(clean(e.message,700));}}
  return {ok:false,error:errors.join(' | ')||'Instagram did not accept the automatic first public comment.',message};
}

export async function publishFacebookArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.facebook||{};
  if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'Facebook automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  try{
    if(!c.pageId||!c.pageAccessToken)throw new Error('Facebook Page ID or Page Access Token is missing.');
    const claim=await claimPublish(env,'facebook',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('Facebook',claim);
    const version=clean(c.graphVersion||'v26.0',20),message=clean(`${info.title}${info.body?`\n\n${info.body}`:''}${info.hashtagText?`\n\n${info.hashtagText}`:''}`,1500),body=new URLSearchParams({message,link:info.localUrl,access_token:c.pageAccessToken});
    const data=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}/feed`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook Page post');
    const firstComment=await addFacebookApplyComment(c,data.id,info);
    await logWrite(env,'facebook',logKey,{articleUrl:info.localUrl,externalId:clean(data.id,300),status:'published',details:{title:info.title,cover:info.cover,mode:'link_post',firstComment,publishedAt:now()}});await savePlatformState(env,'facebook',{connectionState:'connected',connectedAt:now(),lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:info.localUrl});
    return {ok:true,externalId:data.id||'',url:info.localUrl,firstComment,message:successMessage('facebook','publish',{externalId:data.id||''})};
  }catch(e){const diag=await publishFailureState(env,'facebook',e);await logWrite(env,'facebook',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,cover:info.cover}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}
export async function inspectInstagramCapabilities(env,config=null){
  const social=await getSocialIntegrationSettings(env),c=config||social.instagram||{};
  if(!c.instagramBusinessId||!c.pageAccessToken)throw new Error('Enter the Instagram Business Account ID and Page Access Token first.');
  const version=clean(c.graphVersion||'v26.0',20);
  const ig=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${encodeURIComponent(c.pageAccessToken)}`),'Instagram professional account authentication check');
  if(String(ig?.id||'')!==String(c.instagramBusinessId))throw new Error(`Meta returned Instagram account ID ${ig?.id||'unknown'}, which does not match the configured Instagram Business Account ID ${c.instagramBusinessId}. Save the ID linked to the selected Meta Page and test again.`);
  let page=null,pageWarning='';
  if(c.pageId){
    try{
      page=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.pageId)}?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(c.pageAccessToken)}`),'Instagram linked Page check');
      const linked=String(page?.instagram_business_account?.id||'');
      if(linked&&linked!==String(c.instagramBusinessId))throw new Error(`The configured Meta Page is linked to Instagram account ID ${linked}, not ${c.instagramBusinessId}. Update the Instagram Business Account ID or linked Page before publishing/synchronizing comments.`);
      if(!linked)pageWarning='Meta did not return an Instagram Business Account on the configured Page. Confirm the Instagram professional account is linked to this Page in Meta Business settings.';
    }catch(e){if(/linked to Instagram account ID/.test(String(e.message||'')))throw e;pageWarning=clean(e.message,900);}
  }
  // Reuse the Facebook app credentials for debug_token when the Instagram card has
  // not saved a separate copy. This keeps one Meta app authoritative for both cards.
  const appId=clean(c.appId||social.facebook?.appId||'',300),appSecret=clean(c.appSecret||social.facebook?.appSecret||'',5000);
  let debug=null,debugWarning='';
  if(appId&&appSecret){
    try{
      const u=new URL(`https://graph.facebook.com/${version}/debug_token`);u.searchParams.set('input_token',c.pageAccessToken);u.searchParams.set('access_token',`${appId}|${appSecret}`);
      const d=await responseJson(await fetch(u),'Instagram token permission inspection');debug=d?.data||null;
    }catch(e){debugWarning=`Meta token permission inspection could not be completed: ${clean(e.message,700)}`;}
  }
  const scopes=Array.isArray(debug?.scopes)?debug.scopes.map(String):Array.isArray(c.grantedScopes)?c.grantedScopes.map(String):[];
  const tasks=Array.isArray(page?.tasks)?page.tasks.map(String):Array.isArray(c.pageTasks)&&c.pageTasks.length?c.pageTasks.map(String):(String(c.pageId||'')===String(social.facebook?.pageId||'')&&Array.isArray(social.facebook?.pageTasks)?social.facebook.pageTasks.map(String):[]);
  const has=x=>scopes.includes(x),known=scopes.length>0;
  const appMatch=!debug?.app_id||!appId||String(debug.app_id)===String(appId);
  const identityReady=!!ig?.id&&(!c.pageId||!pageWarning||!!page?.instagram_business_account?.id);
  const publishingReady=known?(has('instagram_basic')&&has('instagram_content_publish')&&has('pages_read_engagement')):null;
  const commentReady=known?(has('instagram_basic')&&has('instagram_manage_comments')&&has('pages_read_engagement')):null;
  const privateReplyReady=known?(has('instagram_basic')&&has('instagram_manage_comments')&&has('pages_read_engagement')):null;
  const messagingReady=known?(has('instagram_basic')&&has('instagram_manage_messages')):null;
  const leadReady=known?has('leads_retrieval'):null;
  return {id:String(ig.id||''),username:String(ig.username||''),name:String(ig.name||''),accountType:'professional',pageId:String(page?.id||c.pageId||''),pageName:String(page?.name||''),linkedInstagramId:String(page?.instagram_business_account?.id||''),pageWarning,tokenType:String(debug?.type||c.tokenType||'PAGE'),tokenAppId:String(debug?.app_id||c.tokenAppId||''),appMatch,scopes,tasks,debugWarning,identityReady,publishingReady,commentReady,privateReplyReady,messagingReady,leadReady};
}

async function inspectInstagramLoginFallback(c){
  const token=clean(c.instagramLoginToken,8000);if(!token)return {configured:false,ready:null,username:'',error:''};
  const version=clean(c.graphVersion||'v26.0',20),id=clean(c.instagramBusinessId,200);if(!id)return {configured:true,ready:false,username:'',error:'Instagram Business Account ID is missing.'};
  try{
    const u=new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(id)}`);u.searchParams.set('fields','id,username');u.searchParams.set('access_token',token);
    const data=await responseJson(await fetch(u),'Instagram Login token check');
    if(String(data?.id||'')&&String(data.id)!==String(id))return {configured:true,ready:false,username:clean(data?.username,100),error:`Instagram Login token belongs to account ID ${data.id}, not ${id}.`};
    // A successful identity read proves instagram_business_basic. A recent-media
    // comment read additionally proves the manage-comments capability needed by
    // Private Replies, without sending or changing anything on Instagram.
    const mu=new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(id)}/media`);mu.searchParams.set('fields','id');mu.searchParams.set('limit','1');mu.searchParams.set('access_token',token);
    const media=await responseJson(await fetch(mu),'Instagram Login media check'),first=Array.isArray(media?.data)?media.data[0]:null;
    if(first?.id){const cu=new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(first.id)}/comments`);cu.searchParams.set('fields','id,text');cu.searchParams.set('limit','1');cu.searchParams.set('access_token',token);await responseJson(await fetch(cu),'Instagram Login Private Replies permission check');}
    return {configured:true,ready:true,username:clean(data?.username,100),error:'',commentPermissionVerified:!!first?.id};
  }catch(e){return {configured:true,ready:false,username:'',error:clean(e.message,1200),commentPermissionVerified:false};}
}

export async function testInstagramConnection(env){
  const c=(await getSocialIntegrationSettings(env)).instagram||{};
  try{
    const cap=await inspectInstagramCapabilities(env,c),version=clean(c.graphVersion||'v26.0',20),dmFallback=await inspectInstagramLoginFallback(c);
    // Prove comment-management read access instead of treating account identity alone
    // as proof that the inbox can receive/synchronize comments.
    let commentReadVerified=null,commentReadMessage='No recent Instagram media was available for a live comment-read check.';
    try{
      const mu=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/media`);mu.searchParams.set('fields','id,caption,permalink,timestamp,media_type,media_url,thumbnail_url,comments_count');mu.searchParams.set('limit','1');mu.searchParams.set('access_token',c.pageAccessToken);
      const media=await responseJson(await fetch(mu),'Instagram recent-media check');const first=Array.isArray(media?.data)?media.data[0]:null;
      if(first?.id){
        const cu=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(first.id)}/comments`);cu.searchParams.set('fields','id,text,timestamp,username,from{id,username}');cu.searchParams.set('limit','1');cu.searchParams.set('access_token',c.pageAccessToken);
        const comments=await responseJson(await fetch(cu),'Instagram comment-read capability check');commentReadVerified=true;commentReadMessage=`Instagram comment-read API is working on recent media ${first.id}${Array.isArray(comments?.data)?` (${comments.data.length} comment${comments.data.length===1?'':'s'} returned in the test page)`:''}.`;
      }
    }catch(e){commentReadVerified=false;commentReadMessage=`Instagram account authentication works, but comment reading failed: ${clean(e.message,900)}`;}
    // A live event is the strongest proof of webhook delivery. Older builds stored
    // webhookReady=false when Meta merely declined a programmatic subscription lookup;
    // normalize that old state to "awaiting live event" instead of a false failure.
    const webhookReady=c.webhookReady===true?true:null,webhookFields=Array.isArray(c.lastWebhookFields)?c.lastWebhookFields:[],webhookMessage=c.lastWebhookMessage||'Webhook delivery has not been proven by a live event yet. Comment API synchronization remains available.';
    const missing=[];if(cap.publishingReady===false)missing.push('automatic publishing');if(cap.commentReady===false||commentReadVerified===false)missing.push('comment management');if(cap.privateReplyReady===false&&dmFallback.ready!==true)missing.push('Instagram Private Replies');if(c.lastPublishStatus==='failed')missing.push('the last automatic Instagram publish failed');
    const account=cap.username?`@${cap.username}`:cap.id,publishNote=c.lastPublishStatus?` Last automatic publish: ${c.lastPublishStatus==='published'?'Published successfully':c.lastPublishStatus==='failed'?`Failed${c.lastPublishError?` — ${clean(c.lastPublishError,700)}`:''}`:clean(c.lastPublishStatus,80)}.`:'';
    const privateReplyText=cap.privateReplyReady===true?'Facebook Login Private Reply scopes are present':cap.privateReplyReady===false?'Facebook Login Private Reply scopes need attention':'Facebook Login Private Reply scopes were not fully inspected';
    const fallbackText=dmFallback.configured?(dmFallback.ready?`Instagram Login fallback is Ready${dmFallback.username?` for @${dmFallback.username}`:''}`:`Instagram Login fallback needs attention${dmFallback.error?` — ${dmFallback.error}`:''}`):'Instagram Login fallback is not configured';
    const message=`Instagram authentication is working for ${account}. Linked Meta Page: ${cap.pageName||cap.pageId||'not verified'}. ${commentReadMessage} Automatic publishing permission: ${cap.publishingReady===true?'Ready':cap.publishingReady===false?'Needs permission':'Run scope inspection'}. Comment management: ${cap.commentReady===true&&commentReadVerified!==false?'Ready':cap.commentReady===false||commentReadVerified===false?'Needs attention':'Run scope inspection'}. Private Replies: ${privateReplyText}; ${fallbackText}. Normal DM conversations: ${cap.messagingReady===true?'Ready':cap.messagingReady===false?'Need instagram_manage_messages':'Not fully inspected'}. Webhook delivery: ${webhookReady===true?'Ready — a live Instagram webhook reached this callback':'Awaiting a live Instagram event; this is not treated as a connection failure'}.${publishNote}${missing.length?` Needs attention: ${missing.join(', ')}.`:''}`;
    await savePlatformState(env,'instagram',{connectionState:'connected',connectedAt:c.connectedAt||now(),lastError:missing.length?message:'',lastTestedAt:now(),lastTestMessage:message,username:cap.username,accountName:cap.name,accountType:cap.accountType,pageName:cap.pageName,pageTasks:cap.tasks,tokenType:cap.tokenType,tokenAppId:cap.tokenAppId,grantedScopes:cap.scopes,identityReady:cap.identityReady,publishingReady:cap.publishingReady,commentReady:cap.commentReady,privateReplyReady:cap.privateReplyReady,messagingReady:cap.messagingReady,instagramLoginReady:dmFallback.ready,instagramLoginUsername:dmFallback.username,instagramLoginLastError:dmFallback.error,leadReady:cap.leadReady,commentReadVerified,webhookReady,lastWebhookFields:webhookFields,lastWebhookMessage:webhookMessage});
    return {ok:true,level:missing.length?'warning':'success',...cap,instagramLoginReady:dmFallback.ready,instagramLoginUsername:dmFallback.username,instagramLoginLastError:dmFallback.error,commentReadVerified,webhookReady,webhookFields,webhookMessage,message};
  }catch(e){const d=diagnoseIntegrationError('instagram',e,{action:'connection test'});await savePlatformState(env,'instagram',{connectionState:isAuthenticationFailure(e)?'disconnected':c.connectionState||'',lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});}
}
export async function publishInstagramArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.instagram||{};if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'Instagram automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info),branded=null;
  try{
    if(!info.cover)throw new Error('Instagram automatic publishing needs an Article image.');
    if(!c.instagramBusinessId||!c.pageAccessToken)throw new Error('Instagram Business Account ID or Page Access Token is missing.');
    const claim=await claimPublish(env,'instagram',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('Instagram',claim);
    branded=await buildInstagramBrandedImage(env,info);
    const version=clean(c.graphVersion||'v26.0',20),summary=clean(info.body,900),caption=clean(`${info.title}${summary?`\n\n${summary}`:''}\n\n👇 Apply now using this link below 👇\n\n${info.localUrl}${info.hashtagText?`\n\n${info.hashtagText}`:''}`,2100),createBody=new URLSearchParams({image_url:branded.url,caption,access_token:c.pageAccessToken});
    const created=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/media`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:createBody}),'Instagram media creation');if(!created.id)throw new Error('Instagram did not return a media container ID.');
    await waitForInstagramContainer(c,version,created.id);
    const publishBody=new URLSearchParams({creation_id:created.id,access_token:c.pageAccessToken}),published=await responseJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(c.instagramBusinessId)}/media_publish`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:publishBody}),'Instagram media_publish');
    const firstComment=await addInstagramApplyComment(c,published.id,info);
    await logWrite(env,'instagram',logKey,{articleUrl:info.localUrl,externalId:clean(published.id,300),status:'published',details:{title:info.title,cover:branded.url,originalCover:info.cover,brandedImage:branded,containerId:created.id,firstComment,publishedAt:now()}});
    await savePlatformState(env,'instagram',{connectionState:'connected',connectedAt:now(),lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:info.localUrl,lastPublishImageUrl:branded.url,lastPublishContainerId:created.id,lastPublishedMediaId:clean(published.id,300)});
    return {ok:true,externalId:published.id||'',imageUrl:branded.url,firstComment,message:successMessage('instagram','publish',{externalId:published.id||''})};
  }catch(e){const diag=await publishFailureState(env,'instagram',e);await logWrite(env,'instagram',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,cover:branded?.url||info.cover,originalCover:info.cover,brandedImage:branded||null}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}
export async function testLinkedInConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.linkedin||{};
  try{
    const token=await getLinkedInAccessToken(env),profile=await linkedinUserInfo(token),fresh=(await getSocialIntegrationSettings(env)).linkedin||c;
    const merged={...fresh,memberId:profile.id||fresh.memberId,memberName:profile.name||fresh.memberName,memberEmail:profile.email||fresh.memberEmail,apiVersion:'202608'},cap=linkedinCapabilitySnapshot(merged),identity=linkedinPublishingIdentity(merged),orgId=linkedinOrganizationId(merged);
    const missing=[];
    if(identity==='organization'&&!orgId)missing.push('enter the Organization ID for Organization/Page publishing');
    if(!cap.publishing)missing.push(identity==='organization'?'approve w_organization_social':'approve w_member_social');
    if(merged.communityEnabled&&(!cap.commentRead||!cap.commentWrite))missing.push('Community Management read/write scopes');
    if(merged.leadSyncEnabled&&!cap.lead)missing.push('Lead Sync approval / r_marketing_leadgen_automation');
    if(merged.adsEnabled&&!cap.ads)missing.push('Advertising API approval / r_ads or rw_ads');
    const identityText=identity==='organization'?`Organization/Page${orgId?` ${orgId}`:''}`:'Member Profile';
    const message=`LinkedIn authentication is working${profile.name?` for ${profile.name}`:''}. Publishing identity: ${identityText}. Profile authentication: Ready. Automatic posting: ${cap.publishing&&!(identity==='organization'&&!orgId)?'Ready':'Needs the approved publishing scope / identity setup'}. Comment reading: ${merged.communityEnabled?(cap.commentRead?'Ready':'Needs Community Management read permission'):'Not requested'}. Comment/reaction management: ${merged.communityEnabled?(cap.commentWrite?'Ready':'Needs Community Management write permission'):'Not requested'}. Lead Sync: ${merged.leadSyncEnabled?(cap.lead?'Ready':'Needs Lead Sync approval'):'Not requested'}. Advertising API: ${merged.adsEnabled?(cap.ads?'Ready':'Needs Advertising API approval'):'Not requested'}. API version: 202608.${missing.length?` Needs attention: ${missing.join('; ')}.`:''}`;
    await saveLinkedInState(env,{connectionState:'connected',connectedAt:merged.connectedAt||now(),lastError:missing.length?message:'',lastTestedAt:now(),lastTestMessage:message,memberId:profile.id||merged.memberId,memberName:profile.name||merged.memberName,memberEmail:profile.email||merged.memberEmail,apiVersion:'202608',identityReady:true,publishingReady:cap.publishing&&!(identity==='organization'&&!orgId),commentReadReady:cap.commentRead,commentWriteReady:cap.commentWrite,leadSyncReady:cap.lead,adsReady:cap.ads});
    return {ok:true,level:missing.length?'warning':'success',profile,capabilities:cap,message};
  }catch(e){
    const d=diagnoseIntegrationError('linkedin',e,{action:'connection test'});await saveLinkedInState(env,{connectionState:isAuthenticationFailure(e)?'disconnected':c.connectionState||'',lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});throw Object.assign(new Error(d.message),e,{message:d.message});
  }
}
export async function publishLinkedInArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.linkedin||{};if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'LinkedIn automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  try{
    const token=await getLinkedInAccessToken(env),fresh=(await getSocialIntegrationSettings(env)).linkedin||c,identity=linkedinPublishingIdentity(fresh),orgId=linkedinOrganizationId(fresh),memberId=linkedinMemberId(fresh),actor=linkedinActor(fresh),scopes=String(fresh.grantedScopes||'').split(/[\s,]+/).filter(Boolean);
    if(identity==='organization'&&!orgId)throw new Error('LinkedIn automatic publishing is set to Organization/Page, but the Organization ID is missing. Enter the Organization ID or choose Member Profile.');
    if(identity==='member'&&!memberId)throw new Error('LinkedIn Member Profile identity is missing. Click Connect LinkedIn again so the member ID can be saved automatically.');
    if(!actor)throw new Error('LinkedIn could not determine the publishing identity. Reconnect LinkedIn and run Test Connection.');
    const required=identity==='organization'?'w_organization_social':'w_member_social';if(scopes.length&&!scopes.includes(required))throw new Error(`The connected LinkedIn authorization does not include ${required}. Add/approve the required LinkedIn Product and reconnect LinkedIn.`);
    const claim=await claimPublish(env,'linkedin',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('LinkedIn',claim);
    const version=linkedinVersion(fresh),payload={author:actor,commentary:clean(`${info.title}${info.body?`\n\n${info.body}`:''}\n\n${info.localUrl}${info.hashtagText?`\n\n${info.hashtagText}`:''}`,3000),visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false};if(info.poll.enabled)payload.content={poll:{question:clean(info.poll.question,140),options:info.poll.options.map(x=>({text:clean(x,30)})),settings:{duration:({one_day:'ONE_DAY',three_days:'THREE_DAYS',seven_days:'SEVEN_DAYS',fourteen_days:'FOURTEEN_DAYS'})[info.poll.duration]||'ONE_DAY'}}};
    const res=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers:linkedinHeaders(token,{...fresh,apiVersion:version}),body:JSON.stringify(payload)}),txt=await res.text().catch(()=>'' );if(!res.ok){const e=new Error(`LinkedIn post: ${txt||res.status}`);e.httpStatus=res.status;throw e;}const externalId=res.headers.get('x-restli-id')||'';if(!externalId)throw new Error('LinkedIn accepted the post request but did not return a post ID.');
    const externalUrl=`https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}/`;
    let firstComment={ok:true,skipped:true,reason:'First social comment is disabled.'};const fc=socialFirstCommentMessage(info);if(fc&&externalId){try{const commentRes=await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(externalId)}/comments`,{method:'POST',headers:linkedinHeaders(token,{...fresh,apiVersion:version}),body:JSON.stringify({actor,message:{text:fc}})}),commentText=await commentRes.text().catch(()=>'' );if(!commentRes.ok)throw new Error(`LinkedIn first comment: ${commentText||commentRes.status}`);firstComment={ok:true,id:commentRes.headers.get('x-restli-id')||'',message:fc};}catch(e){firstComment={ok:false,error:clean(e.message,1200),message:fc};}}
    await logWrite(env,'linkedin',logKey,{articleUrl:info.localUrl,externalId,status:'published',details:{title:info.title,cover:info.cover,externalUrl,identity,firstComment,publishedAt:now()}});await savePlatformState(env,'linkedin',{connectionState:'connected',connectedAt:fresh.connectedAt||now(),lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:externalUrl,publishingReady:true});return {ok:true,externalId,url:externalUrl,firstComment,message:successMessage('linkedin','publish',{externalId})};
  }catch(e){const diag=await publishFailureState(env,'linkedin',e);await logWrite(env,'linkedin',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,cover:info.cover}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}
function xScopeList(v){return [...new Set(String(v||'').split(/[\s,]+/).map(x=>clean(x,100)).filter(Boolean))];}
function xPostText(info={}){
  const url=clean(info.localUrl,500),title=clean(info.title,220),body=clean(info.body,900).replace(/\s+/g,' '),tags=clean(info.hashtagText,180);
  // Keep both the public article URL and hashtags intact. Trim descriptive copy first.
  const suffix=`${url?`\n\n${url}`:''}${tags?`\n\n${tags}`:''}`;
  const leadBudget=Math.max(0,280-suffix.length);
  const lead=clean(`${info.poll?.enabled?`${clean(info.poll.question,140)}\n\n`:''}${title}${body?`\n\n${body}`:''}`,leadBudget);
  return clean(`${lead}${suffix}`,280);
}
function xProblemMeta(error){
  const p=error?.upstreamPayload||{},type=String(error?.upstreamType||p?.type||''),reason=String(error?.upstreamReason||p?.reason||''),title=String(error?.upstreamTitle||p?.title||'');
  return {type,reason,title};
}
function xExpectedWriteProbeFailure(res,data,text=''){
  if(Number(res?.status)!==400)return false;
  const all=`${data?.title||''} ${data?.detail||''} ${data?.type||''} ${text||''}`.toLowerCase();
  return /invalid request|invalid-request|text|media|one of|at least one|required/.test(all);
}
async function xWriteEndpointProbe(token){
  // Deliberately invalid empty body: a write-enabled app reaches POST /2/tweets and
  // X returns HTTP 400 without creating a public post. 403/429/other responses reveal
  // access, enrollment, billing or rate-limit problems that GET /users/me cannot detect.
  const res=await fetch('https://api.x.com/2/tweets',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:'{}'});
  const text=await res.text().catch(()=>'');let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(xExpectedWriteProbeFailure(res,data,text))return {ready:true,status:res.status,message:'X write endpoint is reachable with this user authorization. The validation request was intentionally invalid, so no public post was created.'};
  if(res.ok&&data?.data?.id){
    // Defensive cleanup: X should never create a post from {}, but if its API behavior
    // changes, immediately remove the unexpected validation post before returning.
    await fetch(`https://api.x.com/2/tweets/${encodeURIComponent(String(data.data.id))}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}).catch(()=>{});
    return {ready:true,status:res.status,message:'X write endpoint is reachable. A provider-side validation object was removed immediately.'};
  }
  const firstArrayError=Array.isArray(data?.errors)&&data.errors.length?data.errors[0]:null;
  const detail=data?.detail||firstArrayError?.detail||data?.message||data?.title||firstArrayError?.title||text||`X write capability check failed (${res.status}).`;
  const e=new Error(`X write capability check: ${String(detail).slice(0,1200)}`);
  e.httpStatus=Number(res.status||firstArrayError?.status||0)||0;e.upstreamPayload=data;e.upstreamType=String(data?.type||firstArrayError?.type||'');e.upstreamReason=String(data?.reason||firstArrayError?.reason||'');e.upstreamTitle=String(data?.title||firstArrayError?.title||'');e.upstreamMessage=String(detail||'');
  throw e;
}
async function xCreatePost(token,payload,label='X post'){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{return await responseJson(await fetch('https://api.x.com/2/tweets',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),label);}
    catch(e){lastError=e;const status=Number(e?.httpStatus||0),m=String(e?.message||'').toLowerCase();const transient=status>=500||/network|fetch failed|timed out|timeout|connection reset/.test(m);if(!transient||attempt===1)throw e;await sleep(900);}
  }
  throw lastError||new Error(`${label} failed.`);
}
export async function getXUserAccessToken(env){
  const social=await getSocialIntegrationSettings(env),c=social.x||{};let token=clean(c.accessToken||c.bearerToken,10000);
  if(!token)throw new Error('X is not connected with user-context OAuth 2.0. Save the OAuth 2.0 Client ID and Client Secret, then click Connect X / Twitter.');
  const exp=Date.parse(c.tokenExpiresAt||'');if(!Number.isFinite(exp)||exp-Date.now()>5*60*1000)return token;
  if(!c.refreshToken){if(exp>Date.now())return token;throw new Error('The X user access token expired and no refresh token is saved. Click Connect X / Twitter again.');}
  if(!c.clientId||!c.clientSecret)throw new Error('The X OAuth 2.0 Client ID or Client Secret is missing. Save both values and reconnect X / Twitter.');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:c.refreshToken}),basic=btoa(`${c.clientId}:${c.clientSecret}`);
  const data=await responseJson(await fetch('https://api.x.com/2/oauth2/token',{method:'POST',headers:{authorization:`Basic ${basic}`,'content-type':'application/x-www-form-urlencoded'},body}),'X token refresh');
  token=clean(data.access_token,10000);if(!token)throw new Error('X refreshed authorization but did not return a user access token.');const expires=Number(data.expires_in||7200),scopes=clean(data.scope||c.grantedScopes,2000),refreshToken=clean(data.refresh_token||c.refreshToken,10000),tokenExpiresAt=new Date(Date.now()+expires*1000).toISOString();
  await savePlatformState(env,'x',{accessToken:token,bearerToken:token,refreshToken,tokenExpiresAt,grantedScopes:scopes,lastError:''});return token;
}
export async function testXConnection(env){
  const social=await getSocialIntegrationSettings(env),c=social.x||{},token=await getXUserAccessToken(env),data=await responseJson(await fetch('https://api.x.com/2/users/me',{headers:{authorization:`Bearer ${token}`}}),'X connection check'),id=clean(data?.data?.id||c.userId,200),username=clean(data?.data?.username||c.username,300),scopes=xScopeList(c.grantedScopes),has=(x)=>scopes.includes(x);
  const scopeReady=has('tweet.write')||!scopes.length,likeReady=has('like.write')||!scopes.length,alreadyVerified=c.publishingReady===true&&['published','real_publish_ready'].includes(String(c.publishingProbeStatus||''));
  if(!scopeReady){
    const message=`X user authentication is working${username?` for @${username}`:''}, but automatic posting is not authorized because tweet.write is missing. Reconnect X / Twitter and approve write access.`;
    await savePlatformState(env,'x',{connectionState:'connected',connectedAt:c.connectedAt||now(),lastError:message,lastTestedAt:now(),lastTestMessage:message,userId:id,username,publishingReady:false,publishingProbeStatus:'scope_missing'});
    throw Object.assign(new Error(message),{httpStatus:403,upstreamCode:'missing_tweet_write'});
  }
  const message=`X user authentication is working${username?` for @${username}`:''}. Profile read: Ready. OAuth write permission: ${scopeReady?'Ready':'Needs tweet.write'}. Reply publishing permission: ${scopeReady?'Ready':'Needs tweet.write'}. Like actions permission: ${likeReady?'Ready':'Needs like.write'}. Continuous authorization: ${c.refreshToken?'Ready (refresh token saved)':'Reconnect with offline.access to save a refresh token'}. ${alreadyVerified?'A previous real create-post operation was verified successfully.':'No paid write request was made by Test Connection. Actual posting still requires available X Developer API credits.'}`;
  await savePlatformState(env,'x',{connectionState:'connected',connectedAt:c.connectedAt||now(),lastError:'',lastTestedAt:now(),lastTestMessage:message,userId:id,username,publishingReady:alreadyVerified?true:c.publishingReady??null});
  return {ok:true,id,username,scopes,publishingReady:alreadyVerified?true:c.publishingReady??null,message};
}
export async function testXPublishingCapability(env){
  const social=await getSocialIntegrationSettings(env),c=social.x||{},token=await getXUserAccessToken(env),scopes=xScopeList(c.grantedScopes);
  if(scopes.length&&!scopes.includes('tweet.write'))throw Object.assign(new Error('The connected X authorization does not include tweet.write. Reconnect X / Twitter and approve write access.'),{httpStatus:403,upstreamCode:'missing_tweet_write'});
  const testText=`DropBeat Dance Studio X API publishing check ${brandHomeUrl(env)}/`;
  try{
    const created=await xCreatePost(token,{text:clean(testText,280),nullcast:true},'X hidden publishing test'),id=clean(created?.data?.id,300);if(!id)throw new Error('X did not return a post ID for the hidden publishing test.');
    let deleted=false,deleteMessage='';
    try{const del=await responseJson(await fetch(`https://api.x.com/2/tweets/${encodeURIComponent(id)}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),'X hidden publishing test cleanup');deleted=del?.data?.deleted!==false;}
    catch(e){deleteMessage=clean(e.message,900);}
    const message=`X accepted a real hidden/nullcast post containing the DropBeat Dance Studio URL${deleted?' and the test post was deleted immediately':'; the create test passed, but automatic cleanup could not be confirmed'}. Automatic publishing is ready.${deleteMessage?` Cleanup diagnostic: ${deleteMessage}`:''}`;
    await savePlatformState(env,'x',{publishingReady:true,publishingProbeStatus:'real_publish_ready',publishingProbeAt:now(),publishingProbeMessage:message,lastError:'',lastTestedAt:now(),lastTestMessage:message});return {ok:true,id,deleted,message};
  }catch(e){const d=diagnoseIntegrationError('x',e,{action:'real hidden publishing test'}),meta=xProblemMeta(e);await savePlatformState(env,'x',{publishingReady:false,publishingProbeStatus:meta.reason||meta.type||String(e?.httpStatus||'failed'),publishingProbeAt:now(),publishingProbeMessage:d.message,lastError:d.message,lastTestedAt:now(),lastTestMessage:d.message}).catch(()=>{});const out=new Error(d.message);Object.assign(out,e,{message:d.message});throw out;}
}
export async function publishXArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.x||{};if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'X automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  try{
    const scopes=xScopeList(c.grantedScopes);if(scopes.length&&!scopes.includes('tweet.write'))throw Object.assign(new Error('The connected X authorization does not include tweet.write. Reconnect X / Twitter and approve write access.'),{httpStatus:403,upstreamCode:'missing_tweet_write'});
    const token=await getXUserAccessToken(env),claim=await claimPublish(env,'x',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('X',claim);
    const text=xPostText(info);if(!text)throw new Error('X automatic publishing could not build post text for this Article.');
    const data=await xCreatePost(token,{text,...(info.poll.enabled?{poll:{options:info.poll.options.map(x=>clean(x,25)),duration_minutes:Math.min(10080,pollDurationMinutes(info.poll.duration))}}:{})},'X post'),id=clean(data?.data?.id,300);if(!id)throw new Error('X accepted the create request but did not return a post ID.');const externalUrl=`https://x.com/i/web/status/${id}`;
    let firstComment={ok:true,skipped:true,reason:'First social comment is disabled.'};const fc=socialFirstCommentMessage(info);if(fc&&id){try{const r=await xCreatePost(token,{text:clean(fc,280),reply:{in_reply_to_tweet_id:id}},'X first reply');firstComment={ok:true,id:clean(r?.data?.id,300),message:clean(fc,280)};}catch(e){firstComment={ok:false,error:clean(e.message,1200),message:clean(fc,280)};}}
    await logWrite(env,'x',logKey,{articleUrl:info.localUrl,externalId:id,status:'published',details:{title:info.title,cover:info.cover,externalUrl,text,firstComment,publishedAt:now()}});await savePlatformState(env,'x',{connectionState:'connected',connectedAt:c.connectedAt||now(),lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:externalUrl,publishingReady:true,publishingProbeStatus:'published',publishingProbeAt:now(),publishingProbeMessage:`X accepted automatic publication. Post ID ${id}.`});return {ok:true,externalId:id,url:externalUrl,text,firstComment,message:successMessage('x','publish',{externalId:id})};
  }catch(e){const diag=await publishFailureState(env,'x',e);const meta=xProblemMeta(e);await savePlatformState(env,'x',{publishingReady:false,publishingProbeStatus:meta.reason||meta.type||String(e?.httpStatus||'failed'),publishingProbeAt:now(),publishingProbeMessage:diag.message}).catch(()=>{});await logWrite(env,'x',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,cover:info.cover,xProblem:meta}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}
export async function publishSnapchatArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.snapchat||{};
  if(!c.enabled||!c.autoPublishStory)return {ok:true,skipped:true,reason:'Snapchat automatic Story publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info),source=info.video||info.cover;
  if(!source)return {ok:true,skipped:true,reason:'Snapchat automatic Story publishing needs a public Article video or image URL.'};
  try{
    const claim=await claimPublish(env,'snapchat',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('Snapchat',claim);
    const out=await uploadSnapchatStoryMedia(env,source,info.title||'DropBeat Dance Studio Article');
    await logWrite(env,'snapchat',logKey,{articleUrl:info.localUrl,externalId:out.mediaId||'',status:'published',details:{title:info.title,cover:info.cover,video:info.video,source,externalUrl:out.url||'',profileId:out.profileId,publishedAt:now()}});
    return {ok:true,externalId:out.mediaId||'',url:out.url||'',message:'Snapchat Public Profile Story published successfully.'};
  }catch(e){const diag=await publishFailureState(env,'snapchat',e);await logWrite(env,'snapchat',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,cover:info.cover,video:info.video}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}

export async function publishYouTubeArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),c=social.youtube||{};
  if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'YouTube automatic publishing is disabled.'};
  const info=articleInfo(env,article);let logKey=publicationKey(info);
  if(!info.video)return {ok:true,skipped:true,reason:'YouTube automatic publishing requires a public video URL on the Article. YouTube Data API does not create text-only Community posts.'};
  try{
    const token=await getYouTubeAccessToken(env),claim=await claimPublish(env,'youtube',info);logKey=claim.articleKey;if(!claim.claimed)return claimSkip('YouTube',claim);
    const vr=await fetch(info.video,{headers:{accept:'video/*,application/octet-stream'}});if(!vr.ok)throw new Error(`YouTube could not download the Article video (HTTP ${vr.status}).`);
    const len=Number(vr.headers.get('content-length')||0);if(len>50*1024*1024)throw new Error('The Article video is larger than the 50 MB automatic-upload safety limit for this Worker build. Upload the video to YouTube manually or use a smaller file.');
    const bytes=await vr.arrayBuffer(),mime=clean(vr.headers.get('content-type')||'video/mp4',120).split(';')[0]||'video/mp4';
    const boundary=`uc_${crypto.randomUUID().replace(/-/g,'')}`,metadata={snippet:{title:clean(info.title,100),description:clean([info.body,info.localUrl,info.hashtagText].filter(Boolean).join('\n\n'),4500)},status:{privacyStatus:['public','unlisted','private'].includes(c.privacyStatus)?c.privacyStatus:'public'}};
    const encoder=new TextEncoder(),prefix=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,suffix=`\r\n--${boundary}--\r\n`;
    const body=new Blob([encoder.encode(prefix),bytes,encoder.encode(suffix)],{type:`multipart/related; boundary=${boundary}`});
    const res=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':`multipart/related; boundary=${boundary}`},body});
    const text=await res.text();let data={};try{data=JSON.parse(text)}catch{}
    if(!res.ok||!data.id)throw Object.assign(new Error(data?.error?.message||text||`YouTube upload failed (HTTP ${res.status}).`),{httpStatus:res.status});
    const id=clean(data.id,200),url=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    await logWrite(env,'youtube',logKey,{articleUrl:info.localUrl,externalId:id,status:'published',details:{title:info.title,video:info.video,externalUrl:url,publishedAt:now()}});await savePlatformState(env,'youtube',{connectionState:'connected',lastError:'',lastPublishError:'',lastPublishStatus:'published',lastPublishAt:now(),lastPublishedUrl:url});return {ok:true,externalId:id,url,message:'YouTube video published successfully.'};
  }catch(e){const diag=await publishFailureState(env,'youtube',e);await logWrite(env,'youtube',logKey,{articleUrl:info.localUrl,status:'failed',details:{error:diag.message,title:info.title,video:info.video}});throw Object.assign(new Error(diag.message),e,{message:diag.message});}
}

export async function submitGoogleIndexingUrl(env,url){
  const social=await getSocialIntegrationSettings(env),c=social.googleIndexing||{};if(!c.enabled)throw new Error('Google Indexing API is disabled.');if(!c.eligibilityConfirmed)throw new Error('Google Indexing API eligibility has not been confirmed. It may only be used for valid JobPosting or livestream BroadcastEvent pages.');
  const target=clean(url||c.testUrl,1800);if(!/^https:\/\//i.test(target))throw new Error('Enter a valid HTTPS URL to submit.');
  try{const token=await serviceAccountToken(c,'https://www.googleapis.com/auth/indexing');const data=await responseJson(await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({url:target,type:'URL_UPDATED'})}),'Google Indexing API submission');await savePlatformState(env,'googleIndexing',{lastSubmittedAt:now(),lastError:''});return {ok:true,url:target,metadata:data?.urlNotificationMetadata||data,message:'Eligible URL submitted to Google Indexing API.'};}catch(e){await savePlatformState(env,'googleIndexing',{lastError:clean(e.message,1200)}).catch(()=>{});throw e;}
}
export async function testGoogleIndexingConnection(env){
  const c=(await getSocialIntegrationSettings(env)).googleIndexing||{};await serviceAccountToken(c,'https://www.googleapis.com/auth/indexing');await savePlatformState(env,'googleIndexing',{lastError:''});return {ok:true,message:'Google Indexing API service-account authentication is working. Enable automatic submission only for eligible JobPosting/BroadcastEvent pages.'};
}

const INDEXNOW_KEY_RE=/^[A-Za-z0-9-]{8,128}$/;
const INDEXNOW_DEDUPE_MS=10*60*1000;
const INDEXNOW_DEFAULT_COOLDOWN_MS=60*60*1000;
function indexNowHome(env){return brandHomeUrl(env).replace(/\/+$/,'');}
function indexNowKeyLocation(env){return `${indexNowHome(env)}/indexnow-key.txt`;}
function indexNowRetryMs(res){
  const raw=String(res?.headers?.get?.('retry-after')||'').trim();
  if(/^\d+$/.test(raw))return Math.max(60*1000,Math.min(24*60*60*1000,Number(raw)*1000));
  const at=Date.parse(raw);if(Number.isFinite(at)&&at>Date.now())return Math.max(60*1000,Math.min(24*60*60*1000,at-Date.now()));
  return INDEXNOW_DEFAULT_COOLDOWN_MS;
}
function indexNowError(message,status=0,extra={}){const e=new Error(message);e.httpStatus=Number(status||0)||0;Object.assign(e,extra);return e;}
function normalizeIndexNowTargets(env,urls=[]){
  const home=indexNowHome(env),expectedHost=new URL(home).host;
  const list=[...new Set((Array.isArray(urls)?urls:[urls]).map(v=>clean(v,1800)).filter(Boolean))].slice(0,200);
  if(!list.length)throw indexNowError('Enter at least one public HTTPS URL to submit to IndexNow.',400);
  for(const target of list){
    let u;try{u=new URL(target);}catch{throw indexNowError(`IndexNow URL is invalid: ${target}`,400);}
    if(u.protocol!=='https:')throw indexNowError('IndexNow requires a valid HTTPS URL.',400);
    if(u.host!==expectedHost)throw indexNowError(`IndexNow can submit only URLs on ${expectedHost} with the verification key hosted there. Use the public DropBeat Dance Studio URL on ${expectedHost}, not ${u.host}.`,422);
  }
  return {home,host:expectedHost,targets:list,keyLocation:indexNowKeyLocation(env)};
}
function recentIndexNowMap(c={}){
  const rows=Array.isArray(c.recentSubmissions)?c.recentSubmissions:[];const cutoff=Date.now()-24*60*60*1000,out=new Map();
  for(const row of rows){const url=clean(row?.url,1800),t=Date.parse(row?.at||'');if(url&&Number.isFinite(t)&&t>=cutoff)out.set(url,t);}
  return out;
}
export async function submitIndexNowUrls(env,urls=[]){
  const social=await getSocialIntegrationSettings(env),c=social.indexNow||{};
  if(!c.enabled)throw indexNowError('Bing / IndexNow is disabled. Enable it and save the settings before submitting URLs.',409);
  const key=clean(c.key,200);if(!key)throw indexNowError('IndexNow key is missing. Generate a dedicated IndexNow key, save it, then test the connection.',400);
  if(!INDEXNOW_KEY_RE.test(key))throw indexNowError('The saved IndexNow key format is invalid. Use 8–128 letters, numbers or hyphens. Do not use the Bing Webmaster Tools API Access key.',400);
  const cooldownAt=Date.parse(c.cooldownUntil||'');
  if(Number.isFinite(cooldownAt)&&cooldownAt>Date.now())throw indexNowError(`IndexNow is temporarily paused until ${new Date(cooldownAt).toISOString()} because the service returned HTTP 429 Too Many Requests. DropBeat Dance Studio will not send another IndexNow request during this safety pause.`,429,{retryAt:new Date(cooldownAt).toISOString(),cooldown:true});
  const {host,targets,keyLocation}=normalizeIndexNowTargets(env,urls),recent=recentIndexNowMap(c),nowMs=Date.now();
  const pending=targets.filter(url=>!(recent.has(url)&&nowMs-recent.get(url)<INDEXNOW_DEDUPE_MS));
  if(!pending.length)return {ok:true,skipped:true,deduplicated:true,urls:targets,message:'These URLs were already submitted to IndexNow within the last 10 minutes. No duplicate network request was sent.'};
  const body={host,key,keyLocation,urlList:pending};
  try{
    const res=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(body)}),text=await res.text().catch(()=>'');
    if(![200,202].includes(res.status)){
      const message=`IndexNow submission failed (${res.status})${text?`: ${text.slice(0,400)}`:''}`;
      if(res.status===429){
        const retryAt=new Date(Date.now()+indexNowRetryMs(res)).toISOString(),sameCooldown=String(c.lastSubmitError||'')===message&&Date.parse(c.cooldownUntil||'')>Date.now();
        if(!sameCooldown)await savePlatformState(env,'indexNow',{lastSubmitError:clean(message,1200),lastSubmitStatus:429,cooldownUntil:retryAt,lastError:''}).catch(()=>{});
        throw indexNowError(`${message}. DropBeat Dance Studio has automatically paused further IndexNow submissions until ${retryAt} to prevent repeated rate-limit requests.`,429,{retryAt,cooldown:true});
      }
      throw indexNowError(message,res.status);
    }
    const acceptedAt=now(),nextRecent=[...pending.map(url=>({url,at:acceptedAt})),...(Array.isArray(c.recentSubmissions)?c.recentSubmissions:[])].filter((row,i,all)=>row?.url&&all.findIndex(x=>x?.url===row.url)===i).slice(0,30);
    await savePlatformState(env,'indexNow',{lastSubmittedAt:acceptedAt,lastSubmittedUrl:pending[pending.length-1]||'',lastSubmitStatus:res.status,lastSubmitError:'',lastError:'',cooldownUntil:'',recentSubmissions:nextRecent});
    return {ok:true,urls:pending,url:pending[0]||'',status:res.status,keyLocation,message:pending.length===1?'URL submitted to IndexNow for Bing and other participating search engines.':`${pending.length} changed URLs were submitted to IndexNow in one request.`};
  }catch(e){
    if(Number(e?.httpStatus||0)!==429){const message=clean(e.message,1200);if(message&&message!==clean(c.lastSubmitError,1200))await savePlatformState(env,'indexNow',{lastSubmitError:message,lastSubmitStatus:Number(e?.httpStatus||0)||0,lastError:''}).catch(()=>{});}
    throw e;
  }
}
export async function submitIndexNowUrl(env,url){return submitIndexNowUrls(env,[url]);}
export async function testIndexNowConnection(env){
  const c=(await getSocialIntegrationSettings(env)).indexNow||{},key=clean(c.key,200);if(!key)throw indexNowError('Generate and save a dedicated IndexNow key first.',400);
  if(!INDEXNOW_KEY_RE.test(key))throw indexNowError('The saved IndexNow key format is invalid. Use 8–128 letters, numbers or hyphens. The Bing Webmaster Tools API Access key is a different credential and should not be used here.',400);
  const keyLocation=indexNowKeyLocation(env);let res,text='';
  try{res=await fetch(keyLocation,{headers:{accept:'text/plain'},redirect:'follow'});text=await res.text();}catch{throw indexNowError(`DropBeat Dance Studio could not open the public IndexNow key verification URL ${keyLocation}. Confirm the website is live and try again.`,502);}
  if(!res.ok)throw indexNowError(`The IndexNow key verification URL returned HTTP ${res.status}. Save the IndexNow settings and try again.`,res.status);
  if(text.trim()!==key)throw indexNowError('The public IndexNow verification file does not match the saved IndexNow key. Save the key again before submitting URLs.',403);
  const testedAt=now(),message='IndexNow configuration is ready: the dedicated key format is valid and the public key verification URL returns the saved key. Test Connection does not submit any URL, so it cannot consume IndexNow submission quota.';
  await savePlatformState(env,'indexNow',{lastTestedAt:testedAt,lastTestMessage:message,lastError:''}).catch(()=>{});
  return {ok:true,keyLocation,lastTestedAt:testedAt,message};
}

export async function distributePublishedArticle(env,article={}){
  const social=await getSocialIntegrationSettings(env),results={},info=articleInfo(env,article);
  if(social.facebook?.enabled&&social.facebook?.autoPublish){try{results.facebook=await publishFacebookArticle(env,article);}catch(e){results.facebook={ok:false,error:clean(e.message,1200)};}}
  if(social.instagram?.enabled&&social.instagram?.autoPublish){try{results.instagram=await publishInstagramArticle(env,article);}catch(e){results.instagram={ok:false,error:clean(e.message,1200)};}}
  if(social.threads?.enabled&&social.threads?.autoPublish!==false){try{results.threads=await publishThreadArticle(env,article);}catch(e){results.threads={ok:false,error:clean(e.message,1200)};}}
  if(social.youtube?.enabled&&social.youtube?.autoPublish){try{results.youtube=await publishYouTubeArticle(env,article);}catch(e){results.youtube={ok:false,error:clean(e.message,1200)};}
  }
  if(social.snapchat?.enabled&&social.snapchat?.autoPublishStory){try{results.snapchat=await publishSnapchatArticle(env,article);}catch(e){results.snapchat={ok:false,error:clean(e.message,1200)};}}
  if(social.x?.enabled&&social.x?.autoPublish){try{results.x=await publishXArticle(env,article);}catch(e){results.x={ok:false,error:clean(e.message,1200)};}}
  if(social.linkedin?.enabled&&social.linkedin?.autoPublish){try{results.linkedin=await publishLinkedInArticle(env,article);}catch(e){results.linkedin={ok:false,error:clean(e.message,1200)};}}
  if(social.telegram?.enabled&&social.telegram?.autoPublish){try{results.telegram=await publishTelegramArticle(env,article);}catch(e){results.telegram={ok:false,error:clean(e.message,1200)};}}
  if(social.pinterest?.enabled&&social.pinterest?.autoPublish!==false){try{results.pinterest=await publishPinterestArticle(env,article);}catch(e){results.pinterest={ok:false,error:clean(e.message,1200)};}}
  if(social.searchConsole?.enabled&&social.searchConsole?.autoSubmitAuditions!==false){try{results.searchConsole=await submitSearchConsoleSitemap(env,{config:social.searchConsole});}catch(e){results.searchConsole={ok:false,error:clean(e.message,1200)};}}
  if(social.googleIndexing?.enabled&&social.googleIndexing?.autoPublish&&social.googleIndexing?.eligibilityConfirmed){try{results.googleIndexing=await submitGoogleIndexingUrl(env,info.localUrl);}catch(e){results.googleIndexing={ok:false,error:clean(e.message,1200)};}}
  if(social.googleBusiness?.enabled&&social.googleBusiness?.autoPublish){try{results.googleBusiness=await publishGoogleBusinessArticle(env,article);}catch(e){results.googleBusiness={ok:false,error:clean(e.message,1200)};}}
  if(social.indexNow?.enabled&&social.indexNow?.autoPublish!==false){try{results.indexNow=await submitIndexNowUrl(env,info.localUrl);}catch(e){results.indexNow={ok:false,error:clean(e.message,1200)};}}
  const failed=Object.values(results).some(r=>r&&r.ok===false);
  await logWrite(env,'distribution',publicationKey(info),{articleUrl:info.localUrl,status:failed?'failed':'published',details:{results,completedAt:now()}});
  return results;
}
