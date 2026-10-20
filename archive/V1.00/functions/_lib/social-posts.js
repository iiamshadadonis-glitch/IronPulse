import { getSocialIntegrationSettings } from './utils.js';
import { threadsToken, pinterestToken, getXUserAccessToken } from './social-publishing.js';
import { getLinkedInAccessToken, linkedinActor, linkedinHeaders, linkedinScopeList, linkedinPublishingIdentity } from './linkedin.js';
import { getYouTubeAccessToken } from './youtube.js';
import { uploadSnapchatStoryMedia } from './snapchat.js';

const clean=(v,n=8000)=>String(v??'').trim().slice(0,n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>new Date().toISOString();
const bool=v=>v===true||v===1||v==='1'||v==='true'||v==='on';
const jsonSafe=(v,fallback={})=>{try{return typeof v==='string'?JSON.parse(v||''):(v??fallback);}catch{return fallback;}};

export const SOCIAL_POST_DOCS={
  facebook:'https://developers.facebook.com/docs/pages-api/posts/',
  instagram:'https://developers.facebook.com/docs/instagram-platform/content-publishing/',
  threads:'https://developers.facebook.com/docs/threads/posts/',
  pinterest:'https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/',
  youtube:'https://developers.google.com/youtube/v3/docs/videos/insert',
  x:'https://docs.x.com/x-api/posts/create-post',
  linkedin:'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api',
  snapchat:'https://developers.snap.com/api/marketing-api/Public-Profile-API/Overview'
};

const LABELS={facebook:'Facebook',instagram:'Instagram',threads:'Threads',pinterest:'Pinterest',youtube:'YouTube',x:'X / Twitter',linkedin:'LinkedIn',snapchat:'Snapchat'};
export function platformLabel(p){return LABELS[String(p||'').toLowerCase()]||String(p||'');}

function scopeSet(v){return new Set(Array.isArray(v)?v.map(String):String(v||'').split(/[\s,]+/).filter(Boolean));}
function baseConnected(p,c={}){
  if(!c.enabled)return false;
  if(p==='facebook')return !!(c.pageId&&c.pageAccessToken&&c.publishingReady!==false);
  if(p==='instagram')return !!(c.instagramBusinessId&&(c.pageAccessToken||c.instagramLoginToken)&&c.publishingReady!==false);
  if(p==='threads')return !!(c.accessToken&&c.publishingReady!==false);
  if(p==='pinterest')return !!(c.accessToken&&c.boardId&&c.pinPublishingReady!==false);
  if(p==='youtube')return !!(c.refreshToken&&c.channelId&&c.connectionState==='connected');
  if(p==='x')return !!((c.accessToken||c.refreshToken)&&c.connectionState==='connected'&&c.publishingReady!==false);
  if(p==='linkedin')return !!(c.accessToken&&c.connectionState==='connected'&&c.publishingReady!==false);
  if(p==='snapchat')return !!(c.refreshToken&&c.publicProfileId&&c.connectionState==='connected'&&c.publishingReady===true);
  return false;
}

function capabilityEntry(p,c,features,reason=''){
  const connected=baseConnected(p,c);
  return {key:p,label:platformLabel(p),enabled:!!c.enabled,connected,features,reason:connected?'':reason||(!c.enabled?'Disabled in Social Media API.':'Connection/capability check is not ready.'),docs:SOCIAL_POST_DOCS[p]||''};
}

export async function getSocialPostCapabilities(env){
  const s=await getSocialIntegrationSettings(env);
  const xScopes=scopeSet(s.x?.grantedScopes),liScopes=new Set(linkedinScopeList(s.linkedin?.grantedScopes));
  const liIdentity=linkedinPublishingIdentity(s.linkedin||{}),liWrite=liIdentity==='organization'?liScopes.has('w_organization_social'):liScopes.has('w_member_social');
  const items={
    facebook:capabilityEntry('facebook',s.facebook||{},{text:true,image:true,videoShort:true,videoFull:true,storyImage:true,storyVideo:false,firstComment:true,caption:true,tags:true,richText:false},'Enable Facebook and complete the Page publishing capability check.'),
    instagram:capabilityEntry('instagram',s.instagram||{},{text:false,image:true,carouselImage:true,carouselVideo:true,carouselMixed:true,videoShort:true,videoFull:false,storyImage:true,storyVideo:true,firstComment:true,caption:true,storyCaption:false,tags:true,richText:false},'Enable Instagram and complete professional-account content publishing access.'),
    threads:capabilityEntry('threads',s.threads||{},{text:true,image:true,carouselImage:true,carouselVideo:true,carouselMixed:true,videoShort:true,videoFull:true,storyImage:false,storyVideo:false,firstComment:false,caption:true,tags:true,richText:false,pollTypes:['text']},'Enable Threads and connect an account with publishing permission.'),
    pinterest:capabilityEntry('pinterest',s.pinterest||{},{text:false,image:true,videoShort:false,videoFull:false,storyImage:false,storyVideo:false,firstComment:false,caption:true,tags:true,richText:false},'Enable Pinterest, connect OAuth, and select a Board. Video Pins need a separate cover-image upload flow, so this one-media composer exposes image Pins only.'),
    youtube:capabilityEntry('youtube',s.youtube||{},{text:false,image:false,videoShort:true,videoFull:true,storyImage:false,storyVideo:false,firstComment:false,caption:true,tags:true,richText:false},'Enable and connect YouTube. The YouTube Data API uploads videos; it does not currently expose Community text/image posting.'),
    x:capabilityEntry('x',s.x||{},{text:xScopes.size?xScopes.has('tweet.write'):true,image:xScopes.size?(xScopes.has('tweet.write')&&xScopes.has('media.write')):true,videoShort:xScopes.size?(xScopes.has('tweet.write')&&xScopes.has('media.write')):true,videoFull:xScopes.size?(xScopes.has('tweet.write')&&xScopes.has('media.write')):true,storyImage:false,storyVideo:false,firstComment:xScopes.size?xScopes.has('tweet.write'):true,caption:true,tags:true,richText:false,pollTypes:['text']},xScopes.size&&!xScopes.has('tweet.write')?'Reconnect X and approve tweet.write. For image/video publishing also approve media.write.':'Enable X and connect OAuth 2.0 user authorization.'),
    linkedin:capabilityEntry('linkedin',s.linkedin||{},{text:liWrite,image:liWrite,videoShort:liWrite,videoFull:liWrite,storyImage:false,storyVideo:false,firstComment:liWrite,caption:true,tags:true,richText:false,pollTypes:['text']},liScopes.size&&!liWrite?'Reconnect LinkedIn after enabling publishing so the required write permission is requested.':'Enable and connect LinkedIn with publishing permission.'),
    snapchat:capabilityEntry('snapchat',s.snapchat||{},{text:false,image:false,videoShort:false,videoFull:false,storyImage:true,storyVideo:true,firstComment:false,caption:false,storyCaption:false,tags:false,richText:false},'Snapchat Business OAuth may be connected, but Public Profile Story publishing must also pass its capability/allowlist check. Snap Kit does not replace this permission.')
  };
  // If a feature-specific scope is missing, keep connection visible but mark the exact feature unavailable.
  if(items.x.connected&&xScopes.size&&!xScopes.has('media.write'))items.x.reason='X text posting is ready. Reconnect X once to add media.write before using image/video posts.';
  if(items.linkedin.connected&&!liWrite){items.linkedin.connected=false;items.linkedin.reason='LinkedIn OAuth is connected, but the selected publishing identity does not have its required write scope.';}
  return {platforms:Object.values(items),byPlatform:items,drive:{enabled:!!s.googleDrive?.enabled,connected:!!s.googleDrive?.refreshToken,uploadReady:!!s.googleDrive?.uploadReady,postFolderName:s.googleDrive?.postFolderName||'Posts'},rules:{maxTags:30,richText:false,richTextMessage:'Cross-platform publishing uses plain text. Native API formatting support is inconsistent, so bold, italic, underline and strike controls are intentionally not shown instead of publishing visible markup.'}};
}

function featureFor(post={}){
  const type=clean(post.post_type||post.postType,30).toLowerCase();
  if(type==='text')return 'text';
  if(type==='image')return 'image';
  if(type==='video')return clean(post.video_mode||post.videoMode,20)==='short'?'videoShort':'videoFull';
  if(type==='story')return clean(post.media_kind||post.mediaKind,20)==='video'?'storyVideo':'storyImage';
  if(type==='carousel'){const m=clean(post.media_kind||post.mediaKind||post.carousel_mode||post.carouselMode,20).toLowerCase();return m==='video'?'carouselVideo':m==='mixed'?'carouselMixed':'carouselImage';}
  return '';
}

export async function validateTargets(env,post,targets=[]){
  const caps=await getSocialPostCapabilities(env),feature=featureFor(post),valid=[],invalid=[];
  for(const raw of targets){const p=clean(raw,30).toLowerCase(),c=caps.byPlatform[p];if(c?.connected&&c.features?.[feature])valid.push(p);else invalid.push({platform:p,label:platformLabel(p),reason:c?.reason||`${platformLabel(p)} does not support this post type through the connected API.`});}
  return {feature,valid:[...new Set(valid)],invalid,capabilities:caps};
}

function normalizeTags(tags){
  const arr=Array.isArray(tags)?tags:String(tags||'').split(/[\n,]+/);
  return [...new Set(arr.map(x=>clean(x,80).replace(/^#+/,'').replace(/\s+/g,'').replace(/[^\p{L}\p{N}_-]/gu,'')).filter(Boolean))].slice(0,30);
}
function hashtags(tags=[]){return normalizeTags(tags).map(x=>`#${x}`).join(' ');}
function textWithTags(text,tags,limit=10000){const a=clean(text,limit),h=hashtags(tags);return clean([a,h].filter(Boolean).join(a&&h?'\n\n':''),limit);}
function normalizePoll(v){const p=jsonSafe(v,{}),options=(Array.isArray(p?.options)?p.options:[]).map(x=>clean(x,25)).filter(Boolean).slice(0,4);return {enabled:bool(p?.enabled)&&!!clean(p?.question,140)&&options.length>=2,question:clean(p?.question,140),options,duration:['one_day','three_days','seven_days','fourteen_days'].includes(clean(p?.duration,30).toLowerCase())?clean(p.duration,30).toLowerCase():'one_day'};}
function pollKind(post){return post.post_type==='video'?`video_${post.video_mode||'full'}`:post.post_type;}
function pollApplies(platform,post){if(!post.poll?.enabled)return false;const kind=pollKind(post);return ['threads','x','linkedin'].includes(platform)&&kind==='text';}
function pollAttachment(p){const keys=['option_a','option_b','option_c','option_d'],o={};p.options.forEach((v,i)=>o[keys[i]]=clean(v,25));return JSON.stringify(o);}
function durationMinutes(v){return ({one_day:1440,three_days:4320,seven_days:10080,fourteen_days:20160})[v]||1440;}
function withPollQuestion(text,post,limit){const q=clean(post?.poll?.question,140),t=clean(text,limit);return q&&!t.toLowerCase().includes(q.toLowerCase())?clean([q,t].filter(Boolean).join('\n\n'),limit):t;}
async function remoteJson(res,label){
  const txt=await res.text().catch(()=>'');let data={};try{data=txt?JSON.parse(txt):{};}catch{data={raw:txt};}
  if(!res.ok){const detail=data?.error?.message||data?.message||data?.detail||data?.error_description||txt||`${label} returned HTTP ${res.status}.`;const e=new Error(`${label}: ${clean(detail,1400)}`);e.httpStatus=res.status;e.remote=data;throw e;}return data;
}
export async function fetchMedia(url,max=52*1024*1024){
  if(!/^https:\/\//i.test(clean(url,3000)))throw new Error('A public HTTPS media URL is required. Upload the file to the Google Drive Posts folder first.');
  const res=await fetch(url,{headers:{accept:'image/*,video/*,application/octet-stream'}});if(!res.ok)throw new Error(`The publishing worker could not download the uploaded media (HTTP ${res.status}).`);
  const len=Number(res.headers.get('content-length')||0);if(len>max)throw new Error(`The uploaded media is larger than the ${Math.round(max/1024/1024)} MB worker publishing safety limit. Use a smaller/compressed file for direct cross-platform publishing.`);
  const buf=await res.arrayBuffer();if(buf.byteLength>max)throw new Error(`The uploaded media is larger than the ${Math.round(max/1024/1024)} MB worker publishing safety limit.`);
  return {bytes:new Uint8Array(buf),arrayBuffer:buf,mime:clean(res.headers.get('content-type')||'application/octet-stream',120).split(';')[0],size:buf.byteLength};
}

async function facebookFirstComment(c,id,message){if(!message||!id)return null;const version=clean(c.graphVersion||'v26.0',20),body=new URLSearchParams({message:clean(message,1800),access_token:c.pageAccessToken});try{const d=await remoteJson(await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook first comment');return {ok:true,id:clean(d.id,500)};}catch(e){return {ok:false,error:clean(e.message,1000)};}}
async function publishFacebook(env,c,post){
  if(!c.pageId||!c.pageAccessToken)throw new Error('Facebook Page publishing credentials are missing.');
  const v=clean(c.graphVersion||'v26.0',20),id=encodeURIComponent(c.pageId),caption=textWithTags(post.caption||post.body_text,post.tags,6000);let d={};
  if(post.post_type==='text')d=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/feed`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({message:textWithTags(post.body_text,post.tags,6000),access_token:c.pageAccessToken})}),'Facebook text post');
  else if(post.post_type==='image')d=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/photos`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({url:post.media_url,caption,message:caption,access_token:c.pageAccessToken})}),'Facebook image post');
  else if(post.post_type==='video'&&post.video_mode==='full')d=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/videos`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({file_url:post.media_url,title:clean(post.title,255),description:caption,access_token:c.pageAccessToken})}),'Facebook video post');
  else if(post.post_type==='video'&&post.video_mode==='short'){
    const start=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/video_reels?upload_phase=start&access_token=${encodeURIComponent(c.pageAccessToken)}`,{method:'POST'}),'Facebook Reel upload start');
    const videoId=clean(start.video_id||start.id,500),uploadUrl=clean(start.upload_url,3000);if(!videoId||!uploadUrl)throw new Error('Facebook started the Reel upload but did not return the required upload URL/video ID.');
    const ur=await fetch(uploadUrl,{method:'POST',headers:{Authorization:`OAuth ${c.pageAccessToken}`,file_url:post.media_url}});if(!ur.ok)throw new Error(`Facebook Reel media transfer failed (HTTP ${ur.status}): ${clean(await ur.text().catch(()=>''),800)}`);
    d=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/video_reels?upload_phase=finish&video_id=${encodeURIComponent(videoId)}&video_state=PUBLISHED&description=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(c.pageAccessToken)}`,{method:'POST'}),'Facebook Reel publish');d.id=d.id||videoId;
  }else if(post.post_type==='story'&&post.media_kind==='image'){
    const photo=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/photos`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({url:post.media_url,published:'false',access_token:c.pageAccessToken})}),'Facebook Story image upload');
    d=await remoteJson(await fetch(`https://graph.facebook.com/${v}/${id}/photo_stories`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({photo_id:photo.id,access_token:c.pageAccessToken})}),'Facebook Story publish');d.id=d.id||photo.id;
  }else throw new Error('The selected Facebook post format is not enabled by this build.');
  const externalId=clean(d.id||d.post_id||d.video_id,600),first=post.first_comment_enabled&&post.post_type!=='story'?await facebookFirstComment(c,externalId,post.first_comment_text):null;
  return {externalId,url:externalId?`https://www.facebook.com/${encodeURIComponent(externalId)}`:'',metadata:{firstComment:first}};
}

