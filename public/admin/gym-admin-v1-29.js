/* DropBeat V1.29 — immediate appearance controls and brand-colour propagation.
   Presentation only: existing settings, banner and save APIs remain authoritative. */
(()=>{
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>Array.from(root?.querySelectorAll?.(selector)||[]);
  const THEMES={
    dropbeat:{name:'IronPulse Original',description:'The current gym layout with the cinematic hero and gym image gallery.',primary:'#4B55BE',accent:'#A469A8',gallery:true,preview:'stage'},
    casting:{name:'Casting Editorial',description:'A warm editorial layout inspired by the supplied casting-site reference, with rounded cards and a bold full-width hero.',primary:'#9F1239',accent:'#FBBF24',gallery:false,preview:'casting'},
    spotlight:{name:'Gym Spotlight',description:'A high-impact performance layout with cinematic sections, strong typography and the managed gym gallery.',primary:'#111827',accent:'#F43F5E',gallery:true,preview:'spotlight'},
    minimal:{name:'Modern Minimal',description:'A clean, spacious class catalogue with restrained decoration and simplified home sections.',primary:'#0F766E',accent:'#D97706',gallery:false,preview:'minimal'}
  };
  const validHex=value=>/^#[0-9a-f]{6}$/i.test(String(value||'').trim());
  const hex=value=>validHex(value)?String(value).toUpperCase():'#4B55BE';
  function rgb(value){const clean=hex(value).slice(1);return [0,2,4].map(i=>parseInt(clean.slice(i,i+2),16));}
  function shade(value,amount){const [r,g,b]=rgb(value),mix=amount<0?0:255,p=Math.abs(amount);return '#'+[r,g,b].map(v=>Math.round(v+(mix-v)*p).toString(16).padStart(2,'0')).join('').toUpperCase();}
  function settings(){try{return window.dropbeatAdminState?.settings||window.__ucLatestSettings||{};}catch(_){return window.__ucLatestSettings||{};}}
  function selectedTheme(){const input=$('#settings [name="frontendTheme"]'),value=String(input?.value||settings().frontendTheme||'dropbeat');return THEMES[value]?value:'dropbeat';}

  function applyAdminBrand(source=settings()){
    const primary=hex(source.primaryColor||'#4B55BE'),accent=hex(source.accentColor||'#A469A8'),root=document.documentElement.style;
    document.documentElement.dataset.adminBrandCustom=String(primary!=='#4B55BE'||accent!=='#A469A8');
    root.setProperty('--dropbeat-primary',primary);root.setProperty('--dropbeat-accent',accent);
    root.setProperty('--primary',primary);root.setProperty('--accent',accent);root.setProperty('--blue',primary);root.setProperty('--gold',accent);root.setProperty('--pink',accent);
    root.setProperty('--db129-primary',primary);root.setProperty('--db129-primary-mid',shade(primary,-.24));root.setProperty('--db129-primary-deep',shade(primary,-.52));
    root.setProperty('--db129-primary-rgb',rgb(primary).join(','));root.setProperty('--db129-accent-rgb',rgb(accent).join(','));
  }
  const priorBrand=window.applyDropBeatAdminBrand;
  window.applyDropBeatAdminBrand=function(){const result=typeof priorBrand==='function'?priorBrand.apply(this,arguments):undefined;applyAdminBrand();return result;};

  function setColorFields(primary,accent){
    const form=$('#settings form');if(!form)return;
    if(form.elements.primaryColor)form.elements.primaryColor.value=primary;
    if(form.elements.accentColor)form.elements.accentColor.value=accent;
    if(form.elements.colorPaletteType)form.elements.colorPaletteType.value='custom';
    $$('.uc-color-editor',form).forEach(field=>field.ucSyncColor?.());
    applyAdminBrand({...settings(),primaryColor:primary,accentColor:accent});
    form.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function syncThemeCards(){const current=selectedTheme();$$('[data-db129-theme]').forEach(button=>{const active=button.dataset.db129Theme===current;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});syncThemeMedia(current);}
  function selectTheme(key,{reset=false}={}){
    const theme=THEMES[key]||THEMES.dropbeat,form=$('#settings form');if(!form)return;
    const input=form.elements.frontendTheme;if(input){input.value=key;if(matchMedia('(max-width:760px)').matches)input.dataset.db145AppearanceDraft='1';}
    setColorFields(theme.primary,theme.accent);syncThemeCards();
    window.ucAdminToast?.(reset?'Original IronPulse theme is previewing. Click Save Settings to keep it.':`${theme.name} is previewing. Click Save Settings to publish it.`,'success');
  }
  function themeMarkup(){return `<section class="uc129-theme-panel" data-db129-appearance-panel="theme" hidden>
    <div class="uc129-theme-panel-head"><div><h3>Frontend Theme</h3><p class="muted">Choose a complete public-site layout. Admin, Member and Coach dashboard layouts remain unchanged.</p></div><button class="btn secondary compact" type="button" data-db129-reset-theme>Reset Theme</button></div>
    <div class="uc129-theme-grid">${Object.entries(THEMES).map(([key,item])=>`<button type="button" class="uc129-theme-choice" data-db129-theme="${key}" aria-pressed="false"><span class="uc129-theme-mini ${item.preview}"><i></i><i></i><i></i><i></i></span><span><strong>${item.name}</strong><small>${item.description}</small><em>${item.gallery?'Uses the Gym Images gallery':'Gym Images gallery is hidden'}</em></span></button>`).join('')}</div>
    <div class="notice uc129-theme-note"><strong>How publishing works:</strong> selecting a theme previews its recommended colours. Click the existing <strong>Save Settings</strong> button to publish the layout and colours together. You can fine-tune Website Colors afterward.</div>
  </section>`;}
  function ensureAppearanceControls(){
    const form=$('#settings form'),builder=$('#settings .uc-theme-builder');if(!form||!builder)return;
    let input=form.elements.frontendTheme;if(!input){input=document.createElement('input');input.type='hidden';input.name='frontendTheme';form.appendChild(input);}
    if(!matchMedia('(max-width:760px)').matches||input.dataset.db145AppearanceDraft!=='1')input.value=THEMES[String(settings().frontendTheme||input.value)]?String(settings().frontendTheme||input.value):'dropbeat';
    const details=builder.closest('details.uc-v7-theme-details');
    if(details){details.open=true;details.classList.add('uc129-appearance-shell');const summary=$(':scope>summary',details);if(summary)summary.hidden=true;}
    const host=details||builder.parentElement;if(!host)return;
    const mobile=matchMedia('(max-width:760px)').matches;
    let tabs=$('.uc129-appearance-tabs',mobile?form:host);
    // The legacy theme decorator can wrap the builder after controls were added.
    // Reuse those exact controls instead of creating a second appearance editor.
    if(mobile&&tabs){
      if(!host.contains(tabs))builder.before(tabs);
      const panels=$$('.uc129-theme-panel',form),first=panels[0];
      if(first&&!host.contains(first))builder.after(first);
      panels.slice(1).forEach(panel=>panel.remove());
      $$('.uc129-appearance-tabs',form).filter(node=>node!==tabs).forEach(node=>node.remove());
    }
    if(!tabs){tabs=document.createElement('div');tabs.className='uc129-appearance-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Website appearance');tabs.innerHTML='<button type="button" class="active" data-db129-appearance="colors" role="tab" aria-selected="true">Website Colors</button><button type="button" data-db129-appearance="theme" role="tab" aria-selected="false">Theme</button>';builder.before(tabs);builder.dataset.db129AppearancePanel='colors';builder.insertAdjacentHTML('afterend',themeMarkup());tabs.addEventListener('click',event=>{const button=event.target.closest('[data-db129-appearance]');if(!button)return;showAppearancePanel(button.dataset.db129Appearance);});$('[data-db129-reset-theme]',host)?.addEventListener('click',()=>selectTheme('dropbeat',{reset:true}));$$('[data-db129-theme]',host).forEach(button=>button.addEventListener('click',()=>selectTheme(button.dataset.db129Theme)));}
    showAppearancePanel(host.dataset.db129ActivePanel||'colors');syncThemeCards();
  }
  function showAppearancePanel(name){
    const host=$('#settings .uc129-appearance-shell')||$('#settings .uc-theme-builder')?.parentElement;if(!host)return;
    const active=name==='theme'?'theme':'colors';host.dataset.db129ActivePanel=active;
    $$('[data-db129-appearance]',host).forEach(button=>{const on=button.dataset.db129Appearance===active;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on));});
    $$('[data-db129-appearance-panel]',host).forEach(panel=>panel.hidden=panel.dataset.db129AppearancePanel!==active);
  }
  function syncThemeMedia(key=selectedTheme()){
    const theme=THEMES[key]||THEMES.dropbeat;
    $$('[data-studio-gallery-manager]').forEach(manager=>{manager.classList.toggle('uc129-theme-hidden',!theme.gallery);manager.setAttribute('aria-hidden',String(!theme.gallery));});
    const panel=$('#banners'),message=$('[data-db129-theme-media-message]',panel);
    if(panel&&!message){const anchor=$('#bannerTable',panel)?.closest('.card');if(anchor){const note=document.createElement('div');note.dataset.db129ThemeMediaMessage='1';note.className='notice uc129-theme-media-message';anchor.insertAdjacentElement('afterend',note);}}
    const note=$('[data-db129-theme-media-message]',panel);if(note){note.hidden=theme.gallery;note.innerHTML=`<strong>${theme.name}:</strong> this public theme does not use the IronPulse Gym image gallery, so those controls are hidden. Home Banner controls above remain available.`;}
  }

  window.DropBeatAppearanceUI=Object.freeze({ensure:ensureAppearanceControls});
  const priorLoadSettings=window.load_settings;
  if(typeof priorLoadSettings==='function')window.load_settings=async function(){const result=await priorLoadSettings.apply(this,arguments);ensureAppearanceControls();applyAdminBrand();syncThemeCards();return result;};
  const priorLoadBanners=window.load_banners;
  if(typeof priorLoadBanners==='function')window.load_banners=async function(){if(!window.dropbeatAdminState?.settings&&typeof window.load_settings==='function')await window.load_settings().catch(()=>{});const result=await priorLoadBanners.apply(this,arguments);syncThemeMedia();return result;};
  const priorSaveSettings=window.saveSettings;
  if(typeof priorSaveSettings==='function')window.saveSettings=async function(event){ensureAppearanceControls();const form=event?.currentTarget||$('#settings form'),key=String(form?.elements.frontendTheme?.value||'dropbeat'),shared=window.dropbeatAdminState;if(shared)shared.settings={...(shared.settings||{}),frontendTheme:THEMES[key]?key:'dropbeat'};const result=await priorSaveSettings.apply(this,arguments);syncThemeCards();return result;};

  window.addEventListener('uc:brand-updated',event=>{applyAdminBrand(event.detail||settings());ensureAppearanceControls();syncThemeCards();});
  function init(){applyAdminBrand();if($('#settings .uc-theme-builder'))ensureAppearanceControls();syncThemeMedia();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80),{once:true});else setTimeout(init,80);
})();
