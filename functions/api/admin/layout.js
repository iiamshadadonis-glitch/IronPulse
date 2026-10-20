import {json,readJson,requireAdmin} from '../../_lib/utils.js';
import {readLayoutContext,layoutPayload,saveLayout,LAYOUT_CACHE} from '../../_lib/layout.js';
import {BUTTON_DICTIONARY_CACHE} from '../../_lib/button-dictionary.js';
import {purgePublicEdgeCaches,DROPBEAT_PUBLIC_CACHE_ENTRIES} from '../../_lib/edge-response-cache.js';
const headers={'cache-control':'private, no-store'};
export async function onRequestGet({request,env}){
 try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401,headers);}
 try{return json(layoutPayload(await readLayoutContext(env),{admin:true}),200,headers);}catch{return json({error:'The layout could not be loaded. Please retry.'},503,headers);}
}
export async function onRequestPost({request,env}){
 try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401,headers);}
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Use the signed-in Admin page to change the layout.'},403,headers);
 if(!/application\/json/i.test(request.headers.get('content-type')||''))return json({error:'A JSON request is required.'},415,headers);
 try{const result=await saveLayout(env,await readJson(request));await purgePublicEdgeCaches(request,[...LAYOUT_CACHE,...BUTTON_DICTIONARY_CACHE,...DROPBEAT_PUBLIC_CACHE_ENTRIES.filter(row=>row.path==='/api/public/site')]);return json(result,200,headers);}
 catch(e){return json({error:e.message||'Layout changes could not be saved.'},e.status||400,headers);}
}
