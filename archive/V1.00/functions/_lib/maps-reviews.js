import { getSetting, setSetting } from './utils.js';

export const DEFAULT_MAPS_REVIEWS = {
  contactMap: {
    enabled: false,
    embedApiKey: '',
    locations: []
  },
  reviews: {
    enabled: false,
    source: 'places',
    placeId: '',
    mapsUrl: '',
    placesApiKey: '',
    minimumRating: 5,
    fillWithFourStar: true,
    refreshMinutes: 30,
    businessClientId: '',
    businessClientSecret: '',
    businessRefreshToken: '',
    businessAccountId: '',
    businessLocationId: ''
  }
};

const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);
const bool=v=>v===true||v==='true'||v==='on'||v===1||v==='1';

export async function getMapsReviewsSettings(env){
  const raw=await getSetting(env,'maps_reviews_settings',DEFAULT_MAPS_REVIEWS)||{};
  const c=raw.contactMap||{},r=raw.reviews||{};
  return {
    contactMap:{
      ...DEFAULT_MAPS_REVIEWS.contactMap,...c,
      enabled:!!c.enabled,
      locations:Array.isArray(c.locations)?c.locations:[]
    },
    reviews:{
      ...DEFAULT_MAPS_REVIEWS.reviews,...r,
      enabled:!!r.enabled,
      source:['places','business_profile'].includes(String(r.source||'').toLowerCase())?String(r.source).toLowerCase():'places',
      minimumRating:Math.max(1,Math.min(5,Number(r.minimumRating||5))),
      fillWithFourStar:r.fillWithFourStar===undefined?true:!!r.fillWithFourStar,
      refreshMinutes:Math.max(5,Math.min(1440,Number(r.refreshMinutes||30)))
    }
  };
}

export async function saveMapsReviewsSettings(env,next){
  await setSetting(env,'maps_reviews_settings',next);
  return next;
}

function allowedHttps(url){
  try{const u=new URL(url);return u.protocol==='https:'?u.toString():'';}catch(_){return '';}
}
export function normalizeMapsUrl(url){
  const v=allowedHttps(clean(url,3000));if(!v)return'';
  try{const u=new URL(v);const host=u.hostname.toLowerCase();if(host==='maps.app.goo.gl'||host==='goo.gl'||host.endsWith('google.com')||host.endsWith('google.co.in'))return u.toString();}catch(_){}
  return v;
}
export function normalizeEmbedUrl(value){
  let v=clean(value,8000);const m=v.match(/src=["']([^"']+)["']/i);if(m)v=m[1];v=v.replace(/&amp;/g,'&');
  const safe=allowedHttps(v);if(!safe)return'';
  try{const u=new URL(safe);const h=u.hostname.toLowerCase();if((h==='www.google.com'||h==='maps.google.com')&&u.pathname.startsWith('/maps/embed'))return u.toString();}catch(_){}
  return'';
}
export function publicLocations(settings){
  const apiKey=clean(settings?.contactMap?.embedApiKey,2000);
  return (settings?.contactMap?.locations||[]).filter(x=>x&&x.enabled!==false).map((x,i)=>{
    const label=clean(x.label,180)||`Location ${i+1}`,address=clean(x.address,800),placeId=clean(x.placeId,300);
    let embedSrc=normalizeEmbedUrl(x.embedUrl);
    if(!embedSrc&&apiKey&&(placeId||address)){
      const q=placeId?`place_id:${placeId}`:address;
      embedSrc=`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}`;
    }
    let directionsUrl=normalizeMapsUrl(x.mapsUrl);
    if(!directionsUrl&&(placeId||address)){
      const base='https://www.google.com/maps/dir/?api=1';
      directionsUrl=placeId?`${base}&destination_place_id=${encodeURIComponent(placeId)}`:`${base}&destination=${encodeURIComponent(address)}`;
    }
    return {id:clean(x.id,100)||String(i+1),label,address,embedSrc,directionsUrl};
  }).filter(x=>x.embedSrc||x.directionsUrl);
}

