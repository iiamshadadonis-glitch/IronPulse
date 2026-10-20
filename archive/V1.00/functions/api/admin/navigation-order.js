import {invalidateConfiguration,LAYOUT_CACHE} from '../../_lib/configuration-cache-v1-57.js';
import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { getNavigationModel, saveNavigationOrder, saveNavigationChildOrder, saveNavigationItem } from '../../_lib/navigation.js';
import { scheduleNavigationSeoRefresh } from '../../_lib/navigation-seo.js';
import { purgePublicEdgeCaches } from '../../_lib/edge-response-cache.js';

const SITE_NAVIGATION_CACHE = [{path:'/api/public/site',key:'site-dropbeat-v113'},...LAYOUT_CACHE];

function responseModel(model,extra={}){
  return {ok:true,order:model.order,items:model.items,childOrders:model.childOrders||{},...extra};
}
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  return json(responseModel(await getNavigationModel(env)));
}
export async function onRequestPost(ctx){
  const {request,env}=ctx;try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const body=await readJson(request),action=String(body.action||'save_order');
    if(action==='save_item'){
      const saved=await saveNavigationItem(env,{key:body.key,label:body.label,slug:body.slug});
      invalidateConfiguration();
      await purgePublicEdgeCaches(request,SITE_NAVIGATION_CACHE);
      scheduleNavigationSeoRefresh(ctx,{urls:[saved.oldHref,saved.item?.href].filter(Boolean),reason:'navigation item updated'});
      return json(responseModel(saved.model,{item:saved.item,message:`${saved.item?.label||'Header item'} updated successfully. Sitemap/search refresh has been scheduled.`}));
    }
    if(action==='save_child_order'){
      const order=Array.isArray(body.order)?body.order:[];if(!order.length)return json({error:'The sub-option order is empty. Refresh Pages and try again.'},400);
      const model=await saveNavigationChildOrder(env,body.parentKey,order);
      invalidateConfiguration();
      await purgePublicEdgeCaches(request,SITE_NAVIGATION_CACHE);
      scheduleNavigationSeoRefresh(ctx,{reason:'submenu order updated'});
      return json(responseModel(model,{message:'Sub-option order saved successfully.'}));
    }
    const order=Array.isArray(body.order)?body.order:[];
    if(!order.length)return json({error:'Navigation order is empty. Refresh Pages and try again.'},400);
    const model=await saveNavigationOrder(env,order);
    invalidateConfiguration();
      await purgePublicEdgeCaches(request,SITE_NAVIGATION_CACHE);
    scheduleNavigationSeoRefresh(ctx,{reason:'header order updated'});
    return json(responseModel(model,{message:'Website header order saved successfully.'}));
  }catch(e){return json({error:e.message||'Website navigation could not be saved.'},400);}
}
