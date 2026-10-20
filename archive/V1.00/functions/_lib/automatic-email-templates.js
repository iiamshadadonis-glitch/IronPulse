const clean=(value,limit=12000)=>String(value??'').trim().slice(0,limit);

const common={greeting:'Hi @ClientName,',buttonUrl:'/my-orders'};

export const AUTOMATIC_EMAIL_DEFAULTS={
  schedule_confirmation:{
    ...common,label:'Schedule Confirmation',description:'Sent immediately after an online class, offline class, demo or webinar is scheduled.',
    subject:'Your meeting is scheduled: @EventTitle',heading:'Your meeting is scheduled',eyebrow:'Meeting confirmation',
    intro:'Your meeting details are ready. Please keep this message for reference.',summaryTitle:'Event Details',
    summaryLabels:['Date & time','Meeting type','Join link','Contact phone','Contact email'],
    body:'Please use the joining link at the scheduled time. If your contact details change, contact the organizer before the event.',
    note:'The calendar event and enabled reminder schedule use the event date and time shown above.',buttonLabel:'Join Meeting',buttonUrl:'@MeetingLink'
  },
  meeting_reminder:{
    ...common,label:'Meeting Reminder / Follow-up',description:'Sent at each enabled reminder time. Positive offsets send before the event; after-event offsets send follow-ups after it ends.',
    subject:'Meeting update: @EventTitle',heading:'Meeting reminder',eyebrow:'Meeting update',
    intro:'This is a @ReminderTiming update for your scheduled meeting. Please review the details below.',summaryTitle:'Event Details',
    summaryLabels:['Date & time','Meeting type','Join link','Contact phone','Contact email'],
    body:'This message is scheduled from the event date and time, not from the event title. @ReminderDirection messages are sent according to the reminder configured by the admin.',
    note:'If this is an after-event follow-up, the message can acknowledge a missed event and share the next step.',buttonLabel:'Join Meeting',buttonUrl:'@MeetingLink'
  },
  invoice:{
    ...common,label:'Invoice Email',description:'Sent when an invoice PDF is emailed from Client Details.',
    subject:'@BrandName - Invoice @InvoiceNumber',heading:'Your Invoice',eyebrow:'Invoice attached',
    intro:'Please find your invoice attached. It records the payment information available for this transaction.',summaryTitle:'Invoice Summary',
    summaryLabels:['Invoice No.','Plan / Offer','Amount','Payment Reference'],
    body:'Thank you for choosing @BrandName. Your invoice PDF is attached for your records.\n\nWe look forward to seeing you move, learn and grow. Check your class schedule and membership details whenever you need them.',
    note:'The PDF attachment is the downloadable copy of this document.',buttonLabel:'Open Member Dashboard'
  },
  payment_statement:{
    ...common,label:'Payment Statement Email',description:'Sent when a payment statement PDF is emailed from Client Details.',
    subject:'@BrandName - Payment Statement @StatementPeriod',heading:'Payment Statement',eyebrow:'Statement attached',
    intro:'Please find your payment statement attached for the selected period.',summaryTitle:'Statement Summary',
    summaryLabels:['Statement Period','Records','Paid Amount','Pending Amount'],
    body:'This statement contains the payment information available for the selected period, including paid and pending entries where applicable.\n\nThank you for choosing @BrandName. Please keep the attached PDF for your records.',
    note:'The PDF attachment is the downloadable copy of this document.',buttonLabel:'Open Member Dashboard'
  },
  payment_success:{
    ...common,label:'Payment Successful Email',description:'Sent after a payment receipt is confirmed and the invoice PDF is generated.',
    subject:'@BrandName - Payment Successful - @OrderId',heading:'Payment Successful',eyebrow:'Payment confirmed',
    intro:'Your payment has been received successfully and the payment details are confirmed.',summaryTitle:'Payment Summary',
    summaryLabels:['Order ID','Ordered from','Plan / Item','Payment Gateway','Payment ID','Amount Paid','Payment Date'],
    body:'Thank you for choosing @BrandName.\n\nYour membership is ready for the next step. Check your class schedule, gym updates and membership details whenever you need them.',
    note:'Your invoice is attached to this email and records only the amount actually received in this payment.',buttonLabel:'Open Member Dashboard'
  },
  payment_failed:{
    ...common,label:'Payment Failed / Retry Email',description:'Sent after a failed payment and reused for enabled payment-recovery reminders.',
    subject:'@BrandName - Payment Failed - Retry Securely - @OrderId',heading:'Payment Failed - You Can Retry',eyebrow:'Payment not completed',
    intro:'We could not confirm your payment. Please check your available balance, bank or payment-app limits before trying again.',summaryTitle:'Payment Details',
    summaryLabels:['Order ID','Plan / Item','Amount','Status'],
    body:'If you already see a debit in your bank or payment app, verify the transaction status with your bank before paying again so you do not pay twice.',
    note:'A successful payment automatically stops all remaining reminders for this payment attempt.',buttonLabel:'Retry Payment',buttonUrl:'@RetryUrl'
  }
};

