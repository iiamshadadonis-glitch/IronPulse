import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import {
  getMapsReviewsSettings, saveMapsReviewsSettings, mergeContactMap, mergeReviews,
  publicLocations, cachedReviews, fetchAndCacheReviews, cacheIsFresh
} from '../../_lib/maps-reviews.js';

function secretState(value){ return value ? 'Saved' : 'Not saved'; }
function adminView(settings){
  const c=settings.contactMap||{}, r=settings.reviews||{};
  return {
    contactMap:{
      enabled:!!c.enabled,
      embedApiKey:'',
      embedApiKeyState:secretState(c.embedApiKey),
      locations:Array.isArray(c.locations)?c.locations:[]
    },
    reviews:{
      enabled:!!r.enabled,
      source:r.source||'places',
      placeId:r.placeId||'', mapsUrl:r.mapsUrl||'', placesApiKey:'', placesApiKeyState:secretState(r.placesApiKey),
      minimumRating:Number(r.minimumRating||5), fillWithFourStar:r.fillWithFourStar!==false,
      refreshMinutes:Number(r.refreshMinutes||30),
      businessClientId:r.businessClientId||'', businessClientSecret:'', businessClientSecretState:secretState(r.businessClientSecret),
      businessRefreshToken:'', businessRefreshTokenState:secretState(r.businessRefreshToken),
      businessAccountId:r.businessAccountId||'', businessLocationId:r.businessLocationId||''
    }
  };
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const settings=await getMapsReviewsSettings(env), cache=await cachedReviews(env);
    return json({ok:true,settings:adminView(settings),publicLocations:publicLocations(settings),cache,cacheFresh:cacheIsFresh(cache,settings.reviews?.refreshMinutes)});
  }catch(e){return json({error:e.message||'Could not load Maps & Reviews settings.'},500);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  const body=await readJson(request), action=String(body.action||'save_all');
  try{
    const current=await getMapsReviewsSettings(env);
    if(action==='save_contact_map'){
      const next={...current,contactMap:mergeContactMap(current.contactMap||{},body.contactMap||{})};
      await saveMapsReviewsSettings(env,next);
      return json({ok:true,message:'Contact map settings saved.',settings:adminView(next),publicLocations:publicLocations(next)});
    }
    if(action==='save_reviews'){
      const next={...current,reviews:mergeReviews(current.reviews||{},body.reviews||{})};
      await saveMapsReviewsSettings(env,next);
      return json({ok:true,message:'Google review settings saved.',settings:adminView(next)});
    }
    if(action==='refresh_reviews'){
      const data=await fetchAndCacheReviews(env,current);
      return json({ok:true,message:'Google reviews refreshed.',cache:data});
    }
    if(action==='clear_review_cache'){
      await env.DB.prepare("DELETE FROM google_review_cache WHERE cache_key='main'").run();
      return json({ok:true,message:'Cached review preview cleared.'});
    }
    return json({error:'Unknown action.'},400);
  }catch(e){return json({error:e.message||'Could not update Maps & Reviews settings.'},400);}
}
