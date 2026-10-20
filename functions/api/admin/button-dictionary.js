import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { readButtonDictionary, buttonPayload, saveButtonDictionary, BUTTON_DICTIONARY_CACHE } from '../../_lib/button-dictionary.js';
import { purgePublicEdgeCaches } from '../../_lib/edge-response-cache.js';
const privateHeaders={'cache-control':'private, no-store'};
export async function onRequestGet({request,env}){
 try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401,privateHeaders);}
 try{return json(buttonPayload(await readButtonDictionary(env)),200,privateHeaders);}catch{return json({error:'Button settings could not be loaded. Please retry.'},503,privateHeaders);}
}
export async function onRequestPost({request,env}){
 try{await requireAdmin(request,env);}catch(error){return json({error:error.message},401,privateHeaders);}
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Use the signed-in Admin page to change buttons.'},403,privateHeaders);
 if(!/application\/json/i.test(request.headers.get('content-type')||''))return json({error:'A JSON request is required.'},415,privateHeaders);
 try{const saved=await saveButtonDictionary(env,await readJson(request));await purgePublicEdgeCaches(request,BUTTON_DICTIONARY_CACHE);return json({...saved,message:'Button settings saved.'},200,privateHeaders);}
 catch(error){return json({error:error.message||'Button settings could not be saved.'},error.status||400,privateHeaders);}
}