function normalizeLabels(value,fallback){const input=Array.isArray(value)?value:[];return fallback.map((label,index)=>clean(input[index]||label,120));}
function normalizeButtonUrl(value,fallback){const url=clean(value||fallback,1000);return /^(https:\/\/|\/(?!\/)|@(MeetingLink|RetryUrl)$)/i.test(url)?url:fallback;}

export function normalizeAutomaticEmailTemplates(source={}){
  const output={};
  for(const [key,fallback] of Object.entries(AUTOMATIC_EMAIL_DEFAULTS)){
    const current=source&&typeof source[key]==='object'?source[key]:{};
    output[key]={...fallback,
      subject:clean(current.subject||fallback.subject,300),heading:clean(current.heading||fallback.heading,240),eyebrow:clean(current.eyebrow||fallback.eyebrow,160),
      greeting:clean(current.greeting||fallback.greeting,240),intro:clean(current.intro||current.body||fallback.intro,6000),summaryTitle:clean(current.summaryTitle||fallback.summaryTitle,200),
      summaryLabels:normalizeLabels(current.summaryLabels,fallback.summaryLabels),footerBody:clean(current.footerBody||current.bodyFooter||fallback.body,8000),
      note:clean(current.note||fallback.note,3000),buttonLabel:clean(current.buttonLabel||fallback.buttonLabel,160),buttonUrl:normalizeButtonUrl(current.buttonUrl,fallback.buttonUrl)};
  }
  return output;
}

async function readSettings(env){const row=await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('automatic_email_templates').first();if(!row)return{};try{return JSON.parse(row.value)||{};}catch{return{};}}
async function writeSettings(env,value){await env.DB.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP').bind('automatic_email_templates',JSON.stringify(value)).run();}

export async function getAutomaticEmailTemplates(env){return normalizeAutomaticEmailTemplates(await readSettings(env));}
export async function saveAutomaticEmailTemplates(env,input={}){const next=normalizeAutomaticEmailTemplates(input);await writeSettings(env,{...next,updatedAt:new Date().toISOString()});return next;}
export async function saveAutomaticEmailTemplate(env,key,input={}){if(!Object.prototype.hasOwnProperty.call(AUTOMATIC_EMAIL_DEFAULTS,key))throw new Error('Unknown automatic email template.');const current=await getAutomaticEmailTemplates(env),next=normalizeAutomaticEmailTemplates({...current,[key]:{...current[key],...input}});await writeSettings(env,{...next,updatedAt:new Date().toISOString()});return next[key];}

export function automaticEmailTextHtml(value){const escape=text=>String(text??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));return String(value||'').split(/\n{2,}/).filter(Boolean).map(part=>`<p style="margin:0 0 12px">${escape(part).replace(/\n/g,'<br>')}</p>`).join('');}
export function automaticEmailSummaryRows(template,values=[]){const labels=Array.isArray(template?.summaryLabels)?template.summaryLabels:[];return values.map((value,index)=>[labels[index]||`Detail ${index+1}`,value]);}

export function applyEmailTemplate(template={},variables={}){
  const values={};for(const [key,value] of Object.entries(variables||{}))values[String(key).toLowerCase()]=String(value??'');
  const replace=value=>String(value??'').replace(/@([A-Za-z][A-Za-z0-9]*)/g,(match,key)=>Object.prototype.hasOwnProperty.call(values,key.toLowerCase())?values[key.toLowerCase()]:match);
  const body=replace(template.footerBody||template.body);
  return {...template,subject:replace(template.subject),heading:replace(template.heading),eyebrow:replace(template.eyebrow),greeting:replace(template.greeting),intro:replace(template.intro),summaryTitle:replace(template.summaryTitle),summaryLabels:(template.summaryLabels||[]).map(replace),footerBody:body,body,note:replace(template.note),buttonLabel:replace(template.buttonLabel),buttonUrl:replace(template.buttonUrl)};
}
