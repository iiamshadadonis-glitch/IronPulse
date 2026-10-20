import { json, requireAdmin } from '../../_lib/utils.js';
import { getPortalSession } from '../../_lib/portal-auth.js';
import { coachSessionRedirect, studentSessionRedirect } from '../../_lib/portal-dashboard.js';
import { adminOccurrenceRedirect } from '../../_lib/session-meetings.js';

const redirect=url=>new Response(null,{status:302,headers:{location:url,'cache-control':'no-store','referrer-policy':'no-referrer'}});
export async function onRequestGet({request,env}){
  let portalRole='';
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')||'join',account=await getPortalSession(request,env);
    portalRole=account?.role||'';
    if(account?.role==='student'){if(action!=='join')throw new Error('Member accounts can only join assigned sessions.');return redirect(await studentSessionRedirect(env,account,{memberId:url.searchParams.get('memberId'),date:url.searchParams.get('date')}));}
    if(account?.role==='coach'){if(action!=='start')throw new Error('Choose Start Session from the coach dashboard.');return redirect(await coachSessionRedirect(env,account,{source:url.searchParams.get('source')||'product',sourceId:url.searchParams.get('sourceId'),date:url.searchParams.get('date')}));}
    const admin=await requireAdmin(request,env);if(!admin)throw new Error('Login required.');if(action==='admin_join')return redirect(await adminOccurrenceRedirect(env,{sourceType:url.searchParams.get('source')||'product',sourceId:url.searchParams.get('sourceId'),date:url.searchParams.get('date')}));const eventId=Number(url.searchParams.get('eventId')||0),event=await env.DB.prepare("SELECT meeting_url FROM webinar_events WHERE id=? AND status IN ('scheduled','rescheduled') LIMIT 1").bind(eventId).first();if(!event||!/^https:\/\//i.test(event.meeting_url||''))throw new Error('The selected meeting is not ready.');return redirect(event.meeting_url);
  }catch(error){const message=error.message||'Session access could not be verified.';if(portalRole&&String(request.headers.get('accept')||'').includes('text/html')){const target=new URL(portalRole==='coach'?'/coach-dashboard':'/member-dashboard',request.url);target.searchParams.set('view','sessions');target.searchParams.set('session_error',message);return new Response(null,{status:302,headers:{location:target.toString(),'cache-control':'no-store','referrer-policy':'no-referrer'}});}return json({error:message},403,{'cache-control':'no-store'});}
}
