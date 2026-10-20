import { json } from '../../_lib/utils.js';
import { getMarketingSettings } from '../../_lib/marketing-suite.js';
export async function onRequestGet({env}){
  try{const s=await getMarketingSettings(env);return json({googleTag:{enabled:!!s.googleTag.enabled,tagId:s.googleTag.tagId||'',conversionSendTo:s.googleTag.conversionSendTo||'',leadSendTo:s.googleTag.leadSendTo||'',conversionRules:(s.googleTag.conversionRules||[]).map(x=>({id:x.id,name:x.name,eventName:x.eventName,sendTo:x.sendTo,trigger:x.trigger,page:x.page,enabled:x.enabled!==false}))},googleTagManager:{enabled:!!s.googleTagManager.enabled,containerId:s.googleTagManager.containerId||''},googleAnalytics:{enabled:!!s.googleAnalytics.enabled,measurementId:s.googleAnalytics.measurementId||''},metaAds:{enabled:!!s.metaAds.enabled,pixelId:s.metaAds.pixelId||''},firstPartyOrchestration:s.firstPartyOrchestration!==false},200,{'cache-control':'public, max-age=300'});}catch(e){return json({error:e.message},400);}
}