function starsToNumber(v){
  const map={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};return map[String(v||'').toUpperCase()]||Number(v||0)||0;
}
function chooseReviews(rows,fillWithFour=true){
  const list=(rows||[]).filter(x=>Number(x.rating||0)>=4).sort((a,b)=>String(b.publishTime||'').localeCompare(String(a.publishTime||'')));
  const five=list.filter(x=>Number(x.rating)===5),four=list.filter(x=>Number(x.rating)===4);
  return [...five,...(fillWithFour?four:[])].slice(0,4);
}

async function fetchPlacesReviews(r){
  if(!r.placeId||!r.placesApiKey)throw new Error('Places API Key and Place ID are required for Places review mode.');
  const res=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(r.placeId)}`,{
    headers:{'X-Goog-Api-Key':r.placesApiKey,'X-Goog-FieldMask':'displayName,rating,userRatingCount,reviews,googleMapsUri'}
  });
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error?.message||`Google Places returned HTTP ${res.status}.`);
  const rows=(data.reviews||[]).map(x=>({
    id:clean(x.name||x.publishTime||Math.random(),300),rating:Number(x.rating||0),text:clean(x.text?.text||x.originalText?.text||'',5000),
    author:clean(x.authorAttribution?.displayName||'Google reviewer',300),authorUrl:allowedHttps(x.authorAttribution?.uri||''),photoUrl:allowedHttps(x.authorAttribution?.photoUri||''),
    publishTime:clean(x.publishTime||'',100),relativeTime:clean(x.relativePublishTimeDescription||'',200),source:'Google'
  }));
  return {source:'places',businessName:clean(data.displayName?.text||'',300),averageRating:Number(data.rating||0),totalReviewCount:Number(data.userRatingCount||0),mapsUrl:normalizeMapsUrl(r.mapsUrl||data.googleMapsUri||''),reviews:chooseReviews(rows,r.fillWithFourStar)};
}

async function googleAccessToken(r){
  if(!r.businessClientId||!r.businessClientSecret||!r.businessRefreshToken)throw new Error('Google Business Profile OAuth Client ID, Client Secret and Refresh Token are required.');
  const body=new URLSearchParams({client_id:r.businessClientId,client_secret:r.businessClientSecret,refresh_token:r.businessRefreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data=await res.json().catch(()=>({}));if(!res.ok||!data.access_token)throw new Error(data.error_description||data.error||'Could not refresh Google Business Profile access token.');
  return data.access_token;
}
async function fetchBusinessProfileReviews(r){
  if(!r.businessAccountId||!r.businessLocationId)throw new Error('Business Profile Account ID and Location ID are required.');
  const token=await googleAccessToken(r);
  const parent=`accounts/${encodeURIComponent(r.businessAccountId)}/locations/${encodeURIComponent(r.businessLocationId)}`;
  const res=await fetch(`https://mybusiness.googleapis.com/v4/${parent}/reviews?pageSize=50&orderBy=${encodeURIComponent('updateTime desc')}`,{headers:{authorization:`Bearer ${token}`}});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error?.message||`Google Business Profile returned HTTP ${res.status}.`);
  const rows=(data.reviews||[]).map(x=>({
    id:clean(x.reviewId||x.name||x.updateTime||Math.random(),300),rating:starsToNumber(x.starRating),text:clean(x.comment||'',5000),
    author:clean(x.reviewer?.displayName||'Google reviewer',300),authorUrl:'',photoUrl:allowedHttps(x.reviewer?.profilePhotoUrl||''),
    publishTime:clean(x.updateTime||x.createTime||'',100),relativeTime:'',source:'Google'
  }));
  return {source:'business_profile',businessName:'',averageRating:Number(data.averageRating||0),totalReviewCount:Number(data.totalReviewCount||0),mapsUrl:normalizeMapsUrl(r.mapsUrl||''),reviews:chooseReviews(rows,r.fillWithFourStar)};
}

