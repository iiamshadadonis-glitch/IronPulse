import { hmacHex } from './utils.js';
import { brandHomeUrl } from './branded-email.js';

const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const secret=env=>clean(env.AUTOMATION_CHECKOUT_SECRET||env.PAYMENT_RETRY_SECRET||env.AUTOMATION_API_KEY||env.RAZORPAY_KEY_SECRET||env.STRIPE_WEBHOOK_SECRET||env.ADMIN_LOGIN_PASSWORD,5000);
const secureEqual=(a,b)=>{a=String(a||'');b=String(b||'');if(!a||a.length!==b.length)return false;let out=0;for(let i=0;i<a.length;i++)out|=a.charCodeAt(i)^b.charCodeAt(i);return out===0;};

async function signature(env,leadId,productId,expires){const key=secret(env);return key?hmacHex(key,`lead-offer|${Number(leadId)}|${Number(productId)}|${Number(expires)}`):'';}

export async function buildAutomationCheckoutUrl(env,{leadId=0,productId=0,days=10,fallbackUrl=''}={}){
  leadId=Math.max(0,Number(leadId||0));productId=Math.max(0,Number(productId||0));
  if(!leadId||!productId)return `${brandHomeUrl(env)}/checkout`;
  const expires=Math.floor(Date.now()/1000)+Math.max(1,Math.min(14,Number(days||10)))*86400,token=await signature(env,leadId,productId,expires);
  if(!token)return clean(fallbackUrl,3000)||`${brandHomeUrl(env)}/checkout`;
  return `${brandHomeUrl(env)}/checkout?automation_lead=${leadId}&automation_offer=${productId}&automation_expires=${expires}&automation_token=${encodeURIComponent(token)}`;
}

export async function verifyAutomationCheckoutToken(env,{leadId=0,productId=0,expires=0,token=''}={}){
  leadId=Math.max(0,Number(leadId||0));productId=Math.max(0,Number(productId||0));expires=Number(expires||0);
  const now=Math.floor(Date.now()/1000);if(!leadId||!productId||expires<now||expires>now+15*86400)return false;
  return secureEqual(await signature(env,leadId,productId,expires),token);
}
