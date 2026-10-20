import { json, requireAdmin } from '../../_lib/utils.js';
import { getAdminActivity } from '../../_lib/admin-activity.js';

const allowed=new Set(['dm','comments','orders','subscriptions']);
export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    const u=new URL(request.url),raw=String(u.searchParams.get('scope')||'dm').toLowerCase();
    const scopes=raw==='all'?['dm','comments','orders','subscriptions']:[...new Set(raw.split(',').map(x=>x.trim()).filter(x=>allowed.has(x)))];
    const list=scopes.length?scopes:['dm'];
    const rows=await Promise.all(list.map(x=>getAdminActivity(env,x)));
    if(rows.length===1)return json({ok:true,...rows[0]},200,{'cache-control':'no-store'});
    return json({ok:true,activity:Object.fromEntries(rows.map(x=>[x.scope,x]))},200,{'cache-control':'no-store'});
  }catch(e){return json({error:e.message||'Admin activity status could not be loaded.'},500);}
}
