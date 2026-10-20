import { json, readJson, requireAdmin, getSiteSettings, getSocialIntegrationSettings } from '../../_lib/utils.js';
import { sendGmailMessage, gmailConnectionVerified } from '../../_lib/gmail-mailer.js';
import { brandedEmailHtml, emailMoney, brandHomeUrl } from '../../_lib/branded-email.js';
import { integrationRecovery, diagnoseIntegrationError } from '../../_lib/integration-diagnostics.js';

const clean=(value,max=1200)=>String(value??'').trim().slice(0,max);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function absolutePaymentLink(request,env,value){
  const raw=clean(value,3000);if(!raw)return brandHomeUrl(env);
  try{return new URL(raw,brandHomeUrl(env)||new URL(request.url).origin).toString();}catch{return brandHomeUrl(env);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const recovery=integrationRecovery('gmail');
  try{
    const body=await readJson(request),mode=clean(body.mode,40)==='subscription'?'subscription':'one_time',to=clean(body.toEmail,240).toLowerCase(),subject=clean(body.subject,180);
    if(!EMAIL_RE.test(to))return json({error:'Enter a valid customer email address before sending the Gmail offer.',validationErrors:['customer_email']},400);
    if(!subject)return json({error:'Enter the email subject before sending the Gmail offer.',validationErrors:['email_subject']},400);
    const [site,social]=await Promise.all([getSiteSettings(env),getSocialIntegrationSettings(env)]),gmail=social.gmail||{};
    if(!gmail.enabled||!gmailConnectionVerified(gmail)){
      const message='Gmail is disconnected or its Gmail send permission has not been verified. Open the Gmail / Email integration, reconnect the correct account, approve Gmail sending, and run Test Connection.';
      return json({error:message,recovery,diagnostic:{integration:'gmail',message,reconnectRequired:true,recovery}},409);
    }
    if(clean(body.action,40)==='preflight')return json({ok:true,message:'Gmail is connected and ready to send this branded offer.'});
    const orderId=clean(body.orderId,180),plan=clean(body.planName,300)||(mode==='subscription'?'Custom Subscription':'One-Time Payment'),gateway=clean(body.gateway,80),amount=Number(body.amountPaise||0),setup=Number(body.setupAmountPaise||0),paymentLink=absolutePaymentLink(request,env,body.paymentLink),billingType=clean(body.billingType,80),billingMonths=Math.max(0,Number(body.billingMonths||0));
    const rows=[['Order ID',orderId],['Plan / Offer',plan],['Payment amount',emailMoney(amount)],...(setup>0?[['Amount due today',emailMoney(setup)]]:[]),...(mode==='subscription'&&billingType?[['Subscription type',billingType]]:[]),...(mode==='subscription'&&billingMonths?[['Billing frequency',billingMonths===1?'Every month':`Every ${billingMonths} months`]]:[]),['Payment gateway',gateway?gateway.toUpperCase():'Available at checkout']];
    const html=brandedEmailHtml({site,env,title:mode==='subscription'?'Your Subscription Offer Is Ready':'Your Secure Payment Link Is Ready',eyebrow:mode==='subscription'?'Subscription Offer':'Payment Request',customerName:clean(body.customerName,200),introHtml:'Your secure payment link has been prepared. Please review the details below before continuing.',summaryTitle:mode==='subscription'?'Offer Details':'Payment Details',summaryRows:rows,noteHtml:'This secure link was generated for this payment request. Please verify the details before continuing to payment.',ctaLabel:mode==='subscription'?'View Offer & Continue to Payment':'Continue to Payment',ctaUrl:paymentLink});
    await sendGmailMessage(gmail,{to,bcc:gmail.adminCopyEmail||'',subject,html,text:`${mode==='subscription'?'Your subscription offer':'Your payment request'} is ready. Open this secure link: ${paymentLink}`,fromName:site.siteName||gmail.senderName||'DropBeat Dance Studio'});
    return json({ok:true,message:`The branded ${mode==='subscription'?'subscription offer':'payment request'} was sent to ${to}.`,paymentLink,orderId});
  }catch(error){
    const diagnostic=diagnoseIntegrationError('gmail',error,{action:'send branded payment offer'});
    console.error('send-payment-offer-email.js failed',error);
    return json({error:diagnostic.message||'Gmail could not send the branded offer email.',diagnostic,recovery:diagnostic.recovery||recovery},diagnostic.authenticationInvalid?409:400);
  }
}
