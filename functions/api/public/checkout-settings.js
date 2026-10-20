import { json, getCheckoutSettings, getSiteSettings } from '../../_lib/utils.js';
export async function onRequestGet({env}){
  const [s,site]=await Promise.all([getCheckoutSettings(env),getSiteSettings(env)]);
  return json({settings:{
    paymentMode:s.paymentMode||'subscription',
    subscriptionYears:Number(s.subscriptionYears||21),
    yearlyEnabled:!!s.yearlyEnabled,
    productCouponsEnabled:!!s.productCouponsEnabled,
    overallCouponsEnabled:!!s.overallCouponsEnabled,
    couponsEnabled:!!(s.productCouponsEnabled || s.overallCouponsEnabled),
    yearlyOfferMonths:Number(s.yearlyOfferMonths||10),
    taxes:site.taxes||{}
  }},200,{'cache-control':'no-store'});
}