async function waitInstagram(c,containerId,host='graph.facebook.com'){
  const v=clean(c.graphVersion||'v26.0',20),token=c.pageAccessToken||c.instagramLoginToken;
  for(let i=0;i<12;i++){const u=`https://${host}/${v}/${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(token)}`;const d=await remoteJson(await fetch(u),'Instagram media processing');const st=String(d.status_code||d.status||'').toUpperCase();if(['FINISHED','PUBLISHED'].includes(st))return;if(['ERROR','EXPIRED'].includes(st))throw new Error(`Instagram media processing ended with ${st}.`);await sleep(Math.min(1000+500*i,4000));}
  throw new Error('Instagram media is still processing. Retry this target from the scheduler shortly.');
}
async function instagramFirstComment(c,id,msg,host){if(!id||!msg)return null;const v=clean(c.graphVersion||'v26.0',20),token=c.pageAccessToken||c.instagramLoginToken;try{const d=await remoteJson(await fetch(`https://${host}/${v}/${encodeURIComponent(id)}/comments`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({message:clean(msg,1800),access_token:token})}),'Instagram first comment');return {ok:true,id:clean(d.id,500)};}catch(e){return {ok:false,error:clean(e.message,1000)};}}
async function publishInstagram(env,c,post){
  const token=c.pageAccessToken||c.instagramLoginToken;if(!c.instagramBusinessId||!token)throw new Error('Instagram professional-account publishing credentials are missing.');
  const host=c.pageAccessToken?'graph.facebook.com':'graph.instagram.com',v=clean(c.graphVersion||'v26.0',20),base=`https://${host}/${v}`,caption=textWithTags(post.caption||post.body_text,post.tags,2200);
  if(post.post_type==='carousel'){
    const items=Array.isArray(post.media_items)?post.media_items:jsonSafe(post.media_items_json,[]);if(items.length<2||items.length>10)throw new Error('Instagram carousel posts require 2 to 10 media items.');
    const childIds=[];
    for(const item of items){const kind=clean(item.kind||item.mediaKind,20).toLowerCase()==='video'?'video':'image',params=new URLSearchParams({access_token:token,is_carousel_item:'true'});if(kind==='video'){params.set('media_type','VIDEO');params.set('video_url',clean(item.url,3000));}else{params.set('image_url',clean(item.url,3000));if(item.altText)params.set('alt_text',clean(item.altText,1000));}
      const child=await remoteJson(await fetch(`${base}/${encodeURIComponent(c.instagramBusinessId)}/media`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params}),'Instagram carousel item');const cid=clean(child.id,500);if(!cid)throw new Error('Instagram did not return a carousel child container ID.');if(kind==='video')await waitInstagram(c,cid,host);childIds.push(cid);}
    const parentParams=new URLSearchParams({access_token:token,media_type:'CAROUSEL',children:childIds.join(',')});if(caption)parentParams.set('caption',caption);
    const parent=await remoteJson(await fetch(`${base}/${encodeURIComponent(c.instagramBusinessId)}/media`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:parentParams}),'Instagram carousel container');const cid=clean(parent.id,500);if(!cid)throw new Error('Instagram did not return the carousel container ID.');
    const pub=await remoteJson(await fetch(`${base}/${encodeURIComponent(c.instagramBusinessId)}/media_publish`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({creation_id:cid,access_token:token})}),'Instagram carousel publish');const externalId=clean(pub.id,500);const first=post.first_comment_enabled?await instagramFirstComment(c,externalId,post.first_comment_text,host):null;return {externalId,url:'',metadata:{containerId:cid,children:childIds,firstComment:first}};
  }
  const params=new URLSearchParams({access_token:token});
  if(post.post_type==='image'){params.set('image_url',post.media_url);params.set('caption',caption);if(post.alt_text)params.set('alt_text',clean(post.alt_text,1000));}
  else if(post.post_type==='video'&&post.video_mode==='short'){params.set('media_type','REELS');params.set('video_url',post.media_url);params.set('caption',caption);}
  else if(post.post_type==='story'){params.set('media_type','STORIES');params.set(post.media_kind==='video'?'video_url':'image_url',post.media_url);}
  else throw new Error('Instagram supports image posts, carousels, Reels, and Stories here; text-only and full-length feed video are intentionally not offered.');
  const container=await remoteJson(await fetch(`${base}/${encodeURIComponent(c.instagramBusinessId)}/media`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params}),'Instagram media container');const cid=clean(container.id,500);if(!cid)throw new Error('Instagram did not return a media container ID.');
  if(post.post_type!=='image')await waitInstagram(c,cid,host);
  const pub=await remoteJson(await fetch(`${base}/${encodeURIComponent(c.instagramBusinessId)}/media_publish`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({creation_id:cid,access_token:token})}),'Instagram media publish');const externalId=clean(pub.id,500);
  const first=post.first_comment_enabled&&post.post_type!=='story'?await instagramFirstComment(c,externalId,post.first_comment_text,host):null;
  return {externalId,url:'',metadata:{containerId:cid,firstComment:first}};
}

