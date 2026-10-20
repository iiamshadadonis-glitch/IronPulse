/* V16.52 — Brand Settings hub.
   Presentation-only reorganization: Checkout, Maps & Reviews, Storage and Admin Security
   keep their existing panels/loaders/APIs, but are reached from Brand Settings sub-tabs.
   Existing business logic, credentials and theme values are intentionally untouched. */
(function(){
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const MODES={
    profile:{label:'Profile',panel:'settings',description:'Manage brand identity, logo, favicon, WhatsApp contact and admin display preferences.'},
    colors:{label:'Website Colors',panel:'settings',description:'Manage the existing website color controls and theme choices.'},
    legal:{label:'Legal Info',panel:'settings',description:'Manage the existing legal entity and tax settings.'},
    checkout:{label:'Checkout',panel:'checkoutSettings',description:'Manage the existing checkout behaviour and coupon settings.'},
    maps:{label:'Maps & Reviews',panel:'mapsReviews',description:'Manage the existing contact map and Google review settings.'},
    storage:{label:'Storage',panel:'storage',description:'Review storage capacity and the existing safe-cleanup controls.'},
    login:{label:'Login',panel:'security',description:'Manage admin display name, password, email and Google login.'}
  };
  const PANEL_MODE={settings:'profile',checkoutSettings:'checkout',mapsReviews:'maps',storage:'storage',security:'login'};
  const HIDDEN_NAV=new Set(['checkoutSettings','mapsReviews','storage','security']);
  let currentMode='profile', tabWrapped=false, formObserver=null, navObserver=null, scheduled=0;

  function panelForMode(mode){return $('#'+(MODES[mode]?.panel||'settings'));}
  function modeForPanel(id){return PANEL_MODE[id]||null;}
  function selectedModeForPanel(id){
    if(id==='settings'&&['profile','colors','legal'].includes(currentMode))return currentMode;
    return modeForPanel(id)||'profile';
  }
  function buttonMarkup(mode){const m=MODES[mode];return `<button type="button" class="uc-v1652-brand-tab" data-brand-mode="${mode}" aria-selected="false">${m.label}</button>`;}

  function ensureBrandTabs(panel){
    if(!panel)return null;
    if(window.__ucV1654BrandHubOwnsTabs)return panel.querySelector(':scope > .uc-v1652-brand-tabs');
    const top=$(':scope > .top',panel);
    if(top){
      const h=$('h1',top);if(h&&h.textContent!=='Brand Settings')h.textContent='Brand Settings';
    }
    let nav=$(':scope > .uc-v1652-brand-tabs',panel);
    if(!nav){
      nav=document.createElement('div');nav.className='uc-v1652-brand-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Brand Settings sections');
      nav.innerHTML=Object.keys(MODES).map(buttonMarkup).join('');
      if(top)top.insertAdjacentElement('afterend',nav);else panel.prepend(nav);
      nav.addEventListener('click',e=>{const b=e.target.closest('[data-brand-mode]');if(b)window.ucV1652BrandTab(b.dataset.brandMode);});
    }
    const active=selectedModeForPanel(panel.id);
    $$('[data-brand-mode]',nav).forEach(b=>{const on=b.dataset.brandMode===active;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');});
    let context=$(':scope > .uc-v1652-brand-context',panel);
    if(!context){
      context=document.createElement('div');context.className='uc-v1652-brand-context';nav.insertAdjacentElement('afterend',context);
    }
    const meta=MODES[active]||MODES.profile;
    const desired=`<h2>${meta.label}</h2><p>${meta.description}</p>`;
    if(context.innerHTML!==desired)context.innerHTML=desired;
    return nav;
  }

  function rootMode(el){
    if(el.matches?.('.uc-v7-theme-details,.uc-theme-builder')||el.querySelector?.('.uc-v7-theme-details,.uc-theme-builder'))return 'colors';
    if(el.matches?.('.uc-v9-legal-entity,.uc-v160-taxes-card')||el.querySelector?.('.uc-v9-legal-entity,.uc-v160-taxes-card'))return 'legal';
    if(el.matches?.('.form-actions,#settingsMsg')||el.id==='settingsMsg')return 'shared';
    return 'profile';
  }
  function settingsSections(form){const body=form.querySelector(':scope>.db138-form-content');return Array.from((body||form).children).filter(el=>!el.matches('.db138-review,.db138-page-header,.db137-wizard-progress,.db137-wizard-nav'));}
  function classifySettingsForm(){
    const form=$('#settings form');if(!form)return;
    settingsSections(form).forEach(el=>{
      const next=rootMode(el);
      if(el.dataset.ucV1652Section!==next)el.dataset.ucV1652Section=next;
    });
  }
  function applySettingsMode(mode){
    if(!['profile','colors','legal'].includes(mode))mode='profile';
    currentMode=mode;
    const panel=$('#settings');if(!panel)return;
    classifySettingsForm();
    const form=$('form',panel);if(form){
      settingsSections(form).forEach(el=>{
        const section=el.dataset.ucV1652Section||rootMode(el);
        const visible=section==='shared'||section===mode;
        el.classList.toggle('uc-v1652-section-hidden',!visible);
        el.setAttribute('aria-hidden',visible?'false':'true');
      });
    }
    ensureBrandTabs(panel);
  }

  window.ucV1652ApplySettingsMode=function(mode){ currentMode=['profile','colors','legal'].includes(mode)?mode:'profile'; applySettingsMode(currentMode); };

  function loadTarget(mode){
    const id=MODES[mode]?.panel;if(!id)return;
    if(id==='settings'){
      setTimeout(()=>{applySettingsMode(mode);ensureBrandTabs($('#settings'));},30);
      setTimeout(()=>{classifySettingsForm();applySettingsMode(mode);},220);
      setTimeout(()=>{classifySettingsForm();applySettingsMode(mode);},900);
    } else {
      currentMode=mode;
      setTimeout(()=>{ensureBrandTabs($('#'+id));normalizeSidebar();},30);
      setTimeout(()=>{ensureBrandTabs($('#'+id));normalizeSidebar();},250);
      setTimeout(()=>{ensureBrandTabs($('#'+id));normalizeSidebar();},900);
      setTimeout(()=>{ensureBrandTabs($('#'+id));normalizeSidebar();},1800);
    }
  }

  window.ucV1652BrandTab=function(mode){
    if(!MODES[mode])mode='profile';
    currentMode=mode;
    const target=MODES[mode].panel;
    if(typeof window.tab==='function')window.tab(target);
    loadTarget(mode);
  };

  function normalizeSidebar(){
    const nav=$('.side .nav');if(!nav)return;
    $$('button[data-tab]',nav).forEach(b=>{
      if(HIDDEN_NAV.has(b.dataset.tab))b.remove();
      if(b.dataset.tab==='settings'){
        const badge=b.querySelector('.nav-badge');
        b.childNodes.forEach(n=>{if(n.nodeType===3)n.nodeValue='';});
        const label=b.querySelector('span:not(.nav-badge):not(.nav-arrow)');
        if(label)label.textContent='Brand Settings';
        else if(!b.querySelector('.nav-arrow')){b.textContent='Brand Settings';if(badge)b.appendChild(badge);}
      }
    });
    const settingsGroup=$('.nav-group[data-group-title="Settings"]',nav);
    if(settingsGroup&&!settingsGroup.querySelector('button[data-tab="settings"]')){
      const b=document.createElement('button');b.type='button';b.className='nav-subitem';b.dataset.tab='settings';b.textContent='Brand Settings';b.onclick=()=>window.ucV1652BrandTab('profile');
      $('.nav-group-items',settingsGroup)?.appendChild(b);
    }
    const activeId=$('.panel.active')?.id||'';
    const brandOwns=!!modeForPanel(activeId);
    const brandBtn=$('button[data-tab="settings"]',nav);
    if(brandBtn){brandBtn.classList.toggle('active',brandOwns);brandBtn.onclick=()=>window.ucV1652BrandTab('profile');}
    if(settingsGroup&&brandOwns){settingsGroup.classList.add('open','has-active');}
  }

  function ensureAllExistingPanels(){
    ['settings','checkoutSettings','mapsReviews','storage','security'].forEach(id=>{const p=$('#'+id);if(p)ensureBrandTabs(p);});
  }


  function wrapLoaders(){
    const names={
      load_checkoutSettings:'checkoutSettings',
      load_mapsReviews:'mapsReviews',
      loadUCStorage:'storage',
      load_security:'security',
      load_settings:'settings'
    };
    Object.entries(names).forEach(([name,id])=>{
      const old=window[name];if(typeof old!=='function'||old.__ucV1652)return;
      const wrapped=async function(){
        const r=await old.apply(this,arguments);
        setTimeout(()=>{ensureBrandTabs($('#'+id));if(id==='settings')applySettingsMode(currentMode);normalizeSidebar();},20);
        setTimeout(()=>{ensureBrandTabs($('#'+id));if(id==='settings')applySettingsMode(currentMode);},180);
        return r;
      };
      wrapped.__ucV1652=true;wrapped.__ucV1652Old=old;window[name]=wrapped;
    });
  }

  function patchTab(){
    if(window.__ucV1654OwnTabRouter)return;
    if(tabWrapped||typeof window.tab!=='function')return;
    const old=window.tab;
    const wrapped=function(id){
      const mode=modeForPanel(id);
      if(mode){
        if(id!=='settings')currentMode=mode;
        else if(!['profile','colors','legal'].includes(currentMode))currentMode='profile';
      }
      const r=old.apply(this,arguments);
      normalizeSidebar();
      if(mode)loadTarget(id==='settings'?currentMode:mode);
      return r;
    };
    wrapped.__ucV1652=true;wrapped.__ucV1652Old=old;window.tab=wrapped;tabWrapped=true;
  }

  function observe(){
    const nav=$('.side .nav');
    if(nav&&!navObserver){navObserver=new MutationObserver(()=>{clearTimeout(scheduled);scheduled=setTimeout(normalizeSidebar,20);});navObserver.observe(nav,{childList:true,subtree:true});}
    const form=$('#settings form');
    if(form&&(!formObserver||formObserver.__target!==form)){
      formObserver?.disconnect?.();
      formObserver=new MutationObserver(()=>{clearTimeout(scheduled);scheduled=setTimeout(()=>{classifySettingsForm();if($('#settings')?.classList.contains('active'))applySettingsMode(currentMode);},30);});
      formObserver.__target=form;formObserver.observe(form,{childList:true,subtree:false});
    }
  }

  function init(){
    // V16.54 owns Brand Settings routing. Keep only the existing sidebar normalization here;
    // do not wrap loaders, observe/rewrite the settings form, or re-apply the legacy Profile mode.
    if(window.__ucV1654BrandHubOwnsTabs){normalizeSidebar();return;}
    wrapLoaders();patchTab();normalizeSidebar();ensureAllExistingPanels();observe();
    if($('#settings')?.classList.contains('active'))applySettingsMode(currentMode);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1850));else setTimeout(init,1850);
  setTimeout(init,2600);setTimeout(init,4300);setTimeout(init,7000);
})();
