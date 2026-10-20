import { requireAdmin, getPaymentSettings } from '../../_lib/utils.js';
import { ensureSocialDmSchema } from '../../_lib/social-dms.js';
import { resolveTelegramFile } from '../../_lib/telegram.js';

const clean=(v,n=4000)=>String(v??'').trim().slice(0,n);
const obj=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v||''):(v??f);}catch{return f;}};

function safeUrl(raw){
  const u=new URL(raw);if(u.protocol!=='https:')throw new Error('Only secure media URLs can be opened.');
  const h=u.hostname.toLowerCase();
  if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local')||h.endsWith('.internal')||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))throw new Error('Private media URLs are not allowed.');
  return u.toString();
}
function mediaInfo(raw={}){
  const media=raw?.message?.media||raw?.media||{};
  const nested=raw?.whatsapp_webhook_payload||raw?.whatsappWebhookPayload||{};
  let url=clean(raw?._uc_media_url||media?.link||media?.url||media?.download_url||media?.downloadUrl||raw?.media_url||raw?.url,4000);
  let id=clean(raw?._uc_media_id||raw?.image?.id||raw?.video?.id||raw?.document?.id||raw?.audio?.id||raw?.sticker?.id,1000);
  let mime=clean(raw?._uc_media_mime||media?.mime_type||media?.mimeType||raw?.image?.mime_type||raw?.video?.mime_type||raw?.document?.mime_type||raw?.audio?.mime_type,200);
  let filename=clean(raw?._uc_media_filename||media?.filename||media?.file_name||raw?.document?.filename,500);
  if((!url||!id||!filename)&&nested?.entry){for(const entry of nested.entry||[])for(const change of entry?.changes||[])for(const m of change?.value?.messages||[]){url=url||clean(m?.image?.link||m?.video?.link||m?.document?.link||m?.audio?.link||m?.sticker?.link,4000);id=id||clean(m?.image?.id||m?.video?.id||m?.document?.id||m?.audio?.id||m?.sticker?.id,1000);mime=mime||clean(m?.image?.mime_type||m?.video?.mime_type||m?.document?.mime_type||m?.audio?.mime_type,200);filename=filename||clean(m?.document?.filename,500);}}
  return {url,id,mime,filename};
}
function safeFilename(v,mime=''){let name=clean(v,180).replace(/[\r\n"\\/<>:|?*]+/g,'_').replace(/^\.+/,'');if(!name)name=String(mime).includes('pdf')?'document.pdf':'inbox-document';return name;}
async function timed(url,options={},ms=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...options,signal:c.signal});}finally{clearTimeout(t);}}
async function fetchProviderMedia(env,url){
  const safe=safeUrl(url),plain=await timed(safe,{redirect:'follow'}).catch(()=>null);if(plain?.ok)return plain;
  const payment=await getPaymentSettings(env).catch(()=>({})),token=clean(env.INSTAUTOMATE_API_TOKEN||payment?.instautomateToken,3000);
  if(token){const authed=await timed(safe,{headers:{authorization:`Bearer ${token}`},redirect:'follow'}).catch(()=>null);if(authed?.ok)return authed;}
  return plain;
}
async function fetchCloudMedia(env,id){
  const payment=await getPaymentSettings(env).catch(()=>({})),token=clean(env.WHATSAPP_CLOUD_TOKEN||payment?.whatsappCloudToken,3000);if(!token||!id)return null;
  const metaRes=await timed(`https://graph.facebook.com/v26.0/${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${token}`}}).catch(()=>null);if(!metaRes?.ok)return null;
  const meta=await metaRes.json().catch(()=>({}));if(!meta?.url)return null;
  return timed(safeUrl(meta.url),{headers:{authorization:`Bearer ${token}`},redirect:'follow'}).catch(()=>null);
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return new Response('Unauthorized',{status:401});}
  try{
    await ensureSocialDmSchema(env);const u=new URL(request.url),galleryFor=Number(u.searchParams.get('galleryFor')||0);if(galleryFor){const base=await env.DB.prepare('SELECT conversation_id FROM social_dm_messages WHERE id=?').bind(galleryFor).first();if(!base)return new Response(JSON.stringify({error:'Inbox media was not found.'}),{status:404,headers:{'content-type':'application/json'}});const r=await env.DB.prepare(`SELECT id,attachment_type,raw_json FROM social_dm_messages WHERE conversation_id=? ORDER BY datetime(CASE WHEN sent_at<>'' THEN sent_at ELSE created_at END),id`).bind(base.conversation_id).all();const ids=(r.results||[]).filter(x=>{const raw=obj(x.raw_json,{}),info=mediaInfo(raw),mime=String(info.mime||'').toLowerCase(),type=String(x.attachment_type||'').toLowerCase();return type.includes('image')||mime.startsWith('image/')||!!raw?.image?.id||raw?.message?.media?.type==='image';}).map(x=>Number(x.id));return new Response(JSON.stringify({ok:true,ids}),{headers:{'content-type':'application/json','cache-control':'no-store'}});}const id=Number(u.searchParams.get('messageId')||0);if(!id)return new Response('Message id is required.',{status:400});
    const row=await env.DB.prepare(`SELECT id,platform,attachment_url,attachment_type,raw_json FROM social_dm_messages WHERE id=?`).bind(id).first();if(!row)return new Response('Inbox media was not found.',{status:404});
    const raw=obj(row.raw_json,{}),info=mediaInfo(raw),url=clean(row.attachment_url,4000)||info.url;let res=url?await fetchProviderMedia(env,url):null;if((!res||!res.ok)&&row.platform==='whatsapp'&&info.id)res=await fetchCloudMedia(env,info.id);if((!res||!res.ok)&&row.platform==='telegram'&&raw?._uc_telegram_file_id){const file=await resolveTelegramFile(env,raw._uc_telegram_file_id);res=await timed(file.url,{redirect:'follow'}).catch(()=>null);}
    if(!res?.ok)return new Response('This media is no longer available from the messaging provider.',{status:404});
    const headers=new Headers(),mime=clean(res.headers.get('content-type')||info.mime||'application/octet-stream',200),filename=safeFilename(info.filename,mime);headers.set('Content-Type',mime);headers.set('Content-Disposition',`${mime.toLowerCase().startsWith('application/pdf')?'inline':'attachment'}; filename="${filename}"`);headers.set('Cache-Control','private, no-store, max-age=0');headers.set('CDN-Cache-Control','no-store');headers.set('Cloudflare-CDN-Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');
    return new Response(res.body,{status:200,headers});
  }catch(e){return new Response(clean(e?.message||'Inbox media could not be loaded.',1000),{status:400});}
}
