/* V16.92 — consent-controlled marketing tags, first-party funnel events and batched heat-map samples. */
(()=>{
  'use strict';
  if(window.__ucV1692MarketingTracker)return;window.__ucV1692MarketingTracker=true;
  const state={configured:false,config:null,heat:new Map(),started:Date.now(),lastAttention:Date.now(),maxScroll:0,purchaseRecorded:false,batchEvents:0,batchDuration:0,session:(()=>{try{let id=sessionStorage.getItem('uc_heat_session');if(!id){id=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;sessionStorage.setItem('uc_heat_session',id);}return id;}catch{return `${Date.now()}-${Math.random()}`;}})()};
  const consent=kind=>{try{return !!window.UCConsent?.allows?.(kind);}catch{return false;}};
  const visitor=()=>{try{let id=localStorage.getItem('uc_vid');if(!id){id=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;localStorage.setItem('uc_vid',id);}return id;}catch{return '';}};
  const source=()=>{const q=new URLSearchParams(location.search),utm=q.get('utm_source');if(utm)return utm;try{const h=new URL(document.referrer).hostname;if(h)return h;}catch{}return 'Direct / unknown';};
  const device=()=>matchMedia('(max-width: 640px)').matches?'mobile':matchMedia('(max-width: 1024px)').matches?'tablet':'desktop';
  function addScript(src,attrs={}){if([...document.scripts].some(x=>x.src===new URL(src,location.href).href))return;const s=document.createElement('script');s.async=true;s.src=src;Object.entries(attrs).forEach(([k,v])=>s.setAttribute(k,v));document.head.appendChild(s);}
  function configureGoogleTag(id){
    if(!id)return;window.__ucV1692GoogleIds=window.__ucV1692GoogleIds||new Set();if(window.__ucV1692GoogleIds.has(id))return;window.__ucV1692GoogleIds.add(id);addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
    window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments);};if(!window.__ucV1692GoogleTagStarted){window.__ucV1692GoogleTagStarted=true;gtag('js',new Date());}gtag('config',id,{send_page_view:true});
  }
  function configureMeta(id){
    if(!id||window.fbq)return;!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',id);fbq('track','PageView');
  }
  async function configure(){
    if(state.configured)return;const analytics=consent('analytics'),ads=consent('ads');if(!analytics&&!ads)return;
    try{const r=await fetch('/api/public/marketing-config',{credentials:'same-origin'}),d=await r.json();if(!r.ok)return;state.config=d;state.configured=true;
      if(ads&&d.googleTagManager?.enabled&&d.googleTagManager.containerId){window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(d.googleTagManager.containerId)}`);}
      if(analytics&&d.googleAnalytics?.enabled)configureGoogleTag(d.googleAnalytics.measurementId);
      if(ads&&d.googleTag?.enabled)configureGoogleTag(d.googleTag.tagId);
      if(ads&&d.metaAds?.enabled)configureMeta(d.metaAds.pixelId);
      recordMarketing('page_view');firePageConversionRules();observeConfirmedPayment();
    }catch{}
  }
  function eventValue(){const q=new URLSearchParams(location.search);return Math.max(0,Math.round(Number(q.get('amount')||q.get('value')||0)*100));}
  function recordMarketing(event,valueOverride){
    if(!consent('analytics')||!state.config?.firstPartyOrchestration)return;const order=new URLSearchParams(location.search).get('order')||'';if(event==='purchase'){try{if(state.purchaseRecorded||(order&&localStorage.getItem(`uc_marketing_purchase_${order}`)==='1'))return;}catch{}state.purchaseRecorded=true;}const body={visitorId:visitor(),event,eventId:`${event}-${order||Date.now()}`,source:source(),channel:source(),sourceUrl:`${location.origin}${location.pathname}`,adsConsent:consent('ads'),valuePaise:event==='purchase'?Math.max(0,Number(valueOverride)||eventValue()):0};
    fetch('/api/public/marketing-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).then(r=>{if(event==='purchase'&&r.ok&&order)try{localStorage.setItem(`uc_marketing_purchase_${order}`,'1');}catch{}}).catch(()=>{if(event==='purchase')state.purchaseRecorded=false;});
    if(event==='lead'){try{fireConfirmedConversionRules('confirmed_lead','generate_lead',state.config?.googleTag?.leadSendTo);window.fbq?.('track','Lead');}catch{}}
    if(event==='purchase'){try{fireConfirmedConversionRules('confirmed_purchase','purchase',state.config?.googleTag?.conversionSendTo,{value:body.valuePaise/100,currency:'INR'});window.fbq?.('track','Purchase',{value:body.valuePaise/100,currency:'INR'});}catch{}}
  }
  function fireConfirmedConversionRules(trigger,fallbackEvent,fallbackSendTo,values={}){const rules=(state.config?.googleTag?.conversionRules||[]).filter(x=>x?.enabled!==false&&x?.trigger===trigger&&x?.sendTo);if(rules.length){for(const rule of rules)window.gtag?.('event',rule.eventName||fallbackEvent,{...values,send_to:rule.sendTo});return;}window.gtag?.('event',fallbackEvent,fallbackSendTo?{...values,send_to:fallbackSendTo}:values);}
  function firePageConversionRules(){for(const rule of state.config?.googleTag?.conversionRules||[]){if(rule?.enabled===false||rule?.trigger!=='page_view'||!rule.sendTo)continue;const page=String(rule.page||'/');if(location.pathname!==page&&!location.pathname.startsWith(page.endsWith('/')?page:`${page}/`))continue;try{window.gtag?.('event',rule.eventName||'conversion',{send_to:rule.sendTo});}catch{}}}
  function observeConfirmedPayment(){const card=document.querySelector('#resultCard');if(!card||card.dataset.ucMarketingObserved==='1')return;card.dataset.ucMarketingObserved='1';const check=()=>{if(card.dataset.state!=='success')return;const shown=(document.querySelector('#resultAmount')?.textContent||'').replace(/[^0-9.]/g,''),value=Math.round((Number(shown)||0)*100);recordMarketing('purchase',value);};check();new MutationObserver(check).observe(card,{attributes:true,attributeFilter:['data-state']});}
  function selector(el){if(!el)return 'page';if(el.id)return `#${el.id}`;const name=(el.getAttribute('aria-label')||el.textContent||el.tagName).replace(/\s+/g,' ').trim().slice(0,70);return `${el.tagName.toLowerCase()}:${name||'element'}`;}
  function queue(type,x,y,element,durationMs=0){
    if(!consent('analytics'))return;const key=[type,x,y,element].join('|'),old=state.heat.get(key)||{type,x,y,element,count:0,durationMs:0};old.count++;old.durationMs+=durationMs;state.heat.set(key,old);state.batchEvents++;state.batchDuration+=durationMs;if(state.heat.size>=18)flushHeat();
  }
  function flushHeat(){
    if(!state.heat.size||!consent('analytics'))return;const payload=JSON.stringify({path:location.pathname,device:device(),sessionId:state.session,stats:{eventCount:state.batchEvents,durationMs:state.batchDuration,maxScroll:state.maxScroll},events:[...state.heat.values()].slice(0,30)});state.heat.clear();state.batchEvents=0;state.batchDuration=0;
    if(navigator.sendBeacon)navigator.sendBeacon('/api/public/heatmap',new Blob([payload],{type:'application/json'}));else fetch('/api/public/heatmap',{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
  }
  function bind(){
    document.addEventListener('click',e=>{const el=e.target.closest('a,button,input,select,textarea,[role="button"],[onclick]')||e.target;const x=Math.max(0,Math.min(19,Math.floor(e.clientX/Math.max(1,innerWidth)*20))),y=Math.max(0,Math.min(99,Math.floor((scrollY+e.clientY)/Math.max(1,document.documentElement.scrollHeight)*100)));queue('heat',x,y,selector(el));if(el?.closest?.('[data-add-cart],.add-to-cart')||/add to cart/i.test(el?.textContent||''))recordMarketing('add_to_cart');},{passive:true});
    document.addEventListener('uc-confirmed-lead',()=>recordMarketing('lead'));
    addEventListener('scroll',()=>{const h=Math.max(1,document.documentElement.scrollHeight-innerHeight);state.maxScroll=Math.max(state.maxScroll,Math.round(scrollY/h*100));},{passive:true});
    const timer=setInterval(()=>{if(document.visibilityState!=='visible')return;const now=Date.now(),duration=now-state.lastAttention;state.lastAttention=now;const y=Math.max(0,Math.min(99,Math.floor((scrollY+innerHeight/2)/Math.max(1,document.documentElement.scrollHeight)*100)));queue('attention',10,y,'viewport',duration);flushHeat();},60000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){queue('scroll',10,Math.min(99,state.maxScroll),'page');flushHeat();}});
    addEventListener('pagehide',()=>{clearInterval(timer);queue('scroll',10,Math.min(99,state.maxScroll),'page');flushHeat();});
  }
  bind();configure();addEventListener('uc-consent-change',()=>{state.configured=false;configure();});
})();
