import { json, getPaymentSettings } from '../../_lib/utils.js';
import { mergeLeadSubmission } from '../../_lib/lead-profile.js';
import { ingestWhatsappDmWebhook, providerMetadataOnly } from '../../_lib/social-dms.js';

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const settings = await getPaymentSettings(env);
  const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || settings.whatsappWebhookVerifyToken || '';
  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) return new Response(challenge || '', { status: 200 });
  return new Response('Forbidden', { status: 403 });
}

async function captureCloudApiLeads(env,payload){
  let captured=0;
  for(const entry of Array.isArray(payload?.entry)?payload.entry:[]){
    for(const change of Array.isArray(entry?.changes)?entry.changes:[]){
      const value=change?.value||{},contacts=Array.isArray(value.contacts)?value.contacts:[];
      for(const m of Array.isArray(value.messages)?value.messages:[]){
        const phone=clean(m?.from,80);if(!phone)continue;
        const contact=contacts.find(c=>String(c?.wa_id||'')===String(phone))||contacts[0]||{};
        const name=clean(contact?.profile?.name||'WhatsApp Customer',160);
        const text=clean(m?.text?.body||m?.button?.text||m?.interactive?.button_reply?.title||m?.interactive?.list_reply?.title||'',5000);
        await mergeLeadSubmission(env,{name,phone,message:text||`Incoming WhatsApp ${clean(m?.type,80)||'message'}.`,source_detail:'WhatsApp Cloud API • Incoming message',interest_level:'Warm',assigned_to:'Admin'},{submissionType:'social_lead',source:'whatsapp',sourceDetail:'WhatsApp Cloud API • Incoming message'}).catch(()=>{});
        captured++;
      }
    }
  }
  return captured;
}

async function captureGreenApiLead(env,payload){
  const sender=payload?.senderData||{},message=payload?.messageData||{};
  const chatId=clean(sender?.chatId||'',160),phone=chatId.replace(/@.*$/,'').replace(/\D/g,'');
  if(!phone)return 0;
  const text=clean(message?.textMessageData?.textMessage||message?.extendedTextMessageData?.text||message?.typeMessage||'',5000);
  await mergeLeadSubmission(env,{name:clean(sender?.senderName||'WhatsApp Customer',160),phone,message:text||'Incoming WhatsApp message.',source_detail:'GAPI • Incoming WhatsApp message',interest_level:'Warm',assigned_to:'Admin'},{submissionType:'social_lead',source:'whatsapp',sourceDetail:'GAPI • Incoming WhatsApp message'}).catch(()=>{});
  return 1;
}

async function captureInstautomateLead(env,payload){
  const contact=payload?.contact||{},message=payload?.message||{};
  const phone=clean(contact?.phone_number||payload?.phone_number||message?.phone_number||'',100).replace(/\D/g,'');
  if(!phone)return 0;
  const hasNewFlag=Object.prototype.hasOwnProperty.call(message,'is_new_message'),isNew=hasNewFlag?(message.is_new_message===true||message.is_new_message===1||String(message.is_new_message).toLowerCase()==='true'):true,status=clean(message?.status||payload?.status,80).toLowerCase();
  const text=clean(message?.body||message?.message_body||message?.caption||message?.media?.caption||'',5000),media=clean(message?.media?.link||message?.media?.url||message?.media_url||'',3000);
  // Instautomate forwards status/echo callbacks using the same wrapper shape.
  // Only a genuine new customer message becomes a CRM lead.
  if(!isNew||status||(!text&&!media))return 0;
  const name=clean([contact?.first_name,contact?.last_name].filter(Boolean).join(' ')||contact?.name||'WhatsApp Customer',160);
  await mergeLeadSubmission(env,{name,phone,email:clean(contact?.email||'',240),message:text||`Incoming WhatsApp ${clean(message?.media?.type,80)||'media'} message.`,source_detail:'Instautomate • Incoming WhatsApp message',interest_level:'Warm',assigned_to:'Admin'},{submissionType:'social_lead',source:'whatsapp',sourceDetail:'Instautomate • Incoming WhatsApp message'}).catch(()=>{});
  return 1;
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(()=>({}));
  // Preserve the existing webhook audit record exactly as before.
  await env.DB.prepare('INSERT INTO payment_events(order_id,gateway,event_type,payload_json,verified) VALUES(?,?,?,?,?)').bind('', 'whatsapp', 'webhook', JSON.stringify(providerMetadataOnly(payload)), 1).run();
  // Additive CRM intake: only inbound message objects become enquiries. Delivery
  // statuses and other webhook events remain audit-only and do not create leads.
  let captured=await captureCloudApiLeads(env,payload).catch(()=>0);
  // Instautomate's normalized webhook includes the original WhatsApp webhook.
  // Prefer that original messages[] payload for CRM intake when present.
  const nested=payload?.whatsapp_webhook_payload||payload?.whatsappWebhookPayload||{};
  if(!captured&&nested?.entry)captured+=await captureCloudApiLeads(env,nested).catch(()=>0);
  if(!captured&&payload?.senderData)captured+=await captureGreenApiLead(env,payload).catch(()=>0);
  if(!captured&&payload?.contact&&payload?.message)captured+=await captureInstautomateLead(env,payload).catch(()=>0);
  const inboxStored=await ingestWhatsappDmWebhook(env,payload).catch(()=>0);
  return json({ ok: true, leads_captured: captured, inbox_messages_stored: inboxStored });
}
