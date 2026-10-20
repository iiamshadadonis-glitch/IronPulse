import { json, requireAdmin } from '../../_lib/utils.js';
import { deleteMediaAsset } from '../../_lib/media.js';
import { deleteGoogleDriveFile, googleDriveInlineImageUrl, uploadWebsiteImageToGoogleDrive } from '../../_lib/google-drive-upload.js';
import { sweepSocialStatusCampaigns } from '../../_lib/social-status-sweep.js';

const PRODUCT_MAX_IMAGE_BYTES=700*1024,MAX_PRODUCT_IMAGES=3;
const CLOUD='dfu0lha8d',PRESET='blog_imageuploads';
const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);
const bool=v=>v===true||v===1||['1','true','on','yes'].includes(String(v||'').toLowerCase());

async function cleanupProductImages(env,productId){
  const id=Number(productId||0);if(!id)return [];
  let rows=(await env.DB.prepare('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id').bind(id).all()).results||[];
  const seen=new Set(),keep=[],drop=[];for(const r of rows){const keys=[clean(r.object_key,2200),clean(r.public_url,2200)].filter(Boolean);if(keys.some(k=>seen.has(k))||keep.length>=MAX_PRODUCT_IMAGES)drop.push(r);else{keys.forEach(k=>seen.add(k));keep.push(r);}}
  if(drop.length){const ids=drop.map(x=>Number(x.id)).filter(Boolean);if(ids.length)await env.DB.prepare(`DELETE FROM product_images WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).run().catch(()=>{});}
  let coverKept=false;const fixes=[];for(let i=0;i<keep.length;i++){const r=keep[i],cover=Number(r.is_cover||0)===1;if(cover&&!coverKept)coverKept=true;else if(cover)fixes.push(env.DB.prepare('UPDATE product_images SET is_cover=0 WHERE id=?').bind(r.id));fixes.push(env.DB.prepare('UPDATE product_images SET sort_order=? WHERE id=?').bind(i+1,r.id));}if(fixes.length)await env.DB.batch(fixes).catch(()=>{});
  return (await env.DB.prepare('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id').bind(id).all()).results||[];
}

async function ensureDefaultPlacementForFirstImage(env,productId){
  const id=Number(productId||0);if(!id)return;
  for(const [page,section] of [['home','featured'],['offers','memberships']]){
    const existing=await env.DB.prepare('SELECT id FROM page_placements WHERE product_id=? AND page_key=? ORDER BY id LIMIT 1').bind(id,page).first().catch(()=>null);
    if(existing)continue;
    await env.DB.prepare('INSERT INTO page_placements(product_id,page_key,section_key,sort_order,visible,updated_at) VALUES(?,?,?,?,1,CURRENT_TIMESTAMP)').bind(id,page,section,0).run().catch(()=>{});
  }
}
function normalizePublicImageUrl(value=''){
  const raw=clean(value,2400);if(!raw)throw new Error('Paste a public image URL.');let u;try{u=new URL(raw);}catch{throw new Error('Enter a valid public HTTPS image URL.');}if(u.protocol!=='https:')throw new Error('The product image URL must use HTTPS.');
  const host=String(u.hostname||'').toLowerCase();if(host==='localhost'||host==='::1'||host.endsWith('.local')||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host))throw new Error('Use a public internet image URL. Private/local network addresses are not allowed.');
  if(/(^|\.)drive\.google\.com$/i.test(u.hostname)){
    const m=u.pathname.match(/\/file\/d\/([^/]+)/i),id=m?.[1]||u.searchParams.get('id');if(id)return googleDriveInlineImageUrl(id);
  }
  return u.toString();
}
async function sha256(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function cloudId(v=''){return String(v||'').split('/').map(encodeURIComponent).join('/');}
async function uploadRemoteSocialImage(sourceUrl){
  // Cloudinary can fetch a public remote URL directly. The Worker does not download the
  // image into memory first, so there is no arbitrary 15 MB Worker-side source limit.
  const form=new FormData();form.append('file',sourceUrl);form.append('upload_preset',PRESET);
  const out=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,{method:'POST',body:form});const text=await out.text().catch(()=>'');let d={};try{d=text?JSON.parse(text):{};}catch{}
  if(!out.ok||!d.public_id)throw new Error(`The Story / Status image conversion service could not fetch this public image${text?`: ${clean(d?.error?.message||text,500)}`:''}. Make sure the social image link is public and opens without login.`);
  const version=d.version?`v${d.version}/`:'';const ext=clean(d.format||'jpg',20).replace(/[^a-z0-9]/gi,'')||'jpg';const masterUrl=clean(d.secure_url,2400)||`https://res.cloudinary.com/${CLOUD}/image/upload/${version}${cloudId(d.public_id)}.${ext}`;
  return {masterUrl,publicId:d.public_id,format:ext};
}
async function proxyPublicImage(sourceUrl){
  const upstream=await fetch(sourceUrl,{headers:{accept:'image/*,*/*;q=0.8'},redirect:'follow'});
  if(!upstream.ok)throw new Error(`The public source image could not be opened (HTTP ${upstream.status}). Make sure the link is public and opens without login.`);
  const type=clean((upstream.headers.get('content-type')||'').split(';')[0],100).toLowerCase();
  if(type&&!type.startsWith('image/')&&type!=='application/octet-stream')throw new Error(`The public URL returned ${type} instead of an image.`);
  const headers=new Headers();headers.set('content-type',type||'application/octet-stream');headers.set('cache-control','private, max-age=300');headers.set('x-content-type-options','nosniff');
  return new Response(upstream.body,{status:200,headers});
}
async function uploadWebsiteCrop(file,width=900,height=1100,label='website crop'){
  if(!file||typeof file==='string')throw new Error(`Cropped ${label} image is required.`);if(file.size>PRODUCT_MAX_IMAGE_BYTES)throw new Error(`Cropped ${label} image is too large. Maximum size is 700 KB.`);const type=clean(file.type,100).toLowerCase();if(!['image/webp','image/jpeg','image/png'].includes(type))throw new Error(`Cropped ${label} image must be WebP, JPG or PNG.`);
  const safeName=clean(file.name,180)||`${label.replace(/\s+/g,'-')}-${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}.webp`;
  const form=new FormData();form.append('file',file,safeName);form.append('upload_preset',PRESET);const out=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,{method:'POST',body:form});const text=await out.text().catch(()=>'');let d={};try{d=text?JSON.parse(text):{};}catch{}if(!out.ok||!d.public_id)throw new Error(`The ${label} could not be saved${text?`: ${clean(d?.error?.message||text,500)}`:''}.`);
  if(Number(d.width||0)!==Number(width)||Number(d.height||0)!==Number(height))throw new Error(`The ${label} was uploaded as ${Number(d.width||0)} × ${Number(d.height||0)} instead of the required ${Number(width)} × ${Number(height)}. Nothing was linked to the website; please reopen the crop editor and try again.`);
  const url=clean(d.secure_url,2400);if(!url)throw new Error(`The ${label} upload completed but did not return a secure image URL.`);const check=await fetch(url,{headers:{accept:'image/*'}});if(!check.ok)throw new Error(`The saved ${label} could not be verified (HTTP ${check.status}).`);return {url,publicId:d.public_id,width:Number(d.width),height:Number(d.height)};
}
function parseDate(v,label){const s=clean(v,80);if(!s)return'';const n=Date.parse(s);if(!Number.isFinite(n))throw new Error(`Choose a valid ${label}.`);return new Date(n).toISOString();}
async function createStatusCampaign(env,{productId,imageId,imageUrl,altText,mode,startAt,endAt}){
  const m=mode==='daily_period'?'daily_period':'once',start=parseDate(startAt,'social status start date')||new Date().toISOString(),end=m==='daily_period'?parseDate(endAt,'social status end date'):'';if(m==='daily_period'&&!end)throw new Error('Choose both From and To dates for Repeat daily during offer period.');if(end&&Date.parse(end)<Date.parse(start))throw new Error('The social status To date must be the same as or after the From date.');
  const r=await env.DB.prepare(`INSERT INTO social_status_campaigns(product_id,product_image_id,image_url,alt_text,mode,starts_at,ends_at,next_run_at,active) VALUES(?,?,?,?,?,?,?,?,1)`).bind(Number(productId),Number(imageId),imageUrl,clean(altText,500),m,start,end,start).run();return Number(r?.meta?.last_row_id||0);
}

export async function onRequestGet({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}const u=new URL(request.url),source=u.searchParams.get('source_url');if(source){try{return await proxyPublicImage(normalizePublicImageUrl(source));}catch(e){return json({error:e.message},400);}}const productId=u.searchParams.get('product_id');if(!productId)return json({images:[]});return json({images:await cleanupProductImages(env,productId)});}

export async function onRequestPost({request,env,waitUntil}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const ct=String(request.headers.get('content-type')||'');
    if(ct.includes('application/json')){
      const b=await request.json(),productId=Number(b.product_id||0);if(!productId)return json({error:'Product ID is required.'},400);let rows=await cleanupProductImages(env,productId);if(rows.length>=MAX_PRODUCT_IMAGES)return json({error:'Maximum 3 scrolling images per product are allowed. Remove an old image before saving another one.'},400);
      const sourceUrl=normalizePublicImageUrl(b.image_url),sourceKey=`external:${await sha256(sourceUrl)}`,postSocial=bool(b.post_social_status),socialRaw=clean(b.social_image_url,2400);if(postSocial&&!socialRaw)return json({error:'A Story / Status image is required when Post as social status is enabled. Upload the Story / Status image to Google Drive or paste a public Story / Status Image URL. Recommended size: 1080 × 1920 px (9:16).'},400);const socialSourceUrl=postSocial?normalizePublicImageUrl(socialRaw):'';const duplicate=await env.DB.prepare('SELECT * FROM product_images WHERE product_id=? AND object_key=? LIMIT 1').bind(productId,sourceKey).first();if(duplicate)return json({error:'This same public image link is already saved for this plan. Duplicate images were not added.'},400);
      const firstImage=rows.length===0;
      // Product source is stored as the external URL only. Website cropping happens separately
      // and saves only the final 900 × 1100 website crop. Social publishing remains independent.
      const socialConverted=postSocial?await uploadRemoteSocialImage(socialSourceUrl):null,isCover=bool(b.is_cover)?1:0;if(isCover)await env.DB.prepare('UPDATE product_images SET is_cover=0 WHERE product_id=?').bind(productId).run();const next=Number(rows.at(-1)?.sort_order||rows.length)+1;const ins=await env.DB.prepare('INSERT INTO product_images(product_id,object_key,public_url,alt_text,sort_order,is_cover,source_url,source_public_id,website_crop_url,website_crop_updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(productId,sourceKey,sourceUrl,clean(b.alt_text,500),next,isCover,sourceUrl,'','','').run();const imageId=Number(ins?.meta?.last_row_id||0);
      if(firstImage)await ensureDefaultPlacementForFirstImage(env,productId);
      let campaignId=0;if(postSocial){campaignId=await createStatusCampaign(env,{productId,imageId,imageUrl:socialConverted.masterUrl,altText:b.alt_text,mode:b.status_mode,startAt:b.status_start_at,endAt:b.status_end_at});if(campaignId&&Date.parse(b.status_start_at||new Date().toISOString())<=Date.now()+5000){const task=sweepSocialStatusCampaigns(env,{force:true,campaignId,maxCampaigns:1}).catch(()=>null);if(typeof waitUntil==='function')waitUntil(task);}}
      rows=await cleanupProductImages(env,productId);return json({ok:true,url:sourceUrl,source_url:sourceUrl,source_public_id:'',social_source_url:socialConverted?.masterUrl||'',social_source_public_id:socialConverted?.publicId||'',image_id:imageId,status_campaign_id:campaignId,images:rows,website_crop_required:true,storage:'external-source-url-plus-website-crop-url-only-no-source-bytes-in-d1'});
    }
    // Website-only product crop. This never creates/repeats a social status campaign.
    const form=await request.formData(),file=form.get('file'),productId=Number(form.get('product_id')||0),action=clean(form.get('action'),80),imageId=Number(form.get('image_id')||0);
    if(action==='website_crop'){if(!productId||!imageId)return json({error:'Product ID and image ID are required for the website crop.'},400);const row=await env.DB.prepare('SELECT id FROM product_images WHERE id=? AND product_id=?').bind(imageId,productId).first();if(!row)return json({error:'Product image not found.'},404);const cropped=await uploadWebsiteCrop(file,900,1100,'product-card crop');await env.DB.prepare('UPDATE product_images SET public_url=?,website_crop_url=?,website_crop_updated_at=CURRENT_TIMESTAMP WHERE id=? AND product_id=?').bind(cropped.url,cropped.url,imageId,productId).run();return json({ok:true,image_id:imageId,product_id:productId,url:cropped.url,website_only:true,social_reposted:false,storage:'cloudinary-url-only-no-image-bytes-in-d1'});}
    if(action==='website_dual_crop'){if(!productId||!imageId)return json({error:'Product ID and image ID are required for both website crops.'},400);const row=await env.DB.prepare('SELECT id FROM product_images WHERE id=? AND product_id=?').bind(imageId,productId).first();if(!row)return json({error:'Product image not found.'},404);const websiteFile=form.get('website_file'),detailFile=form.get('detail_file');const [cardCrop,detailCrop]=await Promise.all([uploadWebsiteCrop(websiteFile,900,1100,'Product Card crop'),uploadWebsiteCrop(detailFile,1280,720,'Offer Details crop')]);if(cardCrop.publicId===detailCrop.publicId)return json({error:'The image host returned the same asset ID for both crops. The crops were not linked because Product Card and Offer Details must remain independent. Please click Save Cropped Images again.'},409);await env.DB.prepare('UPDATE product_images SET public_url=?,website_crop_url=?,website_crop_updated_at=CURRENT_TIMESTAMP,detail_crop_url=?,detail_crop_updated_at=CURRENT_TIMESTAMP WHERE id=? AND product_id=?').bind(cardCrop.url,cardCrop.url,detailCrop.url,imageId,productId).run();const saved=await env.DB.prepare('SELECT website_crop_url,detail_crop_url,website_crop_updated_at,detail_crop_updated_at FROM product_images WHERE id=? AND product_id=?').bind(imageId,productId).first();if(!saved?.website_crop_url||!saved?.detail_crop_url||saved.website_crop_url===saved.detail_crop_url)return json({error:'The two website crops could not be verified as separate saved images. No social status was repeated. Please reopen Images and save the crops again.'},500);return json({ok:true,image_id:imageId,product_id:productId,website_url:saved.website_crop_url,detail_url:saved.detail_crop_url,website_only:true,social_reposted:false,independent_crops:true,dimensions:{product_card:'900x1100',offer_details:'1280x720'},storage:'cloudinary-urls-only-no-image-bytes-in-d1'});}
    if(productId)return json({error:'Product images now use a public image URL. Open Images and paste the image link instead of uploading a file.'},400);if(!file||typeof file==='string')return json({error:'Image file is required'},400);const asset=await uploadWebsiteImageToGoogleDrive(env,file,{folderName:'Brand Images',settingsPrefix:'brandImages',maxBytes:15*1024*1024});return json({ok:true,key:`drive:${asset.id}`,media_id:`drive:${asset.id}`,url:asset.url,storage:'google-drive'});
  }catch(e){return json({error:e.message},400);}
}

export async function onRequestDelete({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}const u=new URL(request.url),imageId=u.searchParams.get('image_id'),mediaId=u.searchParams.get('media_id');if(!imageId&&!mediaId)return json({error:'image_id or media_id is required'},400);if(imageId){const image=await env.DB.prepare('SELECT * FROM product_images WHERE id=?').bind(imageId).first();if(image){await env.DB.prepare('DELETE FROM social_status_campaigns WHERE product_image_id=?').bind(Number(imageId)).run().catch(()=>{});await env.DB.prepare('DELETE FROM product_images WHERE id=?').bind(imageId).run();if(String(image.object_key||'').startsWith('drive:'))await deleteGoogleDriveFile(env,image.object_key).catch(()=>{});else if(!String(image.object_key||'').startsWith('external:'))await deleteMediaAsset(env,image.object_key||image.public_url).catch(()=>{});await cleanupProductImages(env,image.product_id);}}else if(String(mediaId).startsWith('drive:'))await deleteGoogleDriveFile(env,mediaId);else await deleteMediaAsset(env,mediaId);return json({ok:true});}

export async function onRequestPut({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}try{const b=await request.json().catch(()=>({})),imageId=Number(b.image_id||b.id),productId=Number(b.product_id||0);if(b.action==='set_cover'){if(!imageId||!productId)return json({error:'image_id and product_id are required'},400);const image=await env.DB.prepare('SELECT id FROM product_images WHERE id=? AND product_id=?').bind(imageId,productId).first();if(!image)return json({error:'Product image not found'},404);await env.DB.batch([env.DB.prepare('UPDATE product_images SET is_cover=0 WHERE product_id=?').bind(productId),env.DB.prepare('UPDATE product_images SET is_cover=1 WHERE id=? AND product_id=?').bind(imageId,productId)]);return json({ok:true,cover_image_id:imageId});}if(b.action!=='move')return json({error:'Unsupported media action'},400);const dir=Number(b.dir||0);if(!imageId||!productId||!dir)return json({error:'image_id, product_id and dir are required'},400);const rows=await cleanupProductImages(env,productId),idx=rows.findIndex(r=>Number(r.id)===imageId),swap=dir<0?idx-1:idx+1;if(idx<0)return json({error:'Product image not found'},404);if(swap<0||swap>=rows.length)return json({ok:true,unchanged:true});const ordered=rows.map(r=>r.id);[ordered[idx],ordered[swap]]=[ordered[swap],ordered[idx]];await env.DB.batch(ordered.map((id,i)=>env.DB.prepare('UPDATE product_images SET sort_order=? WHERE id=?').bind(i+1,id)));return json({ok:true});}catch(e){return json({error:e.message},400);}}
