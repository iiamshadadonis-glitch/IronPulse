import { json, readJson, requireAdmin, normalizePhone, getSocialIntegrationSettings, getPaymentSettings, getSiteSettings } from '../../_lib/utils.js';
import { sendGmailMessage } from '../../_lib/gmail-mailer.js';
import { brandedEmailHtml, brandHomeUrl, emailMoney } from '../../_lib/branded-email.js';
import { getAutomaticEmailTemplates, applyEmailTemplate, automaticEmailTextHtml, automaticEmailSummaryRows } from '../../_lib/automatic-email-templates.js';

const clean=(v,n=10000)=>String(v??'').trim().slice(0,n);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function base64ToBytes(value=''){
  const raw=String(value||'').replace(/^data:application\/pdf;base64,/i,'').replace(/\s+/g,'');
  if(!raw)return new Uint8Array();
  const bin=atob(raw),out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function bytesToBase64Url(bytes){
  let bin='';const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+chunk)));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function utf8Base64Url(text){return bytesToBase64Url(new TextEncoder().encode(String(text||'')));}
function safeFilename(v,type='document'){
  let s=clean(v,180).replace(/[\\/:*?"<>|\r\n]+/g,'-').replace(/\s+/g,' ').trim();
  if(!s)s=`dropbeat-dance-studio-${type}.pdf`;if(!/\.pdf$/i.test(s))s+='.pdf';return s;
}
function stripHtml(v){return String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+\n/g,'\n').replace(/\n\s+/g,'\n').replace(/[ \t]+/g,' ').trim();}
function headerText(v){return String(v||'').replace(/[\r\n]+/g,' ').trim();}

async function sendCloudPdf(payment,to,pdfBytes,filename,caption,graphVersion='v26.0'){
  const token=payment.whatsappCloudToken,phoneId=payment.whatsappPhoneNumberId,version=/^v\d+\.\d+$/.test(String(graphVersion||''))?String(graphVersion):'v26.0';if(!token||!phoneId)throw new Error('WhatsApp Cloud API token or Phone Number ID is not configured.');
  const mediaForm=new FormData();mediaForm.append('messaging_product','whatsapp');mediaForm.append('type','application/pdf');mediaForm.append('file',new Blob([pdfBytes],{type:'application/pdf'}),filename);
  const mediaRes=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/media`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:mediaForm});
  const media=await mediaRes.json().catch(()=>({}));if(!mediaRes.ok||!media.id)throw new Error(media?.error?.message||'WhatsApp could not upload the PDF.');
  const msgRes=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:normalizePhone(to),type:'document',document:{id:media.id,filename,caption:clean(caption,1000)}})});
  const msg=await msgRes.json().catch(()=>({}));if(!msgRes.ok)throw new Error(msg?.error?.message||'WhatsApp could not send the PDF.');
  return {ok:true,provider:'whatsapp_cloud',id:msg?.messages?.[0]?.id||''};
}

async function sendGreenPdf(payment,to,pdfBytes,filename,caption){
  const instance=payment.greenApiInstanceId,token=payment.greenApiToken;if(!instance||!token)throw new Error('GREEN-API Instance ID or token is not configured.');
  const form=new FormData();form.append('chatId',`${normalizePhone(to)}@c.us`);form.append('file',new Blob([pdfBytes],{type:'application/pdf'}),filename);form.append('fileName',filename);form.append('caption',clean(caption,1000));
  const res=await fetch(`https://media.green-api.com/waInstance${encodeURIComponent(instance)}/sendFileByUpload/${encodeURIComponent(token)}`,{method:'POST',body:form});
  const data=await res.json().catch(()=>({}));if(!res.ok||!data.idMessage)throw new Error(data?.message||data?.error||'GREEN-API could not send the PDF.');
  return {ok:true,provider:'green_api',id:data.idMessage||''};
}

async function sendWhatsappPdf(payment,to,pdfBytes,filename,caption,graphVersion){
  if(!normalizePhone(to))throw new Error('The client does not have a WhatsApp number.');
  const provider=String(payment.otpProvider||'whatsapp_cloud').toLowerCase();
  if(provider==='green_api')return sendGreenPdf(payment,to,pdfBytes,filename,caption);
  return sendCloudPdf(payment,to,pdfBytes,filename,caption,graphVersion);
}

async function recordDocumentHistory(env,b,{provider='',providerReference='',status='sent'}={}){
  const leadId=Number(b.leadId||b.lead_id||0)||null;
  if(!leadId)return;
  const type=clean(b.documentType||b.document_type,40)||'invoice';
  const channel=clean(b.channel||b.deliveryChannel||b.delivery_channel,40)||'download';
  const recipient=clean(b.recipient||(channel==='email'?b.toEmail:(channel==='whatsapp'?b.toPhone:'')),260);
  await env.DB.prepare(`INSERT INTO client_document_history(lead_id,document_type,document_number,document_date,period_from,period_to,delivery_channel,recipient,delivery_status,provider,provider_reference,amount_paise,transaction_reference,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
    .bind(leadId,type,clean(b.documentNumber||b.document_number,180),clean(b.documentDate||b.document_date,30),clean(b.periodFrom||b.period_from,30),clean(b.periodTo||b.period_to,30),channel,recipient,clean(status,40)||'sent',clean(provider,80),clean(providerReference,300),Math.max(0,Number(b.amountPaise||b.amount_paise||0)),clean(b.transactionReference||b.transaction_reference,300)).run().catch(()=>{});
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const url=new URL(request.url),leadId=Number(url.searchParams.get('lead_id')||0),type=clean(url.searchParams.get('document_type')||'invoice',40);
    if(!leadId)return json({rows:[]});
    const q=await env.DB.prepare(`SELECT id,lead_id,document_type,document_number,document_date,period_from,period_to,delivery_channel,recipient,delivery_status,provider,provider_reference,amount_paise,transaction_reference,created_at FROM client_document_history WHERE lead_id=? AND document_type=? ORDER BY id DESC LIMIT 250`).bind(leadId,type).all();
    return json({rows:q.results||[]});
  }catch(e){return json({error:e.message||'Could not load document history.'},500);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const b=await readJson(request),action=clean(b.action,40).toLowerCase();
  if(action==='record_document'){
    try{await recordDocumentHistory(env,b,{provider:'browser',status:clean(b.deliveryStatus,40)||'generated'});return json({ok:true,message:'Document activity recorded.'});}
    catch(e){return json({error:e.message||'Could not record document activity.'},400);}
  }
  if(action!=='send_document')return json({error:'Unknown document action.'},400);
  try{
    const channel=clean(b.channel,30).toLowerCase(),type=clean(b.documentType,40)||'statement',filename=safeFilename(b.filename,type),pdfBytes=base64ToBytes(b.pdfBase64);
    if(!pdfBytes.length)throw new Error('The PDF could not be generated. Try again or use Download PDF.');
    if(pdfBytes.length>8*1024*1024)throw new Error('The PDF is larger than 8 MB. Choose a shorter statement period or download it manually.');
    const [social,payment,site,templates]=await Promise.all([getSocialIntegrationSettings(env),getPaymentSettings(env),getSiteSettings(env),getAutomaticEmailTemplates(env)]),brand=clean(site?.siteName,160)||'IronPulse Gym',gmailRaw=social.gmail||{},gmail={...gmailRaw,senderName:(!clean(gmailRaw.senderName,160)||clean(gmailRaw.senderName,160)==='IronPulse Gym')?brand:gmailRaw.senderName};
    const customerName=clean(b.customerName,180)||'Customer',periodFrom=clean(b.periodFrom||b.period_from,40),periodTo=clean(b.periodTo||b.period_to,40),periodLabel=clean(b.periodLabel,120),docNo=clean(b.documentNumber||b.document_number,180),planName=clean(b.planName,300),amountPaise=Math.max(0,Number(b.amountPaise||b.amount_paise||0));
    const template=applyEmailTemplate(templates[type==='invoice'?'invoice':'payment_statement'],{BrandName:brand,ClientName:customerName,InvoiceNumber:docNo||'',StatementPeriod:periodLabel||(periodFrom&&periodTo?`${periodFrom} to ${periodTo}`:'')});
    const subject=(clean(b.subject,240)||template.subject||(type==='invoice'?`${brand} - Invoice ${docNo||''}`:`${brand} - Payment Statement${periodFrom&&periodTo?` - ${periodFrom} to ${periodTo}`:''}`)).replace(/[–—]/g,'-');
    const summaryValues=type==='invoice'?[docNo||'-',planName||'-',amountPaise?emailMoney(amountPaise):'-',clean(b.transactionReference||b.transaction_reference,300)||'-']:[periodLabel||(periodFrom&&periodTo?`${periodFrom} to ${periodTo}`:'Selected period'),clean(b.statementRecordCount,40)||'-',Number(b.paidAmountPaise||0)>0?emailMoney(Number(b.paidAmountPaise||0)):'-',Number(b.pendingAmountPaise||0)>0?emailMoney(Number(b.pendingAmountPaise||0)):'-'];
    let ctaUrl=template.buttonUrl||'/my-orders';if(ctaUrl.startsWith('/'))ctaUrl=`${brandHomeUrl(env)}${ctaUrl}`;
    const brandedHtml=brandedEmailHtml({site,env,title:template.heading||(type==='invoice'?'Your Invoice':'Payment Statement'),eyebrow:template.eyebrow||(type==='invoice'?'Invoice Attached':'Statement Attached'),greetingText:template.greeting,customerName,introHtml:automaticEmailTextHtml(template.intro),summaryTitle:template.summaryTitle,summaryRows:automaticEmailSummaryRows(template,summaryValues),bodyHtml:automaticEmailTextHtml(template.body),noteHtml:automaticEmailTextHtml(template.note),ctaLabel:template.buttonLabel,ctaUrl});
    const caption=clean(b.caption,1000)||`${brand} ${type}. Please find the PDF attached.`;
    let sent,copy={ok:false,skipped:true,reason:'Admin email copy is not configured.'};
    if(channel==='email'){
      sent=await sendGmailMessage(gmail,{to:clean(b.toEmail,240).toLowerCase(),bcc:clean(gmail.adminCopyEmail,240).toLowerCase(),subject,html:brandedHtml,text:stripHtml(brandedHtml),attachments:[{filename,contentType:'application/pdf',bytes:pdfBytes}],fromName:brand});
      copy={ok:!!gmail.adminCopyEmail,via:'bcc',skipped:!gmail.adminCopyEmail,reason:gmail.adminCopyEmail?'':'Admin copy email is not configured in Settings → Social Media → Gmail / Email.'};
    }else if(channel==='whatsapp'){
      const graphVersion=social.facebook?.graphVersion||social.instagram?.graphVersion||'v26.0';sent=await sendWhatsappPdf(payment,clean(b.toPhone,80),pdfBytes,filename,caption,graphVersion);
      if(gmail.enabled&&EMAIL_RE.test(clean(gmail.adminCopyEmail,240))){
        try{copy=await sendGmailMessage(gmail,{to:clean(gmail.adminCopyEmail,240).toLowerCase(),bcc:'',subject:`Admin Copy - ${subject}`,html:brandedHtml,text:stripHtml(brandedHtml),attachments:[{filename,contentType:'application/pdf',bytes:pdfBytes}],fromName:brand});}
        catch(e){copy={ok:false,error:e.message};}
      }else{copy={ok:false,skipped:true,reason:'WhatsApp was sent, but the admin email copy was skipped because Gmail sending and Admin Copy Email are not both configured.'};}
    }else throw new Error('Choose WhatsApp or Gmail.');
    await recordDocumentHistory(env,b,{provider:sent.provider||channel,providerReference:sent.id||'',status:'sent'});
    return json({ok:true,channel,provider:sent.provider||'',message:channel==='email'?'Email sent successfully.':'WhatsApp document sent successfully.',admin_copy:copy});
  }catch(e){return json({error:e.message||'Could not send the document.'},400);}
}
