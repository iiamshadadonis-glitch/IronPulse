(()=>{
  'use strict';
  // V16.72: Meta webhooks are primary and V16.60 already supplies the shared
  // 4-second local activity revision watcher plus a 5-minute remote safety sync.
  // The older V16.66 6-second Instagram remote sync duplicated that work and
  // could amplify D1/API traffic. Keep only the one-time webhook subscription repair.
  let subscriptionBusy=false;
  async function api(path,body){
    const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});
    const text=await r.text();let d={};try{d=text?JSON.parse(text):{};}catch{d={};}if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;
  }
  async function repairInstagramSubscription(){
    if(subscriptionBusy||document.hidden||!navigator.onLine)return;subscriptionBusy=true;
    try{
      const r=await fetch('/api/admin/social-dms?mode=capabilities',{credentials:'same-origin'}),d=await r.json().catch(()=>({})),ig=(d?.capabilities?.platforms||[]).find(x=>x.key==='instagram');
      if(ig?.connected)await api('/api/admin/social-platform-action',{platform:'instagram',action:'subscribe_webhook'});
    }catch{}finally{subscriptionBusy=false;}
  }
  if(!sessionStorage.getItem('uc_v1666_ig_subscription_attempted')){
    sessionStorage.setItem('uc_v1666_ig_subscription_attempted','1');setTimeout(repairInstagramSubscription,1800);
  }
})();
