/* Current final fixes: lower home banner text, clean ad integration management, better auditions counters, product display pages/grid. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const clean=v=>String(v||'').trim();
  const pageLabels={home:'Home Page',offers:'Membership Page',festival:'Festival Offers Page'};
  const sectionLabels={featured:'Featured section',memberships:'Membership list',festival:'Festival offers list'};

  function msg(sel,text,type='success'){
    const el=$(sel); if(!el)return;
    el.innerHTML=text?`<div class="${type==='error'?'error':'success'}">${H(text)}</div>`:'';
  }
  function toast(text,type='success'){
    if(typeof window.ucAdminToast==='function') window.ucAdminToast(text,type);
  }
  async function ensureSettings(){
    if(!window.A) window.A={};
    if(!A.settings && typeof window.load_settings==='function'){
      try{ await window.load_settings(); }catch(_){ }
    }
    if(!A.settings){
      try{ const r=await api('/api/admin/settings'); A.settings=r.settings||{}; }catch(_){ A.settings={}; }
    }
    return A.settings;
  }
  async function saveSettings(next,msgSel,message){
    A.settings={...(A.settings||{}),...next,updatedAt:new Date().toISOString()};
    const res=await api('/api/admin/settings',{method:'POST',body:JSON.stringify(A.settings)});
    A.settings=res.settings||A.settings;
    if(msgSel) msg(msgSel,message||'Settings saved successfully.','success');
    if(message) toast(message,'success');
    return A.settings;
  }
  function normalizeAdIntegrations(ai={}){
    const customNetworks=Array.isArray(ai.customNetworks)?ai.customNetworks:[];
    if(ai.custom && (ai.custom.networkName||ai.custom.headCode||ai.custom.bodyCode||ai.custom.enabled) && !customNetworks.length){
      customNetworks.push({id:'custom-1',enabled:!!ai.custom.enabled,networkName:ai.custom.networkName||'Other Ad Network',headCode:ai.custom.headCode||'',bodyCode:ai.custom.bodyCode||'',notes:ai.custom.notes||''});
    }
    return {
      googleAdsense:{enabled:false,publisherId:'',headCode:'',bodyCode:'',notes:'',...(ai.googleAdsense||{})},
      adsterra:{enabled:false,headCode:'',bodyCode:'',notes:'',...(ai.adsterra||{})},
      mediaNet:{enabled:false,headCode:'',bodyCode:'',notes:'',...(ai.mediaNet||{})},
      custom:{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:'',...(ai.custom||{})},
      customNetworks
    };
  }
  function adStatus(enabled){return `<span class="status ${enabled?'active':'draft'}">${enabled?'active':'inactive'}</span>`;}
  function allAdRows(ai){
    const rows=[];
    rows.push({key:'googleAdsense',type:'Google AdSense',name:'Google AdSense',enabled:!!ai.googleAdsense.enabled,notes:ai.googleAdsense.notes||ai.googleAdsense.publisherId||''});
    rows.push({key:'adsterra',type:'Other Network',name:'Adsterra',enabled:!!ai.adsterra.enabled,notes:''});
    rows.push({key:'mediaNet',type:'Other Network',name:'Media.net / Similar Network',enabled:!!ai.mediaNet.enabled,notes:''});
    (ai.customNetworks||[]).forEach((n,i)=>rows.push({key:`custom:${i}`,type:'Custom Network',name:n.networkName||`Custom Network ${i+1}`,enabled:!!n.enabled,notes:n.notes||''}));
    return rows;
  }
  function customNetworkRow(n={},idx=0){
    return `<div class="custom-network-row" data-custom-row>
      <div class="custom-row-head"><strong>Custom Ad Network ${idx+1}</strong><button class="btn danger small" type="button" onclick="removeCustomAdNetworkRow(this)">Remove</button></div>
      <div class="ad-toggle-row"><label class="ad-switch-pill"><input type="checkbox" name="customEnabled" ${n.enabled?'checked':''}><span>Enable Custom Ad Network</span></label></div>
      <div class="field"><label>Network Name</label><input name="customNetworkName" value="${H(n.networkName||'Other Ad Network')}" placeholder="Other Ad Network"></div>
      <div class="field"><label>Custom Header Code</label><textarea name="customHeadCode" rows="5" placeholder="Paste the ad-network code that should load in the page head">${H(n.headCode||'')}</textarea></div>
      <div class="field"><label>Custom Body Code Optional</label><textarea name="customBodyCode" rows="5" placeholder="Paste body/widget code if the ad network gives one">${H(n.bodyCode||'')}</textarea></div>
      <div class="field"><label>Internal Notes Optional</label><input name="customNotes" value="${H(n.notes||'')}" placeholder="Any internal setup note"></div>
    </div>`;
  }
  function renderAdNetworkGrid(ai){
    const box=$('#adNetworkGrid'); if(!box)return;
    const rows=allAdRows(ai);
    box.innerHTML=`<div class="uc-grid ad-network-grid">
      <div class="uc-grid-head">Ad Network</div><div class="uc-grid-head">Type</div><div class="uc-grid-head">Status</div><div class="uc-grid-head">Notes</div><div class="uc-grid-head">Actions</div>
      ${rows.map(r=>`<div class="uc-grid-row"><div class="uc-grid-cell"><strong>${H(r.name)}</strong></div><div class="uc-grid-cell">${H(r.type)}</div><div class="uc-grid-cell">${adStatus(r.enabled)}</div><div class="uc-grid-cell"><small>${H(r.notes||'-')}</small></div><div class="uc-grid-cell"><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit" onclick="editAdNetwork('${H(r.key)}')">✎</button><button class="btn danger small icon-action" type="button" title="Delete" onclick="deleteAdNetwork('${H(r.key)}')">×</button></div></div></div>`).join('')}
    </div>`;
  }
  function renderAdIntegrationsPanel(){
    const panel=$('#adIntegrations'); if(!panel)return;
    const ai=normalizeAdIntegrations((A.settings||{}).adIntegrations||{});
    panel.innerHTML=`
      <div class="top"><h1>Ad Integrations</h1><button class="btn secondary compact" type="button" onclick="load_adIntegrations()">Refresh</button></div>
      <div class="notice">Paste the ad-network code given by Google AdSense or another ad network. This is only for connecting ad networks to the website. Advertisement placements inside individual Auditions can still be managed from the Auditions page.</div>
      <details class="card ad-clean-detail" id="adsenseCard"><summary>Google AdSense</summary><div class="ad-clean-body">
        <form id="googleAdsenseForm" class="form" onsubmit="saveGoogleAdsense(event)">
          <div class="ad-toggle-row"><label class="ad-switch-pill"><input type="checkbox" name="enabled" ${ai.googleAdsense.enabled?'checked':''}><span>Enable Google AdSense</span></label></div>
          <div class="field"><label>Publisher ID Optional</label><input name="publisherId" value="${H(ai.googleAdsense.publisherId||'')}" placeholder="ca-pub-1234567890123456"><small class="hint">Paste your AdSense publisher ID if available. It normally starts with ca-pub-.</small></div>
          <div class="field"><label>Header Code</label><textarea name="headCode" rows="5" placeholder="Paste the AdSense script code that Google asks you to place in the head section">${H(ai.googleAdsense.headCode||'')}</textarea><small class="hint">Use this for the main AdSense verification or loader script.</small></div>
          <div class="field"><label>Body / Auto Ads Code Optional</label><textarea name="bodyCode" rows="4" placeholder="Paste additional AdSense code if Google gives a body snippet">${H(ai.googleAdsense.bodyCode||'')}</textarea><small class="hint">Leave blank if AdSense provides only one script.</small></div>
          <div class="field"><label>Internal Notes Optional</label><input name="notes" value="${H(ai.googleAdsense.notes||'')}" placeholder="Example: AdSense account approved on date"></div>
          <div class="ad-form-actions"><button class="btn compact" type="submit">Save Google AdSense</button></div><div id="googleAdsenseMsg"></div>
        </form>
      </div></details>
      <details class="card ad-clean-detail" id="otherAdNetworksCard"><summary>Other Ad Networks</summary><div class="ad-clean-body">
        <form id="otherAdNetworksForm" class="form" onsubmit="saveOtherAdNetworks(event)">
          <div class="ad-toggle-row"><label class="ad-switch-pill"><input type="checkbox" name="adsterraEnabled" ${ai.adsterra.enabled?'checked':''}><span>Enable Adsterra</span></label><label class="ad-switch-pill"><input type="checkbox" name="mediaNetEnabled" ${ai.mediaNet.enabled?'checked':''}><span>Enable Media.net / Similar Network</span></label></div>
          <div class="ad-two"><div class="field"><label>Adsterra Header Code</label><textarea name="adsterraHeadCode" rows="4" placeholder="Paste Adsterra header/script code">${H(ai.adsterra.headCode||'')}</textarea></div><div class="field"><label>Adsterra Body Code Optional</label><textarea name="adsterraBodyCode" rows="4" placeholder="Paste Adsterra body/widget code if available">${H(ai.adsterra.bodyCode||'')}</textarea></div></div>
          <div class="ad-two"><div class="field"><label>Media.net / Similar Network Header Code</label><textarea name="mediaNetHeadCode" rows="4" placeholder="Paste ad-network header code">${H(ai.mediaNet.headCode||'')}</textarea></div><div class="field"><label>Media.net / Similar Network Body Code Optional</label><textarea name="mediaNetBodyCode" rows="4" placeholder="Paste body/widget code if available">${H(ai.mediaNet.bodyCode||'')}</textarea></div></div>
          <div class="ad-form-actions"><button class="btn compact" type="submit">Save Other Ad Networks</button></div><div id="otherAdNetworksMsg"></div>
        </form>
      </div></details>
      <details class="card ad-clean-detail" id="customAdNetworksCard"><summary>Custom Ad Networks</summary><div class="ad-clean-body">
        <form id="customAdNetworksForm" class="form" onsubmit="saveCustomAdNetworks(event)">
          <div id="customAdNetworkRows">${(ai.customNetworks&&ai.customNetworks.length?ai.customNetworks:[ai.custom]).map((n,i)=>customNetworkRow(n,i)).join('')}</div>
          <div class="ad-form-actions"><button class="btn secondary compact" type="button" onclick="addCustomAdNetworkRow()">+ Add New Ad Network</button><button class="btn compact" type="submit">Save Custom Ad Networks</button></div><div id="customAdNetworksMsg"></div>
        </form>
      </div></details>
      <div class="card below"><div class="block-head"><div><h3>Connected Ad Networks</h3><p class="muted">Use this grid to check which ad networks are active, edit them, or delete saved codes.</p></div></div><div id="adNetworkGrid" class="table-wrap"></div></div>`;
    renderAdNetworkGrid(ai);
  }
  window.load_adIntegrations=async function(){ await ensureSettings(); renderAdIntegrationsPanel(); };
  window.saveGoogleAdsense=async function(e){e.preventDefault(); await ensureSettings(); const f=e.target; const ai=normalizeAdIntegrations(A.settings.adIntegrations||{}); ai.googleAdsense={enabled:!!f.enabled.checked,publisherId:clean(f.publisherId.value),headCode:clean(f.headCode.value),bodyCode:clean(f.bodyCode.value),notes:clean(f.notes.value)}; await saveSettings({adIntegrations:ai},'#googleAdsenseMsg','Google AdSense saved successfully.'); renderAdNetworkGrid(ai);};
  window.saveOtherAdNetworks=async function(e){e.preventDefault(); await ensureSettings(); const f=e.target; const ai=normalizeAdIntegrations(A.settings.adIntegrations||{}); ai.adsterra={enabled:!!f.adsterraEnabled.checked,headCode:clean(f.adsterraHeadCode.value),bodyCode:clean(f.adsterraBodyCode.value),notes:''}; ai.mediaNet={enabled:!!f.mediaNetEnabled.checked,headCode:clean(f.mediaNetHeadCode.value),bodyCode:clean(f.mediaNetBodyCode.value),notes:''}; await saveSettings({adIntegrations:ai},'#otherAdNetworksMsg','Other ad networks saved successfully.'); renderAdNetworkGrid(ai);};
  window.addCustomAdNetworkRow=function(){const box=$('#customAdNetworkRows'); if(!box)return; const idx=box.querySelectorAll('[data-custom-row]').length; box.insertAdjacentHTML('beforeend',customNetworkRow({enabled:false,networkName:'Other Ad Network'},idx));};
  window.removeCustomAdNetworkRow=function(btn){btn.closest('[data-custom-row]')?.remove(); $$('#customAdNetworkRows [data-custom-row] .custom-row-head strong').forEach((s,i)=>s.textContent=`Custom Ad Network ${i+1}`);};
  window.saveCustomAdNetworks=async function(e){e.preventDefault(); await ensureSettings(); const ai=normalizeAdIntegrations(A.settings.adIntegrations||{}); const rows=$$('#customAdNetworkRows [data-custom-row]'); ai.customNetworks=rows.map((row,i)=>({id:row.dataset.id||`custom-${Date.now()}-${i}`,enabled:!!row.querySelector('[name="customEnabled"]')?.checked,networkName:clean(row.querySelector('[name="customNetworkName"]')?.value)||`Custom Network ${i+1}`,headCode:clean(row.querySelector('[name="customHeadCode"]')?.value),bodyCode:clean(row.querySelector('[name="customBodyCode"]')?.value),notes:clean(row.querySelector('[name="customNotes"]')?.value)})).filter(n=>n.networkName||n.headCode||n.bodyCode); ai.custom=ai.customNetworks[0]||{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''}; await saveSettings({adIntegrations:ai},'#customAdNetworksMsg','Custom ad networks saved successfully.'); renderAdNetworkGrid(ai);};
  window.editAdNetwork=async function(key){await window.load_adIntegrations(); const [type,idx]=String(key).split(':'); const map={googleAdsense:'#adsenseCard',adsterra:'#otherAdNetworksCard',mediaNet:'#otherAdNetworksCard',custom:'#customAdNetworksCard'}; const sel=type==='custom'?map.custom:map[type]; const card=$(sel); if(card){card.open=true; card.scrollIntoView({behavior:'smooth',block:'start'});} if(type==='custom'){const row=$$('#customAdNetworkRows [data-custom-row]')[Number(idx)||0]; row?.scrollIntoView({behavior:'smooth',block:'center'});}};
  window.deleteAdNetwork=async function(key){if(!confirm('Delete this ad-network connection from the website? Saved ad code for this network will be cleared.'))return; await ensureSettings(); const ai=normalizeAdIntegrations(A.settings.adIntegrations||{}); const [type,idx]=String(key).split(':'); if(type==='googleAdsense') ai.googleAdsense={enabled:false,publisherId:'',headCode:'',bodyCode:'',notes:''}; if(type==='adsterra') ai.adsterra={enabled:false,headCode:'',bodyCode:'',notes:''}; if(type==='mediaNet') ai.mediaNet={enabled:false,headCode:'',bodyCode:'',notes:''}; if(type==='custom') ai.customNetworks.splice(Number(idx)||0,1); ai.custom=ai.customNetworks[0]||{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''}; await saveSettings({adIntegrations:ai},'#adIntegrationsMsg','Ad network deleted successfully.'); renderAdIntegrationsPanel();};

  function renderPlacementRows(list){
    if(!list || !list.length) return `<div class="uc-grid-row empty-row"><div class="uc-grid-cell" style="grid-column:1/-1">No product display records yet.</div></div>`;
    return list.map(p=>`<div class="uc-grid-row"><div class="uc-grid-cell"><strong>${H(p.product_name||'-')}</strong><br><small>${H(p.product_slug||'')}</small></div><div class="uc-grid-cell">${H(pageLabels[p.page_key]||p.page_key||'-')}</div><div class="uc-grid-cell">${H(sectionLabels[p.section_key]||p.section_key||'-')}</div><div class="uc-grid-cell">${adStatus(p.visible!==0)}</div><div class="uc-grid-cell"><button class="btn danger small icon-action" type="button" title="Remove from this page" onclick="deletePlacement(${Number(p.id)})">×</button></div></div>`).join('');
  }
  async function refreshPlacementGrid(){
    const box=$('#placementGrid'); if(!box)return;
    try{const res=await api('/api/admin/placements'); A.placements=res.placements||[]; box.innerHTML=`<div class="uc-grid placement-grid"><div class="uc-grid-head">Plan / Offer</div><div class="uc-grid-head">Page</div><div class="uc-grid-head">Section</div><div class="uc-grid-head">Status</div><div class="uc-grid-head">Action</div>${renderPlacementRows(A.placements)}</div>`;}
    catch(err){box.innerHTML=`<div class="error">${H(err.message||'Could not load product display records.')}</div>`;}
  }
  function patchPlacementsPanel(){
    const panel=$('#placements'); if(!panel)return;
    panel.dataset.finalPlacementLinks='current';
    panel.innerHTML=`<div class="top"><h1>Product Display</h1></div><div class="card placement-section-card"><h3>What this page is used for</h3><p>Product Display controls where each plan or offer appears on the website. This does not create duplicate products; it only decides where existing products are displayed.</p><div class="notice">Select plans below, choose the page, then click Add Selected Products to Pages. Click any page name to preview that page in a new tab.</div><h3>Select Plans / Offers</h3><div id="placementProductList" class="check-grid"></div><h3>Select Pages</h3><div class="check-grid placement-pages"><label class="check"><span><input data-place-page type="checkbox" value="home"> <a href="/" target="_blank" rel="noopener">Home Page</a></span></label><label class="check"><span><input data-place-page type="checkbox" value="offers"> <a href="/offers" target="_blank" rel="noopener">Membership Page</a></span></label><label class="check"><span><input data-place-page type="checkbox" value="festival"> <a href="/festival-offers" target="_blank" rel="noopener">Festival Offers Page</a></span></label></div><div class="field" style="margin-top:16px"><label>Section key <small class="hint">(decides the area inside the selected page)</small></label><input id="placementSection" value="featured"><small class="hint">Use <strong>featured</strong> for the Featured membership plans on Home Page, <strong>memberships</strong> for Membership Page, or <strong>festival</strong> for Festival Offers Page.</small></div><div class="form-actions"><button class="btn compact" type="button" onclick="bulkPlace()">Add Selected Products to Pages</button></div><div id="placeResult"></div></div><div class="card below"><div class="block-head"><div><h3>Current Product Display</h3><p class="muted">This grid shows which plans are currently displayed on each page.</p></div><button class="btn secondary compact" type="button" onclick="load_placements()">Refresh Display</button></div><div id="placementGrid" class="table-wrap"></div></div>`;
  }
  window.load_placements=async function(){
    patchPlacementsPanel();
    if(!A.products?.length){try{const res=await api('/api/admin/products');A.products=res.products||[];}catch(_){A.products=[];}}
    const box=$('#placementProductList'); if(box) box.innerHTML=A.products.length?A.products.map(p=>`<label class="check"><input data-pick-product type="checkbox" value="${Number(p.id)}"> ${H(p.name)} <small>${H(p.slug)}</small></label>`).join(''):'<div class="notice">No plans found. Add a plan first.</div>';
    await refreshPlacementGrid();
  };
  window.bulkPlace=async function(){
    const ids=$$('[data-pick-product]:checked').map(x=>Number(x.value));
    const pages=$$('[data-place-page]:checked').map(x=>x.value);
    const section=clean($('#placementSection')?.value)||'featured';
    if(!ids.length||!pages.length){msg('#placeResult','Select at least one plan and one page before saving.','error');return;}
    try{const res=await api('/api/admin/placements',{method:'POST',body:JSON.stringify({product_ids:ids,pages,section_key:section})});msg('#placeResult',`${res.count||0} product display records updated successfully.`,'success');toast('Product display updated successfully.','success');await refreshPlacementGrid();}
    catch(err){msg('#placeResult',err.message||'Product display could not be saved.','error');toast(err.message||'Product display could not be saved.','error');}
  };
  window.deletePlacement=async function(id){if(!confirm('Remove this plan from this page?'))return;try{await api('/api/admin/placements?id='+encodeURIComponent(id),{method:'DELETE'});msg('#placeResult','Product removed from the selected page successfully.','success');await refreshPlacementGrid();}catch(err){msg('#placeResult',err.message||'Could not remove this product display record.','error');}};

  function counterFor(el,max){
    if(!el)return;
    el.maxLength=max;
    let c=el.parentElement.querySelector(`.char-counter[data-for="${el.name}"]`);
    if(!c){c=document.createElement('small');c.className='hint char-counter';c.dataset.for=el.name;el.insertAdjacentElement('afterend',c);}
    const update=()=>{ if(el.value.length>max) el.value=el.value.slice(0,max); c.textContent=`${el.value.length} / ${max} characters`; c.classList.toggle('count-warning',el.value.length>max*0.9); };
    el.addEventListener('input',update); el.addEventListener('paste',()=>setTimeout(update,0)); update();
  }
  function patchAuditions(){
    const panel=$('#blogs'); if(!panel)return;
    const form=$('#blogForm'); if(!form)return;
    // Remove old helper notes created by earlier patch so text does not duplicate.
    panel.querySelectorAll('.blogger-required-note,.blog-limit-hint,.char-counter').forEach(x=>x.remove());
    form.insertAdjacentHTML('afterbegin','<div class="blogger-required-note"><strong>SEO connection required for posting:</strong> Published audition updates should be posted after SEO is configured in API Settings. Drafts can be saved for preparation.</div>');
    const title=form.elements.title; if(title){counterFor(title,90); title.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Maximum 90 characters. Keep the audition title short and clear.</small>');}
    const slug=form.elements.slug; if(slug){slug.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Optional. If left blank, the link ending is created from the audition title.</small>');}
    const tags=form.elements.tags; if(tags){tags.maxLength=180; tags.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Use up to 12 tags, separated with commas. Example: audition, casting, ott, hyderabad.</small>');}
    const excerpt=form.elements.excerpt; if(excerpt){counterFor(excerpt,220); excerpt.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Maximum 220 characters. This appears as the short summary on the Auditions page.</small>');}
    const body=form.elements.body_text; if(body){counterFor(body,10000); body.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Recommended: 150 to 1,500 words. Maximum 10,000 characters. Write normal paragraphs; the website formats them automatically.</small>');}
    const cover=form.elements.cover_image_url; if(cover){cover.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Paste a direct public image URL, website media URL, CDN URL, or direct image link.</small>');}
    const status=form.elements.status; if(status){status.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Draft keeps it hidden. Published only after SEO is configured.</small>');}
  }
  const previousSaveBlog=window.saveBlogAudition;
  window.saveBlogAudition=async function(ev,statusOverride){
    const f=$('#blogForm'); const status=statusOverride || f?.status?.value || 'draft';
    if(status==='published'){
      try{ if(!A.api && typeof window.load_apiSettings==='function') await window.load_apiSettings(); }catch(_){ }
      if(!(A.api && String(A.api.bloggerBlogId||'').trim())){
        ev?.preventDefault?.(); msg('#blogMsg','Kindly configure SEO in API Settings before posting audition updates. Save as Draft is available until SEO is connected.','error'); toast('SEO connection is required before posting audition updates.','error'); return;
      }
    }
    if(typeof previousSaveBlog==='function') return previousSaveBlog(ev,statusOverride);
  };

  const oldTab=window.tab;
  window.tab=function(id){
    if(typeof oldTab==='function') oldTab(id);
    if(id==='adIntegrations') setTimeout(()=>window.load_adIntegrations(),140);
    if(id==='placements') setTimeout(()=>window.load_placements(),140);
    if(id==='blogs') setTimeout(()=>patchAuditions(),140);
  };
  function init(){
    if($('#adIntegrations')) window.load_adIntegrations();
    if($('#placements')?.classList.contains('active')) window.load_placements();
    patchAuditions();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,700)); else setTimeout(init,700);
  setTimeout(init,3200); setTimeout(init,5200);
})();
