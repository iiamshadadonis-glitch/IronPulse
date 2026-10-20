import { getSocialIntegrationSettings, getSiteSettings, getSetting, setSetting } from './utils.js';
import { brandHomeUrl } from './branded-email.js';

const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);
const now=()=>new Date().toISOString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(res,label){const text=await res.text().catch(()=>'');let d={};try{d=text?JSON.parse(text):{};}catch{d={raw:text};}if(!res.ok||d?.error)throw new Error(`${label}: ${clean(d?.error?.message||d?.message||text||`HTTP ${res.status}`,1200)}`);return d;}
async function waitIg(c,version,id){for(let i=0;i<12;i++){const u=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(id)}`);u.searchParams.set('fields','id,status_code,status');u.searchParams.set('access_token',c.pageAccessToken);const d=await j(await fetch(u),'Instagram Story container status');const s=String(d.status_code||'').toUpperCase();if(s==='FINISHED')return d;if(['ERROR','EXPIRED'].includes(s))throw new Error(`Instagram Story container ${s.toLowerCase()}: ${clean(d.status||'',600)}`);if(i<11)await sleep(1500);}throw new Error('Instagram Story container did not become ready in time.');}
async function threadsToken(c){if(!c.accessToken)throw new Error('Threads access token is missing.');return c.accessToken;}
async function pinterestToken(c){if(!c.accessToken)throw new Error('Pinterest access token is missing.');return c.accessToken;}
function liHeaders(c){return {authorization:`Bearer ${c.accessToken}`,'Linkedin-Version':clean(c.apiVersion||'202607',20),'X-Restli-Protocol-Version':'2.0.0','content-type':'application/json'};}
function cloudinaryVariant(url,transform){const raw=clean(url,2600);if(!/res\.cloudinary\.com/i.test(raw)||!raw.includes('/image/upload/'))return raw;const versioned=raw.match(/^(.*\/image\/upload\/)(.*?)(\/v\d+\/.*)$/);if(versioned)return `${versioned[1]}${transform}${versioned[3]}`;return raw.replace('/image/upload/',`/image/upload/${transform}/`);}
function statusImageVariant(url,type='story'){
  const transforms={
    story:'c_pad,w_1080,h_1920,g_center,b_rgb:FFFAF4,q_auto:good,f_jpg',
    feed:'c_pad,w_1080,h_1350,g_center,b_rgb:FFFAF4,q_auto:good,f_jpg',
    square:'c_pad,w_1200,h_1200,g_center,b_rgb:FFFAF4,q_auto:good,f_jpg',
    pin:'c_pad,w_1000,h_1500,g_center,b_rgb:FFFAF4,q_auto:good,f_jpg'
  };
  return cloudinaryVariant(url,transforms[type]||transforms.story);
}
function b64urlAscii(v=''){return btoa(String(v||'')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fetchedOverlay(url,w,h){return `l_fetch:${b64urlAscii(url)},c_fit,w_${w},h_${h}`;}

function cloudText(v=''){return encodeURIComponent(encodeURIComponent(String(v||'').replace(/[\r\n]+/g,' ').trim()));}
function overlayId(v=''){return String(v||'').split('/').map(x=>encodeURIComponent(x)).join(':');}
function hex(v,fallback='8A0505'){const x=String(v||'').trim().replace(/^#/,'');return /^[0-9a-f]{6}$/i.test(x)?x.toUpperCase():fallback;}
function money(paise=0){return `₹${Math.max(0,Number(paise||0))/100}`.replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1');}
function strikeText(value=''){return [...String(value||'')].map(ch=>/\s/.test(ch)?ch:`${ch}̶`).join('');}
function publicAsset(env,url=''){const v=clean(url,2200);if(/^https?:\/\//i.test(v))return v;return `${brandHomeUrl(env)}${v.startsWith('/')?'':'/'}${v||'/assets/ironpulse-logo.svg'}`;}
function wrap(value='',maxChars=30,maxLines=3){const words=clean(value,300).replace(/\s+/g,' ').split(' ').filter(Boolean),out=[];let line='';for(const word of words){const n=line?`${line} ${word}`:word;if(n.length<=maxChars||!line)line=n;else{out.push(line);line=word;if(out.length===maxLines-1)break;}}if(line&&out.length<maxLines)out.push(line);if(words.join(' ').length>out.join(' ').length&&out.length)out[out.length-1]=out[out.length-1].slice(0,Math.max(12,maxChars-2)).trim()+'…';return out.length?out:['Offer Update'];}
async function uploadOverlay(url,label){const r=await fetch(url,{headers:{accept:'image/*'}});if(!r.ok)throw new Error(`${label} could not be downloaded (HTTP ${r.status}).`);const type=(r.headers.get('content-type')||'').split(';')[0];if(!type.startsWith('image/'))throw new Error(`${label} is not an image.`);const bytes=await r.arrayBuffer(),form=new FormData();form.append('file',new Blob([bytes],{type}),`${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${Date.now()}`);form.append('upload_preset','blog_imageuploads');const out=await fetch('https://api.cloudinary.com/v1_1/dfu0lha8d/image/upload',{method:'POST',body:form});const d=await j(out,`${label} upload`);if(!d.public_id)throw new Error(`${label} upload did not return a public ID.`);return d.public_id;}
function dateLabel(value=''){const n=Date.parse(value);if(!Number.isFinite(n))return'';return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(n));}
function productPricing(product={}){
  const regular=Number(product.regular_price_paise||0),offerEnabled=Number(product.offer_price_enabled??1)!==0,offer=offerEnabled?Number(product.offer_price_paise||regular):regular,trial=Number(product.trial_enabled||0)===1&&String(product.payment_type||'subscription')==='subscription';
  const period=String(product.billing_period||'monthly')==='yearly'?'year':'month';
  if(trial){
    const trialPrice=money(product.trial_amount_paise||100),after=money(offer||regular),oldPrice=offerEnabled&&regular>offer?money(regular):'';
    return {primary:`TRY FOR ${trialPrice}`,secondary:`THEN ${after} / ${period} AFTER TRIAL`,oldPrice,trial:true};
  }
  if(offerEnabled&&regular>offer){
    const recurring=String(product.payment_type||'subscription')==='subscription'?` / ${period}`:'';
    return {primary:`NOW ${money(offer)}${recurring}`,secondary:'LIMITED OFFER PRICE',oldPrice:money(regular),trial:false};
  }
  const recurring=String(product.payment_type||'subscription')==='subscription'?` / ${period}`:'';
  return {primary:`${money(regular||offer)}${recurring}`,secondary:String(product.payment_type||'subscription')==='subscription'?'SUBSCRIPTION PRICE':'ONE-TIME PAYMENT',oldPrice:'',trial:false};
}
function statusValidity(mode='',endsAt=''){
  if(mode==='daily_period'&&endsAt){const d=dateLabel(endsAt);return d?`LIMITED-TIME OFFER • VALID TILL ${d.toUpperCase()}`:'LIMITED-PERIOD OFFER';}
  return 'LIMITED-TIME OFFER • VALID FOR 24 HOURS';
}

function offerDetailLink(home,slug){return `${home}/offer-details?plan=${encodeURIComponent(clean(slug,220))}`;}
function productFeatures(product={},maxItems=3){
  try{const arr=Array.isArray(product.features)?product.features:JSON.parse(product.features_json||'[]');return (Array.isArray(arr)?arr:[]).map(x=>clean(x,160)).filter(Boolean).slice(0,maxItems);}catch{return [];}
}
function graphicConfig(type='story'){
  if(type==='feed')return {w:1080,h:1350,imageW:980,imageH:610,imageY:140,logoSize:70,logoX:48,logoY:38};
  if(type==='square')return {w:1200,h:1200,imageW:1080,imageH:520,imageY:135,logoSize:70,logoX:48,logoY:38};
  if(type==='pin')return {w:1000,h:1500,imageW:900,imageH:720,imageY:135,logoSize:66,logoX:42,logoY:38};
  return {w:1080,h:1920,imageW:960,imageH:880,imageY:292,logoSize:86,logoX:64,logoY:154};
}
function offerDecorUrl(home,type,primary,accent,bg,data={}){
  const u=new URL(`${home}/api/public/social-offer-decor`);u.searchParams.set('type',type);u.searchParams.set('primary',primary);u.searchParams.set('accent',accent);u.searchParams.set('bg',bg);
  const entries={bn:data.brand,tg:data.tagline,bd:data.badge,tt:data.title,va:data.validity,p1:data.primaryPrice,p2:data.secondaryPrice,old:data.oldPrice,f1:data.features?.[0]||'',f2:data.features?.[1]||'',f3:data.features?.[2]||''};
  for(const [k,v] of Object.entries(entries))if(clean(v,200))u.searchParams.set(k,clean(v,200));
  return u.toString();
}
function buildOfferGraphicUrl(imageUrl,logoPublicId,{type='story',site={},product={},mode='once',endsAt='',home=''}){
  const c=graphicConfig(type),primary=hex(site.primaryColor,'8A0505'),accent=hex(site.accentColor,'FFD45A'),bg='FFFAF4',brand=clean(site.siteName,100)||'IronPulse Gym',tagline=clean(site.tagline,160)||'Online and in-gym fitness classes for every level',title=clean(product.name,180)||'Offer Update',pricing=productPricing(product),validity=statusValidity(mode,endsAt),features=productFeatures(product,3),badge=clean(product.badge,60)||'SPECIAL OFFER';
  const decor=offerDecorUrl(home,type,primary,accent,bg,{brand,tagline,badge,title,validity,primaryPrice:pricing.primary,secondaryPrice:pricing.secondary,oldPrice:pricing.oldPrice,features});
  const steps=[`c_fit,w_${c.imageW},h_${c.imageH}`,`c_pad,w_${c.w},h_${c.h},g_north,y_${c.imageY},b_rgb:${bg}`,`bo_8px_solid_rgb:${primary}`,fetchedOverlay(decor,c.w,c.h),'fl_layer_apply,g_north_west,x_0,y_0'];
  steps.push(`l_${overlayId(logoPublicId)},c_fit,w_${c.logoSize},h_${c.logoSize}`);steps.push(`fl_layer_apply,g_north_west,x_${c.logoX},y_${c.logoY}`);
  steps.push('q_auto:good,f_jpg');
  return cloudinaryVariant(imageUrl,steps.join('/'));
}
async function fetchImage(url){const r=await fetch(url,{headers:{accept:'image/*'}});if(!r.ok)throw new Error(`Image download failed (HTTP ${r.status}).`);const type=(r.headers.get('content-type')||'image/jpeg').split(';')[0];return {bytes:await r.arrayBuffer(),type};}
async function facebookStory(c,imageUrl){if(!c.enabled||!c.pageId||!c.pageAccessToken)return {ok:true,skipped:true,reason:'Facebook is not fully connected.'};const v=clean(c.graphVersion||'v26.0',20);const up=new URLSearchParams({url:imageUrl,published:'false',access_token:c.pageAccessToken});const photo=await j(await fetch(`https://graph.facebook.com/${v}/${encodeURIComponent(c.pageId)}/photos`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:up}),'Facebook Story image upload');const id=clean(photo.id,500);if(!id)throw new Error('Facebook did not return a photo ID for the Story.');const body=new URLSearchParams({photo_id:id,access_token:c.pageAccessToken});const story=await j(await fetch(`https://graph.facebook.com/${v}/${encodeURIComponent(c.pageId)}/photo_stories`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Facebook Story publish');return {ok:true,id:clean(story.post_id||story.id||id,500),kind:'story'};}
async function instagramStory(c,imageUrl){if(!c.enabled||!c.instagramBusinessId||!c.pageAccessToken)return {ok:true,skipped:true,reason:'Instagram is not fully connected.'};const v=clean(c.graphVersion||'v26.0',20),body=new URLSearchParams({image_url:imageUrl,media_type:'STORIES',access_token:c.pageAccessToken});const created=await j(await fetch(`https://graph.facebook.com/${v}/${encodeURIComponent(c.instagramBusinessId)}/media`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),'Instagram Story creation');if(!created.id)throw new Error('Instagram did not return a Story container ID.');await waitIg(c,v,created.id);const pb=new URLSearchParams({creation_id:created.id,access_token:c.pageAccessToken});const out=await j(await fetch(`https://graph.facebook.com/${v}/${encodeURIComponent(c.instagramBusinessId)}/media_publish`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:pb}),'Instagram Story publish');return {ok:true,id:clean(out.id,500),kind:'story'};}
async function threadsImage(c,imageUrl,text,alt){if(!c.enabled||!c.accessToken)return {ok:true,skipped:true,reason:'Threads is not connected.'};const token=await threadsToken(c),u=new URL('https://graph.threads.net/me/threads');u.search=new URLSearchParams({media_type:'IMAGE',image_url:imageUrl,text:clean(text,480),alt_text:clean(alt,500),access_token:token}).toString();const created=await j(await fetch(u,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads image creation');const pub=new URL('https://graph.threads.net/me/threads_publish');pub.search=new URLSearchParams({creation_id:created.id,access_token:token}).toString();const out=await j(await fetch(pub,{method:'POST',headers:{authorization:`Bearer ${token}`}}),'Threads image publish');return {ok:true,id:clean(out.id||created.id,500),kind:'image_post'};}
async function pinterestPin(c,imageUrl,title,description,link){if(!c.enabled||!c.boardId||!c.accessToken)return {ok:true,skipped:true,reason:'Pinterest is not fully connected.'};const token=await pinterestToken(c),payload={board_id:String(c.boardId),title:clean(title,100),description:clean(description,500),link,media_source:{source_type:'image_url',url:imageUrl,is_standard:true}};const out=await j(await fetch('https://api.pinterest.com/v5/pins',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'Pinterest image Pin');return {ok:true,id:clean(out.id,500),kind:'pin'};}
async function linkedinImage(c,imageUrl,text,alt){if(!c.enabled||c.ownerType!=='organization'||!c.ownerId||!c.accessToken)return {ok:true,skipped:true,reason:'LinkedIn Organization image publishing is not fully configured.'};const author=`urn:li:organization:${c.ownerId}`,headers=liHeaders(c);const init=await j(await fetch('https://api.linkedin.com/rest/images?action=initializeUpload',{method:'POST',headers,body:JSON.stringify({initializeUploadRequest:{owner:author}})}),'LinkedIn image upload initialization');const uploadUrl=init?.value?.uploadUrl,imageUrn=init?.value?.image;if(!uploadUrl||!imageUrn)throw new Error('LinkedIn did not return an image upload URL.');const img=await fetchImage(imageUrl);const put=await fetch(uploadUrl,{method:'PUT',headers:{'content-type':img.type},body:img.bytes});if(!put.ok)throw new Error(`LinkedIn image upload failed (HTTP ${put.status}).`);const payload={author,commentary:clean(text,3000),visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{altText:clean(alt,500),id:imageUrn}},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false};const r=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers,body:JSON.stringify(payload)});const body=await r.text().catch(()=>'');if(!r.ok)throw new Error(`LinkedIn image post: ${clean(body||r.status,1200)}`);return {ok:true,id:r.headers.get('x-restli-id')||imageUrn,kind:'image_post'};}

export async function publishProductStatusAcrossPlatforms(env,{imageUrl='',altText='',productId=0,mode='once',startsAt='',endsAt=''}={}){
  const social=await getSocialIntegrationSettings(env),home=brandHomeUrl(env),product=productId?await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(Number(productId)).first().catch(()=>null):null;
  const title=clean(product?.name||'Offer Update',200),desc=clean(product?.short_description||product?.description||'Check the latest offer.',500),link=offerDetailLink(home,product?.slug||''),text=clean(`${title}${desc?`\n\n${desc}`:''}\n\nClick here: ${link}`,1800),results={};
  if(!clean(imageUrl,2600))return {error:'The Story / Status image URL is missing.'};
  // V16.29: the admin supplies the finished Story artwork. Facebook and Instagram use the 9:16 version directly; other platforms receive safe contain/pad variants only.
  const storyImage=statusImageVariant(imageUrl,'story'),feedImage=statusImageVariant(imageUrl,'feed'),squareImage=statusImageVariant(imageUrl,'square'),pinImage=statusImageVariant(imageUrl,'pin');
  const tasks=[['facebook',()=>facebookStory(social.facebook||{},storyImage)],['instagram',()=>instagramStory(social.instagram||{},storyImage)],['threads',()=>threadsImage(social.threads||{},feedImage,text,altText||title)],['linkedin',()=>linkedinImage(social.linkedin||{},squareImage,text,altText||title)],['pinterest',()=>pinterestPin(social.pinterest||{},pinImage,title,`${desc}\n${statusValidity(mode,endsAt)}`,link)]];
  for(const [k,fn] of tasks){try{results[k]=await fn();}catch(e){results[k]={ok:false,error:clean(e.message,1200)};}}
  results.x={ok:true,skipped:true,reason:'The current X integration is configured for text posting and does not contain the media-upload flow required for image status publishing.'};
  results.story_cta_support={ok:true,facebook:false,instagram:false,message:'Facebook Page Stories and Instagram organic Stories use the supplied 1080 × 1920 artwork. Their publishing endpoints used here do not expose a clickable web-link sticker/caption field. Threads, LinkedIn and Pinterest continue to receive the offer URL in API-supported text/destination fields.'};
  results.offer_link=link;results.graphics={story:storyImage,feed:feedImage,square:squareImage,pin:pinImage,source:imageUrl};
  return results;
}

export async function sweepSocialStatusCampaigns(env,{force=false,campaignId=0,maxCampaigns=3}={}){
  const state=await getSetting(env,'social_status_sweep_state',{}).catch(()=>({})),last=Date.parse(state.lastStartedAt||'');if(!force&&Number.isFinite(last)&&Date.now()-last<90_000)return {ok:true,skipped:true,reason:'Social status sweep ran recently.'};const started=now();await setSetting(env,'social_status_sweep_state',{...state,lastStartedAt:started}).catch(()=>{});
  let q="SELECT * FROM social_status_campaigns WHERE active=1 AND datetime(next_run_at)<=datetime('now')";const binds=[];if(campaignId){q+=' AND id=?';binds.push(Number(campaignId));}q+=' ORDER BY datetime(next_run_at),id LIMIT ?';binds.push(Math.max(1,Math.min(5,Number(maxCampaigns)||3)));const rows=(await env.DB.prepare(q).bind(...binds).all().catch(()=>({results:[]}))).results||[],out=[];
  for(const row of rows){let result;try{result=await publishProductStatusAcrossPlatforms(env,{imageUrl:row.image_url,altText:row.alt_text,productId:row.product_id,mode:row.mode,startsAt:row.starts_at,endsAt:row.ends_at});}catch(e){result={error:clean(e.message,1200)};}const run=Number(row.run_count||0)+1,mode=String(row.mode||'once'),end=Date.parse(row.ends_at||''),nextMs=Date.now()+24*60*60*1000,keep=mode==='daily_period'&&(!Number.isFinite(end)||nextMs<=end);await env.DB.prepare('UPDATE social_status_campaigns SET last_run_at=CURRENT_TIMESTAMP,run_count=?,last_result_json=?,active=?,next_run_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(run,JSON.stringify(result||{}),keep?1:0,keep?new Date(nextMs).toISOString():row.next_run_at,row.id).run().catch(()=>{});out.push({id:row.id,result,active:keep});}
  await setSetting(env,'social_status_sweep_state',{lastStartedAt:started,lastCompletedAt:now(),processed:out.length}).catch(()=>{});return {ok:true,processed:out.length,results:out};
}
