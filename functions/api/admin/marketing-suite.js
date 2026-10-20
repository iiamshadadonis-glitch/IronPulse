import { json, readJson, requireAdmin } from '../../_lib/utils.js';
import { ensureMarketingSchema, getMarketingSettings, getWebinarSettings, publicMarketingView, publicWebinarView, saveMarketingSettings, saveWebinarSettings, disconnectMarketingIntegration, disconnectWebinarIntegration, markMarketingIntegrationVerified, markWebinarIntegrationVerified, testMarketingIntegration, testWebinarIntegration, listMarketingWorkspace, saveCampaign, saveFunnel, marketingAnalytics, syncMarketingMetrics, heatmapReport, heatmapPaths, listEmailCampaigns, saveEmailCampaign, sendEmailCampaign, scheduleWebinar, listWebinars, listWebinarMembers, updateWebinarMember, addWebinarMember } from '../../_lib/marketing-suite.js';

const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
const num=v=>Math.max(0,Number(v)||0);

async function customerSearch(env,q){
  q=clean(q,140);if(!q)return [];
  const like=`%${q.replace(/[%_]/g,'')}%`;
  const r=await env.DB.prepare(`WITH matches AS (
    SELECT 'customer' source,CAST(id AS TEXT) ref,COALESCE(NULLIF(name,''),'Customer') name,phone,COALESCE(email,'') email,'' plan_name,'' subscription_status FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
    UNION ALL SELECT 'subscriber',CAST(id AS TEXT),COALESCE(NULLIF(name,''),'Subscriber'),phone,COALESCE(email,''),COALESCE(plan_name,''),COALESCE(subscription_status,'') FROM subscribers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
    UNION ALL SELECT 'lead',CAST(id AS TEXT),COALESCE(NULLIF(name,''),'Lead'),COALESCE(phone,''),COALESCE(email,''),'','' FROM contact_leads WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
  ) SELECT m.*,COALESCE(o.amount_paise,0) fees_paid_paise,COALESCE(o.payment_status,'') payment_status,COALESCE(o.updated_at,'') last_payment_at
  FROM matches m LEFT JOIN orders o ON o.id=COALESCE(
    (SELECT op.id FROM orders op WHERE m.phone<>'' AND op.customer_phone=m.phone ORDER BY op.id DESC LIMIT 1),
    (SELECT oe.id FROM orders oe WHERE m.email<>'' AND lower(oe.customer_email)=lower(m.email) ORDER BY oe.id DESC LIMIT 1)
  ) LIMIT 30`).bind(like,like,like,like,like,like,like,like,like).all();return r.results||[];
}

export async function onRequestGet({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    await ensureMarketingSchema(env);const u=new URL(request.url),mode=clean(u.searchParams.get('mode')||'overview',40);
    if(mode==='integrations')return json({ok:true,marketing:publicMarketingView(await getMarketingSettings(env)),webinars:publicWebinarView(await getWebinarSettings(env)),capabilities:{smsReminders:!!env.SMS_RELAY_URL}});
    if(mode==='workspace')return json({ok:true,...await listMarketingWorkspace(env)});
    if(mode==='analytics')return json({ok:true,...await marketingAnalytics(env,{start:u.searchParams.get('start'),end:u.searchParams.get('end')})});
    if(mode==='heatmap')return json({ok:true,...await heatmapReport(env,{start:u.searchParams.get('start'),end:u.searchParams.get('end'),path:u.searchParams.get('path')||'/',device:u.searchParams.get('device')||'all',mapType:u.searchParams.get('mapType')||'heat'})});
    if(mode==='heatmap_paths')return json({ok:true,paths:await heatmapPaths(env)});
    if(mode==='email_campaigns')return json({ok:true,campaigns:await listEmailCampaigns(env)});
    if(mode==='webinars')return json({ok:true,events:await listWebinars(env),members:await listWebinarMembers(env,{eventType:u.searchParams.get('eventType')||'',status:u.searchParams.get('status')||''}),capabilities:{smsReminders:!!env.SMS_RELAY_URL}});
    if(mode==='webinar_members')return json({ok:true,members:await listWebinarMembers(env,{eventType:u.searchParams.get('eventType')||'',status:u.searchParams.get('status')||''})});
    if(mode==='customers')return json({ok:true,customers:await customerSearch(env,u.searchParams.get('q')||'')});
    return json({ok:true,marketing:publicMarketingView(await getMarketingSettings(env)),webinars:publicWebinarView(await getWebinarSettings(env)),...(await listMarketingWorkspace(env)),events:await listWebinars(env)});
  }catch(e){return json({error:e.message||'Marketing workspace could not be loaded.'},400);}
}

