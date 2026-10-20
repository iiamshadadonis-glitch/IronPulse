import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { listAutomationFlows, saveAutomationFlow, deleteAutomationFlow, setAutomationEnabled, automationStats, testAutomationApiRequest } from '../../_lib/social-automations.js';
import { getSocialDmCapabilities } from '../../_lib/social-dms.js';
import { getSocialIntegrationSettings } from '../../_lib/utils.js';
import { listAiIntegrations } from '../../_lib/ai-integrations.js';
import { listAutomationOffers } from '../../_lib/live-offers.js';
const clean=(v,n=100)=>String(v??'').trim().slice(0,n);

function platformLabel(key){return ({facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',x:'X / Twitter',threads:'Threads',youtube:'YouTube',linkedin:'LinkedIn',telegram:'Telegram',google_maps:'Google Maps Reviews'})[key]||key;}
async function capabilities(env){
  const [dm,s]=await Promise.all([getSocialDmCapabilities(env),getSocialIntegrationSettings(env)]);
  const commentRows=[
    ['facebook',!!s?.facebook?.enabled,!!s?.facebook?.enabled],
    ['instagram',!!s?.instagram?.enabled,!!s?.instagram?.enabled],
    ['threads',!!s?.threads?.enabled,!!s?.threads?.enabled],
    ['youtube',!!s?.youtube?.enabled,!!s?.youtube?.enabled],
    ['x',!!s?.x?.enabled,!!s?.x?.enabled],
    ['linkedin',!!s?.linkedin?.enabled,!!s?.linkedin?.enabled&&s?.linkedin?.communityEnabled===true],
    ['google_maps',!!s?.googleBusiness?.enabled,!!s?.googleBusiness?.enabled]
  ];
  const comments=commentRows.map(([key,enabled,connected])=>({key,label:platformLabel(key),enabled,connected,features:{reply:true,visualFlow:true},reason:connected?'':enabled?'The platform is enabled but the reply capability is not ready yet.':'The platform is disabled.'}));
  const commentDm=[
    {key:'facebook',label:'Facebook',enabled:!!s?.facebook?.enabled,connected:!!(s?.facebook?.enabled&&s?.facebook?.pageId&&s?.facebook?.pageAccessToken),features:{privateMessage:true,keywordTrigger:true},reason:s?.facebook?.enabled?'Complete the Facebook Page connection to enable one-time private replies from comments.':'Facebook is disabled.'},
    {key:'instagram',label:'Instagram',enabled:!!s?.instagram?.enabled,connected:!!(s?.instagram?.enabled&&s?.instagram?.instagramBusinessId&&(s?.instagram?.pageAccessToken||s?.instagram?.instagramLoginToken)),features:{privateMessage:true,keywordTrigger:true},reason:s?.instagram?.enabled?'Complete the Instagram professional-account connection to enable initial DMs from comments.':'Instagram is disabled.'}
  ].map(x=>({...x,reason:x.connected?'':x.reason}));
  return {dm:dm.platforms||[],comments,commentDm,rules:{dm:'Each enabled connected DM platform gets its own visual flow library. Message blocks are capability-aware, so unsupported message formats are not offered for that platform.',comments:'Comment flows run for supported reply platforms. Facebook and Instagram can react from webhooks; other platforms can run when their comment synchronization/webhook imports a new comment.',commentDm:'A matching Facebook or Instagram comment keyword sends the platform-permitted one-time private DM. Enabling the flow is the live auto-reply switch.'}};
}
export async function onRequestGet({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}try{const u=new URL(request.url),mode=clean(u.searchParams.get('mode')||'list',40);if(mode==='capabilities')return json({ok:true,capabilities:await capabilities(env)});const [flows,stats,caps,aiIntegrations,offers]=await Promise.all([listAutomationFlows(env,{channel:clean(u.searchParams.get('channel')||'',20),platform:clean(u.searchParams.get('platform')||'',40)}),automationStats(env),capabilities(env),listAiIntegrations(env,{enabledOnly:true}),listAutomationOffers(env)]);return json({ok:true,flows,stats,capabilities:caps,aiIntegrations,offers});}catch(e){return json({error:e.message||'Automations could not be loaded.'},400);}}
export async function onRequestPost({request,env}){try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}try{const b=await readJson(request),action=clean(b.action||'save',40);if(action==='save')return json({ok:true,flow:await saveAutomationFlow(env,b.flow||b)});if(action==='delete')return json({ok:await deleteAutomationFlow(env,b.id)});if(action==='toggle'){await setAutomationEnabled(env,b.id,!!b.enabled);return json({ok:true});}if(action==='test_api')return json({ok:true,result:await testAutomationApiRequest(b.node||{},b.attributes||{})});return json({error:'Unsupported automation action.'},400);}catch(e){return json({error:e.message||'Automation action failed.',validationErrors:Array.isArray(e.validationErrors)?e.validationErrors:[]},400);}}
