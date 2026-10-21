/* V16.54 — Brand Settings stability + Articles wording/media + stable Integrations navigation.
   This is intentionally additive. Existing IDs, APIs, database structures and save workflows are retained. */
(()=>{
  'use strict';
  // These flags are read by the V16.52/V16.53 compatibility layers before their delayed initializers run.
  window.__ucV1654BrandHubOwnsTabs=true;
  window.__ucV1654OwnTabRouter=true;
  window.__ucV1654StableIntegrations=true;

  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    notifications:{label:'Notifications',panel:'notificationSettings',description:'Manage automatic push rules and reviewed broadcasts for Admin, Member and Coach accounts.'},
    login:{label:'Login',panel:'security',description:'Manage admin display name, password, email and Google login.'}
  };
  const PANEL_MODE={settings:'profile',banners:'banners',socials:'social',checkoutSettings:'checkout',mapsReviews:'maps',storage:'storage',brandEmails:'email',coachSettings:'coach',security:'login',notificationSettings:'notifications'};
  let brandMode='profile', articleObserver=null, routerInstalled=false, integrationsReady=false, integrationWarmPromise=null;
  const brandLoaded=new Set();

  function settingsGroup(){return $$('.side .nav .nav-group').find(g=>g.dataset.groupTitle==='Settings')||null;}
  function setSidebarLabel(btn,text){
    if(!btn||btn.hasAttribute('data-db157-name'))return; const badge=$('.nav-badge',btn),arrow=$('.nav-arrow',btn);
    const span=[...btn.children].find(x=>x!==badge&&x!==arrow&&!x.classList.contains('uc53-group-notification'));
    if(span){if(span.textContent!==text)span.textContent=text;}
    else { const node=[...btn.childNodes].find(n=>n.nodeType===3);if(node){if(node.nodeValue.trim()!==text)node.nodeValue=text;}else btn.insertBefore(document.createTextNode(text),btn.firstChild||null); }
  }
  function markBrandSidebar(){
    const nav=$('.side .nav');if(!nav)return;
    $$('button[data-tab]',nav).forEach(b=>b.classList.remove('active'));
    const b=$('button[data-tab="settings"]',nav);if(b)b.classList.add('active');
    const g=settingsGroup();if(g)g.classList.add('open','has-active');
  }
  function activatePanel(id,{brand=false}={}){
    $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
    const nav=$('.side .nav');
    if(nav){
      if(brand)markBrandSidebar();
      else $$('button[data-tab]',nav).forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
    }
  }
  function brandNavMarkup(){return Object.entries(BRAND).map(([k,m])=>`<button type="button" class="uc-v1652-brand-tab${k===brandMode?' active':''}" data-uc54-brand-mode="${k}" aria-selected="${k===brandMode?'true':'false'}">${m.label}</button>`).join('');}
  function ensureBrandNav(panel,mode=brandMode){
    if(!panel)return; if(BRAND[mode])brandMode=mode;
    const top=$(':scope > .top',panel);if(!top)return;
    const h=$('h1',top);if(h)h.textContent='Brand Settings';
    let nav=$(':scope > .uc-v1652-brand-tabs',panel);if(!nav){nav=document.createElement('div');nav.className='uc-v1652-brand-tabs uc54-brand-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Brand Settings sections');top?.insertAdjacentElement('afterend',nav);}
    nav.dataset.uc54Owned='1';const desired=brandNavMarkup();
    if(window.matchMedia('(max-width:760px)').matches){
      const position=nav.scrollLeft,buttons=$$('[data-uc54-brand-mode]',nav),keys=Object.keys(BRAND);
      if(buttons.length!==keys.length||buttons.some((button,index)=>button.dataset.uc54BrandMode!==keys[index]))nav.innerHTML=desired;
      $$('[data-uc54-brand-mode]',nav).forEach(button=>{const active=button.dataset.uc54BrandMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
      nav.scrollLeft=position;
      requestAnimationFrame(()=>{const active=$('[data-uc54-brand-mode="'+mode+'"]',nav);if(!active||!nav.clientWidth)return;const n=nav.getBoundingClientRect(),a=active.getBoundingClientRect();if(a.left<n.left)nav.scrollLeft-=n.left-a.left+8;else if(a.right>n.right)nav.scrollLeft+=a.right-n.right+8;});
    }else if(nav.innerHTML!==desired)nav.innerHTML=desired;
    $$('[data-uc54-brand-mode]',nav).forEach(b=>b.onclick=()=>window.ucV1654BrandTab(b.dataset.uc54BrandMode));
    let context=$(':scope > .uc-v1652-brand-context',panel);if(!context){context=document.createElement('div');context.className='uc-v1652-brand-context uc54-brand-context';nav.insertAdjacentElement('afterend',context);}
    const m=BRAND[brandMode];const desiredContext=`<h2>${H(m.label)}</h2><p>${H(m.description)}</p>`;if(context.innerHTML!==desiredContext)context.innerHTML=desiredContext;
  }
  function ensureBrandNavEverywhere(){
    for(const id of [...new Set(Object.values(BRAND).map(x=>x.panel))]){const p=$('#'+id);if(!p)continue;let mode=PANEL_MODE[id]||'profile';if(id==='settings'&&['profile','colors','legal'].includes(brandMode))mode=brandMode;ensureBrandNav(p,mode);}
  }
  async function runBrandLoader(id){
    const fn=id==='storage'?window.loadUCStorage:window['load_'+id];if(typeof fn!=='function')return;
    try{await fn();}catch(_){/* Existing panel already renders its own diagnostics. */}
  }
  async function showBrand(mode){
    if(!BRAND[mode])mode='profile';brandMode=mode;const id=BRAND[mode].panel;
    // Load a destination once while the current panel remains visible, then switch in one paint.
    // This avoids the old render/clear/re-render flash while preserving each panel's own Refresh controls.
    if(id==='settings'){
      if(!window.A?.settings&&typeof window.load_settings==='function')await window.load_settings().catch(()=>{});
      window.ucV1652ApplySettingsMode?.(mode);
    }else if(!brandLoaded.has(id)){
      await runBrandLoader(id);brandLoaded.add(id);
    }
    activatePanel(id,{brand:true});
    ensureBrandNav($('#'+id),mode);markBrandSidebar();
  }
  window.ucV1654BrandTab=showBrand;
  window.ucV1653BrandTab=showBrand;
  window.ucV1652BrandTab=showBrand;

  // ----------------------------- Articles UI -----------------------------
  // V1.04: source templates and the dynamic layout store own display wording.
  // Never run a broad text replacement over rendered labels or saved post data.
  function patchArticleText(root=$('#blogs')){
    if(!root)return;
    const tags=$('#blogForm [name="tags"]');if(tags){const field=tags.closest('.field');const label=$('label',field);if(label&&label.textContent!=='Hashtags')label.textContent='Hashtags';if(tags.placeholder!=='strength, cardio, nutrition')tags.placeholder='strength, cardio, nutrition';const hint=$('small.hint',field),text='Enter up to 12 comma-separated topics, with or without #. The website stores them as fitness tip tags; supported social platforms publish them as hashtags automatically.';if(hint&&hint.textContent!==text)hint.textContent=text;}
    $$('#blogTable thead th',root).forEach(th=>{if(/^Tags$/i.test(th.textContent.trim()))th.textContent='Hashtags';});
  }
  function normalizeTagInput(){const el=$('#blogForm [name="tags"]');if(!el)return;el.value=String(el.value||'').split(',').map(x=>x.trim().replace(/^#+/,'')).filter(Boolean).slice(0,12).join(', ');}

  function articleImageField(){return $('#blogForm [name="cover_image_url"]')?.closest('.field')||null;}
  const articleImageStates=new WeakMap();
  function renderArticleImageState(url='',message=''){
    const box=$('#uc54ArticleImageState');if(!box)return;const clean=String(url||'').trim();
    const html=clean?`<div class="uc54-article-image-current"><img src="${H(clean)}" alt="Current fitness tip image"><div><strong>Fitness Tips image ready</strong><small>${H(message||'This Google Drive image URL will be used by the website and connected publishing workflows.')}</small><a href="${H(clean)}" target="_blank" rel="noopener">Open image</a></div></div>`:`<small class="hint">No fitness tip image is selected yet. Uploading creates/uses the <strong>Fitness Tips Images</strong> folder inside your connected Google Drive destination.</small>`;
    const previous=articleImageStates.get(box);
    if(previous?.source===html&&previous.rendered===box.innerHTML)return;
    box.innerHTML=html;articleImageStates.set(box,{source:html,rendered:box.innerHTML});
  }
  function ensureArticleImageUpload(){
    const hidden=$('#blogForm [name="cover_image_url"]'),field=hidden?.closest('.field');if(!hidden||!field)return;
    if(hidden.type!=='hidden')hidden.type='hidden';
    if(!field.classList.contains('uc54-article-image-field'))field.classList.add('uc54-article-image-field');
    // The legacy form supplied a visible “Cover Image URL Optional” label. The URL field is still
    // retained internally for the existing article/save/publishing logic, but the admin now sees
    // only the Google Drive upload control requested for V16.54.
    Array.from(field.children).forEach(el=>{
      if(el===hidden||el.id==='uc54ArticleImageUpload')return;
      if(el.matches?.('label, small.hint, .hint, .blog-limit-hint')&&!el.classList.contains('uc54-legacy-cover-ui'))el.classList.add('uc54-legacy-cover-ui');
    });
    if(!$('#uc54ArticleImageUpload',field)){
      const box=document.createElement('div');box.id='uc54ArticleImageUpload';box.className='uc54-article-image-upload';
      box.innerHTML=`<label>Fitness Tips Image</label><div class="uc54-upload-row"><input id="uc54ArticleImageFile" type="file" accept="image/*"><button id="uc54ArticleImageButton" class="btn secondary compact" type="button">Upload Image</button></div><div id="uc54ArticleImageState"></div><div id="uc54ArticleImageMsg"></div>`;
      field.prepend(box);$('#uc54ArticleImageButton',box).onclick=()=>window.ucV1654UploadArticleImage();
    }
    renderArticleImageState(hidden.value||'');
  }
  window.ucV1654UploadArticleImage=async function(){
    const input=$('#uc54ArticleImageFile'),file=input?.files?.[0],msg=$('#uc54ArticleImageMsg'),btn=$('#uc54ArticleImageButton'),hidden=$('#blogForm [name="cover_image_url"]');
    if(!file){if(msg)msg.innerHTML='<div class="error">Choose an image first.</div>';return null;}
    const fd=new FormData();fd.append('file',file);fd.append('purpose','article-image');
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Uploading…';}if(msg)msg.innerHTML='<div class="notice">Uploading to Google Drive → Fitness Tips Images…</div>';
    try{
      const res=await fetch('/api/admin/google-drive-upload',{method:'POST',body:fd}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Fitness Tips image upload failed.');
      if(hidden)hidden.value=data.url||'';if(input)input.dataset.uc54Uploaded='1';renderArticleImageState(data.url||'',`Uploaded to Google Drive → ${data.folderName||'Fitness Tips Images'}.`);if(msg)msg.innerHTML='<div class="notice success">Fitness Tips image uploaded successfully. It will be saved with this fitness tip.</div>';return data;
    }catch(e){if(msg)msg.innerHTML=`<div class="error">${H(e.message||'Fitness Tips image upload failed.')}</div>`;throw e;}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Upload Image';}}
  };
  function syncArticleImageFromForm(){ensureArticleImageUpload();renderArticleImageState($('#blogForm [name="cover_image_url"]')?.value||'');const i=$('#uc54ArticleImageFile');if(i){i.value='';delete i.dataset.uc54Uploaded;}}
  function wrapArticleFunctions(){
    const oldLoad=window.load_blogs;if(typeof oldLoad==='function'&&!oldLoad.__uc54){const f=async function(){const r=await oldLoad.apply(this,arguments);patchArticleText();ensureArticleImageUpload();return r;};f.__uc54=true;window.load_blogs=f;window.syncAndLoadAuditions=f;window.syncBloggerAuditions=f;}
    const oldEdit=window.editBlog;if(typeof oldEdit==='function'&&!oldEdit.__uc54){const f=async function(){const r=await oldEdit.apply(this,arguments);syncArticleImageFromForm();patchArticleText();return r;};f.__uc54=true;window.editBlog=f;}
    const oldReset=window.resetBlogForm;if(typeof oldReset==='function'&&!oldReset.__uc54){const f=function(){const r=oldReset.apply(this,arguments);syncArticleImageFromForm();patchArticleText();return r;};f.__uc54=true;window.resetBlogForm=f;}
    const oldSave=window.saveBlogAudition;if(typeof oldSave==='function'&&!oldSave.__uc54){const f=async function(ev,statusOverride){ev?.preventDefault?.();normalizeTagInput();const file=$('#uc54ArticleImageFile')?.files?.[0];if(file&&!$('#uc54ArticleImageFile')?.dataset.uc54Uploaded)await window.ucV1654UploadArticleImage();return oldSave.call(this,ev,statusOverride);};f.__uc54=true;window.saveBlogAudition=f;window.saveBlog=function(ev){return window.saveBlogAudition(ev,$('#blogForm [name="status"]')?.value||'draft');};}
  }
  function observeArticles(){const p=$('#blogs');if(!p||articleObserver)return;let queued=0;const options={childList:true,subtree:true},controls='form,[name="tags"],[name="cover_image_url"],#uc54ArticleImageUpload,th';articleObserver=new MutationObserver(records=>{if(!records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches(controls)||node.querySelector(controls)))))return;clearTimeout(queued);queued=setTimeout(()=>{articleObserver.disconnect();try{patchArticleText(p);ensureArticleImageUpload();}finally{articleObserver.observe(p,options);}},0);});articleObserver.observe(p,options);}

  // ------------------------ Stable Integrations opening ------------------------
  async function warmIntegrations(){
    if(integrationsReady)return true;if(integrationWarmPromise)return integrationWarmPromise;
    const panel=$('#socialMediaIntegrations');if(!panel)return false;
    integrationWarmPromise=(async()=>{try{await window.load_socialMediaIntegrations?.();await new Promise(r=>setTimeout(r,700));integrationsReady=!!$('#uc49IntegrationShell',panel);return integrationsReady;}catch(_){return false;}finally{integrationWarmPromise=null;}})();
    return integrationWarmPromise;
  }
  function openIntegrationsWithoutReload(){
    const panel=$('#socialMediaIntegrations');if(!panel)return false;
    activatePanel('socialMediaIntegrations');
    panel.classList.remove('uc53-integrations-stabilizing');panel.removeAttribute('aria-busy');
    const nav=$('.side .nav'),btn=$('[data-tab="socialMediaIntegrations"]',nav);if(btn)btn.classList.add('active');
    const group=settingsGroup();if(group)group.classList.add('open','has-active');
    return true;
  }
  async function openIntegrationsWhenReady(){
    if(integrationsReady){openIntegrationsWithoutReload();return true;}
    for(let i=0;i<14;i++){
      await warmIntegrations();
      if(integrationsReady||$('#uc49IntegrationShell', $('#socialMediaIntegrations'))){integrationsReady=true;openIntegrationsWithoutReload();return true;}
      await new Promise(r=>setTimeout(r,220));
    }
    // Last-resort opening keeps the existing diagnostic behavior without repeatedly rebuilding it.
    openIntegrationsWithoutReload();return false;
  }
  function installRouter(){
    if(routerInstalled||typeof window.tab!=='function')return;routerInstalled=true;const old=window.tab;
    window.tab=function(id){
      if(id==='socialMediaIntegrations'){
        // Do not expose the legacy multi-stage renderer. A very early click waits for the hidden
        // prewarm to finish and then switches the panel only once.
        openIntegrationsWhenReady();return;
      }
      const bm=PANEL_MODE[id];if(bm){window.ucV1654BrandTab(bm);return;}
      if(id==='settings'){window.ucV1654BrandTab('profile');return;}
      return old.apply(this,arguments);
    };
    window.tab.__uc54=true;window.tab.__uc54Old=old;
  }

  function init(){
    ensureBrandNavEverywhere();patchArticleText();ensureArticleImageUpload();wrapArticleFunctions();observeArticles();
    // Preload Integrations while hidden so opening it later is a single paint instead of multiple legacy refresh paints.
    if(!$('#socialMediaIntegrations')?.classList.contains('active'))warmIntegrations();
    installRouter();
    try{const u=new URL(location.href);if(u.searchParams.has('snapchat')){u.searchParams.delete('snapchat');u.searchParams.delete('social_message');history.replaceState({},'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);}}catch(_){ }
  }
  // Install the stable router as soon as the base admin router exists; delayed initialization below
  // remains only for DOM-dependent relocation/translation work.
  installRouter();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installRouter();setTimeout(()=>warmIntegrations(),120);setTimeout(init,3650);},{once:true});
  else {installRouter();setTimeout(()=>warmIntegrations(),120);setTimeout(init,3650);}
  setTimeout(()=>{ensureBrandNavEverywhere();patchArticleText();ensureArticleImageUpload();wrapArticleFunctions();},5200);
})();
