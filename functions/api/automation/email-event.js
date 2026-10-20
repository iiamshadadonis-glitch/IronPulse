import { json, readJson, requireAutomation } from '../../_lib/utils.js';
import { enrollEmailAutomationForEvent, processEmailAutomations } from '../../_lib/email-automations.js';

const EVENTS=new Set(['lead_created','lead_updated','abandoned_cart','abandoned_checkout','purchase','purchase_product','repeat_purchase','subscriber_group','webinar','membership_renewal','payment_failed','subscription_failed','subscription_cancelled','inactive','exact_date','birthday']);

export async function onRequestPost({request,env}){
  try{await requireAutomation(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const body=await readJson(request),leadId=Math.max(0,Number(body.leadId||body.lead_id||0)),eventType=String(body.eventType||body.event_type||'').trim();
    if(!leadId)throw new Error('leadId is required.');
    if(!EVENTS.has(eventType))throw new Error('A supported eventType is required.');
    const context=body.context&&typeof body.context==='object'?body.context:{};
    const enrollment=await enrollEmailAutomationForEvent(env,{leadId,eventType,context});
    const processing=await processEmailAutomations(env,{leadId,limit:30});
    return json({ok:true,enrollment,processing});
  }catch(e){return json({error:e.message||'Email automation event could not be processed.'},400);}
}
