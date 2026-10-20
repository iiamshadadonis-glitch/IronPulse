/* DropBeat Dance Studio Admin V1.05
   Instant Brand Settings navigation and verified Student Story form binding. */
(function(){
  'use strict';
  const $=(selector,root=document)=>root?.querySelector?.(selector)||null;
  const $$=(selector,root=document)=>Array.from(root?.querySelectorAll?.(selector)||[]);
  const H=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const BRAND={
    profile:{label:'Profile',panel:'settings',description:'Manage brand identity, logo, favicon, WhatsApp contact and admin display preferences.'},
    banners:{label:'Banners',panel:'banners',description:'Manage the existing home-page banners without changing their publishing logic.'},
    colors:{label:'Website Colors',panel:'settings',description:'Manage the existing website color controls and theme choices.'},
    social:{label:'Social Media',panel:'socials',description:'Manage the public social-media profile links shown by the website.'},
    legal:{label:'Legal Info',panel:'settings',description:'Manage the existing legal entity and tax settings.'},
    checkout:{label:'Checkout',panel:'checkoutSettings',description:'Manage the existing checkout behaviour and coupon settings.'},
    maps:{label:'Maps & Reviews',panel:'mapsReviews',description:'Manage the existing contact map and Google review settings.'},
    storage:{label:'Storage',panel:'storage',description:'Review storage capacity and the existing safe-cleanup controls.'},
    email:{label:'Email',panel:'brandEmails',description:'Edit the branded automatic emails sent for meetings, reminders, invoices and payment statements.'},
    coach:{label:'Coach Settings',panel:'coachSettings',description:'Manage coach onboarding questions, paid-leave rules and approved remuneration terms.'},
    notifications:{label:'Notifications',panel:'notificationSettings',description:'Manage automatic push rules and reviewed broadcasts for Admin, Student and Coach accounts.'},
    login:{label:'Login',panel:'security',description:'Manage admin display name, password, email and Google login.'}
  };
  const PANEL_MODE={settings:'profile',banners:'banners',socials:'social',checkoutSettings:'checkout',mapsReviews:'maps',storage:'storage',brandEmails:'email',coachSettings:'coach',security:'login',notificationSettings:'notifications'};
  const loadedPanels=new Set(),loadingPanels=new Map();
  let activeMode='profile',observerTimer=0;

  function brandMarkup(){return Object.entries(BRAND).map(([key,item])=>`<button type="button" class="uc-v1652-brand-tab${key===activeMode?' active':''}" data-uc54-brand-mode="${key}" aria-selected="${key===activeMode?'true':'false'}">${H(item.label)}</button>`).join('');}
  function settingsGroup(){return $$('.side .nav .nav-group').find(group=>group.dataset.groupTitle==='Settings')||$('button[data-tab="settings"]')?.closest('.nav-group')||null;}
  function markSettingsSidebar(){
    const nav=$('.side .nav');if(!nav)return;
    $$('button[data-tab]',nav).forEach(button=>button.classList.toggle('active',button.dataset.tab==='settings'));
    settingsGroup()?.classList.add('open','has-active');
  }
  function ensureBrandChrome(panel,mode=activeMode){
    if(!panel||!BRAND[mode])return;
    const top=$(':scope > .top',panel);if(!top)return;
    const heading=$('h1',top);if(heading&&heading.textContent!=='Brand Settings')heading.textContent='Brand Settings';
    let nav=$(':scope > .uc-v1652-brand-tabs',panel);
    if(!nav){nav=document.createElement('div');nav.className='uc-v1652-brand-tabs uc54-brand-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Brand Settings sections');top.insertAdjacentElement('afterend',nav);}
    const keys=$$('[data-uc54-brand-mode]',nav).map(button=>button.dataset.uc54BrandMode).join(',');
    if(keys!==Object.keys(BRAND).join(','))nav.innerHTML=brandMarkup();
    $$('[data-uc54-brand-mode]',nav).forEach(button=>{
      const selected=button.dataset.uc54BrandMode===mode;
      button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));
      button.onclick=()=>switchBrand(button.dataset.uc54BrandMode);
    });
    let context=$(':scope > .uc-v1652-brand-context',panel);
    if(!context){context=document.createElement('div');context.className='uc-v1652-brand-context uc54-brand-context';nav.insertAdjacentElement('afterend',context);}
    let title=$(':scope > h2',context),description=$(':scope > p',context);
    if(!title){title=document.createElement('h2');context.prepend(title);}if(!description){description=document.createElement('p');title.insertAdjacentElement('afterend',description);}
    if(title.textContent!==BRAND[mode].label)title.textContent=BRAND[mode].label;if(description.textContent!==BRAND[mode].description)description.textContent=BRAND[mode].description;
  }
  function syncAllBrandTabs(){
    $$('[data-uc54-brand-mode]').forEach(button=>{
      const selected=button.dataset.uc54BrandMode===activeMode;
      button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));
    });
  }
  function activateBrandPanel(mode){
    const item=BRAND[mode];if(!item)return null;
    const panel=$('#'+item.panel);if(!panel)return null;
    $$('#adminApp .panel').forEach(candidate=>candidate.classList.toggle('active',candidate===panel));
    markSettingsSidebar();ensureBrandChrome(panel,mode);syncAllBrandTabs();
    if(item.panel==='settings'){
      try{window.ucV1652ApplySettingsMode?.(mode);}catch(_){ }
      requestAnimationFrame(()=>{if(activeMode===mode)try{window.ucV1652ApplySettingsMode?.(mode);}catch(_){ }});
    }
    return panel;
  }
  function setPanelLoading(panel,message='',error=false){
    if(!panel)return;let state=$('[data-dropbeat-brand-loading]',panel);
    if(!message){state?.remove();panel.removeAttribute('aria-busy');return;}
    if(!state){state=document.createElement('span');state.dataset.dropbeatBrandLoading='1';state.className='dropbeat-brand-loading';const context=$(':scope > .uc-v1652-brand-context',panel);(context||panel).appendChild(state);}
    state.classList.toggle('is-error',error);state.textContent=message;panel.setAttribute('aria-busy',String(!error));
  }
  function panelLoader(id){return id==='storage'?window.loadUCStorage:window['load_'+id];}
  function loadBrandPanel(id){
    if(loadedPanels.has(id)||loadingPanels.has(id))return loadingPanels.get(id)||Promise.resolve();
    const loader=panelLoader(id);if(typeof loader!=='function')return Promise.resolve();
    const panel=$('#'+id);if(BRAND[activeMode]?.panel===id)setPanelLoading(panel,'Loading the latest settings…');
    const job=Promise.resolve().then(()=>loader()).then(()=>{
      loadedPanels.add(id);setPanelLoading(panel,'');
      if(BRAND[activeMode]?.panel===id){activateBrandPanel(activeMode);document.dispatchEvent(new CustomEvent('dropbeat:brand-panel-ready',{detail:{mode:activeMode,panel:id}}));}
    }).catch(error=>{
      if(BRAND[activeMode]?.panel===id){setPanelLoading(panel,error?.message||'This section could not be refreshed. Existing values remain available.',true);setTimeout(()=>setPanelLoading(panel,''),5200);}
    }).finally(()=>loadingPanels.delete(id));
    loadingPanels.set(id,job);return job;
  }
  function switchBrand(mode){
    if(!BRAND[mode])mode='profile';activeMode=mode;
    const panel=activateBrandPanel(mode);if(!panel)return Promise.resolve(false);
    // Switching is complete before any API request starts. The original loader
    // still runs once in the background and retains every existing save flow.
    queueMicrotask(()=>loadBrandPanel(BRAND[mode].panel));
    return Promise.resolve(true);
  }
  window.ucV1654BrandTab=switchBrand;window.ucV1653BrandTab=switchBrand;window.ucV1652BrandTab=switchBrand;

  async function requestJson(path,options={}){
    const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch(_){data={};}
    if(!response.ok)throw new Error(data.error||`Request failed (${response.status}).`);
    return data;
  }
  function normalizeStoryUrl(value=''){
    const raw=String(value||'').trim();if(!raw)return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:`https://${raw.replace(/^\/+/, '')}`;
  }
  function fallbackStoryTable(stories){
    const box=$('#storyTable');if(!box)return;
    box.innerHTML=stories.length?`<table class="table fixed-table clean-actions story-admin-table"><thead><tr><th>Story</th><th>Preview</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead><tbody>${stories.map(story=>`<tr><td class="text-cell"><strong>${H(story.title||'Untitled story')}</strong><br><small>${H(story.url||'')}</small></td><td><img class="story-thumb" src="${H(story.thumbnail_url||'/assets/product-generic.svg')}" alt=""></td><td><span class="status ${H(story.status==='draft'?'draft':'active')}">${H(story.status||'active')}</span></td><td><div class="sort-actions nowrap"><button class="btn secondary small icon-action" type="button" title="Move up" onclick="moveStory(${Number(story.id)},-1)">↑</button><button class="btn secondary small icon-action" type="button" title="Move down" onclick="moveStory(${Number(story.id)},1)">↓</button></div></td><td><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit" onclick="editStory(${Number(story.id)})">✎</button><button class="btn danger small icon-action" type="button" title="Delete" onclick="deleteStory(${Number(story.id)})">×</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="notice">No Student Stories added yet.</div>';
  }
  function applyStoryRows(stories){
    let shared=false;
    try{
      if(typeof A!=='undefined'&&A){A.stories=stories;shared=true;}
    }catch(_){ }
    if(shared&&typeof window.renderStories==='function'){
      try{window.renderStories();return;}catch(_){ }
    }
    fallbackStoryTable(stories);
  }
  const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
  async function verifiedStoryRows(saved){
    const wantedId=Number(saved?.story?.id||saved?.id||0),wantedUrl=String(saved?.story?.url||'');
    let lastError=null;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const current=await requestJson(`/api/admin/success-stories?dropbeat=1.13&fresh=${Date.now()}`),rows=Array.isArray(current.stories)?current.stories:[];
        const found=rows.some(story=>wantedId?Number(story.id)===wantedId:String(story.url||'')===wantedUrl);
        if(found)return rows;lastError=new Error('The saved Student Story was not returned by the verification read.');
      }catch(error){lastError=error;}
      if(attempt<2)await pause(160*(attempt+1));
    }
    throw lastError||new Error('The Student Story could not be verified after saving.');
  }
  async function saveStudentStory(event){
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.currentTarget;if(!form||form.dataset.dropbeatStorySaving==='1')return;
    const message=$('#storyMsg'),button=$('button[type="submit"],button:not([type])',form),originalLabel=button?.textContent||'Save Success Story';
    const payload=Object.fromEntries(new FormData(form).entries());payload.url=normalizeStoryUrl(payload.url);
    if(!payload.url){if(message)message.innerHTML='<div class="error">Paste a YouTube or Instagram link.</div>';return;}
    form.dataset.dropbeatStorySaving='1';form.setAttribute('aria-busy','true');if(button){button.disabled=true;button.textContent='Saving…';}
    if(message)message.innerHTML='<div class="notice">Saving and verifying the Student Story…</div>';
    try{
      const saved=await requestJson('/api/admin/success-stories',{method:'POST',body:JSON.stringify(payload)});
      if(!saved?.ok||(!saved?.id&&!saved?.story?.id))throw new Error('The server did not return a saved Student Story.');
      const stories=await verifiedStoryRows(saved);applyStoryRows(stories);
      form.reset();const id=$('[name="id"]',form);if(id)id.value='';
      if(message)message.innerHTML=`<div class="notice success"><strong>Student Story saved.</strong> It was verified in Existing Student Stories${String(payload.status||'active')==='draft'?' as a draft':' and is available to the website'}.</div>`;
      // Warm the no-store public endpoint after an active save; this never holds
      // the form open and does not replace the authoritative admin verification.
      if(String(payload.status||'active')!=='draft')requestJson(`/api/public/success-stories?dropbeat=1.13&fresh=${Date.now()}`).catch(()=>{});
    }catch(error){
      if(message)message.innerHTML=`<div class="error"><strong>Student Story was not saved.</strong> ${H(error?.message||'Please check the link and try again.')}</div>`;
    }finally{
      delete form.dataset.dropbeatStorySaving;form.removeAttribute('aria-busy');if(button){button.disabled=false;button.textContent=originalLabel;}
    }
  }
  function bindStudentStoryForm(){
    const form=$('#successStories form');if(!form||form.dataset.dropbeatStoryV105==='1')return;
    form.removeAttribute('onsubmit');form.onsubmit=null;form.dataset.dropbeatStoryV105='1';form.addEventListener('submit',saveStudentStory,true);
  }
  function inferBrandMode(){
    const selected=$('[data-uc54-brand-mode][aria-selected="true"],.uc-v1652-brand-tab.active');if(selected&&BRAND[selected.dataset.uc54BrandMode])return selected.dataset.uc54BrandMode;
    const panel=$('#adminApp .panel.active');return PANEL_MODE[panel?.id]||'profile';
  }
  function stabilize(){
    bindStudentStoryForm();
    const panel=$('#'+(BRAND[activeMode]?.panel||''));if(panel?.classList.contains('active')){ensureBrandChrome(panel,activeMode);syncAllBrandTabs();markSettingsSidebar();}
  }
  function scheduleStabilize(){clearTimeout(observerTimer);observerTimer=setTimeout(stabilize,25);}
  function start(){
    activeMode=inferBrandMode();bindStudentStoryForm();
    new MutationObserver(scheduleStabilize).observe(document.body,{childList:true,subtree:true});
    // Reassert after the inherited delayed Brand Settings initializers finish.
    setTimeout(stabilize,3800);setTimeout(stabilize,5350);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