export async function fetchAndCacheReviews(env,settings){
  const r=settings.reviews||{};if(!r.enabled)return {enabled:false,reviews:[]};
  const data=r.source==='business_profile'?await fetchBusinessProfileReviews(r):await fetchPlacesReviews(r);
  await env.DB.prepare(`INSERT INTO google_review_cache(cache_key,source,reviews_json,business_name,average_rating,total_review_count,maps_url,fetched_at,updated_at) VALUES('main',?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(cache_key) DO UPDATE SET source=excluded.source,reviews_json=excluded.reviews_json,business_name=excluded.business_name,average_rating=excluded.average_rating,total_review_count=excluded.total_review_count,maps_url=excluded.maps_url,fetched_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(data.source,JSON.stringify(data.reviews||[]),data.businessName||'',Number(data.averageRating||0),Number(data.totalReviewCount||0),data.mapsUrl||'').run();
  return {...data,enabled:true,fetchedAt:new Date().toISOString()};
}
export async function cachedReviews(env){
  const row=await env.DB.prepare("SELECT * FROM google_review_cache WHERE cache_key='main'").first().catch(()=>null);if(!row)return null;
  let reviews=[];try{reviews=JSON.parse(row.reviews_json||'[]')}catch(_){}
  return {enabled:true,source:row.source||'',businessName:row.business_name||'',averageRating:Number(row.average_rating||0),totalReviewCount:Number(row.total_review_count||0),mapsUrl:row.maps_url||'',reviews:Array.isArray(reviews)?reviews:[],fetchedAt:row.fetched_at||''};
}
export function cacheIsFresh(cache,minutes=30){
  if(!cache?.fetchedAt)return false;const t=new Date(String(cache.fetchedAt).replace(' ','T')+(String(cache.fetchedAt).includes('Z')?'':'Z')).getTime();return Number.isFinite(t)&&(Date.now()-t)<Math.max(5,Number(minutes||30))*60000;
}

export function mergeContactMap(existing,input){
  const next={...existing,enabled:bool(input.enabled)};
  if(clean(input.embedApiKey,3000))next.embedApiKey=clean(input.embedApiKey,3000);
  if(Array.isArray(input.locations))next.locations=input.locations.slice(0,12).map((x,i)=>({
    id:clean(x.id,100)||crypto.randomUUID(),enabled:x.enabled===undefined?true:bool(x.enabled),label:clean(x.label,180)||`Location ${i+1}`,
    address:clean(x.address,800),placeId:clean(x.placeId,300),mapsUrl:normalizeMapsUrl(x.mapsUrl),embedUrl:normalizeEmbedUrl(x.embedUrl)
  }));
  return next;
}
export function mergeReviews(existing,input){
  const next={...existing,enabled:bool(input.enabled),source:['places','business_profile'].includes(clean(input.source,40).toLowerCase())?clean(input.source,40).toLowerCase():'places',placeId:clean(input.placeId,300),mapsUrl:normalizeMapsUrl(input.mapsUrl),minimumRating:5,fillWithFourStar:input.fillWithFourStar===undefined?true:bool(input.fillWithFourStar),refreshMinutes:Math.max(5,Math.min(1440,Number(input.refreshMinutes||30))),businessClientId:clean(input.businessClientId,1000),businessAccountId:clean(input.businessAccountId,300).replace(/^accounts\//i,''),businessLocationId:clean(input.businessLocationId,300).replace(/^locations\//i,'')};
  if(clean(input.placesApiKey,3000))next.placesApiKey=clean(input.placesApiKey,3000);
  if(clean(input.businessClientSecret,3000))next.businessClientSecret=clean(input.businessClientSecret,3000);
  if(clean(input.businessRefreshToken,8000))next.businessRefreshToken=clean(input.businessRefreshToken,8000);
  return next;
}
