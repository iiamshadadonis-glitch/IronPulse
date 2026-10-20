import { json } from '../../_lib/utils.js';
import { getMapsReviewsSettings, publicLocations, cachedReviews, fetchAndCacheReviews, cacheIsFresh } from '../../_lib/maps-reviews.js';

export async function onRequestGet({env}){
  try{
    const settings=await getMapsReviewsSettings(env);
    const contactEnabled=!!settings.contactMap?.enabled;
    const locations=contactEnabled?publicLocations(settings):[];
    let reviewData=null;
    if(settings.reviews?.enabled){
      reviewData=await cachedReviews(env);
      if(!cacheIsFresh(reviewData,settings.reviews.refreshMinutes)){
        try{reviewData=await fetchAndCacheReviews(env,settings);}catch(_){ /* keep last good cache */ }
      }
    }
    return json({
      contactMap:{enabled:contactEnabled&&locations.length>0,locations},
      reviews:{
        enabled:!!settings.reviews?.enabled&&!!reviewData&&Array.isArray(reviewData.reviews)&&reviewData.reviews.length>0,
        source:reviewData?.source||'',businessName:reviewData?.businessName||'',averageRating:Number(reviewData?.averageRating||0),
        totalReviewCount:Number(reviewData?.totalReviewCount||0),mapsUrl:reviewData?.mapsUrl||settings.reviews?.mapsUrl||'',
        reviews:Array.isArray(reviewData?.reviews)?reviewData.reviews.slice(0,4):[],fetchedAt:reviewData?.fetchedAt||''
      }
    },200,{'cache-control':'public, max-age=300, stale-while-revalidate=900'});
  }catch(e){return json({contactMap:{enabled:false,locations:[]},reviews:{enabled:false,reviews:[]}},200,{'cache-control':'public, max-age=120'});}
}
