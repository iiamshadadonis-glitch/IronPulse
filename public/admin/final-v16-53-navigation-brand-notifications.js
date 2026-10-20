/* V16.53 — admin navigation cleanup, Brand Settings extensions, Pages/Success Stories hub,
   notification-style sidebar badges and Integrations visual-stability guard.
   This is a presentation/routing add-on only: existing panels, forms, loaders, APIs and data remain unchanged. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const BRAND_MODES={
    profile:{label:'Profile',panel:'settings',description:'Manage brand identity, logo, favicon, WhatsApp contact and admin display preferences.'},
    banners:{label:'Banners',panel:'banners',description:'Manage the existing home-page banner form and banner list.'},
    colors:{label:'Website Colors',panel:'settings',description:'Manage the existing website color controls and theme choices.'},
    social:{label:'Social Media',panel:'socials',description:'Manage the public social-media profile links shown by the website.'},
    legal:{label:'Legal Info',panel:'settings',description:'Manage the existing legal entity and tax settings.'},
    checkout:{label:'Checkout',panel:'checkoutSettings',description:'Manage the existing checkout behaviour and coupon settings.'},
    maps:{label:'Maps & Reviews',panel:'mapsReviews',description:'Manage the existing contact map and Google review settings.'},
    storage:{label:'Storage',panel:'storage',description:'Review storage capacity and the existing safe-cleanup controls.'},
    login:{label:'Login',panel:'security',description:'Manage admin display name, password, email and Google login.'}
  };
  const PANEL_MODE={settings:'profile',banners:'banners',socials:'social',checkoutSettings:'checkout',mapsReviews:'maps',storage:'storage',security:'login'};
  let activeBrandMode='profile', navObserver=null, patchTimer=0, integrationPromise=null, integrationRevealTimer=0, wrapped=false;

  function labelNode(toggle){return toggle?.querySelector(':scope > span:first-child')||toggle;}
  function groupByTitle(title){return $(`.side .nav .nav-group[data-group-title="${title}"]`);}
  function brandModeFromPanel(id){return PANEL_MODE[id]||null;}

  function setGroupTitle(group,title){
    if(!group)return; group.dataset.groupTitle=title;
    const n=labelNode($('.nav-group-toggle',group)); if(n&&n.textContent!==title)n.textContent=title;
  }
  function setButtonLabel(btn,text){
    if(!btn)return; const badge=$('.nav-badge',btn); const arrow=$('.nav-arrow',btn);
    const other=[...btn.children].filter(x=>x!==badge&&x!==arrow);
    if(other.length){const candidate=other.find(x=>!x.matches('.nav-badge,.nav-arrow'));if(candidate)candidate.textContent=text;}
    else {btn.childNodes.forEach(n=>{if(n.nodeType===3)n.remove();});btn.insertBefore(document.createTextNode(text),btn.firstChild||null);}
    if(badge&&!badge.isConnected)btn.appendChild(badge); if(arrow&&!arrow.isConnected)btn.appendChild(arrow);
  }

  function normalizeNavigation(){
    const nav=$('.side .nav'); if(!nav)return;
    let social=groupByTitle('Social Media')||groupByTitle('Website Content');
    if(social){
      setGroupTitle(social,'Social Media');
      const box=$('.nav-group-items',social);
      ['blogs','socialPosts','socialDMs','blogComments'].forEach(id=>{const b=$(`[data-tab="${id}"]`,nav);if(b&&box&&b.parentElement!==box)box.appendChild(b);});
    }
    const settings=groupByTitle('Settings');
    if(settings){
      const box=$('.nav-group-items',settings), pages=$('[data-tab="pages"]',nav), brand=$('[data-tab="settings"]',nav);
      if(pages&&box&&pages.parentElement!==box){ if(brand&&brand.parentElement===box)box.insertBefore(pages,brand); else box.appendChild(pages); }
      if(pages)setButtonLabel(pages,'Pages');
      if(brand)setButtonLabel(brand,'Brand Settings');
    }
    // Keep these original buttons in the DOM for legacy scripts, but remove them from the visible sidebar.
    ['banners','successStories','socials','checkoutSettings','mapsReviews','storage','security'].forEach(id=>{
      const b=$(`[data-tab="${id}"]`,nav);if(b){b.classList.add('uc53-merged-nav-item');b.setAttribute('aria-hidden','true');b.tabIndex=-1;}
    });
    const active=$('.panel.active')?.id||'';
    const brandOwns=!!brandModeFromPanel(active);
    const brand=$('[data-tab="settings"]',nav);if(brand)brand.classList.toggle('active',brandOwns);
    if(active==='successStories')$('[data-tab="pages"]',nav)?.classList.add('active');
    const activeSocial=['blogs','socialPosts','socialDMs','blogComments'].includes(active);
    if(social){social.classList.toggle('has-active',activeSocial);if(activeSocial)social.classList.add('open');}
    if(settings&&(brandOwns||active==='pages'||active==='successStories')){settings.classList.add('open','has-active');}
    refreshNotificationBadges();
  }

  function brandTabMarkup(mode){const m=BRAND_MODES[mode];return `<button type="button" class="uc-v1652-brand-tab" data-uc53-brand-mode="${mode}" aria-selected="false">${m.label}</button>`;}
  function ensureBrandTabs(panel,mode){
    if(!panel)return;
    if(window.__ucV1654BrandHubOwnsTabs)return; mode=mode||brandModeFromPanel(panel.id)||activeBrandMode||'profile'; activeBrandMode=mode;
    const top=$(':scope > .top',panel); const h=$('h1',top); if(h&&h.textContent!=='Brand Settings')h.textContent='Brand Settings';
    let nav=$(':scope > .uc-v1652-brand-tabs',panel);
    if(!nav){nav=document.createElement('div');nav.className='uc-v1652-brand-tabs';nav.setAttribute('role','tablist');top?.insertAdjacentElement('afterend',nav);}
    const desired=Object.keys(BRAND_MODES).map(brandTabMarkup).join(''); if(nav.innerHTML!==desired)nav.innerHTML=desired;
    $$('[data-uc53-brand-mode]',nav).forEach(b=>{const on=b.dataset.uc53BrandMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');b.onclick=()=>window.ucV1653BrandTab(b.dataset.uc53BrandMode);});
    let context=$(':scope > .uc-v1652-brand-context',panel);if(!context){context=document.createElement('div');context.className='uc-v1652-brand-context';nav.insertAdjacentElement('afterend',context);}
    const meta=BRAND_MODES[mode];const html=`<h2>${meta.label}</h2><p>${meta.description}</p>`;if(context.innerHTML!==html)context.innerHTML=html;
  }
  function patchBrandPanels(){
    if(window.__ucV1654BrandHubOwnsTabs)return;
    Object.values(BRAND_MODES).map(x=>x.panel).filter((v,i,a)=>a.indexOf(v)===i).forEach(id=>{const p=$('#'+id);if(p){let mode=brandModeFromPanel(id)||'profile';if(id==='settings'&&['profile','colors','legal'].includes(activeBrandMode))mode=activeBrandMode;ensureBrandTabs(p,mode);}});
  }
  const oldBrandTab=window.ucV1652BrandTab;
  window.ucV1653BrandTab=function(mode){
    if(!BRAND_MODES[mode])mode='profile';activeBrandMode=mode;
    if(['profile','colors','legal','checkout','maps','storage','login'].includes(mode)&&typeof oldBrandTab==='function'){
      oldBrandTab(mode);
      setTimeout(()=>{patchBrandPanels();normalizeNavigation();},50);return;
    }
    const target=BRAND_MODES[mode].panel;if(typeof window.tab==='function')window.tab(target);
    setTimeout(()=>{ensureBrandTabs($('#'+target),mode);normalizeNavigation();},40);
  };
  window.ucV1652BrandTab=window.ucV1653BrandTab;

  function ensurePagesHub(){
    const pages=$('#pages'), stories=$('#successStories');
    if(pages){
      const top=$(':scope > .top',pages);const h=$('h1',top);if(h)h.textContent='Pages';
      let tabs=$(':scope > .uc-v1634-pages-tabs',pages);if(tabs&&!$('[data-uc53-success-stories]',tabs)){
        const b=document.createElement('button');b.type='button';b.className='pill';b.dataset.uc53SuccessStories='1';b.textContent='Success Stories';b.onclick=()=>window.ucV1653PagesTab('success');tabs.appendChild(b);
      }
      if(tabs)$('[data-uc53-success-stories]',tabs)?.classList.remove('active');
    }
    if(stories){
      const top=$(':scope > .top',stories);const h=$('h1',top);if(h)h.textContent='Pages';
      let tabs=$(':scope > .uc-v1653-pages-tabs',stories);if(!tabs){tabs=document.createElement('div');tabs.className='tabs uc-v1634-pages-tabs uc-v1653-pages-tabs';top?.insertAdjacentElement('afterend',tabs);}
      tabs.innerHTML='<button class="pill" type="button" data-uc53-pages="new">New Page</button><button class="pill" type="button" data-uc53-pages="existing">Existing Pages</button><button class="pill active" type="button" data-uc53-pages="success">Success Stories</button>';
      $$('[data-uc53-pages]',tabs).forEach(b=>b.onclick=()=>window.ucV1653PagesTab(b.dataset.uc53Pages));
    }
  }
  window.ucV1653PagesTab=function(mode){
    if(mode==='success'){window.tab?.('successStories');setTimeout(()=>{ensurePagesHub();normalizeNavigation();},40);return;}
    window.tab?.('pages');setTimeout(()=>{ensurePagesHub();$(`#pages [data-page-workspace="${mode==='new'?'new':'existing'}"]`)?.click();normalizeNavigation();},55);
  };

  function numericBadgeValue(b){
    if(!b||b.hidden||getComputedStyle(b).display==='none')return 0;
    const nums=String(b.textContent||'').match(/-?\d+/g)||[];return nums.reduce((s,x)=>s+Math.abs(Number(x)||0),0);
  }
  function normalizeChildBadge(btn){
    const b=$('.nav-badge',btn);if(!b)return 0;const n=numericBadgeValue(b);
    if(n>0){const t=n>99?'99+':String(n);if(b.textContent!==t)b.textContent=t;if(b.hidden)b.hidden=false;b.classList.add('uc53-notification-badge');}
    else{if(!b.hidden)b.hidden=true;if(b.textContent)b.textContent='';b.classList.add('uc53-notification-badge');}
    return n;
  }
  function groupNotify(group,ids){
    if(!group)return;let total=0;ids.forEach(id=>{const b=$(`[data-tab="${id}"]`,group);if(b&&!b.classList.contains('uc53-merged-nav-item'))total+=normalizeChildBadge(b);});
    const toggle=$('.nav-group-toggle',group);if(!toggle)return;toggle.querySelectorAll('.uc-v11-group-badge').forEach(x=>x.remove());
    let badge=$('.uc53-group-notification',toggle);if(!badge){badge=document.createElement('span');badge.className='uc53-group-notification';const arrow=$('.nav-arrow',toggle);if(arrow)toggle.insertBefore(badge,arrow);else toggle.appendChild(badge);}
    const t=total>99?'99+':String(total);if(badge.textContent!==t)badge.textContent=t;if(badge.hidden===!!total)badge.hidden=!total;
  }
  function refreshNotificationBadges(){
    const orders=groupByTitle('Orders & Leads');if(orders)groupNotify(orders,['orders','refunds','leads','requests']);
    const social=groupByTitle('Social Media')||groupByTitle('Website Content');if(social)groupNotify(social,['blogs','socialPosts','socialDMs','blogComments']);
  }

  function integrationPanel(){return $('#socialMediaIntegrations');}
  function beginIntegrationStability(){if(window.__ucV1654StableIntegrations)return;const p=integrationPanel();if(p){p.classList.add('uc53-integrations-stabilizing');p.setAttribute('aria-busy','true');}}
  function endIntegrationStability(delay=520){if(window.__ucV1654StableIntegrations)return;clearTimeout(integrationRevealTimer);integrationRevealTimer=setTimeout(()=>{const p=integrationPanel();if(p){p.classList.remove('uc53-integrations-stabilizing');p.removeAttribute('aria-busy');normalizeNavigation();}},delay);}
  function wrapIntegrationLoader(){
    if(window.__ucV1654StableIntegrations)return;
    const old=window.load_socialMediaIntegrations;if(typeof old!=='function'||old.__uc53)return;
    const fn=async function(){
      if(integrationPromise)return integrationPromise;
      beginIntegrationStability();
      integrationPromise=(async()=>{try{return await old.apply(this,arguments);}finally{integrationPromise=null;endIntegrationStability(560);}})();
      return integrationPromise;
    };fn.__uc53=true;fn.__uc53Old=old;window.load_socialMediaIntegrations=fn;
  }
  function wrapTab(){
    if(window.__ucV1654OwnTabRouter)return;
    if(wrapped||typeof window.tab!=='function')return;wrapped=true;const old=window.tab;
    window.tab=function(id){
      if(id==='socialMediaIntegrations')beginIntegrationStability();
      if(id==='settings'&&!['profile','colors','legal'].includes(activeBrandMode))activeBrandMode='profile';
      const r=old.apply(this,arguments);
      if(id==='banners')activeBrandMode='banners'; else if(id==='socials')activeBrandMode='social'; else if(id==='checkoutSettings')activeBrandMode='checkout'; else if(id==='mapsReviews')activeBrandMode='maps'; else if(id==='storage')activeBrandMode='storage'; else if(id==='security')activeBrandMode='login';
      setTimeout(()=>{normalizeNavigation();patchBrandPanels();ensurePagesHub();if(id==='socialMediaIntegrations')endIntegrationStability(620);},50);
      return r;
    };
  }

  function patchGuidanceText(){
    $$('small,p,.hint,.notice,.error,details summary,label').forEach(el=>{
      if(el.closest('#loginOverlay'))return;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(n=>{let s=n.nodeValue;s=s.replace(/Website Content\s*→\s*Posts/gi,'Social Media → Posts').replace(/Website Content\s*→\s*Auditions/gi,'Social Media → Articles');if(s!==n.nodeValue)n.nodeValue=s;});
    });
  }
  function schedulePatch(){clearTimeout(patchTimer);patchTimer=setTimeout(()=>{normalizeNavigation();patchBrandPanels();ensurePagesHub();patchGuidanceText();refreshNotificationBadges();},45);}
  function observeNav(){
    const nav=$('.side .nav');if(!nav||navObserver)return;navObserver=new MutationObserver(m=>{if(m.some(x=>x.type==='childList'||x.type==='characterData'||x.attributeName==='hidden'))schedulePatch();});navObserver.observe(nav,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
  }
  function init(){wrapIntegrationLoader();wrapTab();normalizeNavigation();patchBrandPanels();ensurePagesHub();patchGuidanceText();refreshNotificationBadges();observeNav();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,2050),{once:true});else setTimeout(init,2050);
  setTimeout(init,2850);setTimeout(()=>{normalizeNavigation();patchBrandPanels();ensurePagesHub();refreshNotificationBadges();},4700);
})();
