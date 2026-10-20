const clean=(value,limit=500)=>String(value??'').trim().slice(0,limit);

function enabled(value){
  return value===true||value===1||String(value??'').toLowerCase()==='true'||String(value??'')==='1';
}

// Cloudflare supplies CF-Connecting-IP at the edge. Never accept an IP address
// from JSON/form input: a visitor could forge it. The first-party visitor/device
// identifier and edge network context are operational records used for security,
// fraud prevention and visit continuity. Consent flags remain separate and are
// the only authority for optional analytics/advertising tags or audience exports.
export function contactContext(request,body={}){
  const analyticsConsent=enabled(body.analytics_consent);
  const adsConsent=enabled(body.ads_consent);
  const visitorId=clean(body.visitor_id,80);
  // Cloudflare supplies this location at the edge. It is an approximate network
  // location, not GPS, and can be blank for local/preview traffic.
  const cf=request?.cf||{};
  return {
    visitor_id:visitorId,
    device_id:visitorId,
    ip_address:clean(request?.headers?.get('CF-Connecting-IP'),80),
    city:clean(cf.city||request?.headers?.get('CF-IPCity'),120),
    region_code:clean(cf.regionCode||request?.headers?.get('CF-Region-Code'),24).toUpperCase(),
    country_code:clean(cf.country||request?.headers?.get('CF-IPCountry'),12).toUpperCase(),
    analytics_consent:analyticsConsent?1:0,
    ads_consent:adsConsent?1:0
  };
}

export function withContactContext(request,body={}){
  return {...body,...contactContext(request,body)};
}