async function waitThreadsMedia(token,id){for(let i=0;i<14;i++){const st=await remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(id)}?fields=status,error_message&access_token=${encodeURIComponent(token)}`),'Threads media processing');const state=String(st.status||'').toUpperCase();if(['FINISHED','PUBLISHED'].includes(state))return;if(['ERROR','EXPIRED'].includes(state))throw new Error(st.error_message||`Threads media processing ${state}.`);await sleep(1200+300*i);}throw new Error('Threads media is still processing. Retry this target from Scheduling shortly.');}
async function publishThreads(env,c,post){
  const token=await threadsToken(env,c);const text=withPollQuestion(textWithTags(post.caption||post.body_text,post.tags,500),post,500);
  if(post.post_type==='carousel'){
    const items=Array.isArray(post.media_items)?post.media_items:jsonSafe(post.media_items_json,[]);if(items.length<2||items.length>20)throw new Error('Threads carousel posts require 2 to 20 media items.');const childIds=[];
    for(const item of items){const kind=clean(item.kind||item.mediaKind,20).toLowerCase()==='video'?'video':'image',q=new URLSearchParams({access_token:token,media_type:kind==='video'?'VIDEO':'IMAGE',is_carousel_item:'true'});q.set(kind==='video'?'video_url':'image_url',clean(item.url,3000));if(kind==='image'&&item.altText)q.set('alt_text',clean(item.altText,1000));const ctn=await remoteJson(await fetch(`https://graph.threads.net/me/threads?${q}`,{method:'POST'}),'Threads carousel item');const cid=clean(ctn.id,500);if(!cid)throw new Error('Threads did not return a carousel child container ID.');if(kind==='video')await waitThreadsMedia(token,cid);childIds.push(cid);}
    const q=new URLSearchParams({access_token:token,media_type:'CAROUSEL',children:childIds.join(',')});if(text)q.set('text',text);const create=await remoteJson(await fetch(`https://graph.threads.net/me/threads?${q}`,{method:'POST'}),'Threads carousel container'),id=clean(create.id,500);if(!id)throw new Error('Threads did not return a carousel container ID.');const pub=await remoteJson(await fetch(`https://graph.threads.net/me/threads_publish?creation_id=${encodeURIComponent(id)}&access_token=${encodeURIComponent(token)}`,{method:'POST'}),'Threads carousel publish'),externalId=clean(pub.id,500);let url='';try{const d=await remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(externalId)}?fields=permalink&access_token=${encodeURIComponent(token)}`),'Threads permalink');url=clean(d.permalink,2000);}catch{}return {externalId,url,metadata:{containerId:id,children:childIds}};
  }
  const q=new URLSearchParams({access_token:token});
  if(post.post_type==='text'){q.set('media_type','TEXT');q.set('text',text);if(pollApplies('threads',post))q.set('poll_attachment',pollAttachment(post.poll));}
  else if(post.post_type==='image'){q.set('media_type','IMAGE');q.set('image_url',post.media_url);if(text)q.set('text',text);if(post.alt_text)q.set('alt_text',clean(post.alt_text,1000));}
  else if(post.post_type==='video'){q.set('media_type','VIDEO');q.set('video_url',post.media_url);if(text)q.set('text',text);}
  else throw new Error('Threads does not expose Story/Status publishing in this integration.');
  const create=await remoteJson(await fetch(`https://graph.threads.net/me/threads?${q}`,{method:'POST'}),'Threads container create'),id=clean(create.id,500);if(!id)throw new Error('Threads did not return a container ID.');if(post.post_type==='video')await waitThreadsMedia(token,id);
  const pub=await remoteJson(await fetch(`https://graph.threads.net/me/threads_publish?creation_id=${encodeURIComponent(id)}&access_token=${encodeURIComponent(token)}`,{method:'POST'}),'Threads publish'),externalId=clean(pub.id,500);let url='';try{const d=await remoteJson(await fetch(`https://graph.threads.net/${encodeURIComponent(externalId)}?fields=permalink&access_token=${encodeURIComponent(token)}`),'Threads permalink');url=clean(d.permalink,2000);}catch{}return {externalId,url,metadata:{containerId:id}};
}

