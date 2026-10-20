import { json } from '../../_lib/utils.js';
import { readButtonDictionary, buttonPayload, freshPublicButtonPayload } from '../../_lib/button-dictionary.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';
export async function onRequestGet({request,env,waitUntil,data}){
 try{
  // A page load/explicit refresh validates one indexed settings row. It does not
  // scan customers/plans or trust a stale copy from another Cloudflare location.
  if(request.headers.get('x-dropbeat-revalidate')==='1'){
   const payload=await freshPublicButtonPayload(env,new URL(request.url).origin,data?.db150PreparePublicRead);
   return json(payload,200,{'cache-control':'no-store, max-age=0, must-revalidate',etag:'"'+payload.revision+'"'});
  }
  return await edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:'button-dictionary-v156',ttl:60,stale:60,load:async()=>{
   const payload=buttonPayload(await readButtonDictionary(env),{publicOnly:true});return json(payload,200,{'cache-control':'public, max-age=60',etag:'"'+payload.revision+'"'});
  }});
 }catch{return json({error:'Button settings are temporarily unavailable.'},503,{'cache-control':'no-store','retry-after':'60'});}
}
