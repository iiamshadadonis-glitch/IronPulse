import { json, getPaymentSettings, getSocialIntegrationSettings } from '../../_lib/utils.js';
import { getOutboundEmailSettings } from '../../_lib/outbound-email.js';
import { gmailConnectionVerified } from '../../_lib/gmail-mailer.js';

export async function onRequestGet({ env }) {
  const [payment, social, outbound] = await Promise.all([
    getPaymentSettings(env).catch(()=>({})),
    getSocialIntegrationSettings(env).catch(()=>({ gmail:{} })),
    getOutboundEmailSettings(env).catch(()=>({ primaryProvider:'gmail' }))
  ]);
  const gmail = social?.gmail || {};
  const fallbackKeys=[outbound.primaryProvider,'ses','lambda','mailchimp','mailersend','company'].filter((x,i,a)=>x&&x!=='gmail'&&a.indexOf(x)===i);
  const fallbackProvider=fallbackKeys.find(key=>outbound[key]?.enabled&&outbound[key]?.otpEnabled)||'';
  const verifiedGmail = gmailConnectionVerified(gmail);
  const emailEnabled = !!(gmail.otpEnabled&&verifiedGmail)||!!fallbackProvider;
  const whatsappEnabled = !!payment.whatsappOtpEnabled && !emailEnabled;
  let channel = 'none';
  if (emailEnabled) channel = 'email';
  else if (whatsappEnabled) channel = 'whatsapp';
  return json({
    ok:true,
    channel,
    emailEnabled,
    whatsappEnabled,
    whatsappProvider: payment.otpProvider || 'whatsapp_cloud',
    gmailConnected: verifiedGmail,
    emailProvider: gmail.otpEnabled&&verifiedGmail?'gmail':fallbackProvider
  }, 200, { 'cache-control':'no-store' });
}
