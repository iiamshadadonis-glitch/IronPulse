import { getSocialIntegrationSettings, getPaymentSettings, sendWhatsAppText, normalizePhone } from './utils.js';
import { getXUserAccessToken } from './social-publishing.js';
import { fetchMedia, xUploadMedia } from './social-posts.js';
import { bumpAdminActivity, reconcileDmUnread } from './admin-activity.js';
import { sendTelegram } from './telegram.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const jsonSafe=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v||''):(v??f);}catch{return f;}};
const scopeSet=v=>new Set(Array.isArray(v)?v.map(String):String(v||'').split(/[\s,]+/).filter(Boolean));
const now=()=>new Date().toISOString();
const iso=v=>{const d=new Date(v||Date.now());return Number.isFinite(d.getTime())?d.toISOString():now();};
const eventTimestampIsRecent=(v,maxAgeMs=10*60*1000)=>{if(v===undefined||v===null||v==='')return true;const n=Number(v),ms=Number.isFinite(n)&&n>0?(n<1e12?n*1000:n):Date.parse(String(v));if(!Number.isFinite(ms))return true;return ms<=Date.now()+5*60*1000&&Date.now()-ms<=maxAgeMs;};
const PLABEL={facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',x:'X / Twitter',telegram:'Telegram'};
const DM_INITIAL_LOOKBACK_MS=2*60*60*1000;
const DM_SYNC_OVERLAP_MS=5*60*1000;
const META_CONVERSATION_PAGE_SIZE=20;
const META_MESSAGE_PAGE_SIZE=20;
const META_MAX_CONVERSATION_PAGES=3;
const META_MAX_MESSAGE_PAGES=2;
const REMOTE_TIMEOUT_MS=12000;
const boolish=v=>v===true||v===1||String(v??'').trim().toLowerCase()==='true';
function stableEventId(prefix,...parts){let h=2166136261;const input=parts.map(v=>String(v??'')).join('|');for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return `${prefix}:${(h>>>0).toString(16)}:${input.length}`;}
export function providerMetadataOnly(value,depth=0,key=''){if(depth>10)return '[omitted]';if(value===null||value===undefined||typeof value==='number'||typeof value==='boolean')return value;if(typeof value==='string'){const k=String(key).toLowerCase(),compact=value.replace(/\s+/g,'');const encodedFile=/^(?:JVBER|UEsDB|0M8R4KGx|iVBOR|\/9j\/)/.test(compact)||(compact.length>1000&&/^[A-Za-z0-9+/_=-]+$/.test(compact));if(/base64|binary|filedata|file_data|bytes|buffer|blob/.test(k)||(/^data:/i.test(value)&&value.length>300)||encodedFile)return '[provider media bytes omitted]';return value.slice(0,12000);}if(Array.isArray(value))return value.slice(0,100).map(v=>providerMetadataOnly(v,depth+1,key));if(typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=providerMetadataOnly(v,depth+1,k);return out;}return String(value).slice(0,1000);}
const metadataOnly=providerMetadataOnly;
function cloudPayloadHasMessages(payload={}){for(const entry of Array.isArray(payload?.entry)?payload.entry:[])for(const change of Array.isArray(entry?.changes)?entry.changes:[])if(Array.isArray(change?.value?.messages)&&change.value.messages.length)return true;return false;}

async function fetchTimed(url,options={},timeout=REMOTE_TIMEOUT_MS){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(e){if(e?.name==='AbortError')throw new Error('The social network took too long to respond. Please try Refresh again.');throw e;}
  finally{clearTimeout(timer);}
}
async function remoteJson(res,label){const text=await res.text().catch(()=>'');let d={};try{d=text?JSON.parse(text):{};}catch{d={raw:text};}if(!res.ok){const msg=d?.error?.message||d?.detail||d?.title||d?.error_description||text||`${label} returned HTTP ${res.status}.`;const e=new Error(`${label}: ${clean(msg,1600)}`);e.httpStatus=res.status;e.upstreamCode=String(d?.error?.code||'');throw e;}return d;}
function friendlyDmError(platform,e){
  const raw=clean(e?.message||e,1600),p=PLABEL[platform]||platform||'Social inbox';
  if(/UNIQUE constraint failed:\s*social_dm_messages\.platform|SQLITE_CONSTRAINT_UNIQUE/i.test(raw))return `${p} sent a duplicate copy of a message that is already in Inbox. The duplicate was ignored safely.`;
  if(/D1_ERROR|SQLITE_|constraint failed|database is locked/i.test(raw))return `${p} Inbox storage could not finish this refresh. No existing messages were removed. Click Refresh to try again; if it repeats, check the D1 database binding in Cloudflare.`;
  if(/reduce the amount of data|too much data|response.*too large/i.test(raw))return `${p} returned too much conversation data in one response. Inbox now uses a lightweight recent-message sync; click Refresh again if the newest message has not appeared yet.`;
  if(/permission|oauth|access token|unsupported|get application request limit|code 10\b|code 200\b/i.test(raw))return `${p} Inbox needs attention in Settings → Integrations. Re-run Test Connection and confirm the messaging permission/webhook fields are approved for this connected account.`;
  if(/took too long|timed? out|abort/i.test(raw))return `${p} did not respond in time. Inbox stopped waiting so the admin page will not remain stuck on Synchronizing. Click Refresh to try again.`;
  return `${p} could not refresh new messages right now. ${raw.replace(/^.*? conversations:\s*/i,'').slice(0,700)}`;
}

let dmSchemaReady=false;
const DM_SCHEMA_KEY='social_dm_schema_v1671';
const DM_SCHEMA_VERSION='1';
export async function ensureSocialDmSchema(env){
  if(dmSchemaReady||!env?.DB)return;
  let marked=false;
  try{
    const row=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(DM_SCHEMA_KEY).first();
    marked=String(row?.value||'')===DM_SCHEMA_VERSION;
  }catch(_){}
  if(marked){dmSchemaReady=true;return;}

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    external_conversation_id TEXT NOT NULL,
    participant_id TEXT NOT NULL DEFAULT '',
    participant_name TEXT NOT NULL DEFAULT '',
    participant_username TEXT NOT NULL DEFAULT '',
    participant_profile_url TEXT NOT NULL DEFAULT '',
    participant_avatar_url TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL DEFAULT 'inbox',
    last_message_text TEXT NOT NULL DEFAULT '',
    last_message_at TEXT NOT NULL DEFAULT '',
    last_message_id TEXT NOT NULL DEFAULT '',
    last_direction TEXT NOT NULL DEFAULT '',
    unread_count INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform,external_conversation_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    external_message_id TEXT NOT NULL,
    sender_id TEXT NOT NULL DEFAULT '',
    sender_name TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'inbound',
    message_text TEXT NOT NULL DEFAULT '',
    attachment_url TEXT NOT NULL DEFAULT '',
    attachment_type TEXT NOT NULL DEFAULT '',
    sent_at TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform,external_message_id),
    FOREIGN KEY(conversation_id) REFERENCES social_dm_conversations(id) ON DELETE CASCADE
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_sync_state (
    platform TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT '',
    last_synced_at TEXT NOT NULL DEFAULT '',
    last_success_at TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();

  // Existing V16.70 databases already have the DM tables, so these guarded
  // ALTERs add only the two latest-message fields used by lightweight polling.
  try{await env.DB.prepare("ALTER TABLE social_dm_conversations ADD COLUMN last_message_id TEXT NOT NULL DEFAULT ''").run();}catch(_){}
  try{await env.DB.prepare("ALTER TABLE social_dm_conversations ADD COLUMN last_direction TEXT NOT NULL DEFAULT ''").run();}catch(_){}

  // Normalize legacy blank dates once so indexed ORDER BY clauses can be used
  // directly instead of wrapping every row in datetime(CASE ...).
  await env.DB.prepare("UPDATE social_dm_conversations SET last_message_at=created_at WHERE COALESCE(last_message_at,'')='' ").run().catch(()=>{});
  await env.DB.prepare("UPDATE social_dm_messages SET sent_at=created_at WHERE COALESCE(sent_at,'')='' ").run().catch(()=>{});

  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_activity ON social_dm_conversations(last_message_at DESC,id DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_unread ON social_dm_conversations(unread_count,last_message_at DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_participant ON social_dm_conversations(platform,participant_id,last_message_at DESC,id DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_dm_messages_conversation ON social_dm_messages(conversation_id,sent_at,id)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_social_dm_messages_conversation_desc ON social_dm_messages(conversation_id,sent_at DESC,id DESC)').run().catch(()=>{});

  await env.DB.prepare("UPDATE social_dm_conversations SET participant_profile_url='' WHERE platform='facebook' AND participant_id<>'' AND (participant_profile_url='https://www.facebook.com/' || participant_id OR participant_profile_url='https://www.facebook.com/' || participant_id || '/')").run().catch(()=>{});
  await repairLegacyDmConversations(env).catch(()=>{});
  await repairWhatsappProviderEchoRows(env).catch(()=>{});

  // Backfill only the newest-message metadata required by the Inbox watcher.
  // The conversation/message indexes make each lookup bounded; this is a one-time
  // migration and is skipped by all later isolates through DM_SCHEMA_KEY.
  await env.DB.prepare(`UPDATE social_dm_conversations SET
    last_message_id=COALESCE((SELECT m.external_message_id FROM social_dm_messages m WHERE m.conversation_id=social_dm_conversations.id ORDER BY m.sent_at DESC,m.id DESC LIMIT 1),last_message_id),
    last_direction=COALESCE((SELECT m.direction FROM social_dm_messages m WHERE m.conversation_id=social_dm_conversations.id ORDER BY m.sent_at DESC,m.id DESC LIMIT 1),last_direction)
    WHERE COALESCE(last_message_id,'')=''`).run().catch(()=>{});

  await reconcileDmUnread(env,{bump:false}).catch(()=>{});
  try{await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(DM_SCHEMA_KEY,DM_SCHEMA_VERSION).run();}catch(_){}
  dmSchemaReady=true;
}

function profileUrl(platform,participantId,username=''){
  if(platform==='instagram'&&username)return `https://www.instagram.com/${encodeURIComponent(String(username).replace(/^@/,''))}/`;
  // Messenger participant IDs are Page-scoped IDs (PSIDs), not public Facebook profile IDs.
  // Do not manufacture facebook.com/<PSID> links because they commonly open 'content unavailable'.
  if(platform==='facebook')return '';
  if(platform==='x'&&username)return `https://x.com/${encodeURIComponent(String(username).replace(/^@/,''))}`;
  if(platform==='whatsapp'&&participantId)return `https://wa.me/${encodeURIComponent(String(participantId).replace(/\D/g,''))}`;
  if(platform==='telegram'&&username)return `https://t.me/${encodeURIComponent(String(username).replace(/^@/,''))}`;
  return '';
}

export async function getSocialDmCapabilities(env){
  const [s,payment]=await Promise.all([getSocialIntegrationSettings(env),getPaymentSettings(env).catch(()=>({}))]),fb=s.facebook||{},ig=s.instagram||{},x=s.x||{},tg=s.telegram||{};
  const fbScopes=scopeSet(fb.grantedScopes),igScopes=scopeSet(ig.grantedScopes),xScopes=scopeSet(x.grantedScopes);
  const facebookReady=!!(fb.enabled&&fb.pageId&&fb.pageAccessToken&&(fb.messagingReady===true||fbScopes.has('pages_messaging')));
  const instagramReady=!!(ig.enabled&&ig.instagramBusinessId&&(ig.pageAccessToken||ig.instagramLoginToken)&&(ig.messagingReady===true||igScopes.has('instagram_manage_messages')||igScopes.has('instagram_business_manage_messages')));
  const xReady=!!(x.enabled&&(x.accessToken||x.refreshToken)&&x.connectionState==='connected'&&xScopes.has('dm.read')&&xScopes.has('dm.write'));
  const waProvider=clean(payment.otpProvider||payment.whatsappConnectedProvider||'whatsapp_cloud',60).toLowerCase(),whatsappEnabled=payment.whatsappOtpEnabled!==false,whatsappReady=!!(whatsappEnabled&&payment.whatsappConnectionState==='connected'&&(!payment.whatsappConnectedProvider||payment.whatsappConnectedProvider===waProvider));
  return {platforms:[
    {key:'facebook',label:'Facebook',enabled:!!fb.enabled,connected:facebookReady,features:{read:true,reply:true,image:true,documents:true,providerHostedMedia:true,emoji:true,voiceCall:false,videoCall:false},realtime:{messagesSubscribed:Array.isArray(fb.lastWebhookFields)&&fb.lastWebhookFields.includes('messages'),webhookReady:fb.webhookReady===true,lastReceivedAt:fb.lastWebhookReceivedAt||''},reason:facebookReady?'':(!fb.enabled?'Facebook is disabled.':'Messenger messages require a connected Page with pages_messaging. Run Test Connection after approving that permission.')},
    {key:'instagram',label:'Instagram',enabled:!!ig.enabled,connected:instagramReady,features:{read:true,reply:true,image:true,documents:true,providerHostedMedia:true,emoji:true,voiceCall:false,videoCall:false},realtime:{messagesSubscribed:Array.isArray(ig.lastWebhookFields)&&ig.lastWebhookFields.includes('messages'),webhookReady:ig.webhookReady===true||ig.messagingWebhookReady===true,lastReceivedAt:ig.lastWebhookReceivedAt||''},reason:instagramReady?'':(!ig.enabled?'Instagram is disabled.':'Instagram messages require the connected professional account and messaging permission.')},
    {key:'whatsapp',label:'WhatsApp',enabled:whatsappEnabled,connected:whatsappReady,features:{read:true,reply:true,image:whatsappReady&&['whatsapp_cloud','instautomate'].includes(waProvider),documents:true,providerHostedMedia:true,emoji:true,voiceCall:false,videoCall:false},reason:whatsappReady?'':(!whatsappEnabled?'WhatsApp is disabled.':'Connect the selected WhatsApp provider in Integrations. Incoming messages are synchronized from the configured webhook.')},
    {key:'x',label:'X / Twitter',enabled:!!x.enabled,connected:xReady,features:{read:true,reply:true,image:true,documents:true,providerHostedMedia:true,emoji:true,voiceCall:false,videoCall:false},reason:xReady?'':(!x.enabled?'X is disabled.':'Reconnect X once and approve dm.read + dm.write to use Inbox messages.')},
    {key:'telegram',label:'Telegram',enabled:!!tg.enabled,connected:!!(tg.enabled&&tg.connectionState==='connected'&&tg.botToken&&tg.webhookReady),features:{read:true,reply:true,image:true,documents:true,providerHostedMedia:true,emoji:true,voiceCall:false,videoCall:false},realtime:{webhookReady:!!tg.webhookReady},reason:tg.enabled?'Connect the Telegram bot and register its webhook in Integrations.':'Telegram is disabled.'}
  ],rules:{voiceVideo:'Current connected public APIs do not expose starting native voice/video calls from this admin panel, so call buttons are intentionally hidden.',imageFolder:'DM Attachments',whatsapp:'WhatsApp inbox history is populated by new webhook events; Refresh does not invent or scrape older WhatsApp conversations.',incrementalSync:'Inbox keeps existing stored conversations but only imports recent/new messages during refresh. Webhooks remain the primary path for new DMs.'}};
}

async function conversationByExternal(env,platform,externalId){await ensureSocialDmSchema(env);return env.DB.prepare('SELECT * FROM social_dm_conversations WHERE platform=? AND external_conversation_id=?').bind(platform,externalId).first();}
function syntheticConversationId(platform,participantId){return participantId?`${platform}:${participantId}`:'';}
function isSyntheticConversation(row,platform='',participantId=''){const p=platform||row?.platform||'',pid=participantId||row?.participant_id||'';return !!(row&&pid&&String(row.external_conversation_id||'')===syntheticConversationId(p,pid));}
function genericParticipantName(v='',platform=''){const n=clean(v,240).toLowerCase(),p=clean(platform,40).toLowerCase();return !n||n==='social user'||n===p||n===`${p} user`;}
async function conversationByParticipant(env,platform,participantId){if(!participantId)return null;await ensureSocialDmSchema(env);return env.DB.prepare(`SELECT * FROM social_dm_conversations WHERE platform=? AND participant_id=? ORDER BY CASE WHEN external_conversation_id=? THEN 1 ELSE 0 END,last_message_at DESC,id DESC LIMIT 1`).bind(platform,participantId,syntheticConversationId(platform,participantId)).first();}
async function mergeConversationRows(env,keep,drop){
  if(!keep||!drop||Number(keep.id)===Number(drop.id))return keep||drop;
  await env.DB.prepare('UPDATE social_dm_messages SET conversation_id=? WHERE conversation_id=?').bind(keep.id,drop.id).run().catch(()=>{});
  const latest=await env.DB.prepare(`SELECT external_message_id,direction,message_text,attachment_type,attachment_url,sent_at,created_at FROM social_dm_messages WHERE conversation_id=? ORDER BY sent_at DESC,id DESC LIMIT 1`).bind(keep.id).first().catch(()=>null);
  const keepName=clean(keep.participant_name,240),dropName=clean(drop.participant_name,240),name=genericParticipantName(keepName,keep.platform)&&!genericParticipantName(dropName,drop.platform)?dropName:keepName||dropName;
  const username=clean(keep.participant_username,200)||clean(drop.participant_username,200),pid=clean(keep.participant_id,300)||clean(drop.participant_id,300),prof=clean(keep.participant_profile_url,2000)||clean(drop.participant_profile_url,2000)||profileUrl(keep.platform,pid,username),avatar=clean(keep.participant_avatar_url,3000)||clean(drop.participant_avatar_url,3000),folder=clean(keep.folder,50)||clean(drop.folder,50)||'inbox';
  const lastText=latest?(clean(latest.message_text,1600)||((latest.attachment_type||latest.attachment_url)?`[${clean(latest.attachment_type,40)||'attachment'}]`:'Message')):(clean(keep.last_message_text,1600)||clean(drop.last_message_text,1600)),lastAt=latest?iso(latest.sent_at||latest.created_at):(clean(keep.last_message_at,100)||clean(drop.last_message_at,100));
  await env.DB.prepare(`UPDATE social_dm_conversations SET participant_id=?,participant_name=?,participant_username=?,participant_profile_url=?,participant_avatar_url=?,folder=?,last_message_text=?,last_message_at=?,last_message_id=?,last_direction=?,unread_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(pid,name,username,prof,avatar,folder,lastText,lastAt,clean(latest?.external_message_id,700),clean(latest?.direction,20),Math.max(0,Number(keep.unread_count||0))+Math.max(0,Number(drop.unread_count||0)),keep.id).run();
  await env.DB.prepare('DELETE FROM social_dm_conversations WHERE id=?').bind(drop.id).run().catch(()=>{});
  return env.DB.prepare('SELECT * FROM social_dm_conversations WHERE id=?').bind(keep.id).first();
}
async function repairLegacyDmConversations(env){
  const groups=await env.DB.prepare(`SELECT platform,participant_id,COUNT(*) n FROM social_dm_conversations WHERE platform IN ('facebook','instagram') AND participant_id<>'' GROUP BY platform,participant_id HAVING COUNT(*)>1`).all().catch(()=>({results:[]}));
  for(const g of groups.results||[]){const rows=(await env.DB.prepare(`SELECT * FROM social_dm_conversations WHERE platform=? AND participant_id=? ORDER BY CASE WHEN external_conversation_id=? THEN 1 ELSE 0 END,last_message_at DESC,id DESC`).bind(g.platform,g.participant_id,syntheticConversationId(g.platform,g.participant_id)).all().catch(()=>({results:[]}))).results||[];let keep=rows[0];for(const row of rows.slice(1))keep=await mergeConversationRows(env,keep,row);}
}
async function repairWhatsappProviderEchoRows(env){
  // V16.66: older Instautomate wrapper status callbacks could be mistaken for
  // inbound messages because they contain contact + message objects but no user
  // content. Remove only those provider-wrapper blank rows; never delete normal
  // WhatsApp Cloud messages or genuine media/content rows.
  const rows=(await env.DB.prepare(`SELECT id,conversation_id,raw_json FROM social_dm_messages WHERE platform='whatsapp' AND direction='inbound' AND message_text='' AND attachment_url='' AND raw_json LIKE '%"contact"%' AND raw_json LIKE '%"message"%' LIMIT 500`).all().catch(()=>({results:[]}))).results||[];
  const affected=new Map();
  for(const row of rows){
    const raw=jsonSafe(row.raw_json,{}),m=raw?.message||{};
    const explicitNew=Object.prototype.hasOwnProperty.call(m,'is_new_message')?boolish(m.is_new_message):null;
    const status=clean(m?.status||raw?.status,80).toLowerCase();
    const body=clean(m?.body||m?.message_body||m?.caption||m?.media?.caption,5000),media=clean(m?.media?.link||m?.media?.url||m?.media_url||m?.url,3000);
    if((explicitNew===false||status||(!body&&!media))&&row.id){await env.DB.prepare('DELETE FROM social_dm_messages WHERE id=?').bind(row.id).run().catch(()=>{});affected.set(Number(row.conversation_id),Number(affected.get(Number(row.conversation_id))||0)+1);}
  }
  for(const [conversationId,removed] of affected){
    const latest=await env.DB.prepare(`SELECT external_message_id,direction,message_text,attachment_type,attachment_url,sent_at,created_at FROM social_dm_messages WHERE conversation_id=? ORDER BY sent_at DESC,id DESC LIMIT 1`).bind(conversationId).first().catch(()=>null);
    const preview=latest?(clean(latest.message_text,1600)||((latest.attachment_type||latest.attachment_url)?`[${clean(latest.attachment_type,40)||'attachment'}]`:'Message')):'';
    const at=latest?clean(latest.sent_at||latest.created_at,100):'';
    await env.DB.prepare('UPDATE social_dm_conversations SET last_message_text=?,last_message_at=?,last_message_id=?,last_direction=?,unread_count=MAX(0,unread_count-?),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(preview,at,clean(latest?.external_message_id,700),clean(latest?.direction,20),removed,conversationId).run().catch(()=>{});
  }
  return rows.length;
}

async function upsertConversation(env,{platform,externalConversationId,participantId='',participantName='',participantUsername='',participantProfileUrl='',participantAvatarUrl='',folder='inbox',lastMessageText='',lastMessageAt='',raw={}}){
  const p=clean(platform,40).toLowerCase(),requestedExt=clean(externalConversationId,500),incomingPid=clean(participantId,300);if(!p||!requestedExt)throw new Error('DM conversation identity is incomplete.');
  let existing=await conversationByExternal(env,p,requestedExt);
  if(incomingPid&&['facebook','instagram'].includes(p)){
    const byParticipant=await conversationByParticipant(env,p,incomingPid);
    if(existing&&byParticipant&&Number(existing.id)!==Number(byParticipant.id)){
      const existingSynthetic=isSyntheticConversation(existing,p,incomingPid),participantSynthetic=isSyntheticConversation(byParticipant,p,incomingPid),keep=!existingSynthetic?existing:(!participantSynthetic?byParticipant:existing),drop=Number(keep.id)===Number(existing.id)?byParticipant:existing;existing=await mergeConversationRows(env,keep,drop);
    }else if(!existing&&byParticipant){
      if(!isSyntheticConversation({external_conversation_id:requestedExt,platform:p,participant_id:incomingPid},p,incomingPid)&&isSyntheticConversation(byParticipant,p,incomingPid)){
        try{await env.DB.prepare('UPDATE social_dm_conversations SET external_conversation_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(requestedExt,byParticipant.id).run();existing=await conversationByExternal(env,p,requestedExt);}catch{existing=byParticipant;}
      }else existing=byParticipant;
    }
  }
  const ext=clean(existing?.external_conversation_id,500)||requestedExt,name=clean(participantName,240)||(existing&&!genericParticipantName(existing.participant_name,p)?existing.participant_name:'')||clean(participantUsername,200)||clean(existing?.participant_name,240)||PLABEL[p]||'Social user',username=clean(participantUsername,200)||existing?.participant_username||'',pid=incomingPid||existing?.participant_id||'',prof=clean(participantProfileUrl,2000)||existing?.participant_profile_url||profileUrl(p,pid,username),avatar=clean(participantAvatarUrl,3000)||existing?.participant_avatar_url||'',f=existing?.folder==='blocked'?'blocked':(clean(folder,50)||existing?.folder||'inbox'),last=clean(lastMessageText,1600)||existing?.last_message_text||'',at=lastMessageAt?iso(lastMessageAt):(existing?.last_message_at||'');
  const row=await env.DB.prepare(`INSERT INTO social_dm_conversations(platform,external_conversation_id,participant_id,participant_name,participant_username,participant_profile_url,participant_avatar_url,folder,last_message_text,last_message_at,unread_count,raw_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,0,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(platform,external_conversation_id) DO UPDATE SET participant_id=CASE WHEN excluded.participant_id<>'' THEN excluded.participant_id ELSE participant_id END,participant_name=CASE WHEN excluded.participant_name<>'' AND (participant_name='' OR lower(participant_name) IN ('social user','facebook','facebook user','instagram','instagram user')) THEN excluded.participant_name WHEN participant_name='' THEN excluded.participant_name ELSE participant_name END,participant_username=CASE WHEN excluded.participant_username<>'' THEN excluded.participant_username ELSE participant_username END,participant_profile_url=CASE WHEN excluded.participant_profile_url<>'' THEN excluded.participant_profile_url ELSE participant_profile_url END,participant_avatar_url=CASE WHEN excluded.participant_avatar_url<>'' THEN excluded.participant_avatar_url ELSE participant_avatar_url END,folder=CASE WHEN excluded.folder<>'' THEN excluded.folder ELSE folder END,last_message_text=CASE WHEN excluded.last_message_at<>'' AND (last_message_at='' OR excluded.last_message_at>=last_message_at) THEN excluded.last_message_text WHEN last_message_text='' THEN excluded.last_message_text ELSE last_message_text END,last_message_at=CASE WHEN excluded.last_message_at<>'' AND (last_message_at='' OR excluded.last_message_at>=last_message_at) THEN excluded.last_message_at ELSE last_message_at END,raw_json=excluded.raw_json,updated_at=CURRENT_TIMESTAMP RETURNING *`)
    .bind(p,ext,pid,name,username,prof,avatar,f,last,at,JSON.stringify(metadataOnly(raw||{}))).first();return row;
}

export async function upsertDmMessage(env,{platform,externalConversationId,externalMessageId,participantId='',participantName='',participantUsername='',participantProfileUrl='',participantAvatarUrl='',folder='inbox',senderId='',senderName='',direction='inbound',messageText='',attachmentUrl='',attachmentType='',sentAt='',raw={}}){
  await ensureSocialDmSchema(env);
  const p=clean(platform,40).toLowerCase(),mid=clean(externalMessageId,700)||`local:${crypto.randomUUID()}`,dir=direction==='outbound'?'outbound':'inbound',text=clean(messageText,5000),att=clean(attachmentUrl,3000),when=iso(sentAt);

  // V16.71: the platform/message unique index is the cheapest place to reject
  // webhook/API echoes. Do it before touching the conversation row, otherwise
  // duplicate refreshes still cause writes and make D1 usage climb rapidly.
  const prior=await env.DB.prepare('SELECT id,conversation_id FROM social_dm_messages WHERE platform=? AND external_message_id=?').bind(p,mid).first().catch(()=>null);
  if(prior?.id)return {inserted:false,id:prior.id,conversationId:prior.conversation_id||0};

  const preview=text||((attachmentType||att)?`[${clean(attachmentType,40)||'attachment'}]`:'Message');
  const conv=await upsertConversation(env,{platform:p,externalConversationId,participantId,participantName,participantUsername,participantProfileUrl,participantAvatarUrl,folder,lastMessageText:preview,lastMessageAt:when,raw});
  if(dir==='inbound'&&conv?.folder==='blocked')return {inserted:false,id:0,conversationId:conv.id,blocked:true};
  const ins=await env.DB.prepare(`INSERT INTO social_dm_messages(conversation_id,platform,external_message_id,sender_id,sender_name,direction,message_text,attachment_url,attachment_type,sent_at,raw_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform,external_message_id) DO NOTHING RETURNING id,conversation_id`).bind(conv.id,p,mid,clean(senderId,300),clean(senderName,240),dir,text,att,clean(attachmentType,60),when,JSON.stringify(metadataOnly(raw||{}))).first();
  if(!ins?.id){const existing=await env.DB.prepare('SELECT id,conversation_id FROM social_dm_messages WHERE platform=? AND external_message_id=?').bind(p,mid).first();return {inserted:false,id:existing?.id||0,conversationId:existing?.conversation_id||conv.id};}
  await env.DB.prepare(`UPDATE social_dm_conversations SET
    last_message_id=?,last_direction=?,
    unread_count=unread_count+?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(mid,dir,dir==='inbound'?1:0,conv.id).run();
  await bumpAdminActivity(env,'dm',{unreadDelta:dir==='inbound'?1:0}).catch(()=>{});
  if(dir==='inbound')try{const leads=await import('./lead-nurturing.js');await leads.captureSocialLead(env,{platform:p,externalId:clean(participantId,300),name:clean(participantName,240),username:clean(participantUsername,200),profileUrl:clean(participantProfileUrl,2000),text:text||preview,conversationId:conv.id});}catch{}
  if(dir==='inbound'&&Date.now()-Date.parse(when)<10*60000&&Date.parse(when)<=Date.now()+60000){try{const push=await import('./notifications-v1-58.js');await push.enqueueNotification(env,{role:'admin',event:'new_message',eventKey:`dm:${p}:${mid}`,title:'New Inbox Message',body:'A new message is ready to review.',url:'/admin/?open=inbox&platform='+encodeURIComponent(p)+'&conversation='+encodeURIComponent(conv.id)});}catch{}}
  return {inserted:true,id:ins.id,conversationId:ins.conversation_id||conv.id};
}

function metaPlatformFromWebhook(settings,entry,messaging,objectHint=''){
  const ig=settings.instagram||{},hint=clean(objectHint||entry?.object,80).toLowerCase(),entryId=clean(entry?.id,300),recipientId=clean(messaging?.recipient?.id,300);
  if(hint==='instagram')return 'instagram';
  if(String(entryId)===String(ig.instagramBusinessId||'')||String(recipientId)===String(ig.instagramBusinessId||''))return 'instagram';
  return 'facebook';
}
async function facebookWebhookProfile(c={},senderId=''){
  if(!c.pageAccessToken||!senderId)return{};const version=clean(c.graphVersion||'v26.0',20),u=new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(senderId)}`);u.searchParams.set('fields','name,first_name,last_name,profile_pic');u.searchParams.set('access_token',c.pageAccessToken);
  try{const d=await remoteJson(await fetchTimed(u.toString(),{},2500),'Facebook Messenger user profile');return {name:clean(d?.name||[d?.first_name,d?.last_name].filter(Boolean).join(' '),240),avatar:clean(d?.profile_pic,3000)};}catch{return{};}
}
export async function ingestMetaDmWebhook(env,entry={},messaging={},objectHint=''){
  const s=await getSocialIntegrationSettings(env),platform=metaPlatformFromWebhook(s,entry,messaging,objectHint),senderId=clean(messaging?.sender?.id,300),message=messaging?.message||{},postback=messaging?.postback||{},quickPayload=clean(message?.quick_reply?.payload||postback?.payload,300),incomingText=clean(message?.text||postback?.title||quickPayload,5000),isEcho=message?.is_echo===true||String(message?.is_echo||'').toLowerCase()==='true';
  const ownerId=platform==='instagram'?clean(s.instagram?.instagramBusinessId,300):clean(s.facebook?.pageId,300);if(isEcho||!senderId||(ownerId&&senderId===ownerId)||(!message.mid&&!incomingText&&!message.attachments&&!quickPayload))return false;
  const a=Array.isArray(message.attachments)?message.attachments[0]:null,attUrl=clean(a?.payload?.url||a?.url,3000),attType=clean(a?.type||'',60),externalId=clean(message.mid||postback.mid,700)||`meta:${platform}:${senderId}:${clean(messaging?.timestamp||Date.now(),40)}:${quickPayload||'event'}`,conversationId=clean(messaging?.conversation?.id||messaging?.thread_id,500)||syntheticConversationId(platform,senderId);
  let participantName=clean(messaging?.sender?.name,240),participantUsername=clean(messaging?.sender?.username,200),participantAvatarUrl='',participantProfileUrl='';if(platform==='facebook'&&genericParticipantName(participantName,'facebook')){const profile=await facebookWebhookProfile(s.facebook||{},senderId);participantName=profile.name||participantName;participantAvatarUrl=profile.avatar||'';participantProfileUrl='';}
  const r=await upsertDmMessage(env,{platform,externalConversationId:conversationId,externalMessageId:externalId,participantId:senderId,participantName,participantUsername,participantProfileUrl:participantProfileUrl||profileUrl(platform,senderId,participantUsername),participantAvatarUrl,senderId,senderName:participantName,direction:'inbound',messageText:incomingText,attachmentUrl:attUrl,attachmentType:attType,sentAt:messaging?.timestamp||Date.now(),raw:{entry,messaging,object:objectHint||'',automationPayload:quickPayload}});
  // V16.65: Webhook and background sync can race. A sync may store an Instagram
  // message a few seconds before Meta delivers the webhook. Run the automation
  // for a live webhook even when the message row already exists; the automation
  // event claim makes this exactly-once and prevents duplicate replies.
  if(r.inserted||eventTimestampIsRecent(messaging?.timestamp,15*60*1000))await runDmAutomationAfterInbound(env,{platform,conversationId:r.conversationId,participantId:senderId,text:incomingText,payload:quickPayload,externalEventId:externalId}).catch(()=>{});
  return !!r.inserted;
}

export async function ingestXDmWebhook(env,x={},raw={}){
  const type=clean(x.type||raw?.type||raw?.event_type,120).toLowerCase();if(!type.includes('dm')&&!type.includes('chat'))return false;const p=raw?.payload||{},senderId=clean(x.authorId||p.sender_id||p.author_id,300);if(!senderId)return false;const username=clean(x.username||p.sender?.username,200),name=clean(x.name||p.sender?.name||username,240),conversationId=clean(p.dm_conversation_id||p.conversation_id,500)||`x:${senderId}`,messageId=clean(p.id||p.dm_event_id||raw?.event_uuid||raw?.id,700)||`x:${crypto.randomUUID()}`,text=clean(x.message||p.text||p.message?.text,5000);
  const r=await upsertDmMessage(env,{platform:'x',externalConversationId:conversationId,externalMessageId:messageId,participantId:senderId,participantName:name,participantUsername:username,participantProfileUrl:profileUrl('x',senderId,username),participantAvatarUrl:clean(p.sender?.profile_image_url,3000),senderId,senderName:name,direction:'inbound',messageText:text,sentAt:p.created_at||Date.now(),raw});if(r.inserted)await runDmAutomationAfterInbound(env,{platform:'x',conversationId:r.conversationId,participantId:senderId,text,externalEventId:messageId}).catch(()=>{});return !!r.inserted;
}

export async function ingestWhatsappDmWebhook(env,payload={}){
  await ensureSocialDmSchema(env);
  let stored=0;
  const ingestCloud=async(rawPayload,source='cloud',fallbackMedia={})=>{
    let count=0;
    for(const entry of Array.isArray(rawPayload?.entry)?rawPayload.entry:[]){
      for(const change of Array.isArray(entry?.changes)?entry.changes:[]){
        const value=change?.value||{},contacts=Array.isArray(value.contacts)?value.contacts:[];
        for(const m of Array.isArray(value.messages)?value.messages:[]){
          const phone=clean(m?.from,100).replace(/\D/g,'');if(!phone)continue;
          const contact=contacts.find(c=>String(c?.wa_id||'')===String(phone))||contacts[0]||{},name=clean(contact?.profile?.name||phone,240);
          const text=clean(m?.text?.body||m?.button?.text||m?.interactive?.button_reply?.title||m?.interactive?.list_reply?.title||m?.image?.caption||m?.video?.caption||m?.document?.caption||'',5000);
          const type=clean(m?.type||fallbackMedia?.type||'',60),nativeUrl=clean(m?.image?.link||m?.video?.link||m?.document?.link||m?.audio?.link||m?.sticker?.link||'',3000),mediaId=clean(m?.image?.id||m?.video?.id||m?.document?.id||m?.audio?.id||m?.sticker?.id||'',700),attUrl=nativeUrl||clean(fallbackMedia?.url,3000),mediaMime=clean(m?.image?.mime_type||m?.video?.mime_type||m?.document?.mime_type||m?.audio?.mime_type||fallbackMedia?.mimeType||'',160),mediaFilename=clean(m?.document?.filename||fallbackMedia?.filename||'',500);
          const payloadId=clean(m?.interactive?.button_reply?.id||m?.interactive?.list_reply?.id||m?.button?.payload,300),interactiveText=clean(m?.interactive?.button_reply?.title||m?.interactive?.list_reply?.title,5000),finalText=text||interactiveText;
          const externalId=clean(m?.id,700)||stableEventId(`whatsapp-${source}`,phone,m?.timestamp,type,finalText,attUrl);
          const r=await upsertDmMessage(env,{platform:'whatsapp',externalConversationId:`whatsapp:${phone}`,externalMessageId:externalId,participantId:phone,participantName:name,participantUsername:phone,participantProfileUrl:profileUrl('whatsapp',phone,''),senderId:phone,senderName:name,direction:'inbound',messageText:finalText,attachmentUrl:attUrl,attachmentType:type&&type!=='text'?type:'',sentAt:m?.timestamp?Number(m.timestamp)*1000:Date.now(),raw:{...m,_uc_source:source,_uc_media_url:attUrl||'',_uc_media_id:mediaId||'',_uc_media_mime:mediaMime||'',_uc_media_filename:mediaFilename||''}});
          if(r.inserted){count++;await runDmAutomationAfterInbound(env,{platform:'whatsapp',conversationId:r.conversationId,participantId:phone,text:finalText,payload:payloadId,externalEventId:externalId}).catch(()=>{});}
        }
      }
    }
    return count;
  };

  // Direct WhatsApp Cloud webhook payload.
  stored+=await ingestCloud(payload,'cloud');

  // Green API webhook payload. Use a stable fallback ID rather than a random ID,
  // so a repeated provider callback cannot create another Inbox bubble.
  if(payload?.senderData){
    const sender=payload.senderData||{},message=payload.messageData||{},chatId=clean(sender?.chatId||'',160),phone=chatId.replace(/@.*$/,'').replace(/\D/g,'');
    if(phone){const name=clean(sender?.senderName||phone,240),text=clean(message?.textMessageData?.textMessage||message?.extendedTextMessageData?.text||message?.caption||'',5000),attUrl=clean(message?.fileMessageData?.downloadUrl||message?.downloadUrl||'',3000),type=clean(message?.typeMessage||'',60),externalId=clean(payload?.idMessage||message?.idMessage,700)||stableEventId('green-wa',phone,payload?.timestamp,type,text,attUrl);if(text||attUrl){const r=await upsertDmMessage(env,{platform:'whatsapp',externalConversationId:`whatsapp:${phone}`,externalMessageId:externalId,participantId:phone,participantName:name,participantUsername:phone,participantProfileUrl:profileUrl('whatsapp',phone,''),senderId:phone,senderName:name,direction:'inbound',messageText:text,attachmentUrl:attUrl,attachmentType:type,sentAt:payload?.timestamp?Number(payload.timestamp)*1000:Date.now(),raw:payload});if(r.inserted){stored++;await runDmAutomationAfterInbound(env,{platform:'whatsapp',conversationId:r.conversationId,participantId:phone,text,externalEventId:externalId}).catch(()=>{});}}}
  }

  if(payload?.contact&&payload?.message){
    const contact=payload.contact||{},message=payload.message||{},nested=payload?.whatsapp_webhook_payload||payload?.whatsappWebhookPayload||{};
    // Instautomate forwards the original WhatsApp webhook. When that original
    // payload contains a real messages[] event it is authoritative: consume it
    // once and do not also store the normalized wrapper copy.
    const wrapperMedia={url:clean(message?.media?.link||message?.media?.url||message?.media?.download_url||message?.media?.downloadUrl||message?.media_url||message?.url||'',3000),mimeType:clean(message?.media?.mime_type||message?.media?.mimeType||'',160),type:clean(message?.media?.type||message?.type||'',60),filename:clean(message?.media?.filename||message?.media?.file_name||message?.filename||message?.file_name||'',500)};
    if(cloudPayloadHasMessages(nested))stored+=await ingestCloud(nested,'instautomate-original',wrapperMedia);
    else{
      const phone=clean(contact?.phone_number||payload?.phone_number||message?.phone_number||'',100).replace(/\D/g,''),hasNewFlag=Object.prototype.hasOwnProperty.call(message,'is_new_message'),isNew=hasNewFlag?boolish(message.is_new_message):true,status=clean(message?.status||payload?.status,80).toLowerCase();
      const text=clean(message?.body||message?.message_body||message?.caption||message?.media?.caption||'',5000),attUrl=wrapperMedia.url,type=wrapperMedia.type;
      // Delivery/read/sent statuses and normalized outbound echoes are audit data,
      // not customer messages. Requiring real content also prevents the blank
      // bubbles visible in the V16.65 screenshot.
      if(phone&&isNew&&!status&&(text||attUrl)){
        const name=clean([contact?.first_name,contact?.last_name].filter(Boolean).join(' ')||contact?.name||phone,240),externalId=clean(message?.whatsapp_message_id||message?.id||message?.message_id||payload?.id,700)||stableEventId('instautomate-wa',phone,message?.created_at||message?.timestamp,text,attUrl,type);
        const r=await upsertDmMessage(env,{platform:'whatsapp',externalConversationId:`whatsapp:${phone}`,externalMessageId:externalId,participantId:phone,participantName:name,participantUsername:phone,participantProfileUrl:profileUrl('whatsapp',phone,''),senderId:phone,senderName:name,direction:'inbound',messageText:text,attachmentUrl:attUrl,attachmentType:type,sentAt:message?.created_at||message?.timestamp||Date.now(),raw:payload});
        if(r.inserted){stored++;await runDmAutomationAfterInbound(env,{platform:'whatsapp',conversationId:r.conversationId,participantId:phone,text,externalEventId:externalId}).catch(()=>{});}
      }
    }
  }
  return stored;
}

function participantFromConversation(c={},ownerIds=[]){const owners=new Set((Array.isArray(ownerIds)?ownerIds:[ownerIds]).filter(Boolean).map(String)),arr=Array.isArray(c?.participants?.data)?c.participants.data:[];return arr.find(x=>!owners.has(String(x?.id||'')))||arr[0]||{};}
function messageAttachment(m={}){const arr=Array.isArray(m?.attachments?.data)?m.attachments.data:Array.isArray(m?.attachments)?m.attachments:[];const a=arr[0]||{};return {url:clean(a?.image_data?.url||a?.video_data?.url||a?.file_url||a?.url||a?.payload?.url,3000),type:clean(a?.mime_type||a?.type||'',60)};}
async function getSyncState(env,platform){
  await ensureSocialDmSchema(env);let row=await env.DB.prepare('SELECT * FROM social_dm_sync_state WHERE platform=?').bind(platform).first();
  if(!row){const start=iso(Date.now()-DM_INITIAL_LOOKBACK_MS);await env.DB.prepare(`INSERT INTO social_dm_sync_state(platform,started_at,last_synced_at,last_success_at,last_error,updated_at) VALUES(?,?,?,'','',CURRENT_TIMESTAMP) ON CONFLICT(platform) DO NOTHING`).bind(platform,start,start).run();row=await env.DB.prepare('SELECT * FROM social_dm_sync_state WHERE platform=?').bind(platform).first();}
  return row||{platform,started_at:iso(Date.now()-DM_INITIAL_LOOKBACK_MS),last_synced_at:iso(Date.now()-DM_INITIAL_LOOKBACK_MS)};
}
async function saveSyncState(env,platform,{lastSyncedAt='',success=false,error=''}){await ensureSocialDmSchema(env);const at=lastSyncedAt||now();await env.DB.prepare(`INSERT INTO social_dm_sync_state(platform,started_at,last_synced_at,last_success_at,last_error,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(platform) DO UPDATE SET last_synced_at=CASE WHEN excluded.last_synced_at<>'' THEN excluded.last_synced_at ELSE last_synced_at END,last_success_at=CASE WHEN excluded.last_success_at<>'' THEN excluded.last_success_at ELSE last_success_at END,last_error=excluded.last_error,updated_at=CURRENT_TIMESTAMP`).bind(platform,at,at,success?at:'',clean(error,1200)).run();}
function metaRoute(platform,c){
  const isIg=platform==='instagram',version=clean(c.graphVersion||'v26.0',20);
  if(isIg&&c.instagramLoginToken)return {platform,isIg,version,host:'graph.instagram.com',token:c.instagramLoginToken,listOwner:c.instagramBusinessId,ownerIds:[c.instagramBusinessId],platformParam:'instagram'};
  return {platform,isIg,version,host:'graph.facebook.com',token:c.pageAccessToken,listOwner:isIg?(c.pageId||c.instagramBusinessId):c.pageId,ownerIds:isIg?[c.instagramBusinessId,c.pageId]:[c.pageId],platformParam:isIg?'instagram':'messenger'};
}
async function metaGet(route,path,params={},label='Meta request'){
  const u=new URL(`https://${route.host}/${route.version}/${path}`);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&String(v)!=='')u.searchParams.set(k,String(v));u.searchParams.set('access_token',route.token);return remoteJson(await fetchTimed(u.toString()),label);
}
async function recentMessageSummaries(route,conversationId,cutoffMs){
  const first=await metaGet(route,encodeURIComponent(conversationId),{fields:`messages.limit(${META_MESSAGE_PAGE_SIZE}){id,created_time}`},`${PLABEL[route.platform]} conversation messages`),out=[];let page=first?.messages||{},pages=0;
  while(page&&pages<META_MAX_MESSAGE_PAGES){const data=Array.isArray(page.data)?page.data:[];let hitOld=false;for(const m of data){const t=Date.parse(m?.created_time||'');if(Number.isFinite(t)&&t<cutoffMs){hitOld=true;continue;}if(m?.id)out.push(m);}pages++;if(hitOld||!page?.paging?.next||pages>=META_MAX_MESSAGE_PAGES)break;page=await remoteJson(await fetchTimed(page.paging.next),`${PLABEL[route.platform]} conversation message page`);}
  return out;
}
async function metaMessageDetail(route,messageId){return metaGet(route,encodeURIComponent(messageId),{fields:'id,message,created_time,from,to,attachments'},`${PLABEL[route.platform]} message`);}

async function existingMessageIds(env,platform,ids=[]){
  const list=[...new Set((ids||[]).map(x=>clean(x,700)).filter(Boolean))].slice(0,150);if(!list.length)return new Set();
  const ph=list.map(()=>'?').join(','),r=await env.DB.prepare(`SELECT external_message_id FROM social_dm_messages WHERE platform=? AND external_message_id IN (${ph})`).bind(platform,...list).all().catch(()=>({results:[]}));
  return new Set((r.results||[]).map(x=>String(x.external_message_id||'')));
}

async function syncMeta(env,platform,c){
  const route=metaRoute(platform,c);if(!route.token||!route.listOwner)return {platform,ok:false,error:'Messaging credentials are incomplete.',conversations:0,messages:0};
  const state=await getSyncState(env,platform),syncStartedAt=now(),baseMs=Date.parse(state.last_synced_at||state.started_at||'')||Date.now()-DM_INITIAL_LOOKBACK_MS,cutoffMs=Math.max(0,baseMs-DM_SYNC_OVERLAP_MS),hadSuccessfulSync=!!state.last_success_at;
  let url=new URL(`https://${route.host}/${route.version}/${encodeURIComponent(route.listOwner)}/conversations`);url.searchParams.set('fields','id,updated_time,folder,participants');url.searchParams.set('limit',String(META_CONVERSATION_PAGE_SIZE));if(route.platformParam)url.searchParams.set('platform',route.platformParam);url.searchParams.set('access_token',route.token);
  let convs=0,msgs=0,pages=0,stop=false,automationChecks=0;
  try{
    while(url&&pages<META_MAX_CONVERSATION_PAGES&&!stop){
      const d=await remoteJson(await fetchTimed(url.toString()),`${PLABEL[platform]} conversations`),rows=Array.isArray(d.data)?d.data:[];pages++;
      for(const rc of rows){
        const updatedMs=Date.parse(rc?.updated_time||'');if(Number.isFinite(updatedMs)&&updatedMs<cutoffMs){stop=true;continue;}
        const part=participantFromConversation(rc,route.ownerIds),pid=clean(part.id,300),username=clean(part.username||part.name,200),pname=clean(part.name||part.username,240),ext=clean(rc.id,500)||`${platform}:${pid||crypto.randomUUID()}`;
        convs++;
        const summaries=await recentMessageSummaries(route,ext,cutoffMs),known=await existingMessageIds(env,platform,summaries.map(x=>x?.id));
        for(const sm of summaries.slice().reverse()){
          const summaryId=clean(sm?.id,700);if(!summaryId||known.has(summaryId))continue;
          const m=await metaMessageDetail(route,summaryId),fromId=clean(m?.from?.id,300),direction=route.ownerIds.filter(Boolean).map(String).includes(String(fromId))?'outbound':'inbound',a=messageAttachment(m),senderName=clean(m?.from?.name||m?.from?.username,240),participantForRow=direction==='inbound'?(pid||fromId):pid,messageText=clean(m.message,5000),eventId=clean(m.id,700)||summaryId,messageTime=m.created_time||sm.created_time||rc.updated_time;
          const r=await upsertDmMessage(env,{platform,externalConversationId:ext,externalMessageId:eventId,participantId:participantForRow,participantName:pname||senderName,participantUsername:username||clean(m?.from?.username,200),participantProfileUrl:profileUrl(platform,participantForRow,username||clean(m?.from?.username,200)),participantAvatarUrl:clean(part.profile_picture_url||part.profile_pic,3000),folder:clean(rc.folder,50)||'inbox',senderId:fromId,senderName,direction,messageText,attachmentUrl:a.url,attachmentType:a.type,sentAt:messageTime,raw:m});
          if(r.inserted){
            msgs++;
            if(direction==='inbound'&&(hadSuccessfulSync||eventTimestampIsRecent(messageTime,10*60*1000))){automationChecks++;await runDmAutomationAfterInbound(env,{platform,conversationId:r.conversationId,participantId:participantForRow,text:messageText,externalEventId:eventId}).catch(()=>{});}
          }
        }
      }
      if(stop||!d?.paging?.next)break;url=new URL(d.paging.next);
    }
    await saveSyncState(env,platform,{lastSyncedAt:syncStartedAt,success:true,error:''});return {platform,ok:true,mode:'incremental',conversations:convs,messages:msgs,automationChecks};
  }catch(e){await saveSyncState(env,platform,{lastSyncedAt:state.last_synced_at||state.started_at||'',success:false,error:e.message}).catch(()=>{});throw e;}
}

export async function refreshRealtimeDmFallback(env,{platform='instagram'}={}){
  platform=clean(platform,40).toLowerCase();
  if(!['instagram','facebook'].includes(platform))return {ok:false,platform,error:'Realtime fallback is available only for Meta messaging platforms.'};
  await ensureSocialDmSchema(env);
  const settings=await getSocialIntegrationSettings(env),c=settings[platform]||{},route=metaRoute(platform,c);
  if(!route.token||!route.listOwner)return {ok:false,platform,error:'Messaging credentials are incomplete.'};
  const cutoffMs=Date.now()-10*60*1000;
  const u=new URL(`https://${route.host}/${route.version}/${encodeURIComponent(route.listOwner)}/conversations`);u.searchParams.set('fields','id,updated_time,folder,participants');u.searchParams.set('limit','5');if(route.platformParam)u.searchParams.set('platform',route.platformParam);u.searchParams.set('access_token',route.token);
  let conversations=0,messages=0,automationChecks=0;
  try{
    const d=await remoteJson(await fetchTimed(u.toString(),{},6500),`${PLABEL[platform]} realtime conversations`),rows=Array.isArray(d.data)?d.data:[];
    for(const rc of rows){
      const updatedMs=Date.parse(rc?.updated_time||'');if(Number.isFinite(updatedMs)&&updatedMs<cutoffMs)continue;
      const part=participantFromConversation(rc,route.ownerIds),pid=clean(part.id,300),username=clean(part.username||part.name,200),pname=clean(part.name||part.username,240),ext=clean(rc.id,500)||`${platform}:${pid||crypto.randomUUID()}`;conversations++;
      const summary=await metaGet(route,encodeURIComponent(ext),{fields:'messages.limit(5){id,created_time}'},`${PLABEL[platform]} realtime messages`),items=Array.isArray(summary?.messages?.data)?summary.messages.data:[];
      const recent=items.filter(sm=>{const eventId=clean(sm?.id,700),ts=Date.parse(sm?.created_time||'');return !!eventId&&(!Number.isFinite(ts)||ts>=cutoffMs);});
      const known=await existingMessageIds(env,platform,recent.map(x=>x.id));
      for(const sm of recent.slice().reverse()){
        const eventId=clean(sm?.id,700);if(!eventId||known.has(eventId))continue;
        const m=await metaMessageDetail(route,eventId),fromId=clean(m?.from?.id,300),direction=route.ownerIds.filter(Boolean).map(String).includes(String(fromId))?'outbound':'inbound',a=messageAttachment(m),senderName=clean(m?.from?.name||m?.from?.username,240),participantForRow=direction==='inbound'?(pid||fromId):pid,messageText=clean(m.message,5000),messageTime=m.created_time||sm.created_time||rc.updated_time;
        const r=await upsertDmMessage(env,{platform,externalConversationId:ext,externalMessageId:eventId,participantId:participantForRow,participantName:pname||senderName,participantUsername:username||clean(m?.from?.username,200),participantProfileUrl:profileUrl(platform,participantForRow,username||clean(m?.from?.username,200)),participantAvatarUrl:clean(part.profile_picture_url||part.profile_pic,3000),folder:clean(rc.folder,50)||'inbox',senderId:fromId,senderName,direction,messageText,attachmentUrl:a.url,attachmentType:a.type,sentAt:messageTime,raw:m});
        if(r.inserted){messages++;if(direction==='inbound'&&eventTimestampIsRecent(messageTime,10*60*1000)){automationChecks++;await runDmAutomationAfterInbound(env,{platform,conversationId:r.conversationId,participantId:participantForRow,text:messageText,externalEventId:eventId}).catch(()=>{});}}
      }
    }
    return {ok:true,platform,mode:'realtime_safety_check',conversations,messages,automationChecks};
  }catch(e){return {ok:false,platform,error:friendlyDmError(platform,e)};}
}

async function syncX(env,c){
  const state=await getSyncState(env,'x'),hadSuccessfulSync=!!state.last_success_at,syncStartedAt=now();
  try{
    const token=await getXUserAccessToken(env),u=new URL('https://api.x.com/2/dm_events');u.searchParams.set('max_results','100');u.searchParams.set('dm_event.fields','id,text,event_type,created_at,sender_id,dm_conversation_id,attachments');u.searchParams.set('expansions','sender_id');u.searchParams.set('user.fields','id,name,username,profile_image_url');
    const d=await remoteJson(await fetchTimed(u,{headers:{authorization:`Bearer ${token}`}}),'X DM events'),users=new Map((d?.includes?.users||[]).map(x=>[String(x.id),x])),items=Array.isArray(d.data)?d.data:[],known=await existingMessageIds(env,'x',items.map(x=>x?.id));let msgs=0,automationChecks=0;const convs=new Set();
    for(const m of items.slice().reverse()){
      const senderId=clean(m.sender_id,300),usr=users.get(String(senderId))||{},conversationId=clean(m.dm_conversation_id,500)||`x:${senderId}`,username=clean(usr.username,200),selfId=clean(c.userId,300),direction=selfId&&senderId===selfId?'outbound':'inbound',att=Array.isArray(m.attachments)?m.attachments[0]:null,eventId=clean(m.id,700),messageText=clean(m.text,5000);convs.add(conversationId);if(!eventId||known.has(eventId))continue;
      const r=await upsertDmMessage(env,{platform:'x',externalConversationId:conversationId,externalMessageId:eventId,participantId:direction==='inbound'?senderId:'',participantName:clean(usr.name||username,240),participantUsername:username,participantProfileUrl:profileUrl('x',senderId,username),participantAvatarUrl:clean(usr.profile_image_url,3000),senderId,senderName:clean(usr.name||username,240),direction,messageText,attachmentUrl:clean(att?.url,3000),attachmentType:clean(att?.type,60),sentAt:m.created_at,raw:m});
      if(r.inserted){msgs++;if(direction==='inbound'&&(hadSuccessfulSync||eventTimestampIsRecent(m.created_at,10*60*1000))){automationChecks++;await runDmAutomationAfterInbound(env,{platform:'x',conversationId:r.conversationId,participantId:senderId,text:messageText,externalEventId:eventId}).catch(()=>{});}}
    }
    await saveSyncState(env,'x',{lastSyncedAt:syncStartedAt,success:true,error:''});return {platform:'x',ok:true,conversations:convs.size,messages:msgs,automationChecks};
  }catch(e){await saveSyncState(env,'x',{lastSyncedAt:state.last_synced_at||state.started_at||'',success:false,error:e.message}).catch(()=>{});throw e;}
}

export async function refreshSocialDms(env){
  await ensureSocialDmSchema(env);const caps=await getSocialDmCapabilities(env),s=await getSocialIntegrationSettings(env),connected=caps.platforms.filter(x=>x.connected);
  const results=await Promise.all(connected.map(async p=>{try{if(p.key==='whatsapp'||p.key==='telegram')return {platform:p.key,ok:true,mode:'webhook',conversations:0,messages:0,message:`${PLABEL[p.key]} messages are synchronized from the configured webhook.`};return p.key==='x'?await syncX(env,s.x||{}):await syncMeta(env,p.key,s[p.key]||{});}catch(e){return {platform:p.key,ok:false,error:friendlyDmError(p.key,e)};}}));
  return {ok:true,results,capabilities:caps};
}

const crmConversationSql=`SELECT c.*,
  il.lead_id contact_lead_id,cl.name contact_name,cl.phone contact_phone,cl.email contact_email
  FROM social_dm_conversations c
  LEFT JOIN lead_identity_links il ON il.rowid=(
    SELECT ix.rowid FROM lead_identity_links ix
    WHERE lower(ix.platform)=lower(c.platform)
      AND (ix.external_id=c.participant_id OR (c.participant_username<>'' AND lower(ix.external_id)=lower(c.participant_username)))
    ORDER BY ix.updated_at DESC,ix.rowid DESC LIMIT 1
  )
  LEFT JOIN contact_leads cl ON cl.id=il.lead_id`;
export async function listDmConversations(env,{limit=120}={}){await ensureSocialDmSchema(env);const r=await env.DB.prepare(`${crmConversationSql} ORDER BY c.last_message_at DESC,c.id DESC LIMIT ?`).bind(Math.max(1,Math.min(300,Number(limit||120)))).all();return r.results||[];}
export async function getDmConversation(env,id,{messageLimit=150}={}){await ensureSocialDmSchema(env);const c=await env.DB.prepare(`${crmConversationSql} WHERE c.id=?`).bind(Number(id||0)).first();if(!c)return null;const limit=Math.max(20,Math.min(300,Number(messageLimit||150))),r=await env.DB.prepare(`SELECT * FROM (SELECT * FROM social_dm_messages WHERE conversation_id=? ORDER BY sent_at DESC,id DESC LIMIT ?) ORDER BY sent_at ASC,id ASC`).bind(c.id,limit).all();return {...c,messages:r.results||[]};}
export async function markDmRead(env,id){await ensureSocialDmSchema(env);const cid=Number(id||0),row=await env.DB.prepare('SELECT unread_count FROM social_dm_conversations WHERE id=?').bind(cid).first();const unread=Math.max(0,Number(row?.unread_count||0));if(unread>0){await env.DB.prepare('UPDATE social_dm_conversations SET unread_count=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND unread_count<>0').bind(cid).run();await bumpAdminActivity(env,'dm',{unreadDelta:-unread}).catch(()=>{});}return getDmConversation(env,id);}
export async function setDmBlocked(env,id,blocked=true){await ensureSocialDmSchema(env);const cid=Number(id||0),row=await env.DB.prepare('SELECT unread_count FROM social_dm_conversations WHERE id=?').bind(cid).first();if(!row)throw new Error('Inbox conversation was not found.');const unread=Math.max(0,Number(row.unread_count||0));await env.DB.prepare('UPDATE social_dm_conversations SET folder=?,unread_count=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(blocked?'blocked':'inbox',cid).run();if(unread)await bumpAdminActivity(env,'dm',{unreadDelta:-unread}).catch(()=>{});return getDmConversation(env,cid);}



function whatsappProvider(payment={}){return clean(payment.otpProvider||payment.whatsappConnectedProvider||'whatsapp_cloud',60).toLowerCase();}
function instautomateConfig(env,payment={}){return {base:clean(env.INSTAUTOMATE_API_BASE_URL||payment.instautomateApiBaseUrl||'https://client.instautomate.com/api',1000).replace(/\/+$/,''),vendor:clean(env.INSTAUTOMATE_VENDOR_UID||payment.instautomateVendorUid,300),token:clean(env.INSTAUTOMATE_API_TOKEN||payment.instautomateToken,3000),from:clean(env.INSTAUTOMATE_FROM_PHONE_NUMBER_ID||payment.instautomateFromPhoneNumberId,300)};}
async function instautomatePost(env,payment,path,body,label='Instautomate WhatsApp request'){
  const c=instautomateConfig(env,payment);if(!c.base||!c.vendor||!c.token)throw new Error('Instautomate API Base URL, Vendor UID or API Access Token is missing.');
  const res=await fetchTimed(`${c.base}/${encodeURIComponent(c.vendor)}/contact/${path}`,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json',accept:'application/json'},body:JSON.stringify({...((c.from&&body?.from_phone_number_id===undefined)?{from_phone_number_id:c.from}:{}),...body})},9000),d=await remoteJson(res,label);
  return {data:d,messageId:clean(d?.message_id||d?.whatsapp_message_id||d?.idMessage||d?.id||d?.data?.message_id||d?.data?.id,700)};
}

function automationPayload(flowId,next='',buttonId=''){return next?`ucflow:${Number(flowId||0)}:${clean(next,80)}`:`ucflow:${Number(flowId||0)}:end:${clean(buttonId,80)}`;}
async function sendAutomationRich(env,conv,flow,step){
  const settings=await getSocialIntegrationSettings(env),buttons=(step.buttons||[]).filter(b=>b.label),text=clean(step.text,4000)||'Choose an option:',platform=conv.platform;let remoteId='';
  if(platform==='facebook'||platform==='instagram'){
    const c=settings[platform]||{},v=clean(c.graphVersion||'v26.0',20),token=platform==='instagram'?(c.instagramLoginToken||c.pageAccessToken):c.pageAccessToken,owner=platform==='instagram'?c.instagramBusinessId:c.pageId,host=platform==='instagram'&&c.instagramLoginToken?'graph.instagram.com':'graph.facebook.com';if(!token||!owner)throw new Error(`${PLABEL[platform]} messaging connection is incomplete.`);
    const rich=['interactive_buttons','image_buttons'].includes(step.type),metaButton=b=>b.action==='url'&&/^https?:\/\//i.test(clean(b.url,3000))?{type:'web_url',url:clean(b.url,3000),title:clean(b.label,20)}:b.action==='phone'&&clean(b.url,80)?{type:'phone_number',payload:clean(b.url,80).replace(/^tel:/i,''),title:clean(b.label,20)}:{type:'postback',title:clean(b.label,20),payload:automationPayload(flow.id,b.next,b.id)},quick=buttons.slice(0,13).map(b=>({content_type:'text',title:clean(b.label,20),payload:automationPayload(flow.id,b.next,b.id)}));
    const message=rich?(step.type==='image_buttons'?{attachment:{type:'template',payload:{template_type:'generic',elements:[{title:clean(text,80)||'Choose an option',subtitle:clean(text,640),image_url:clean(step.mediaUrl,3000),buttons:buttons.slice(0,3).map(metaButton)}]}}}:{attachment:{type:'template',payload:{template_type:'button',text:clean(text,640),buttons:buttons.slice(0,3).map(metaButton)}}}):{text,...(quick.length?{quick_replies:quick}:{})};const body={recipient:{id:conv.participant_id},message};if(platform==='facebook')body.message_type='RESPONSE';
    try{const d=await remoteJson(await fetchTimed(`https://${host}/${v}/${encodeURIComponent(owner)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)},8000),`${PLABEL[platform]} automation reply`);remoteId=clean(d.message_id||d.id,700);}
    catch(e){if(platform!=='instagram'||(!quick.length&&!rich))throw e;const numbered=`${text}\n\n${buttons.map((b,i)=>`${i+1}. ${b.label}${b.action==='url'&&b.url?` — ${b.url}`:''}`).join('\n')}`;const ids=await sendInstagram(c,conv,{text:numbered,attachmentUrl:step.type==='image_buttons'?clean(step.mediaUrl,3000):''});remoteId=clean(ids?.[0],700);}
  }else if(platform==='whatsapp'){
    const payment=await getPaymentSettings(env),provider=whatsappProvider(payment),phone=normalizePhone(conv.participant_id||conv.participant_username||'');if(!phone)throw new Error('This WhatsApp conversation does not contain a valid phone number.');
    if(provider==='whatsapp_cloud'){
      const token=env.WHATSAPP_CLOUD_TOKEN||payment.whatsappCloudToken,phoneId=env.WHATSAPP_PHONE_NUMBER_ID||payment.whatsappPhoneNumberId;if(!token||!phoneId)throw new Error('WhatsApp Cloud API Phone Number ID or access token is missing.');
      let body={messaging_product:'whatsapp',recipient_type:'individual',to:phone};
      if(step.type==='whatsapp_template')body={...body,type:'template',template:{name:clean(step.templateName,240),language:{code:clean(step.templateLanguage||'en',40)}}};
      else if(step.type==='list')body={...body,type:'interactive',interactive:{type:'list',body:{text},action:{button:clean(step.listTitle||'Choose',20),sections:[{title:'Options',rows:buttons.slice(0,10).map(b=>({id:automationPayload(flow.id,b.next,b.id),title:clean(b.label,24)}))}]}}};
      else {const replyButtons=buttons.filter(b=>b.action!=='url'&&b.action!=='phone').slice(0,3),links=buttons.filter(b=>b.action==='url'&&b.url).map(b=>`${b.label}: ${b.url}`).join('\n'),bodyText=clean([text,links].filter(Boolean).join('\n\n'),1024);body={...body,type:'interactive',interactive:{type:'button',...(step.type==='image_buttons'&&step.mediaUrl?{header:{type:'image',image:{link:clean(step.mediaUrl,3000)}}}:{}),body:{text:bodyText},action:{buttons:(replyButtons.length?replyButtons:[{id:'continue',label:'Continue',next:''}]).slice(0,3).map(b=>({type:'reply',reply:{id:automationPayload(flow.id,b.next,b.id),title:clean(b.label,20)}}))}}};}
      const d=await remoteJson(await fetchTimed(`https://graph.facebook.com/v26.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)},9000),'WhatsApp automation reply');remoteId=clean(d?.messages?.[0]?.id||d?.id,700);
    }else if(provider==='instautomate'){
      try{
        if(step.type==='whatsapp_template'){
          const sent=await instautomatePost(env,payment,'send-template-message',{phone_number:phone,template_name:clean(step.templateName,240),template_language:clean(step.templateLanguage||'en',40)},'Instautomate WhatsApp template');remoteId=sent.messageId;
        }else if(step.type==='list'){
          const rows={};buttons.slice(0,10).forEach((b,i)=>{rows[`row_${i+1}`]={id:`row_${i+1}`,row_id:String(i+1),title:clean(b.label,24),description:''};});
          const sent=await instautomatePost(env,payment,'send-interactive-message',{phone_number:phone,interactive_type:'list',body_text:text,list_data:{button_text:clean(step.listTitle||'Choose',20),sections:{section_1:{title:'Options',id:'section_1',rows}}}},'Instautomate WhatsApp list');remoteId=sent.messageId;
        }else{
          const map={};buttons.slice(0,3).forEach((b,i)=>{map[String(i+1)]=clean(b.label,20);});
          const sent=await instautomatePost(env,payment,'send-interactive-message',{phone_number:phone,interactive_type:'button',body_text:text,buttons:map},'Instautomate WhatsApp buttons');remoteId=sent.messageId;
        }
      }catch(e){
        // Some white-label accounts may have text API access before interactive
        // messaging is enabled. Keep the flow usable as numbered choices.
        if(step.type==='whatsapp_template')throw e;const numbered=buttons.length?`${text}\n\n${buttons.map((b,i)=>`${i+1}. ${b.label}`).join('\n')}`:text,sent=await sendWhatsAppText(env,phone,numbered);if(!sent?.ok)throw e;remoteId=clean(sent.messageId,700);
      }
    }else{
      const numbered=buttons.length?`${text}\n\n${buttons.map((b,i)=>`${i+1}. ${b.label}`).join('\n')}`:text,sent=await sendWhatsAppText(env,phone,numbered);if(!sent?.ok)throw new Error(sent?.reason||'WhatsApp automation reply could not be sent.');remoteId=clean(sent.messageId,700);
    }
  }else if(platform==='telegram'){
    const d=await sendTelegram(env,conv.participant_id,{text,attachmentUrl:step.type==='image_buttons'?clean(step.mediaUrl,3000):'',attachmentType:step.type==='image_buttons'?'image':'',buttons:buttons.map(b=>({...b,payload:automationPayload(flow.id,b.next,b.id)}))});remoteId=clean(d?.message_id,700);
  }else{
    const numbered=buttons.length?`${text}\n\n${buttons.map((b,i)=>`${i+1}. ${b.label}`).join('\n')}`:text;const sent=await sendDm(env,conv.id,{text:numbered,attachmentUrl:clean(step.mediaUrl,3000),attachmentType:'image'});const last=[...(sent?.messages||[])].reverse().find(m=>m.direction==='outbound');if(last?.id)await env.DB.prepare('UPDATE social_dm_messages SET raw_json=? WHERE id=?').bind(JSON.stringify({automation:true,flowId:flow.id,stepId:step.id,interactive:{type:step.type,listTitle:clean(step.listTitle||'',120),buttons:buttons.map((b,i)=>({label:clean(b.label,80),value:clean(b.value||String(i+1),160),position:i+1})),provider:platform}}),Number(last.id)).run().catch(()=>{});return getDmConversation(env,conv.id);
  }
  const storedText=step.type==='whatsapp_template'?`[WhatsApp template: ${clean(step.templateName,240)}]`:text;await upsertDmMessage(env,{platform,externalConversationId:conv.external_conversation_id,externalMessageId:remoteId||`automation:${crypto.randomUUID()}`,participantId:conv.participant_id,participantName:conv.participant_name,participantUsername:conv.participant_username,participantProfileUrl:conv.participant_profile_url,participantAvatarUrl:conv.participant_avatar_url,folder:conv.folder,senderId:'automation',senderName:'Automation',direction:'outbound',messageText:storedText,attachmentUrl:step.type==='image_buttons'?clean(step.mediaUrl,3000):'',attachmentType:step.type==='image_buttons'?'image':'',sentAt:now(),raw:{automation:true,flowId:flow.id,stepId:step.id,interactive:{type:step.type,listTitle:clean(step.listTitle||'',120),buttons:buttons.map((b,i)=>({label:clean(b.label,80),value:clean(b.value||String(i+1),160),action:b.action||'reply',url:clean(b.url,3000),position:i+1})),provider:platform}}});return getDmConversation(env,conv.id);
}

async function sendAutomationPayment(env,conv,flow,step){
  if(conv.platform!=='whatsapp')throw new Error('Native in-chat payment is currently supported only for WhatsApp Cloud API flows.');
  const payment=await getPaymentSettings(env),token=env.WHATSAPP_CLOUD_TOKEN||payment.whatsappCloudToken,phoneId=env.WHATSAPP_PHONE_NUMBER_ID||payment.whatsappPhoneNumberId,phone=normalizePhone(conv.participant_id||conv.participant_username||'');
  if(!token||!phoneId||!phone)throw new Error('WhatsApp Cloud API Phone Number ID or access token is missing.');
  const base=Math.max(1,Number(step.paymentAmount||0)||0),taxPct=Math.max(0,Math.min(100,Number(step.paymentTaxPercent||0)||0)),tax=Math.round(base*taxPct)/100,total=Math.round((base+tax)*100)/100,toAmount=v=>({value:Math.round(Number(v||0)*100),offset:100});
  const stamp=String(Date.now()),reference=`uc_${String(flow.id||0)}_${stamp.slice(-10)}`,receipt=`uc_${String(flow.id||0)}_${stamp.slice(-8)}`.slice(0,40),itemName=clean(step.paymentItemName||'Payment',120),retailer=clean(step.paymentRetailerId||'urgent_casting_payment',120),configurationName=clean(step.paymentConfigurationName||'WhatsappPay',120);
  const interactive={type:'order_details',body:{text:clean(step.paymentDescription||step.paymentTitle||'Please complete the payment securely.',1024)},footer:{text:clean(step.paymentFooter||'DropBeat Dance Studio',60)},action:{name:'review_and_pay',parameters:{reference_id:reference,type:'digital-goods',payment_type:'upi',payment_configuration:configurationName,currency:clean(step.paymentCurrency||'INR',8).toUpperCase(),total_amount:toAmount(total),order:{status:'pending',items:[{retailer_id:retailer,name:itemName,amount:toAmount(base),sale_amount:toAmount(base),quantity:1}],subtotal:toAmount(base),tax:toAmount(tax),shipping:toAmount(0),discount:toAmount(0)}}}};
  if(step.paymentImageUrl)interactive.header={type:'image',image:{link:clean(step.paymentImageUrl,3000)}};
  const body={messaging_product:'whatsapp',recipient_type:'individual',to:phone,type:'interactive',interactive};
  const d=await remoteJson(await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}),'WhatsApp Pay automation');
  const remoteId=clean(d?.messages?.[0]?.id||d?.id,700)||`automation-payment:${crypto.randomUUID()}`;
  await upsertDmMessage(env,{platform:conv.platform,externalConversationId:conv.external_conversation_id,externalMessageId:remoteId,participantId:conv.participant_id,participantName:conv.participant_name,participantUsername:conv.participant_username,participantProfileUrl:conv.participant_profile_url,participantAvatarUrl:conv.participant_avatar_url,folder:conv.folder,senderId:'automation',senderName:'Automation',direction:'outbound',messageText:`[WhatsApp Pay: ${itemName} — ${clean(step.paymentCurrency||'INR',8)} ${total.toFixed(2)}]`,attachmentUrl:clean(step.paymentImageUrl,3000),attachmentType:step.paymentImageUrl?'image':'',sentAt:now(),raw:{automation:true,payment:true,flowId:flow.id,stepId:step.id,referenceId:reference,receipt}});
  return getDmConversation(env,conv.id);
}

async function sendAutomationStep(env,conversationId,flow,step){
  const conv=await env.DB.prepare('SELECT * FROM social_dm_conversations WHERE id=?').bind(Number(conversationId||0)).first();if(!conv)return null;
  if(step.type==='payment')return sendAutomationPayment(env,conv,flow,step);
  if(['buttons','interactive_buttons','image_buttons','list','whatsapp_template'].includes(step.type))return sendAutomationRich(env,conv,flow,step);
  const attachmentUrl=step.type==='document'?clean(step.documentUrl,3000):step.type==='image'?clean(step.mediaUrl,3000):'',attachmentType=step.type==='document'?'document':'image';
  const sent=await sendDm(env,conv.id,{text:clean([step.text,step.linkUrl].filter(Boolean).join('\n\n'),4000),attachmentUrl,attachmentType});
  if(step.aiGenerated&&sent?.messages?.length){const last=[...sent.messages].reverse().find(m=>m.direction==='outbound');if(last?.id)await env.DB.prepare('UPDATE social_dm_messages SET raw_json=? WHERE id=?').bind(JSON.stringify({automation:true,ai:true,flowId:flow.id,stepId:step.id,aiIntegrationId:Number(step.aiIntegrationId||0)}),Number(last.id)).run().catch(()=>{});}
  return sent;
}
export async function sendAutomationToAddress(env,{platform='whatsapp',participantId='',participantName='',participantUsername=''}={},flow={},step={}){
  await ensureSocialDmSchema(env);platform=clean(platform,40).toLowerCase();participantId=platform==='whatsapp'?normalizePhone(participantId):clean(participantId,300);if(!participantId)throw new Error('The recipient address is missing.');
  const externalConversationId=platform==='whatsapp'?`whatsapp:${participantId}`:`${platform}:${participantId}`,conv=await upsertConversation(env,{platform,externalConversationId,participantId,participantName:clean(participantName,240)||participantId,participantUsername:clean(participantUsername,200)||participantId,participantProfileUrl:profileUrl(platform,participantId,participantUsername),folder:'inbox',raw:{automation:true,leadNurturing:true}});
  return sendAutomationStep(env,conv.id,flow,step);
}
export async function runDmAutomationAfterInbound(env,{platform='',conversationId=0,participantId='',text='',payload='',externalEventId=''}={}){
  const blocked=await env.DB.prepare('SELECT folder FROM social_dm_conversations WHERE id=?').bind(Number(conversationId||0)).first().catch(()=>null);if(blocked?.folder==='blocked')return false;
  const mod=await import('./social-automations.js'),eventId=clean(externalEventId,700),channel='dm';
  const control=await mod.getAutomationControl(env,platform,participantId).catch(()=>({mode:'automation'}));if(control?.mode==='human')return false;
  // Claim the incoming event before matching/sending. This prevents webhook
  // and background-sync races from replying more than once.
  const claimed=await mod.claimAutomationEvent(env,{channel,platform,externalEventId:eventId,participantId,text});if(!claimed)return false;
  let plan=null;
  try{
    const conv=await env.DB.prepare('SELECT participant_name,participant_username FROM social_dm_conversations WHERE id=?').bind(Number(conversationId||0)).first().catch(()=>null);
    const hr=await env.DB.prepare(`SELECT direction,message_text,attachment_type FROM social_dm_messages WHERE conversation_id=? ORDER BY sent_at DESC,id DESC LIMIT 12`).bind(Number(conversationId||0)).all().catch(()=>({results:[]}));
    const history=(hr.results||[]).slice().reverse().map(m=>({role:m.direction==='outbound'?'assistant':'user',text:clean(m.message_text||((m.attachment_type)?`[${m.attachment_type}]`:''),1800)})).filter(m=>m.text);
    plan=await mod.matchAutomation(env,{channel,platform,participantId,participantName:conv?.participant_name||'',participantUsername:conv?.participant_username||'',text,payload,history});
    if(!plan){await mod.finishAutomationEvent(env,{channel,platform,externalEventId:eventId,status:'no_match'});return false;}
    for(const step of (Array.isArray(plan.steps)?plan.steps:(plan.step?[plan.step]:[]))){if(step&&(step.type==='payment'||clean(step.text||step.templateName||step.mediaUrl||step.documentUrl||'',5000)||(step.buttons||[]).length))await sendAutomationStep(env,conversationId,plan.flow,step);}
    await mod.advanceAutomationSession(env,{platform,participantId,flow:plan.flow,step:plan.step,session:plan.session,ended:!!plan.ended});
    if(plan.handoff)await mod.setAutomationControl(env,platform,participantId,'human').catch(()=>{});
    const status=plan.handoff?'handoff':plan.ended?'ended':'processed';
    await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel,platform,participantId,externalEventId:eventId,matchedText:text,stepId:plan.lastNodeId||plan.step?.id||'',status});
    await mod.finishAutomationEvent(env,{channel,platform,externalEventId:eventId,status,flowId:plan.flow.id});return true;
  }catch(e){
    if(plan)await mod.recordAutomationRun(env,{flowId:plan.flow.id,channel,platform,participantId,externalEventId:eventId,matchedText:text,stepId:plan.lastNodeId||plan.step?.id||'',status:'error',errorMessage:e?.message||String(e)});
    await mod.finishAutomationEvent(env,{channel,platform,externalEventId:eventId,status:'error',flowId:plan?.flow?.id||0,errorMessage:e?.message||String(e)});return false;
  }
}

async function sendFacebook(c,conv,{text='',attachmentUrl=''}){const v=clean(c.graphVersion||'v26.0',20),endpoint=`https://graph.facebook.com/${v}/${encodeURIComponent(c.pageId)}/messages`,ids=[];if(attachmentUrl){const payload={recipient:{id:conv.participant_id},message_type:'RESPONSE',message:{attachment:{type:'image',payload:{url:attachmentUrl,is_reusable:true}}}};const d=await remoteJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${c.pageAccessToken}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'Facebook DM image');ids.push(clean(d.message_id,700));}if(text){const d=await remoteJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${c.pageAccessToken}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:conv.participant_id},message_type:'RESPONSE',message:{text:clean(text,2000)}})}),'Facebook DM reply');ids.push(clean(d.message_id,700));}return ids.filter(Boolean);}
async function sendInstagram(c,conv,{text='',attachmentUrl=''}){const v=clean(c.graphVersion||'v26.0',20),token=c.instagramLoginToken||c.pageAccessToken,host=c.instagramLoginToken?'graph.instagram.com':'graph.facebook.com',endpoint=`https://${host}/${v}/${encodeURIComponent(c.instagramBusinessId)}/messages`,ids=[];if(attachmentUrl){const d=await remoteJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:conv.participant_id},message:{attachment:{type:'image',payload:{url:attachmentUrl}}}})}),'Instagram DM image');ids.push(clean(d.message_id||d.id,700));}if(text){const d=await remoteJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({recipient:{id:conv.participant_id},message:{text:clean(text,2000)}})}),'Instagram DM reply');ids.push(clean(d.message_id||d.id,700));}return ids.filter(Boolean);}