export async function onRequestPost({request,env}){
  try{await requireAdmin(request,env);}catch(e){return json({error:e.message},401);}
  try{
    await ensureMarketingSchema(env);const b=await readJson(request),action=clean(b.action,60);
    if(action==='save_marketing')return json({ok:true,message:'Marketing integration settings saved.',marketing:publicMarketingView(await saveMarketingSettings(env,b.settings||{}))});
    if(action==='save_webinars')return json({ok:true,message:'Webinar integration settings saved.',webinars:publicWebinarView(await saveWebinarSettings(env,b.settings||{}))});
    if(action==='disconnect_marketing')return json({ok:true,message:'Marketing integration disconnected and its saved credentials removed.',marketing:publicMarketingView(await disconnectMarketingIntegration(env,clean(b.integration,40)))});
    if(action==='disconnect_webinar')return json({ok:true,message:'Webinar integration disconnected and its saved credentials removed.',webinars:publicWebinarView(await disconnectWebinarIntegration(env,clean(b.integration,40)))});
    if(action==='test_marketing'){const integration=clean(b.integration,40),result=await testMarketingIntegration(env,integration);return json({...result,marketing:publicMarketingView(await markMarketingIntegrationVerified(env,integration))});}
    if(action==='test_webinar'){const integration=clean(b.integration,40),result=await testWebinarIntegration(env,integration);return json({...result,webinars:publicWebinarView(await markWebinarIntegrationVerified(env,integration))});}
    if(action==='save_campaign'){const id=await saveCampaign(env,b);return json({ok:true,id,message:'Campaign draft saved. Publish only after the matching platform connection and required assets are approved.'});}
    if(action==='save_funnel'){const id=await saveFunnel(env,b);return json({ok:true,id,message:'Funnel stages saved. Audience stages are coordinated here; each advertising platform still controls its own auction and exact delivery timing.'});}
    if(action==='save_email_campaign'){const id=await saveEmailCampaign(env,b);return json({ok:true,id,message:'Email campaign saved as a workspace draft. Nothing has been sent yet.'});}
    if(action==='send_email_campaign')return json(await sendEmailCampaign(env,num(b.id)));
    if(action==='delete_campaign'){await env.DB.prepare('DELETE FROM marketing_campaigns WHERE id=?').bind(num(b.id)).run();return json({ok:true,message:'Campaign draft deleted.'});}
    if(action==='delete_funnel'){await env.DB.prepare('DELETE FROM marketing_funnels WHERE id=?').bind(num(b.id)).run();return json({ok:true,message:'Funnel deleted.'});}
    if(action==='record_metrics'){
      const day=/^\d{4}-\d{2}-\d{2}$/.test(b.day)?b.day:new Date().toISOString().slice(0,10),channel=clean(b.channel,50)||'manual',campaign=num(b.campaignId);
      await env.DB.prepare(`INSERT INTO marketing_daily_metrics(day,channel,campaign_id,impressions,clicks,leads,conversions,spend_paise,revenue_paise) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(day,channel,campaign_id) DO UPDATE SET impressions=excluded.impressions,clicks=excluded.clicks,leads=excluded.leads,conversions=excluded.conversions,spend_paise=excluded.spend_paise,revenue_paise=excluded.revenue_paise`).bind(day,channel,campaign,num(b.impressions),num(b.clicks),num(b.leads),num(b.conversions),num(b.spendPaise),num(b.revenuePaise)).run();return json({ok:true,message:'Daily marketing figures saved.'});
    }
    if(action==='sync_marketing')return json(await syncMarketingMetrics(env,{start:b.start,end:b.end}));
    if(action==='schedule_webinar'){
      const result=await scheduleWebinar(env,b),failed=(result.notifications||[]).filter(x=>x?.ok===false),sent=(result.notifications||[]).filter(x=>x?.ok!==false).map(x=>x.channel).filter(Boolean);
      const message=failed.length?`Meeting scheduled. ${sent.length?`${sent.join(' and ')} confirmation sent. `:''}${failed.map(x=>`${x.channel||'Notification'}: ${x.error||'delivery failed'}`).join(' · ')}`:`Meeting scheduled${sent.length?` and ${sent.join(' and ')} confirmation sent`:''}.`;
      return json({ok:true,...result,message,notificationWarning:failed.length>0});
    }
    if(action==='cancel_webinar'){await env.DB.prepare("UPDATE webinar_events SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(num(b.id)).run();await env.DB.prepare("UPDATE webinar_reminders SET status='cancelled' WHERE webinar_id=? AND status='pending'").bind(num(b.id)).run();return json({ok:true,message:'Meeting cancelled and pending reminders stopped.'});}
    if(action==='complete_call_reminder'){await env.DB.prepare("UPDATE webinar_reminders SET status='sent',sent_at=CURRENT_TIMESTAMP,error_text='' WHERE webinar_id=? AND channel='call' AND status='action_required'").bind(num(b.id)).run();return json({ok:true,message:'Admin follow-up call marked complete.'});}
    if(action==='update_webinar_member'){const id=await updateWebinarMember(env,b);return json({ok:true,id,message:'Member details updated.'});}
    if(action==='add_webinar_member'){const result=await addWebinarMember(env,b);return json({ok:true,...result,message:'Member added to the class. Contact details and recurring reminders were saved.'});}
    throw new Error('Choose a supported marketing or webinar action.');
  }catch(e){return json({error:e.message||'The requested action could not be completed.'},400);}
}
