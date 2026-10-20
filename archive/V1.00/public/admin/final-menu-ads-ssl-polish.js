/* Final requested admin menu naming, Ad Integrations panel, Home Banners grid fix. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  const LABELS={
    search:'Search',
    customSubscription:'Create Subscription', products:'', bulk:'Bulk Import', placements:'Product Placements',
    orders:'Orders', refunds:'Refunds', leads:'Contact Leads', requests:'Requests', subscribers:'Subscribers', unsubscribed:'Unsubscribed', oneTimeUsers:'One-Time Users', favorites:'Favorites',
    pages:'Pages', blogs:'', socialPosts:'Posts', socialDMs:'Inbox', blogComments:'Comments', socialAutomations:'Automations',
    tracking:'Tracking', socialMediaIntegrations:'Integrations', settings:'Brand Settings'
  };
  // Keep this older menu builder aligned with the V16.62 authoritative navigation so
  // its delayed init timers cannot flash or restore retired menu groups after login.
  const GROUPS=[
    ['Sales',['customSubscription','products','bulk','placements']],
    ['Orders & Leads',['orders','refunds','leads','requests']],
    ['Customers',['subscribers','unsubscribed','oneTimeUsers','favorites']],
    ['Social Media',['blogs','socialPosts','socialDMs','blogComments','socialAutomations']],
    ['Settings',['pages','tracking','socialMediaIntegrations','settings']]
  ];

  function setBtnLabel(btn,label){
    if(!btn)return;
    const shared={blogs:'blog',products:'offers',successStories:'stories'}[btn.dataset.tab];
    if(shared){window.DropBeatDynamicUI?.label(btn,shared);return;}
    const badge=btn.querySelector('.nav-badge');
    btn.textContent=label;
    if(badge) btn.appendChild(badge);
  }
  function ensureNavButton(id,label){
    let btn=$(`[data-tab="${id}"]`);
    if(!btn){
      btn=document.createElement('button');
      btn.dataset.tab=id;
      const badge=document.createElement('span');
      badge.className='nav-badge';
      badge.id='badge_'+id;
      badge.hidden=true;
      btn.appendChild(badge);
    }
    setBtnLabel(btn,label);
    btn.onclick=()=>window.tab(id);
    return btn;
  }
  function ensureAdIntegrationsPanel(){
    if($('#adIntegrations')) return;
    const main=$('main.main'); if(!main) return;
    const panel=document.createElement('section');
    panel.id='adIntegrations';
    panel.className='panel';
    panel.innerHTML=`
      <div class="top"><h1>Ad Integrations</h1><button class="btn secondary compact" type="button" onclick="load_adIntegrations()">Refresh</button></div>
      <div class="notice">Paste the ad-network code given by Google AdSense or another ad network. This is for website ad-network integration only; individual advertisement placements inside Fitness Tips can still be managed from the Fitness Tips page.</div>
      <form id="adIntegrationsForm" class="form" onsubmit="saveAdIntegrations(event)">
        <details class="card pay-detail"><summary>Google AdSense</summary>
          <label class="check"><input type="checkbox" name="googleAdsenseEnabled"> Enable Google AdSense</label>
          <div class="field"><label>Publisher ID Optional</label><input name="googleAdsensePublisherId" placeholder="ca-pub-1234567890123456"><small class="hint">Paste your AdSense publisher ID if you have it. It usually starts with ca-pub-.</small></div>
          <div class="field"><label>Header Code</label><textarea name="googleAdsenseHeadCode" rows="5" placeholder="Paste AdSense script code that Google asks you to place in the head section"></textarea><small class="hint">Use this for the main AdSense verification/loader script.</small></div>
          <div class="field"><label>Body / Auto Ads Code Optional</label><textarea name="googleAdsenseBodyCode" rows="4" placeholder="Paste additional AdSense code if Google gives a body snippet"></textarea><small class="hint">Leave blank if AdSense only provides one script.</small></div>
          <div class="field"><label>Internal Notes Optional</label><input name="googleAdsenseNotes" placeholder="Example: AdSense account approved on date"></div>
        </details>
        <details class="card pay-detail"><summary>Other Ad Networks</summary>
          <div class="row">
            <label class="check"><input type="checkbox" name="adsterraEnabled"> Enable Adsterra</label>
            <label class="check"><input type="checkbox" name="mediaNetEnabled"> Enable Media.net / Similar Network</label>
          </div>
          <div class="field"><label>Adsterra Header Code</label><textarea name="adsterraHeadCode" rows="4" placeholder="Paste Adsterra header/script code"></textarea></div>
          <div class="field"><label>Adsterra Body Code Optional</label><textarea name="adsterraBodyCode" rows="4" placeholder="Paste Adsterra body/widget code if available"></textarea></div>
          <div class="field"><label>Media.net / Similar Network Header Code</label><textarea name="mediaNetHeadCode" rows="4" placeholder="Paste ad-network header code"></textarea></div>
          <div class="field"><label>Media.net / Similar Network Body Code Optional</label><textarea name="mediaNetBodyCode" rows="4" placeholder="Paste body/widget code if available"></textarea></div>
        </details>
        <details class="card pay-detail"><summary>Custom Ad Network</summary>
          <label class="check"><input type="checkbox" name="customAdEnabled"> Enable Custom Ad Network</label>
          <div class="field"><label>Network Name</label><input name="customAdNetworkName" placeholder="Other Ad Network"></div>
          <div class="field"><label>Custom Header Code</label><textarea name="customAdHeadCode" rows="5" placeholder="Paste the ad network code that should load in the page head"></textarea></div>
          <div class="field"><label>Custom Body Code Optional</label><textarea name="customAdBodyCode" rows="5" placeholder="Paste body/widget code if the ad network gives one"></textarea></div>
          <div class="field"><label>Internal Notes Optional</label><input name="customAdNotes" placeholder="Any internal setup note"></div>
        </details>
        <div class="form-actions"><button class="btn compact" type="submit">Save Ad Integrations</button></div>
        <div id="adIntegrationsMsg"></div>
      </form>`;
    main.appendChild(panel);
  }
  function cleanCode(v){ return String(v||'').trim(); }
  function currentSettings(){ return A.settings || {}; }
  window.load_adIntegrations=async function(){
    if(!A.settings && window.load_settings) await load_settings();
    ensureAdIntegrationsPanel();
    const f=$('#adIntegrationsForm'); if(!f) return;
    const ai=(currentSettings().adIntegrations||{});
    const g=ai.googleAdsense||{}, a=ai.adsterra||{}, m=ai.mediaNet||{}, c=ai.custom||{};
    f.googleAdsenseEnabled.checked=!!g.enabled;
    f.googleAdsensePublisherId.value=g.publisherId||'';
    f.googleAdsenseHeadCode.value=g.headCode||'';
    f.googleAdsenseBodyCode.value=g.bodyCode||'';
    f.googleAdsenseNotes.value=g.notes||'';
    f.adsterraEnabled.checked=!!a.enabled;
    f.adsterraHeadCode.value=a.headCode||'';
    f.adsterraBodyCode.value=a.bodyCode||'';
    f.mediaNetEnabled.checked=!!m.enabled;
    f.mediaNetHeadCode.value=m.headCode||'';
    f.mediaNetBodyCode.value=m.bodyCode||'';
    f.customAdEnabled.checked=!!c.enabled;
    f.customAdNetworkName.value=c.networkName||'Other Ad Network';
    f.customAdHeadCode.value=c.headCode||'';
    f.customAdBodyCode.value=c.bodyCode||'';
    f.customAdNotes.value=c.notes||'';
  };
  window.saveAdIntegrations=async function(e){
    e.preventDefault();
    const f=e.target;
    const adIntegrations={
      googleAdsense:{enabled:!!f.googleAdsenseEnabled.checked,publisherId:cleanCode(f.googleAdsensePublisherId.value),headCode:cleanCode(f.googleAdsenseHeadCode.value),bodyCode:cleanCode(f.googleAdsenseBodyCode.value),notes:cleanCode(f.googleAdsenseNotes.value)},
      adsterra:{enabled:!!f.adsterraEnabled.checked,headCode:cleanCode(f.adsterraHeadCode.value),bodyCode:cleanCode(f.adsterraBodyCode.value),notes:''},
      mediaNet:{enabled:!!f.mediaNetEnabled.checked,headCode:cleanCode(f.mediaNetHeadCode.value),bodyCode:cleanCode(f.mediaNetBodyCode.value),notes:''},
      custom:{enabled:!!f.customAdEnabled.checked,networkName:cleanCode(f.customAdNetworkName.value)||'Other Ad Network',headCode:cleanCode(f.customAdHeadCode.value),bodyCode:cleanCode(f.customAdBodyCode.value),notes:cleanCode(f.customAdNotes.value)}
    };
    A.settings={...(A.settings||{}),adIntegrations};
    try{
      await api('/api/admin/settings',{method:'POST',body:JSON.stringify(A.settings)});
      const box=$('#adIntegrationsMsg'); if(box) box.innerHTML='<div class="notice">Ad integrations saved successfully.</div>';
    }catch(err){
      const box=$('#adIntegrationsMsg'); if(box) box.innerHTML=`<div class="error">${H(err.message||'Could not save ad integrations.')}</div>`;
    }
  };

  function buildRequestedNav(){
    ensureAdIntegrationsPanel();
    const nav=$('.side .nav'); if(!nav)return;
    const buttons={};
    nav.querySelectorAll('button[data-tab]').forEach(btn=>{ buttons[btn.dataset.tab]=btn; });
    Object.entries(LABELS).forEach(([id,label])=>{ buttons[id]=ensureNavButton(id,label); });
    nav.innerHTML='';
    const dashboard=buttons.dashboard || ensureNavButton('dashboard','Dashboard');
    dashboard.className='';
    dashboard.onclick=()=>window.tab('dashboard');
    setBtnLabel(dashboard,'Dashboard');
    nav.appendChild(dashboard);
    const search=buttons.search || ensureNavButton('search','Search');
    search.className='';
    search.onclick=()=>window.tab('search');
    setBtnLabel(search,'Search');
    nav.appendChild(search);
    GROUPS.forEach(([title,ids])=>{
      const items=ids.map(id=>buttons[id]).filter(Boolean);
      if(!items.length)return;
      const group=document.createElement('div'); group.className='nav-group'; group.dataset.groupTitle=title;
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='nav-group-toggle'; toggle.innerHTML=`<span>${H(title)}</span><span class="nav-arrow">⌄</span>`;
      const itemBox=document.createElement('div'); itemBox.className='nav-group-items';
      items.forEach(btn=>{ btn.className='nav-subitem'; setBtnLabel(btn,LABELS[btn.dataset.tab]||btn.textContent); btn.onclick=()=>{window.tab(btn.dataset.tab); group.classList.add('open');}; itemBox.appendChild(btn); });
      toggle.onclick=()=>{const open=!group.classList.contains('open'); $$('.nav-group').forEach(g=>g!==group&&g.classList.remove('open')); group.classList.toggle('open',open);};
      group.append(toggle,itemBox); nav.appendChild(group);
    });
    nav.dataset.grouped='requested';
    setActiveGroup($('.panel.active')?.id || 'dashboard');
  }
  function setActiveGroup(id){
    $$('.side .nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
    $$('.nav-group').forEach(g=>{const has=!!g.querySelector(`[data-tab="${id}"]`);g.classList.toggle('has-active',has);g.classList.toggle('open',has);});
  }
  const previousTab=window.tab;
  window.tab=function(id){
    if(typeof previousTab==='function') previousTab(id);
    normalizePanelNames();
    setActiveGroup(id);
    if(id==='adIntegrations') load_adIntegrations();
    if(id==='socialMediaIntegrations' && typeof window.load_socialMediaIntegrations==='function') window.load_socialMediaIntegrations();
    if(id==='storage' && typeof window.loadUCStorage==='function') window.loadUCStorage();
    if(id==='requests' && typeof window.load_requests==='function') window.load_requests();
  };

  function normalizePanelNames(){
    const banners=$('#banners');
    if(banners){
      banners.querySelectorAll('h1,h2,h3,summary,th,button,label,small,p').forEach(el=>{
        if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
          el.textContent=el.textContent
            .replace(/Home Page Banners/g,'Home Banners')
            .replace(/Home Page Banner/g,'Home Banner')
            .replace(/home page banner/g,'home banner')
            .replace(/Home page banner/g,'Home banner');
        }
      });
      const ft=$('#bannerFormTitle'); if(ft) ft.textContent=ft.textContent.replace(/Home Page Banner/g,'Home Banner').replace(/Hero Banner/g,'Home Banner');
    }
    const headingMap={
      customSubscription:'Create Subscription', placements:'Product Placements', leads:'Contact Leads', requests:'Requests', unsubscribed:'Unsubscribed', oneTimeUsers:'One-Time Users', favorites:'Favorites', blogs:'', tracking:'Tracking', socialMediaIntegrations:'Integrations', settings:'Brand Settings'
    };
    Object.entries(headingMap).forEach(([id,title])=>{ const h=$(`#${id} .top h1`); if(h) h.textContent=title; });
  }

  window.load_banners=async function(){
    const res=await api('/api/admin/banners');
    A.banners=res.banners||[];
    const box=$('#bannerTable'); if(!box)return;
    const rows=A.banners.length?A.banners.map(b=>`
      <div class="uc-grid-row">
        <div class="uc-grid-cell text-cell"><strong>${H(b.title)}</strong><br><small>${H(b.subtitle||'')}</small></div>
        <div class="uc-grid-cell"><img class="preview-img" src="${H(b.desktop_image_url||'/assets/gym-hero.jpg')}" alt=""></div>
        <div class="uc-grid-cell text-cell"><small>${H(b.link_type)}: ${H(b.link_value||'')}</small></div>
        <div class="uc-grid-cell"><span class="status ${b.visible?'active':'draft'}">${b.visible?'visible':'hidden'}</span></div>
        <div class="uc-grid-cell"><div class="sort-actions nowrap"><button class="btn secondary small icon-action" title="Move up" onclick="moveBanner(${b.id},-1)">↑</button><button class="btn secondary small icon-action" title="Move down" onclick="moveBanner(${b.id},1)">↓</button></div></div>
        <div class="uc-grid-cell"><div class="action-row nowrap"><button class="btn secondary small icon-action" title="Edit" onclick="editBanner(${b.id})">✎</button><button class="btn danger small icon-action" title="Delete" onclick="deleteBanner(${b.id})">×</button></div></div>
      </div>`).join(''):`<div class="uc-grid-row empty-row"><div class="uc-grid-cell" style="grid-column:1/-1">No home banners added yet.</div></div>`;
    box.classList.add('home-banner-grid-wrap');
    box.innerHTML=`<div class="uc-table-grid home-banner-grid">
      <div class="uc-grid-head">Home Banner</div><div class="uc-grid-head">Image</div><div class="uc-grid-head">Link</div><div class="uc-grid-head">Status</div><div class="uc-grid-head">Sort</div><div class="uc-grid-head">Actions</div>${rows}
    </div>`;
    normalizePanelNames();
  };

  // Keep banner form help text aligned with high-quality homepage background use.
  function polishBannerHelp(){
    const d=$('#bannerForm [name="desktop_image"]')?.closest('.field')?.querySelector('.hint');
    if(d) d.textContent='Recommended size: 2560 × 960 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB. This becomes the full-width home banner background.';
    const m=$('#bannerForm [name="mobile_image"]')?.closest('.field')?.querySelector('.hint');
    if(m) m.textContent='Recommended size: 1440 × 1800 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB. Used for mobile home banner background.';
  }

  function init(){
    ensureAdIntegrationsPanel();
    buildRequestedNav();
    normalizePanelNames();
    polishBannerHelp();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,300));
  else setTimeout(init,300);
  setTimeout(init,900);
  setTimeout(init,1600);
})();
