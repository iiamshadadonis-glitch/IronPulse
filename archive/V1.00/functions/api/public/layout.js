import {json} from '../../_lib/utils.js';
import {readLayoutContext,layoutPayload,freshLayoutPayload} from '../../_lib/layout.js';
import {edgeCachedResponse} from '../../_lib/edge-response-cache.js';
export async function onRequestGet({request,env,waitUntil,data}){
 try{
  if(request.headers.get('x-dropbeat-revalidate')==='1'){const result=await freshLayoutPayload(env,new URL(request.url).origin,data?.db150PreparePublicRead);return json(result,200,{'cache-control':'no-store, max-age=0, must-revalidate',etag:'"'+result.contextRevision+'"'});}
  return await edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:'layout-v157',ttl:60,stale:60,load:async()=>json(layoutPayload(await readLayoutContext(env)),200,{'cache-control':'public, max-age=60'})});
 }catch{return json({error:'Layout information is temporarily unavailable.'},503,{'cache-control':'no-store','retry-after':'60'});}
}
