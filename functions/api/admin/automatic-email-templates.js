import { json, readJson, requireAdmin, getSiteSettings } from '../../_lib/utils.js';
import { brandedEmailHtml, brandHomeUrl } from '../../_lib/branded-email.js';
import { AUTOMATIC_EMAIL_DEFAULTS, getAutomaticEmailTemplates, saveAutomaticEmailTemplates, saveAutomaticEmailTemplate, normalizeAutomaticEmailTemplates, applyEmailTemplate } from '../../_lib/automatic-email-templates.js';

const esc=value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const paragraphs=value=>String(value||'').split(/\n{2,}/).map(part=>`<p style="margin:0 0 12px">${esc(part).replace(/\n/g,'<br>')}</p>`).join('');

function previewModel(key){
  const models={
    schedule_confirmation:{values:{EventTitle:'Schedule Meeting',EventDate:'16 September 2026, 3:00 pm',MeetingLink:'https://meet.google.com/example',ReminderTiming:'before-event',ReminderDirection:'Before-event'},rows:['16 September 2026, 3:00 pm','Online class','https://meet.google.com/example','+91 90000 00000','customer@example.com']},
    meeting_reminder:{values:{EventTitle:'Schedule Meeting',EventDate:'16 September 2026, 3:00 pm',MeetingLink:'https://meet.google.com/example',ReminderTiming:'one-hour before-event',ReminderDirection:'Before-event'},rows:['16 September 2026, 3:00 pm','Demo / webinar','https://meet.google.com/example','+91 90000 00000','customer@example.com']},
    invoice:{values:{InvoiceNumber:'INV-20260916-DEMO'},rows:['INV-20260916-DEMO','Example Plan','₹1,250.00','pay_example123']},
    payment_statement:{values:{StatementPeriod:'1 September 2026 to 16 September 2026'},rows:['1 September 2026 to 16 September 2026','8','₹5,250.00','₹750.00']},
    payment_success:{values:{OrderId:'UC-20260916-DEMO'},rows:['UC-20260916-DEMO','IronPulse Gym','Example Plan','Razorpay','pay_example123','₹1,250.00','16 September 2026']},
    payment_failed:{values:{OrderId:'UC-20260916-DEMO',RetryUrl:'https://ironpulse-gym.pages.dev/my-orders?retry=example'},rows:['UC-20260916-DEMO','Example Plan','₹1,250.00','Payment not completed']}
  };
  return models[key]||{values:{},rows:[]};
}

async function preview(env,key,input){
  if(!Object.prototype.hasOwnProperty.call(AUTOMATIC_EMAIL_DEFAULTS,key))throw new Error('Unknown automatic email template.');
  const site=await getSiteSettings(env),brand=site.siteName||'IronPulse Gym',model=previewModel(key);
  const normalized=normalizeAutomaticEmailTemplates({[key]:input})[key];
  const rendered=applyEmailTemplate(normalized,{BrandName:brand,ClientName:'Example Customer',...model.values});
  const labels=rendered.summaryLabels||[],summaryRows=model.rows.map((value,index)=>[labels[index]||`Detail ${index+1}`,value]);
  let ctaUrl=rendered.buttonUrl||'';if(ctaUrl.startsWith('/'))ctaUrl=`${brandHomeUrl(env)}${ctaUrl}`;
  const html=brandedEmailHtml({site,env,title:rendered.heading,eyebrow:rendered.eyebrow,greetingText:rendered.greeting,introHtml:paragraphs(rendered.intro),summaryTitle:rendered.summaryTitle,summaryRows,bodyHtml:paragraphs(rendered.body),noteHtml:esc(rendered.note),ctaLabel:rendered.buttonLabel,ctaUrl});
  return {html,subject:rendered.subject};
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  try{return json({ok:true,templates:await getAutomaticEmailTemplates(env),defaults:AUTOMATIC_EMAIL_DEFAULTS});}
  catch(error){return json({error:error.message||'Automatic email templates could not be loaded.'},500);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401);}
  try{
    const body=await readJson(request),action=String(body.action||'').toLowerCase();
    if(action==='preview'){const result=await preview(env,String(body.key||''),body.template||{});return json({ok:true,...result});}
    if(action==='save_one'){const template=await saveAutomaticEmailTemplate(env,String(body.key||''),body.template||{});return json({ok:true,template,message:'Email template saved.'});}
    return json({ok:true,templates:await saveAutomaticEmailTemplates(env,body.templates||body),message:'Automatic email templates saved.'});
  }catch(error){return json({error:error.message||'Automatic email templates could not be saved.'},400);}
}
