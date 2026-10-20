(()=>{
  'use strict';
  // V16.72 — subscription dashboard follows the same low-cost pattern as Inbox/Comments:
  // webhook/activity revision -> tiny revision poll -> live refresh only on change,
  // plus one five-minute safety refresh while the Dashboard is actually visible.
  const ACTIVITY_MS=60000, SAFETY_MS=10*60*1000;
  const LAST_LIVE_KEY='uc_v1672_subscription_last_live_sync';
  const LIVE_LOCK_KEY='uc_v1672_subscription_live_lock';
  const REV_KEY='uc_v1672_subscription_revision';
  let activityBusy=false,liveBusy=false,revision=null,pendingRevision=null;

  const $=s=>document.querySelector(s);
  const enc=v=>encodeURIComponent(String(v??''));
  async function api(path){
    const r=await fetch(path,{credentials:'same-origin',headers:{'accept':'application/json'}}),text=await r.text();let d={};
    try{d=text?JSON.parse(text):{};}catch{d={};}
    if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;
  }
  function dashboardVisible(){return !document.hidden&&!!$('#dashboard')?.classList.contains('active');}
  function period(){return $('#ucDashboardSubscriptionPeriod')?.value||'monthly';}
  function base(cacheOnly=false){return `/api/admin/subscription-overview?mode=cards&period=${enc(period())}${cacheOnly?'&cache_only=1':''}`;}
  function render(r){
    const c=r?.cards||{},set=(id,v)=>{const e=$(id);if(e)e.textContent=String(v??0);};
    set('#ucStatSubTotal',c.total||0);set('#ucStatSubActive',c.active||0);set('#ucStatSubSuccessful',c.successful||0);set('#ucStatSubNew',c.new||0);
    set('#ucStatSubRenewed',c.renewed||0);set('#ucStatSubUpcoming',c.upcoming||0);set('#ucStatSubFailed',c.failed||0);set('#ucStatSubCancelled',c.cancelled||0);
  }
  function status(text,tone='ok',busy=false){
    const box=$('#ucSubscriptionOverviewMsg');if(!box)return;
    box.innerHTML=`<div class="uc-pg-status ${tone}">${busy?'<span class="uc-fetch-spinner" aria-hidden="true"></span>':''}<span>${String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span></div>`;
  }
  function markLive(){try{localStorage.setItem(LAST_LIVE_KEY,String(Date.now()));}catch{}}
  function lastLive(){try{return Number(localStorage.getItem(LAST_LIVE_KEY)||0)||0;}catch{return 0;}}
  function acquireLiveLock(){
    const now=Date.now();try{
      const held=Number(localStorage.getItem(LIVE_LOCK_KEY)||0)||0;if(held&&now-held<20000)return false;
      localStorage.setItem(LIVE_LOCK_KEY,String(now));return true;
    }catch{return true;}
  }
  function releaseLiveLock(){try{localStorage.removeItem(LIVE_LOCK_KEY);}catch{}}

  async function loadCached({coldLive=true}={}){
    try{
      const r=await api(base(true));render(r);
      if(r.configured===false){status('Live subscription information will appear here after a Payment Gateway is enabled in Payments.','warn');return r;}
      if(r.cache_has_data){
        const stamp=r.cache_last_refreshed_at?` Last changed: ${r.cache_last_refreshed_at}.`:'';
        status(`Saved Subscription Overview data is shown immediately. Payment webhooks refresh changed data; a lightweight safety check runs every 5 minutes.${stamp}`,'ok');
        return r;
      }
      status('No saved Subscription Overview data is available yet. Preparing one live refresh…','fetching',true);
      if(coldLive){
        const key=`uc_v1672_sub_cold_${period()}`;
        let attempted=false;try{attempted=sessionStorage.getItem(key)==='1';if(!attempted)sessionStorage.setItem(key,'1');}catch{}
        if(!attempted)return refreshLive('cold');
      }
      return r;
    }catch(e){status(e.message||'Saved Subscription Overview data could not be loaded.','warn');return null;}
  }

  async function refreshLive(reason='activity'){
    if(liveBusy||!navigator.onLine)return null;
    if(!acquireLiveLock()){setTimeout(()=>loadCached({coldLive:false}),1800);return null;}
    liveBusy=true;
    try{
      status(reason==='safety'?'Checking enabled Payment Gateways for subscription changes…':'Refreshing subscription changes from the enabled Payment Gateway…','fetching',true);
      const r=await api(base(false));render(r);markLive();
      const names=(r.sources||[]).filter(x=>!x.error).map(x=>x.label).filter(Boolean).join(' + ')||'the enabled Payment Gateway';
      status(`Subscription Overview is current from ${names}. Unchanged cache rows were not rewritten.`,'ok');
      return r;
    }catch(e){status(`Saved Subscription Overview data remains available. Live refresh could not be completed: ${e.message||'Please try again.'}`,'warn');return null;}
    finally{liveBusy=false;releaseLiveLock();}
  }

  // Preserve explicit Apply as a user-requested live refresh, but keep ordinary Dashboard loads cache-only.
  const originalApply=window.applyUCSubscriptionOverview;
  if(typeof originalApply==='function'){
    window.applyUCSubscriptionOverview=async function(btn){const r=await originalApply.apply(this,arguments);markLive();return r;};
    window.refreshUCSubscriptionOverview=window.applyUCSubscriptionOverview;
  }
  window.loadUCSubscriptionOverview=function(){return loadCached({coldLive:true});};
  window.ucV1672RefreshSubscriptionOverview=refreshLive;

  async function pollActivity(){
    if(activityBusy||!navigator.onLine||document.hidden)return;activityBusy=true;
    try{
      const a=await api('/api/admin/activity?scope=subscriptions'),rev=Math.max(0,Number(a.revision||0));
      if(revision===null){
        let saved=null;try{saved=sessionStorage.getItem(REV_KEY);}catch{}
        revision=saved===null?rev:Math.max(0,Number(saved||0));
      }
      if(rev!==revision){pendingRevision=rev;if(dashboardVisible()){
        const target=rev,res=await refreshLive('activity');if(res){revision=target;pendingRevision=null;try{sessionStorage.setItem(REV_KEY,String(revision));}catch{}}
      }}else if(pendingRevision!==null&&dashboardVisible()){
        const target=pendingRevision,res=await refreshLive('activity');if(res){revision=target;pendingRevision=null;try{sessionStorage.setItem(REV_KEY,String(revision));}catch{}}
      }
    }catch{}finally{activityBusy=false;}
  }
  async function safety(){
    if(!dashboardVisible()||!navigator.onLine)return;
    if(Date.now()-lastLive()<SAFETY_MS-15000)return;
    await refreshLive('safety');
  }
  function install(){
    // The older subscription modules schedule their first dashboard load after parsing;
    // by replacing loadUCSubscriptionOverview before those timers fire, they now load cache only.
    setTimeout(()=>{if($('#dashboard')?.classList.contains('active'))loadCached({coldLive:true});},300);
    setInterval(pollActivity,ACTIVITY_MS);setTimeout(pollActivity,1600);
    setInterval(safety,SAFETY_MS);setTimeout(safety,SAFETY_MS);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollActivity();if(dashboardVisible())loadCached({coldLive:false});}});
    window.addEventListener('online',()=>{pollActivity();if(dashboardVisible())loadCached({coldLive:false});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
