import { getSocialIntegrationSettings, setSetting } from './utils.js';

const clean=(v,n=4096)=>String(v??'').trim().slice(0,n);

export async function telegramRequest(token,method,payload={}){
  token=clean(token,9000);if(!token)throw new Error('Telegram bot token is missing.');
  const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(clean(d.description||`Telegram ${method} returned HTTP ${r.status}.`,1400));
  return d.result;
}

export async function testTelegramConnection(config={}){
  const me=await telegramRequest(config.botToken,'getMe');
  const webhook=await telegramRequest(config.botToken,'getWebhookInfo');
  let chat=null;if(config.targetChatId)chat=await telegramRequest(config.botToken,'getChat',{chat_id:config.targetChatId});
  return {me,webhook,chat,message:`Telegram bot @${me.username||me.first_name||me.id} is authenticated.${config.targetChatId?` Publishing target ${chat?.title||chat?.username||chat?.id} is reachable.`:''}`};
}

export async function connectTelegram(config={},webhookUrl=''){
  const me=await telegramRequest(config.botToken,'getMe'),secret=clean(config.webhookSecret,256);
  await telegramRequest(config.botToken,'setWebhook',{url:webhookUrl,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false});
  const tested=await testTelegramConnection(config);return {...tested,me};
}

export async function disconnectTelegram(config={}){if(config.botToken)await telegramRequest(config.botToken,'deleteWebhook',{drop_pending_updates:false});return {ok:true};}

function keyboard(buttons=[]){const rows=buttons.filter(x=>x?.label).slice(0,8).map((b,i)=>[{text:clean(b.label,64),...(b.action==='url'&&/^https:\/\//i.test(clean(b.url,3000))?{url:clean(b.url,3000)}:{callback_data:clean(b.payload||b.value||b.label||`option-${i+1}`,64)})}]);return rows.length?{inline_keyboard:rows}:undefined;}

export async function sendTelegram(env,chatId,{text='',attachmentUrl='',attachmentType='',buttons=[]}={}){
  const s=await getSocialIntegrationSettings(env),c=s.telegram||{},reply_markup=keyboard(buttons),caption=clean(text,1024);let result;
  if(attachmentUrl&&/document|pdf|file/i.test(attachmentType))result=await telegramRequest(c.botToken,'sendDocument',{chat_id:chatId,document:attachmentUrl,caption,reply_markup});
  else if(attachmentUrl)result=await telegramRequest(c.botToken,'sendPhoto',{chat_id:chatId,photo:attachmentUrl,caption,reply_markup});
  else result=await telegramRequest(c.botToken,'sendMessage',{chat_id:chatId,text:clean(text||'Message',4096),reply_markup,disable_web_page_preview:false});
  return result;
}

export async function resolveTelegramFile(env,fileId){const s=await getSocialIntegrationSettings(env),c=s.telegram||{},f=await telegramRequest(c.botToken,'getFile',{file_id:fileId});if(!f?.file_path)throw new Error('Telegram did not return a downloadable file path.');return {url:`https://api.telegram.org/file/bot${c.botToken}/${f.file_path}`};}

export async function publishTelegramArticle(env,article={}){
  const s=await getSocialIntegrationSettings(env),c=s.telegram||{};if(!c.enabled||!c.autoPublish)return {ok:true,skipped:true,reason:'Telegram automatic publishing is disabled.'};if(!c.targetChatId)throw new Error('Telegram target group/channel/chat is missing.');
  const origin=clean(env.PUBLIC_SITE_URL||env.SITE_URL||'https://ironpulse-gym.pages.dev',1000).replace(/\/$/,'');const url=clean(article.url||article.publicUrl||article.article_url||article.slug&&`${origin}/blog/${article.slug}`,1500),title=clean(article.title||'New update',500),body=clean(article.excerpt||article.summary||article.description||'',2200),image=clean(article.image_url||article.imageUrl||article.cover_image||article.coverImage||'',3000),text=clean(`${title}${body?`\n\n${body}`:''}${url?`\n\n${url}`:''}`,image?1024:4096);
  try{const sent=await sendTelegram(env,c.targetChatId,{text,attachmentUrl:image,attachmentType:image?'image':''});s.telegram={...c,lastPublishAt:new Date().toISOString(),lastPublishError:''};await setSetting(env,'social_integration_settings',s);return {ok:true,id:sent?.message_id||'',url,message:'Telegram post published.'};}
  catch(e){s.telegram={...c,lastPublishError:clean(e.message,1200)};await setSetting(env,'social_integration_settings',s).catch(()=>{});throw e;}
}
