import { getSocialIntegrationSettings } from '../../_lib/utils.js';
import { telegramRequest } from '../../_lib/telegram.js';
import { upsertDmMessage, runDmAutomationAfterInbound } from '../../_lib/social-dms.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const ok=()=>new Response('OK',{status:200});

export async function onRequestPost({request,env}){
  const settings=await getSocialIntegrationSettings(env),c=settings.telegram||{};
  if(!c.enabled||!c.botToken)return ok();
  if(c.webhookSecret&&request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==c.webhookSecret)return new Response('Unauthorized',{status:401});
  const update=await request.json().catch(()=>({}));let m=update.message;
  if(update.callback_query){await telegramRequest(c.botToken,'answerCallbackQuery',{callback_query_id:update.callback_query.id}).catch(()=>{});m=update.callback_query.message?{...update.callback_query.message,from:update.callback_query.from,text:update.callback_query.data||'Button selected'}:null;}
  if(!m||m.chat?.type!=='private')return ok();
  const from=m.from||{},chat=m.chat||{},photo=Array.isArray(m.photo)&&m.photo.length?m.photo[m.photo.length-1]:null,doc=m.document||null,fileId=clean(photo?.file_id||doc?.file_id,1000),attachmentType=doc?'document':photo?'image':'',text=clean(m.text||m.caption||'',5000),externalId=`telegram:${clean(chat.id,300)}`;
  const r=await upsertDmMessage(env,{platform:'telegram',externalConversationId:externalId,externalMessageId:`telegram:${m.message_id}`,participantId:clean(chat.id,300),participantName:clean([from.first_name,from.last_name].filter(Boolean).join(' ')||from.username||'Telegram user',240),participantUsername:clean(from.username,200),participantProfileUrl:from.username?`https://t.me/${encodeURIComponent(from.username)}`:'',senderId:clean(from.id,300),senderName:clean([from.first_name,from.last_name].filter(Boolean).join(' '),240),direction:'inbound',messageText:text,attachmentType,sentAt:Number(m.date||0)*1000,raw:{_uc_telegram_file_id:fileId,_uc_media_filename:clean(doc?.file_name,500),_uc_media_mime:clean(doc?.mime_type,200),update_id:update.update_id,message:m}});
  if(r.inserted)await runDmAutomationAfterInbound(env,{platform:'telegram',conversationId:r.conversationId,participantId:clean(chat.id,300),text,payload:update.callback_query?.data||'',externalEventId:`telegram:${m.message_id}`}).catch(()=>{});
  return ok();
}
