/* V16.91 — additive Business Ops badge acknowledgement and zero-shell cleanup. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null,$$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const ORDER_KEYS=['new','pending','existing','cancelled','cancelled_subscriptions'];
  const SEEN_KEY='uc_v1687_business_ops_seen';
  const signalCache={orders:null,inquiries:null,requests:null};
  let activeOrder='new',ordersLoaded=false,routerWrapped=false;

  function numberFrom(selector){
    const node=typeof selector==='string'?$(selector):selector;
    if(!node||node.hidden)return 0;
    const match=String(node.textContent||'').match(/\d+/);
    return match?Math.max(0,Number(match[0])||0):0;
  }
  function capped(n){return Number(n)>99?'99+':String(Math.max(0,Number(n)||0));}
  function safeId(value){return String(value??'').trim();}
  function recordId(row,prefix){
    return prefix+':'+safeId(row?.id||row?.order_id||row?.inquiry_id||row?.lead_id||row?.request_id||'');
  }
  function readSeen(){
    try{const value=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch{return{};}
  }
  function writeSeen(value){try{localStorage.setItem(SEEN_KEY,JSON.stringify(value));}catch{}}
  function bounded(values){return [...new Set(values.filter(Boolean))].slice(-500);}

  function inquiryCounts(){
    return {
      new:numberFrom('.uc-v153-inquiry-tabs [data-inquiry-status="new"] .uc-v1634-count-badge'),
      progress:numberFrom('.uc-v153-inquiry-tabs [data-inquiry-status="in_progress"] .uc-v1634-count-badge')
    };
  }
  function requestCounts(){
    return {
      new:numberFrom('.uc-v11-request-tabs [data-request-status="new"] .uc-v1634-count-badge'),
      progress:numberFrom('.uc-v11-request-tabs [data-request-status="in_progress"] .uc-v1634-count-badge')
    };
  }
  function requestTokens(){
    return bounded($$('#ucRequestsTable tbody tr').filter(row=>!row.querySelector('.status.active')).map((row,index)=>{
      const call=$('[onclick*="ucV11OpenRequestClient"]',row)?.getAttribute('onclick')||'';
      const id=call.match(/ucV11OpenRequestClient\((\d+)/)?.[1]||$('td:nth-child(2) small',row)?.textContent||row.textContent.slice(0,100)||String(index);
      return 'request:'+safeId(id);
    }));
  }
  function rowToken(row,prefix){
    const id=row?.id||row?.order_id||row?.inquiry_id||row?.lead_id||row?.request_id;
    return id===undefined||id===null||id===''?'':recordId(row,prefix);
  }
  function captureResponse(path,result){
    if(!result||typeof result!=='object')return;
    const url=String(path||'');
    if(url==='/api/admin/orders'||url.startsWith('/api/admin/orders?summary=1')){
      const rows=Array.isArray(result.new_orders)?result.new_orders:[];
      signalCache.orders={count:rows.length,tokens:bounded(rows.map(row=>rowToken(row,'order')))};
    }else if(url.startsWith('/api/admin/leads?')&&url.includes('mode=inquiries')){
      const rows=Array.isArray(result.inquiries)?result.inquiries:[];
      const count=Number(result.new_count||0),tokens=bounded(rows.filter(row=>String(row.inquiry_status||'new')==='new').map(row=>rowToken(row,'inquiry')));
      signalCache.inquiries={count,tokens:count&&!tokens.length?(signalCache.inquiries?.tokens||[]):tokens};
    }else if(url.startsWith('/api/admin/requests')){
      const rows=Array.isArray(result.rows)?result.rows:[];
      const count=Number(result.new_count||0),tokens=bounded(rows.filter(row=>String(row.status||'new')==='new').map(row=>rowToken(row,'request')));
      signalCache.requests={count,tokens:count&&!tokens.length?(signalCache.requests?.tokens||[]):tokens};
    }
  }
  function wrapApiCapture(){
    const old=window.api;if(typeof old!=='function'||old.__uc87SignalCapture)return;
    const fn=async function(path){const result=await old.apply(this,arguments);captureResponse(path,result);return result;};
    fn.__uc87SignalCapture=true;fn.__uc87Old=old;window.api=fn;
  }
  function currentSignals(){
    const data=window.A||{},inq=inquiryCounts(),req=requestCounts();
    const orderRows=Array.isArray(data.newOrders)?data.newOrders:[];
    const orderFallback=signalCache.orders||{count:numberFrom('#statPaid'),tokens:[]};
    const orderCount=ordersLoaded?orderRows.length:Math.max(orderRows.length,orderFallback.count,numberFrom('#statPaid'));
    const inquiryRows=Array.isArray(data.inquiries)?data.inquiries.filter(x=>['new','in_progress'].includes(String(x.inquiry_status||'new'))):[];
    return {
      orders:{count:orderCount,tokens:ordersLoaded?bounded(orderRows.map(x=>rowToken(x,'order'))):bounded([...orderFallback.tokens,...orderRows.map(x=>rowToken(x,'order'))])},
      inquiries:{count:Math.max(inq.new,signalCache.inquiries?.count||0),tokens:bounded([...(signalCache.inquiries?.tokens||[]),...inquiryRows.filter(x=>String(x.inquiry_status||'new')==='new').map(x=>rowToken(x,'inquiry'))])},
      requests:{count:Math.max(req.new,signalCache.requests?.count||0),tokens:req.new?bounded(signalCache.requests?.tokens||[]):[]},
      // Workspace/parent badges announce only records that are still New.
      // In Progress counts remain visible on their own inner status tabs.
      totals:{orders:orderCount,inquiries:inq.new,requests:req.new}
    };
  }
  function operationsVisible(){return !!$('#operationsHub.panel.active');}
  function acknowledge(signals=currentSignals()){
    const seen=readSeen();
    for(const key of ['orders','inquiries','requests']){
      const item=signals[key];
      seen[key]={tokens:bounded([...(seen[key]?.tokens||[]),...item.tokens]),count:item.count};
    }
    writeSeen(seen);
  }
  function unseenCount(signals){
    const seen=readSeen();let total=0;
    for(const key of ['orders','inquiries','requests']){
      const item=signals[key],known=seen[key]||{};
      total+=item.tokens.length?item.tokens.filter(token=>!(known.tokens||[]).includes(token)).length:Math.max(0,item.count-Number(known.count||0));
    }
    return total;
  }

  function badge(host,key,count,{group=false}={}){
    if(!host)return;
    let node=$(`:scope>.uc86-count-badge[data-uc87-count="${key}"]`,host);
    const n=Math.max(0,Number(count)||0);
    if(!n){
      if(node)node.remove();
      for(const empty of $$(':scope>.uc86-count-badge',host)){
        if(!String(empty.textContent||'').trim())empty.remove();
      }
      return;
    }
    if(!node){
      node=$(':scope>.uc86-count-badge',host)||document.createElement('span');
      node.classList.add('uc86-count-badge');
      node.dataset.uc87Count=key;
    }
    node.classList.add('uc96-notification-badge');
    node.classList.toggle('uc87-group-count',group);
    const label=capped(n);if(node.textContent!==label)node.textContent=label;
    if(node.hidden)node.hidden=false;
    if(group){
      const arrow=$(':scope>.nav-arrow',host);
      if(node.parentElement!==host||node.nextElementSibling!==arrow)host.insertBefore(node,arrow||null);
    }else if(node.parentElement!==host)host.appendChild(node);
  }
  function removeDuplicateBadges(host,keep){
    if(!host)return;
    $$(':scope>.uc86-count-badge,:scope>.nav-badge',host).forEach(node=>{if(node!==keep)node.remove();});
  }
  function paintBadges(){
    const signals=currentSignals();
    if(operationsVisible())acknowledge(signals);
    const parentCount=operationsVisible()?0:unseenCount(signals);

    badge($('[data-uc86-hub-target="orders"]'),'orders-inner',signals.totals.orders);
    badge($('[data-uc86-hub-target="leads"]'),'inquiries-inner',signals.totals.inquiries);
    badge($('[data-uc86-hub-target="requests"]'),'requests-inner',signals.totals.requests);
    badge($('[data-uc86-order="new"]'),'new-orders-inner',signals.totals.orders);

    const operationsNav=$('.side .nav [data-tab="operationsHub"]');
    badge(operationsNav,'operations-parent',parentCount);
    const groupToggle=$('.side .nav .nav-group[data-group-title="Business Ops"]>.nav-group-toggle');
    badge(groupToggle,'business-parent',parentCount,{group:true});
    // The sidebar can be rebuilding during Dashboard load. Do not search within
    // a menu toggle that the navigation builder has not mounted yet.
    const kept=groupToggle?$(':scope>.uc86-count-badge[data-uc87-count="business-parent"]',groupToggle):null;
    removeDuplicateBadges(groupToggle,kept);
    hideZeroBadges();
  }
  function hideZeroBadges(){
    for(const node of $$('.side .nav .uc86-count-badge,#operationsHub .uc86-count-badge')){
      const value=String(node.textContent||'').trim();
      if(!value||value==='0')node.remove();
    }
    for(const node of $$('.side .nav .nav-badge')){
      const value=String(node.textContent||'').trim();
      if(!value||value==='0'){
        if(node.textContent)node.textContent='';
        if(!node.hidden)node.hidden=true;
      }
    }
  }
  function installZeroBadgeGuard(){
    for(const root of [$('.side .nav .nav-group[data-group-title="Business Ops"]'),$('#operationsHub')]){
      if(!root||root.dataset.uc91ZeroBadgeGuard)continue;
      root.dataset.uc91ZeroBadgeGuard='1';
      let queued=false;
      const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']};
      const observer=new MutationObserver(()=>{
        if(queued)return;queued=true;
        requestAnimationFrame(()=>{
          queued=false;
          observer.disconnect();
          try{
            const groupToggle=$(':scope>.nav-group-toggle',root)||root;
            const keep=$(':scope>.uc86-count-badge[data-uc87-count="business-parent"]',groupToggle);
            removeDuplicateBadges(groupToggle,keep);
            hideZeroBadges();
            paintBadges();
          }finally{
            if(root.isConnected)observer.observe(root,options);
          }
        });
      });
      observer.observe(root,options);
    }
  }

  function applyOrderView(key){
    if(ORDER_KEYS.includes(key))activeOrder=key;
    const panel=$('#orders');if(!panel)return;
    $$('[data-order-bucket]',panel).forEach(card=>{
      const selected=card.dataset.orderBucket===activeOrder;
      card.hidden=!selected;
      if(selected)card.open=true;
    });
    $$('[data-uc86-order]',panel).forEach(tab=>{
      const selected=tab.dataset.uc86Order===activeOrder;
      tab.classList.toggle('active',selected);
      tab.setAttribute('aria-selected',selected?'true':'false');
    });
  }

  function wrapAfter(name,after){
    const old=window[name];if(typeof old!=='function'||old.__uc87)return;
    const fn=async function(){const result=await old.apply(this,arguments);after?.(result,arguments);return result;};
    fn.__uc87=true;if(old.__uc86)fn.__uc86=true;fn.__uc87Old=old;window[name]=fn;
  }
  function wrapOrderRoute(){
    const old=window.openOrdersBucket;if(typeof old!=='function'||old.__uc87)return;
    const fn=function(key){const wanted=ORDER_KEYS.includes(key)?key:activeOrder;const result=old.apply(this,arguments);activeOrder=wanted;setTimeout(()=>{applyOrderView(wanted);paintBadges();},0);return result;};
    fn.__uc87=true;fn.__uc86=true;fn.__uc87Old=old;window.openOrdersBucket=fn;
  }
  function wrapRouter(){
    if(routerWrapped||typeof window.tab!=='function')return;routerWrapped=true;
    const old=window.tab;
    window.tab=function(id){
      const entering=id==='operationsHub'||['orders','refunds','leads','requests'].includes(id);
      const result=old.apply(this,arguments);
      setTimeout(()=>{
        if(entering){acknowledge();if(id==='orders'||id==='operationsHub')applyOrderView(activeOrder);}
        paintBadges();
      },60);
      return result;
    };
    window.tab.__uc87=true;window.tab.__uc86=true;window.tab.__uc87Old=old;
  }
  function wrapLoaders(){
    wrapAfter('load_orders',()=>{ordersLoaded=true;applyOrderView(activeOrder);paintBadges();});
    wrapAfter('load_leads',()=>paintBadges());
    wrapAfter('load_requests',()=>paintBadges());
    wrapAfter('load_dashboard',()=>paintBadges());
  }
  function normalizeTitle(){
    const group=$('.side .nav .nav-group[data-group-title="Business Operations"]');
    if(!group)return;
    group.dataset.groupTitle='Business Ops';
    const label=$(':scope>.nav-group-toggle>span:first-child',group);if(label)label.textContent='Business Ops';
  }
  function init(){
    normalizeTitle();wrapApiCapture();wrapRouter();wrapOrderRoute();wrapLoaders();
    const selected=$('[data-uc86-order].active')?.dataset.uc86Order;if(ORDER_KEYS.includes(selected))activeOrder=selected;
    applyOrderView(activeOrder);paintBadges();installZeroBadgeGuard();
    const groupToggle=$('.side .nav .nav-group[data-group-title="Business Ops"]>.nav-group-toggle');
    if(groupToggle&&!groupToggle.dataset.uc96SeenBinding){groupToggle.dataset.uc96SeenBinding='1';groupToggle.addEventListener('click',()=>{acknowledge();setTimeout(paintBadges,0);});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900),{once:true});else setTimeout(init,900);
  setTimeout(init,6200);setTimeout(init,9200);
})();