async function sendWhatsapp(env,conv,{text='',attachmentUrl='',attachmentType='image'}={}){
  const payment=await getPaymentSettings(env),provider=whatsappProvider(payment),phone=normalizePhone(conv.participant_id||conv.participant_username||'');if(!phone)throw new Error('This WhatsApp conversation does not contain a valid phone number.');const ids=[];
  if(attachmentUrl){
    if(provider==='instautomate'){
      const mediaType=['image','video','document','audio'].includes(clean(attachmentType,40).toLowerCase())?clean(attachmentType,40).toLowerCase():'image',sent=await instautomatePost(env,payment,'send-media-message',{phone_number:phone,media_type:mediaType,media_url:attachmentUrl,caption:clean(text,1000),file_name:''},'Instautomate WhatsApp media');ids.push(sent.messageId||`instautomate-media:${Date.now()}`);return ids.filter(Boolean);
    }
    if(provider!=='whatsapp_cloud')throw new Error('Image/media replies require WhatsApp Cloud API or Instautomate as the selected connected provider.');
    const token=env.WHATSAPP_CLOUD_TOKEN||payment.whatsappCloudToken,phoneId=env.WHATSAPP_PHONE_NUMBER_ID||payment.whatsappPhoneNumberId;if(!token||!phoneId)throw new Error('WhatsApp Cloud API Phone Number ID or access token is missing.');
    const kind=['image','video','document','audio'].includes(clean(attachmentType,40).toLowerCase())?clean(attachmentType,40).toLowerCase():'image',media={link:attachmentUrl,...(text&&kind!=='audio'?{caption:clean(text,1000)}:{})},body={messaging_product:'whatsapp',recipient_type:'individual',to:phone,type:kind,[kind]:media};const d=await remoteJson(await fetchTimed(`https://graph.facebook.com/v26.0/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)},9000),'WhatsApp media reply');ids.push(clean(d?.messages?.[0]?.id||d?.id,700));return ids.filter(Boolean);
  }
  const sent=await sendWhatsAppText(env,phone,text);if(!sent?.ok)throw new Error(sent?.reason||'WhatsApp message could not be sent.');ids.push(clean(sent.messageId,700)||`whatsapp:${provider}:${Date.now()}`);return ids;
}

export async function sendDm(env,conversationId,{text='',attachmentUrl='',attachmentType='image'}={}){
  await ensureSocialDmSchema(env);
  const conv=await env.DB.prepare('SELECT * FROM social_dm_conversations WHERE id=?').bind(Number(conversationId||0)).first();if(!conv)throw new Error('Choose an Inbox conversation first.');if(conv.folder==='blocked')throw new Error('Unblock this contact before sending a message.');const s=await getSocialIntegrationSettings(env),msg=clean(text,5000),image=clean(attachmentUrl,3000);if(!msg&&!image)throw new Error('Write a message or attach an image.');let ids=[];
  if(conv.platform==='facebook')ids=await sendFacebook(s.facebook||{},conv,{text:/document|pdf|file/i.test(attachmentType)?clean(`${msg}${msg?'\n\n':''}${image}`,2000):msg,attachmentUrl:/document|pdf|file/i.test(attachmentType)?'':image});
  else if(conv.platform==='instagram')ids=await sendInstagram(s.instagram||{},conv,{text:/document|pdf|file/i.test(attachmentType)?clean(`${msg}${msg?'\n\n':''}${image}`,2000):msg,attachmentUrl:/document|pdf|file/i.test(attachmentType)?'':image});
  else if(conv.platform==='whatsapp')ids=await sendWhatsapp(env,conv,{text:msg,attachmentUrl:image,attachmentType});
  else if(conv.platform==='telegram'){const d=await sendTelegram(env,conv.participant_id,{text:msg,attachmentUrl:image,attachmentType});ids=[clean(d?.message_id,700)].filter(Boolean);}
  else if(conv.platform==='x'){
    const token=await getXUserAccessToken(env),payload={};if(msg)payload.text=clean(msg,10000);if(image){const media=await fetchMedia(image,15*1024*1024),mediaId=await xUploadMedia(token,media);payload.attachments=[{media_id:mediaId}];}
    const endpoint=conv.external_conversation_id&&!String(conv.external_conversation_id).startsWith('x:')?`https://api.x.com/2/dm_conversations/${encodeURIComponent(conv.external_conversation_id)}/messages`:`https://api.x.com/2/dm_conversations/with/${encodeURIComponent(conv.participant_id)}/messages`;
    const d=await remoteJson(await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(payload)}),'X DM reply');ids=[clean(d?.data?.dm_event_id||d?.data?.id||d?.id,700)].filter(Boolean);
  }else throw new Error('This platform is not enabled for the unified DM inbox.');
  const base=ids[0]||`local:${crypto.randomUUID()}`;await upsertDmMessage(env,{platform:conv.platform,externalConversationId:conv.external_conversation_id,externalMessageId:base,participantId:conv.participant_id,participantName:conv.participant_name,participantUsername:conv.participant_username,participantProfileUrl:conv.participant_profile_url,participantAvatarUrl:conv.participant_avatar_url,folder:conv.folder,senderId:'admin',senderName:'Admin',direction:'outbound',messageText:msg,attachmentUrl:image,attachmentType:image?(attachmentType||'image'):'',sentAt:now(),raw:{sent:true,remoteIds:ids}});return getDmConversation(env,conv.id);
}