async function publishPinterest(env,c,post){
  if(post.post_type!=='image')throw new Error('This composer publishes Pinterest image Pins. Video Pins require a separate cover-image upload and are not shown as an eligible target in this release.');
  const token=await pinterestToken(env,c);if(!c.boardId)throw new Error('Pinterest Board ID is missing.');
  const payload={board_id:c.boardId,title:clean(post.title||post.caption||post.body_text,100),description:textWithTags(post.caption||post.body_text,post.tags,500),media_source:{source_type:'image_url',url:post.media_url}};
  const d=await remoteJson(await fetch('https://api.pinterest.com/v5/pins',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'Pinterest Pin create'),externalId=clean(d.id,500);
  return {externalId,url:externalId?`https://www.pinterest.com/pin/${encodeURIComponent(externalId)}/`:'',metadata:{}};
}

export async function xUploadMedia(token,media){
  const init=new FormData();init.set('command','INIT');init.set('media_type',media.mime||'application/octet-stream');init.set('total_bytes',String(media.size));init.set('media_category',media.mime.startsWith('image/')?'tweet_image':'tweet_video');
  const d=await remoteJson(await fetch('https://api.x.com/2/media/upload',{method:'POST',headers:{authorization:`Bearer ${token}`},body:init}),'X media upload initialize'),mediaId=clean(d?.data?.id||d?.media_id_string||d?.media_id,100);if(!mediaId)throw new Error('X media upload did not return a media ID.');
  const chunkSize=4*1024*1024;for(let off=0,seg=0;off<media.size;off+=chunkSize,seg++){const chunk=media.bytes.slice(off,Math.min(media.size,off+chunkSize));const f=new FormData();f.set('command','APPEND');f.set('media_id',mediaId);f.set('segment_index',String(seg));f.set('media',new Blob([chunk],{type:media.mime||'application/octet-stream'}),`segment-${seg}`);await remoteJson(await fetch('https://api.x.com/2/media/upload',{method:'POST',headers:{authorization:`Bearer ${token}`},body:f}),'X media upload append');}
  const fin=new FormData();fin.set('command','FINALIZE');fin.set('media_id',mediaId);let fd=await remoteJson(await fetch('https://api.x.com/2/media/upload',{method:'POST',headers:{authorization:`Bearer ${token}`},body:fin}),'X media upload finalize');
  let pi=fd?.data?.processing_info||fd?.processing_info||null;for(let i=0;pi&&i<20;i++){const state=String(pi.state||'').toLowerCase();if(state==='succeeded')break;if(state==='failed')throw new Error(`X media processing failed: ${clean(pi.error?.message||pi.error?.name||'unknown media error',800)}`);await sleep(Math.max(1000,Math.min(5000,Number(pi.check_after_secs||1)*1000)));const st=await remoteJson(await fetch(`https://api.x.com/2/media/upload?command=STATUS&media_id=${encodeURIComponent(mediaId)}`,{headers:{authorization:`Bearer ${token}`}}),'X media processing status');pi=st?.data?.processing_info||st?.processing_info||null;}
  if(pi&&!['succeeded',''].includes(String(pi.state||'').toLowerCase()))throw new Error('X media processing did not finish in time. Retry this target from the scheduler.');return mediaId;
}
async function publishX(env,c,post){
  const token=await getXUserAccessToken(env),payload={};let text=withPollQuestion(textWithTags(post.caption||post.body_text,post.tags,280),post,280);if(text)payload.text=text;
  if(pollApplies('x',post))payload.poll={options:post.poll.options.map(x=>clean(x,25)),duration_minutes:Math.min(10080,durationMinutes(post.poll.duration))};
  if(post.post_type!=='text'){const media=await fetchMedia(post.media_url);const id=await xUploadMedia(token,media);payload.media={media_ids:[id]};}
  const d=await remoteJson(await fetch('https://api.x.com/2/tweets',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'X Post create'),externalId=clean(d?.data?.id,100);if(!externalId)throw new Error('X accepted the request but did not return a Post ID.');
  let first=null;if(post.first_comment_enabled&&post.first_comment_text){try{const r=await remoteJson(await fetch('https://api.x.com/2/tweets',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({text:clean(post.first_comment_text,280),reply:{in_reply_to_tweet_id:externalId}})}),'X first reply');first={ok:true,id:clean(r?.data?.id,100)};}catch(e){first={ok:false,error:clean(e.message,1000)};}}
  return {externalId,url:`https://x.com/i/web/status/${externalId}`,metadata:{firstComment:first}};
}

async function liJson(res,label){return remoteJson(res,label);}
async function linkedinUploadImage(token,c,actor,media,alt=''){
  const init=await liJson(await fetch('https://api.linkedin.com/rest/images?action=initializeUpload',{method:'POST',headers:linkedinHeaders(token,c),body:JSON.stringify({initializeUploadRequest:{owner:actor}})}),'LinkedIn image initialize'),v=init.value||{},url=clean(v.uploadUrl,4000),urn=clean(v.image,600);if(!url||!urn)throw new Error('LinkedIn image initialization did not return an upload URL and image URN.');
  const up=await fetch(url,{method:'PUT',headers:{'content-type':'application/octet-stream'},body:media.arrayBuffer});if(!up.ok)throw new Error(`LinkedIn image upload failed (HTTP ${up.status}).`);return urn;
}
async function linkedinUploadVideo(token,c,actor,media){
  const init=await liJson(await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload',{method:'POST',headers:linkedinHeaders(token,c),body:JSON.stringify({initializeUploadRequest:{owner:actor,fileSizeBytes:media.size,uploadCaptions:false,uploadThumbnail:false}})}),'LinkedIn video initialize'),v=init.value||{},urn=clean(v.video,600),instructions=Array.isArray(v.uploadInstructions)?v.uploadInstructions:[];if(!urn||!instructions.length)throw new Error('LinkedIn video initialization did not return upload instructions.');
  const parts=[];for(const ins of instructions){const first=Number(ins.firstByte||0),last=Math.min(media.size-1,Number(ins.lastByte??media.size-1)),chunk=media.bytes.slice(first,last+1);const r=await fetch(ins.uploadUrl,{method:'PUT',headers:{'content-type':'application/octet-stream'},body:chunk});if(!r.ok)throw new Error(`LinkedIn video part upload failed (HTTP ${r.status}).`);parts.push(clean((r.headers.get('etag')||'').replace(/^"|"$/g,''),4000));}
  await liJson(await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload',{method:'POST',headers:linkedinHeaders(token,c),body:JSON.stringify({finalizeUploadRequest:{video:urn,uploadToken:v.uploadToken||'',uploadedPartIds:parts}})}),'LinkedIn video finalize');
  for(let i=0;i<18;i++){const st=await liJson(await fetch(`https://api.linkedin.com/rest/videos/${encodeURIComponent(urn)}`,{headers:linkedinHeaders(token,c,false)}),'LinkedIn video status'),state=String(st.status||'').toUpperCase();if(state==='AVAILABLE')return urn;if(state==='PROCESSING_FAILED')throw new Error(`LinkedIn video processing failed: ${clean(st.processingFailureReason||'unknown error',900)}`);await sleep(1800);}
  throw new Error('LinkedIn video is still processing. Retry this target from the scheduler shortly.');
}
async function publishLinkedIn(env,c,post){
  const token=await getLinkedInAccessToken(env),fresh=(await getSocialIntegrationSettings(env)).linkedin||c,actor=linkedinActor(fresh);if(!actor)throw new Error('LinkedIn publishing identity is incomplete. Select Member or Organization and run Test Connection.');
  const commentary=textWithTags(post.caption||post.body_text,post.tags,3000),payload={author:actor,commentary,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false};
  if(pollApplies('linkedin',post))payload.content={poll:{question:clean(post.poll.question,140),options:post.poll.options.map(x=>({text:clean(x,30)})),settings:{duration:({one_day:'ONE_DAY',three_days:'THREE_DAYS',seven_days:'SEVEN_DAYS',fourteen_days:'FOURTEEN_DAYS'})[post.poll.duration]||'ONE_DAY'}}};
  if(post.post_type==='image'||post.post_type==='video'){const media=await fetchMedia(post.media_url),urn=post.post_type==='image'?await linkedinUploadImage(token,fresh,actor,media,post.alt_text):await linkedinUploadVideo(token,fresh,actor,media);payload.content={media:{id:urn,...(post.post_type==='image'&&post.alt_text?{altText:clean(post.alt_text,1000)}:{}),...(post.post_type==='video'&&post.title?{title:clean(post.title,200)}:{})}};}
  else if(post.post_type!=='text')throw new Error('LinkedIn Stories are not exposed through the current Posts API.');
  const res=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers:linkedinHeaders(token,fresh),body:JSON.stringify(payload)}),txt=await res.text().catch(()=>'' );if(!res.ok)throw new Error(`LinkedIn post: ${clean(txt||res.status,1200)}`);const externalId=clean(res.headers.get('x-restli-id'),600);if(!externalId)throw new Error('LinkedIn accepted the post but did not return a Post ID.');
  let first=null;if(post.first_comment_enabled&&post.first_comment_text){try{const r=await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(externalId)}/comments`,{method:'POST',headers:linkedinHeaders(token,fresh),body:JSON.stringify({actor,message:{text:clean(post.first_comment_text,1800)}})});if(!r.ok)throw new Error(clean(await r.text().catch(()=>''),1000)||`HTTP ${r.status}`);first={ok:true,id:clean(r.headers.get('x-restli-id'),600)};}catch(e){first={ok:false,error:clean(e.message,1000)};}}
  return {externalId,url:`https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}/`,metadata:{firstComment:first}};
}

async function publishYouTube(env,c,post){
  if(post.post_type!=='video')throw new Error('YouTube Data API does not expose Community text/image post creation. Select Video.');
  const token=await getYouTubeAccessToken(env),media=await fetchMedia(post.media_url),boundary=`uc_${crypto.randomUUID().replace(/-/g,'')}`,tags=normalizeTags(post.tags),metadata={snippet:{title:clean(post.title||post.caption||post.body_text||'IronPulse Gym video',100),description:clean(post.caption||post.body_text,4500),...(tags.length?{tags}:{})},status:{privacyStatus:['public','unlisted','private'].includes(c.privacyStatus)?c.privacyStatus:'public'}};
  const enc=new TextEncoder(),prefix=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${media.mime||'video/mp4'}\r\n\r\n`,suffix=`\r\n--${boundary}--\r\n`,body=new Blob([enc.encode(prefix),media.arrayBuffer,enc.encode(suffix)],{type:`multipart/related; boundary=${boundary}`});
  const d=await remoteJson(await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':`multipart/related; boundary=${boundary}`},body}),'YouTube video upload'),externalId=clean(d.id,300);if(!externalId)throw new Error('YouTube did not return a video ID.');return {externalId,url:`https://www.youtube.com/watch?v=${encodeURIComponent(externalId)}`,metadata:{classification:post.video_mode==='short'?'Uploaded as Short-compatible video; YouTube determines final Shorts classification from the media.':'Uploaded as standard video.'}};
}

async function publishSnapchat(env,c,post){if(post.post_type!=='story')throw new Error('Snapchat Public Profile integration publishes Stories only.');const out=await uploadSnapchatStoryMedia(env,post.media_url,post.title||post.caption||'IronPulse Gym Story');return {externalId:clean(out.mediaId,600),url:clean(out.url,2000),metadata:{profileId:out.profileId||''}};}

export async function publishSocialPostTarget(env,post,platform){
  const s=await getSocialIntegrationSettings(env),p=clean(platform,30).toLowerCase(),c=s[p]||{};const val=await validateTargets(env,post,[p]);if(!val.valid.includes(p))throw new Error(val.invalid[0]?.reason||`${platformLabel(p)} is not ready for this post type.`);
  const prepared={...post,tags:normalizeTags(post.tags||jsonSafe(post.tags_json,[])),media_items:Array.isArray(post.media_items)?post.media_items:jsonSafe(post.media_items_json,[]),poll:normalizePoll(post.poll||post.poll_json),first_comment_enabled:bool(post.first_comment_enabled)};let out;
  if(p==='facebook')out=await publishFacebook(env,c,prepared);else if(p==='instagram')out=await publishInstagram(env,c,prepared);else if(p==='threads')out=await publishThreads(env,c,prepared);else if(p==='pinterest')out=await publishPinterest(env,c,prepared);else if(p==='x')out=await publishX(env,c,prepared);else if(p==='linkedin')out=await publishLinkedIn(env,c,prepared);else if(p==='youtube')out=await publishYouTube(env,c,prepared);else if(p==='snapchat')out=await publishSnapchat(env,c,prepared);else throw new Error(`Unsupported social platform: ${p}`);out.metadata={...(out.metadata||{}),poll:{enabled:prepared.poll.enabled,applied:pollApplies(p,prepared),reason:prepared.poll.enabled&&!pollApplies(p,prepared)?`${platformLabel(p)} publishes this post normally because its API does not support a poll for ${pollKind(prepared)} posts.`:''}};return out;
}

async function refreshPostStatus(env,postId){
  const rows=await env.DB.prepare('SELECT status FROM social_post_targets WHERE post_id=?').bind(postId).all(),st=(rows.results||[]).map(x=>x.status);let status='draft';
  if(!st.length)status='draft';else if(st.every(x=>x==='cancelled'))status='cancelled';else if(st.every(x=>x==='published'||x==='cancelled'))status=st.some(x=>x==='published')?'published':'cancelled';else if(st.some(x=>x==='failed')&&st.some(x=>x==='published'))status='partial';else if(st.every(x=>x==='failed'||x==='cancelled'))status='failed';else if(st.some(x=>x==='publishing'))status='publishing';else if(st.some(x=>x==='scheduled'))status='scheduled';else status='pending';
  const summary=st.length?`${st.filter(x=>x==='published').length}/${st.length} platform target(s) published.`:'';await env.DB.prepare("UPDATE social_posts SET status=?,publish_summary=?,published_at=CASE WHEN ?='published' THEN COALESCE(NULLIF(published_at,''),CURRENT_TIMESTAMP) ELSE published_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,summary,status,postId).run();return status;
}

export async function processSocialPost(env,postId,{onlyTargetId=0}={}){
  const post=await env.DB.prepare('SELECT * FROM social_posts WHERE id=?').bind(postId).first();if(!post)throw new Error('Scheduled social post was not found.');if(post.status==='cancelled')return {postId,status:'cancelled',results:[]};
  let sql="SELECT * FROM social_post_targets WHERE post_id=? AND status IN ('pending','scheduled','failed')",bind=[postId];if(onlyTargetId){sql+=' AND id=?';bind.push(onlyTargetId);}const trg=await env.DB.prepare(sql).bind(...bind).all(),results=[];
  for(const t of trg.results||[]){
    // Atomically claim the target so two simultaneous page/cron sweeps cannot publish it twice.
    const claim=await env.DB.prepare("UPDATE social_post_targets SET status='publishing',error_text='',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','scheduled','failed')").bind(t.id).run();
    if(Number(claim?.meta?.changes||0)!==1)continue;
    try{const out=await publishSocialPostTarget(env,post,t.platform);await env.DB.prepare("UPDATE social_post_targets SET status='published',external_id=?,external_url=?,metadata_json=?,published_at=CURRENT_TIMESTAMP,error_text='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(clean(out.externalId,1000),clean(out.url,3000),JSON.stringify(out.metadata||{}),t.id).run();results.push({targetId:t.id,platform:t.platform,ok:true,...out});}catch(e){await env.DB.prepare("UPDATE social_post_targets SET status='failed',error_text=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(clean(e.message,1800),t.id).run();results.push({targetId:t.id,platform:t.platform,ok:false,error:clean(e.message,1800)});}
  }
  const status=await refreshPostStatus(env,postId);return {postId,status,results};
}

export async function processDueSocialPosts(env,{limit=4}={}){
  // D1 claim is per post. Re-check inside processSocialPost means duplicate page-traffic
  // sweeps cannot publish already completed targets.
  const due=await env.DB.prepare("SELECT id FROM social_posts WHERE status='scheduled' AND scheduled_at<>'' AND datetime(scheduled_at)<=datetime('now') ORDER BY datetime(scheduled_at),id LIMIT ?").bind(Math.max(1,Math.min(10,Number(limit||4)))).all(),out=[];
  for(const row of due.results||[]){try{out.push(await processSocialPost(env,row.id));}catch(e){out.push({postId:row.id,status:'failed',error:clean(e.message,1200)});}}
  return {ok:true,processed:out.length,posts:out,checkedAt:now()};
}
