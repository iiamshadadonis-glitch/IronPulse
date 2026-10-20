import { json, getSiteSettings } from '../../_lib/utils.js';
import { getNavigationModel, publicNavigationPayload } from '../../_lib/navigation.js';
import { edgeCachedResponse } from '../../_lib/edge-response-cache.js';
export async function onRequestGet({ request, env, waitUntil, data }) {
  return edgeCachedResponse({request,waitUntil,prepare:data?.db150PreparePublicRead,key:'site-dropbeat-v113',ttl:120,load:async()=>{
    const settings=await getSiteSettings(env);let navigation=[];
    try{navigation=(await env.DB.prepare("SELECT page_key,COALESCE(NULLIF(page_name,''),title) AS page_name,title,slug,nav_parent,nav_sort_order,product_display_enabled FROM content_pages WHERE is_custom=1 AND nav_visible=1 ORDER BY nav_sort_order,id").all()).results||[];}catch(_){navigation=[];}
    let model={order:[],items:[]};try{model=await getNavigationModel(env,navigation);}catch(_){model={order:[],items:[]};}
    return json({settings,navigation,navigationOrder:model.order||[],navigationModel:publicNavigationPayload(model)},200,{'cache-control':'public, max-age=120, stale-while-revalidate=300'});
  }});
}
