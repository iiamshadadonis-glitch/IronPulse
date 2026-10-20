/* Last requested UI fixes: Offers/admin stability, clean ad toggles, product display grid, coupons, auditions layout. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const clean=v=>String(v||'').trim();
  const pageLabels={home:'Home Page',offers:'Membership Page',festival:'Festival Offers Page'};
  const sectionLabels={featured:'Featured section',memberships:'Membership list',festival:'Festival offers list'};
  function adminMsg(sel,text,type='success'){
    const el=$(sel); if(!el)return;
    el.innerHTML=text?`<div class="${type==='error'?'error':'success'}">${H(text)}</div>`:'';
  }
  function toast(text,type='success'){
    if(typeof window.ucAdminToast==='function') window.ucAdminToast(text,type);
  }
  async function ensureSettings(){
    if(!window.A) window.A={};
    if(!A.settings){
      try{const r=await api('/api/admin/settings');A.settings=r.settings||{};}catch(_){A.settings={};}
    }
    return A.settings;
  }
  async function saveSettings(part,msgSel,message){
    A.settings={...(A.settings||{}),...part,updatedAt:new Date().toISOString()};
    const res=await api('/api/admin/settings',{method:'POST',body:JSON.stringify(A.settings)});
    A.settings=res.settings||A.settings;
    if(msgSel)adminMsg(msgSel,message||'Changes saved successfully.','success');
    toast(message||'Changes saved successfully.','success');
    return A.settings;
  }
  function normalizeAdIntegrations(ai={}){
    const customNetworks=Array.isArray(ai.customNetworks)?ai.customNetworks.slice():[];
    if(ai.custom && (ai.custom.networkName||ai.custom.headCode||ai.custom.bodyCode||ai.custom.enabled) && !customNetworks.length){
      customNetworks.push({id:'custom-1',enabled:!!ai.custom.enabled,networkName:ai.custom.networkName||'Other Ad Network',headCode:ai.custom.headCode||'',bodyCode:ai.custom.bodyCode||'',notes:ai.custom.notes||''});
    }
    if(!customNetworks.length) customNetworks.push({id:'custom-1',enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''});
    return {
      googleAdsense:{enabled:false,publisherId:'',headCode:'',bodyCode:'',notes:'',...(ai.googleAdsense||{})},
      adsterra:{enabled:false,headCode:'',bodyCode:'',notes:'',...(ai.adsterra||{})},
      mediaNet:{enabled:false,headCode:'',bodyCode:'',notes:'',...(ai.mediaNet||{})},
      custom:{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:'',...(ai.custom||{})},
      customNetworks
    };
  }
  function statusPill(text,cls){return `<span class="status ${cls||''}">${H(text)}</span>`;}
  function adStatus(enabled){return statusPill(enabled?'active':'inactive',enabled?'active':'draft');}
  function togglePill(name,label,checked){
    return `<label class="ad-mini-toggle"><span class="switch"><input type="checkbox" name="${H(name)}" ${checked?'checked':''}><span class="slider"></span></span><span>${H(label)}</span></label>`;
  }
  function allAdRows(ai){
    const rows=[
      {key:'googleAdsense',type:'Google AdSense',name:'Google AdSense',enabled:!!ai.googleAdsense.enabled,notes:ai.googleAdsense.notes||ai.googleAdsense.publisherId||''},
      {key:'adsterra',type:'Other Network',name:'Adsterra',enabled:!!ai.adsterra.enabled,notes:ai.adsterra.notes||''},
      {key:'mediaNet',type:'Other Network',name:'Media.net / Similar Network',enabled:!!ai.mediaNet.enabled,notes:ai.mediaNet.notes||''}
    ];
    (ai.customNetworks||[]).forEach((n,i)=>rows.push({key:`custom:${i}`,type:'Custom Network',name:n.networkName||`Custom Network ${i+1}`,enabled:!!n.enabled,notes:n.notes||''}));
    return rows;
  }
  function customNetworkRow(n={},idx=0){
    return `<div class="custom-network-row" data-custom-row data-id="${H(n.id||'')}">
      <div class="custom-row-head"><strong>Custom Ad Network ${idx+1}</strong><button class="btn danger small" type="button" onclick="removeCustomAdNetworkRow(this)">Remove</button></div>
      <div class="ad-toggle-row">${togglePill('customEnabled','Enable Custom Ad Network',!!n.enabled)}</div>
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
      ${rows.map(r=>`<div class="uc-grid-row"><div class="uc-grid-cell"><strong>${H(r.name)}</strong></div><div class="uc-grid-cell">${H(r.type)}</div><div class="uc-grid-cell">${adStatus(r.enabled)}</div><div class="uc-grid-cell"><small>${H(r.notes||'-')}</small></div><div class="uc-grid-cell"><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit" onclick="editAdNetwork('${H(r.key)}')">✎</button><button class="btn danger small icon-action" type="button" title="Clear saved code" onclick="deleteAdNetwork('${H(r.key)}')">×</button></div></div></div>`).join('')}
    </div>`;
  }
  function renderAdIntegrationsPanelFinal(){
    const panel=$('#adIntegrations'); if(!panel)return;
    const ai=normalizeAdIntegrations((A.settings||{}).adIntegrations||{});
    panel.innerHTML=`
      <div class="top"><h1>Ad Integrations</h1><button class="btn secondary compact" type="button" onclick="load_adIntegrations()">Refresh</button></div>
      <div class="notice">Paste the ad-network code given by Google AdSense or another ad network. This is only for connecting ad networks to the website. Advertisement placements inside individual Fitness Tips can still be managed from the Fitness Tips page.</div>
      <details class="card ad-clean-detail" id="adsenseCard"><summary>Google AdSense</summary><div class="ad-clean-body">
        <form id="googleAdsenseForm" class="form" onsubmit="saveGoogleAdsense(event)">
          <div class="ad-toggle-row">${togglePill('enabled','Enable Google AdSense',!!ai.googleAdsense.enabled)}</div>
          <div class="field"><label>Publisher ID Optional</label><input name="publisherId" value="${H(ai.googleAdsense.publisherId||'')}" placeholder="ca-pub-1234567890123456"><small class="hint">Paste your AdSense publisher ID if available. It normally starts with ca-pub-.</small></div>
          <div class="field"><label>Header Code</label><textarea name="headCode" rows="5" placeholder="Paste the AdSense script code that Google asks you to place in the head section">${H(ai.googleAdsense.headCode||'')}</textarea><small class="hint">Use this for the main AdSense verification or loader script.</small></div>
          <div class="field"><label>Body / Auto Ads Code Optional</label><textarea name="bodyCode" rows="4" placeholder="Paste additional AdSense code if Google gives a body snippet">${H(ai.googleAdsense.bodyCode||'')}</textarea><small class="hint">Leave blank if AdSense provides only one script.</small></div>
          <div class="field"><label>Internal Notes Optional</label><input name="notes" value="${H(ai.googleAdsense.notes||'')}" placeholder="Example: AdSense account approved on date"></div>
          <div class="ad-form-actions"><button class="btn compact" type="submit">Save Google AdSense</button></div><div id="googleAdsenseMsg"></div>
        </form>
      </div></details>
      <details class="card ad-clean-detail" id="otherAdNetworksCard"><summary>Other Ad Networks</summary><div class="ad-clean-body">
        <form id="otherAdNetworksForm" class="form" onsubmit="saveOtherAdNetworks(event)">
          <div class="ad-toggle-row">${togglePill('adsterraEnabled','Enable Adsterra',!!ai.adsterra.enabled)}${togglePill('mediaNetEnabled','Enable Media.net / Similar Network',!!ai.mediaNet.enabled)}</div>
          <div class="ad-two"><div class="field"><label>Adsterra Header Code</label><textarea name="adsterraHeadCode" rows="4" placeholder="Paste Adsterra header/script code">${H(ai.adsterra.headCode||'')}</textarea></div><div class="field"><label>Adsterra Body Code Optional</label><textarea name="adsterraBodyCode" rows="4" placeholder="Paste Adsterra body/widget code if available">${H(ai.adsterra.bodyCode||'')}</textarea></div></div>
          <div class="ad-two"><div class="field"><label>Media.net / Similar Network Header Code</label><textarea name="mediaNetHeadCode" rows="4" placeholder="Paste ad-network header code">${H(ai.mediaNet.headCode||'')}</textarea></div><div class="field"><label>Media.net / Similar Network Body Code Optional</label><textarea name="mediaNetBodyCode" rows="4" placeholder="Paste body/widget code if available">${H(ai.mediaNet.bodyCode||'')}</textarea></div></div>
          <div class="ad-form-actions"><button class="btn compact" type="submit">Save Other Ad Networks</button></div><div id="otherAdNetworksMsg"></div>
        </form>
      </div></details>
      <details class="card ad-clean-detail" id="customAdNetworksCard"><summary>Custom Ad Networks</summary><div class="ad-clean-body">
        <form id="customAdNetworksForm" class="form" onsubmit="saveCustomAdNetworks(event)">
          <div id="customAdNetworkRows">${ai.customNetworks.map((n,i)=>customNetworkRow(n,i)).join('')}</div>
          <div class="ad-form-actions"><button class="btn secondary compact" type="button" onclick="addCustomAdNetworkRow()">+ Add New Ad Network</button><button class="btn compact" type="submit">Save Custom Ad Networks</button></div><div id="customAdNetworksMsg"></div>
        </form>
      </div></details>
      <div id="adIntegrationsMsg"></div>
      <div class="card below"><div class="block-head"><div><h3>Connected Ad Networks</h3><p class="muted">Use this grid to check which ad networks are active, edit them, or clear saved ad codes.</p></div></div><div id="adNetworkGrid" class="table-wrap"></div></div>`;
    renderAdNetworkGrid(ai);
  }
  window.load_adIntegrations=async function(){await ensureSettings();renderAdIntegrationsPanelFinal();};
  window.saveGoogleAdsense=async function(e){e.preventDefault();await ensureSettings();const f=e.target;const ai=normalizeAdIntegrations(A.settings.adIntegrations||{});ai.googleAdsense={enabled:!!f.enabled.checked,publisherId:clean(f.publisherId.value),headCode:clean(f.headCode.value),bodyCode:clean(f.bodyCode.value),notes:clean(f.notes.value)};await saveSettings({adIntegrations:ai},'#googleAdsenseMsg','Google AdSense saved successfully.');renderAdNetworkGrid(ai);};
  window.saveOtherAdNetworks=async function(e){e.preventDefault();await ensureSettings();const f=e.target;const ai=normalizeAdIntegrations(A.settings.adIntegrations||{});ai.adsterra={enabled:!!f.adsterraEnabled.checked,headCode:clean(f.adsterraHeadCode.value),bodyCode:clean(f.adsterraBodyCode.value),notes:ai.adsterra.notes||''};ai.mediaNet={enabled:!!f.mediaNetEnabled.checked,headCode:clean(f.mediaNetHeadCode.value),bodyCode:clean(f.mediaNetBodyCode.value),notes:ai.mediaNet.notes||''};await saveSettings({adIntegrations:ai},'#otherAdNetworksMsg','Other ad networks saved successfully.');renderAdNetworkGrid(ai);};
  window.addCustomAdNetworkRow=function(){const box=$('#customAdNetworkRows'); if(!box)return; const idx=box.querySelectorAll('[data-custom-row]').length; box.insertAdjacentHTML('beforeend',customNetworkRow({id:`custom-${Date.now()}-${idx}`,enabled:false,networkName:'Other Ad Network'},idx));};
  window.removeCustomAdNetworkRow=function(btn){btn.closest('[data-custom-row]')?.remove(); $$('#customAdNetworkRows [data-custom-row] .custom-row-head strong').forEach((s,i)=>s.textContent=`Custom Ad Network ${i+1}`);};
  window.saveCustomAdNetworks=async function(e){e.preventDefault();await ensureSettings();const ai=normalizeAdIntegrations(A.settings.adIntegrations||{});const rows=$$('#customAdNetworkRows [data-custom-row]');ai.customNetworks=rows.map((row,i)=>({id:row.dataset.id||`custom-${Date.now()}-${i}`,enabled:!!row.querySelector('[name="customEnabled"]')?.checked,networkName:clean(row.querySelector('[name="customNetworkName"]')?.value)||`Custom Network ${i+1}`,headCode:clean(row.querySelector('[name="customHeadCode"]')?.value),bodyCode:clean(row.querySelector('[name="customBodyCode"]')?.value),notes:clean(row.querySelector('[name="customNotes"]')?.value)}));if(!ai.customNetworks.length)ai.customNetworks=[{id:'custom-1',enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''}];ai.custom=ai.customNetworks[0];await saveSettings({adIntegrations:ai},'#customAdNetworksMsg','Custom ad networks saved successfully.');renderAdNetworkGrid(ai);};
  window.editAdNetwork=async function(key){await window.load_adIntegrations();const [type,idx]=String(key).split(':');const map={googleAdsense:'#adsenseCard',adsterra:'#otherAdNetworksCard',mediaNet:'#otherAdNetworksCard',custom:'#customAdNetworksCard'};const card=$(type==='custom'?map.custom:map[type]);if(card){card.open=true;card.scrollIntoView({behavior:'smooth',block:'start'});}if(type==='custom'){$$('#customAdNetworkRows [data-custom-row]')[Number(idx)||0]?.scrollIntoView({behavior:'smooth',block:'center'});}};
  window.deleteAdNetwork=async function(key){if(!confirm('Delete this ad network connection from the website? Saved ad code for this network will be cleared.'))return;await ensureSettings();const ai=normalizeAdIntegrations(A.settings.adIntegrations||{});const [type,idx]=String(key).split(':');if(type==='googleAdsense')ai.googleAdsense={enabled:false,publisherId:'',headCode:'',bodyCode:'',notes:''};if(type==='adsterra')ai.adsterra={enabled:false,headCode:'',bodyCode:'',notes:''};if(type==='mediaNet')ai.mediaNet={enabled:false,headCode:'',bodyCode:'',notes:''};if(type==='custom'){const n=ai.customNetworks[Number(idx)||0];if(n){n.enabled=false;n.headCode='';n.bodyCode='';n.notes='';}}ai.custom=ai.customNetworks[0]||{enabled:false,networkName:'Other Ad Network',headCode:'',bodyCode:'',notes:''};await saveSettings({adIntegrations:ai},'#adIntegrationsMsg','Saved ad code cleared successfully.');renderAdIntegrationsPanelFinal();};

  function renderPlacementRows(list){
    if(!list||!list.length)return `<div class="uc-grid-row empty-row"><div class="uc-grid-cell" style="grid-column:1/-1">No product display records yet.</div></div>`;
    return list.map(p=>`<div class="uc-grid-row"><div class="uc-grid-cell"><strong>${H(p.product_name||'-')}</strong></div><div class="uc-grid-cell">${H(pageLabels[p.page_key]||p.page_key||'-')}</div><div class="uc-grid-cell">${H(sectionLabels[p.section_key]||p.section_key||'-')}</div><div class="uc-grid-cell">${adStatus(p.visible!==0)}</div><div class="uc-grid-cell"><button class="btn danger small icon-action" type="button" title="Remove from this page" onclick="deletePlacement(${Number(p.id)})">×</button></div></div>`).join('');
  }
  async function refreshPlacementGridFinal(){
    const box=$('#placementGrid'); if(!box)return;
    try{const res=await api('/api/admin/placements');A.placements=res.placements||[];box.innerHTML=`<div class="uc-grid placement-grid"><div class="uc-grid-head">Plan / Offer</div><div class="uc-grid-head">Page</div><div class="uc-grid-head">Section</div><div class="uc-grid-head">Status</div><div class="uc-grid-head">Action</div>${renderPlacementRows(A.placements)}</div>`;}catch(err){box.innerHTML=`<div class="error">${H(err.message||'Could not load product display records.')}</div>`;}
  }
  function patchPlacementsPanelFinal(){
    const panel=$('#placements'); if(!panel)return;
    panel.innerHTML=`<div class="top"><h1>Product Display</h1></div><div class="card placement-section-card"><h3>What this page is used for</h3><p>Product Display controls where each plan or offer appears on the website. This does not create duplicate products; it only decides where existing products are displayed.</p><div class="notice">Select plans below, choose the page, then click Add Selected Products to Pages. Click any page name to preview that page in a new tab.</div><h3>Select Plans / Offers</h3><div id="placementProductList" class="check-grid"></div><h3>Select Pages</h3><div class="check-grid placement-pages"><label class="check"><span><input data-place-page type="checkbox" value="home"> <a href="/" target="_blank" rel="noopener">Home Page</a></span></label><label class="check"><span><input data-place-page type="checkbox" value="offers"> <a href="/offers" target="_blank" rel="noopener">Membership Page</a></span></label><label class="check"><span><input data-place-page type="checkbox" value="festival"> <a href="/festival-offers" target="_blank" rel="noopener">Festival Offers Page</a></span></label><label class="check"><span><input data-place-page type="checkbox" value="yearly"> <a href="/yearly-plans" target="_blank" rel="noopener">Yearly Plans Page</a></span></label></div><div class="field" style="margin-top:16px"><label>Section key <small class="hint">(decides the area inside the selected page)</small></label><input id="placementSection" value="featured"><small class="hint">Use <strong>featured</strong> for Home Page, <strong>memberships</strong> for Membership Page, <strong>festival</strong> for Festival Offers Page, or <strong>yearly</strong> for Yearly Plans Page.</small></div><div class="form-actions"><button class="btn compact" type="button" onclick="bulkPlace()">Add Selected Products to Pages</button></div><div id="placeResult"></div></div><div class="card below"><div class="block-head"><div><h3>Current Product Display</h3><p class="muted">This grid shows which plans are currently displayed on each page.</p></div><button class="btn secondary compact" type="button" onclick="load_placements()">Refresh Display</button></div><div id="placementGrid" class="table-wrap"></div></div>`;
  }
  window.load_placements=async function(){patchPlacementsPanelFinal();if(!A.products?.length){try{const res=await api('/api/admin/products');A.products=res.products||[];}catch(_){A.products=[];}}const box=$('#placementProductList');if(box)box.innerHTML=A.products.length?A.products.map(p=>`<label class="check"><input data-pick-product type="checkbox" value="${Number(p.id)}"> ${H(p.name)}</label>`).join(''):'<div class="notice">No plans found. Add a plan first.</div>';await refreshPlacementGridFinal();};
  window.bulkPlace=async function(){const ids=$$('[data-pick-product]:checked').map(x=>Number(x.value));const pages=$$('[data-place-page]:checked').map(x=>x.value);const section=clean($('#placementSection')?.value)||'featured';if(!ids.length||!pages.length){adminMsg('#placeResult','Select at least one plan and one page before saving.','error');return;}try{const res=await api('/api/admin/placements',{method:'POST',body:JSON.stringify({product_ids:ids,pages,section_key:section})});adminMsg('#placeResult',`${res.count||0} product display records updated successfully.`,'success');toast('Product display updated successfully.','success');await refreshPlacementGridFinal();}catch(err){adminMsg('#placeResult',err.message||'Product display could not be saved.','error');toast(err.message||'Product display could not be saved.','error');}};
  window.deletePlacement=async function(id){if(!confirm('Remove this plan from this page?'))return;try{await api('/api/admin/placements?id='+encodeURIComponent(id),{method:'DELETE'});adminMsg('#placeResult','Product removed from the selected page successfully.','success');await refreshPlacementGridFinal();}catch(err){adminMsg('#placeResult',err.message||'Could not remove this product display record.','error');}};

  function parseDateEnd(v){
    if(!v)return null; const s=String(v).trim(); if(!s)return null;
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),23,59,59,999);
    m=s.match(/^(\d{2})-(\d{2})-(\d{4})/); if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),23,59,59,999);
    const d=new Date(s); return isNaN(d)?null:d;
  }
  function couponEffectiveStatus(c){const exp=parseDateEnd(c.expires_at); if(exp && exp.getTime()<Date.now())return {text:'expired',cls:'failed'}; if(c.status==='inactive')return {text:'inactive',cls:'draft'}; return {text:'active',cls:'active'};}
  window.renderCoupons=function(){const box=$('#couponTable'); if(!box)return; box.innerHTML=A.coupons?.length?`<table class="table fixed-table coupon-table"><thead><tr><th>Coupon</th><th>Discount</th><th>Rules</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>${A.coupons.map(c=>{const st=couponEffectiveStatus(c);return `<tr><td class="text-cell"><strong>${H(c.code)}</strong><br><small>${H(c.description||'')}</small></td><td>${H(c.discount_type)}: ${H(c.discount_value)}</td><td><small>${c.applies_to==='item'?'Plan: '+H(c.product_slug||'Any'):'Overall bill'}<br>${H(c.billing_scope||'both')} • ${H(c.recurring_scope||'first')}</small></td><td>${c.used_count||0}${c.max_uses?' / '+c.max_uses:' / unlimited'}</td><td>${statusPill(st.text,st.cls)}</td><td><div class="action-row nowrap"><button class="btn secondary small icon-action" title="Edit" onclick="editCoupon(${c.id})">✎</button><button class="btn danger small icon-action" title="Delete" onclick="deleteCoupon(${c.id})">×</button></div></td></tr>`}).join('')}</tbody></table>`:'<div class="notice">No coupon codes created yet.</div>';};

  function cleanAuditionHelpers(form){form.querySelectorAll('.blogger-required-note,.blog-limit-hint,.char-counter,.char-counter-inline').forEach(x=>x.remove());}
  function putHint(el,html){if(el)el.insertAdjacentHTML('afterend',`<small class="blog-limit-hint">${html}</small>`);}
  function labelCounter(el,max){
    if(!el)return; el.maxLength=max;
    const field=el.closest('.field'); const label=field?.querySelector('label'); if(!label)return;
    const counter=document.createElement('small'); counter.className='char-counter-inline'; label.appendChild(counter);
    const update=()=>{if(el.value.length>max)el.value=el.value.slice(0,max);counter.textContent=` (${el.value.length} / ${max} characters)`;counter.classList.toggle('count-warning',el.value.length>max*.9);};
    el.addEventListener('input',update); el.addEventListener('paste',()=>setTimeout(update,0)); update();
  }
  function patchAuditionsFinal(){
    const panel=$('#blogs'); const form=$('#blogForm'); if(!panel||!form)return;
    cleanAuditionHelpers(form); panel.querySelectorAll('.blogger-required-note').forEach(x=>x.remove());
    form.insertAdjacentHTML('afterbegin','<div class="blogger-required-note"><strong>SEO connection required for posting:</strong> Published fitness updates should be posted after SEO is configured in API Settings. Drafts can be saved for preparation.</div>');
    const title=form.elements.title, slug=form.elements.slug, tags=form.elements.tags, excerpt=form.elements.excerpt, body=form.elements.body_text, cover=form.elements.cover_image_url, status=form.elements.status;
    if(title&&slug&&!form.dataset.finalAuditionLayout){
      const titleField=title.closest('.field'), slugField=slug.closest('.field'), row=titleField?.parentElement;
      if(titleField&&slugField&&row&&row.classList.contains('row')){row.parentElement.insertBefore(titleField,row);row.parentElement.insertBefore(slugField,titleField.nextSibling);row.remove();}
      form.dataset.finalAuditionLayout='1';
    }
    if(slug){const lab=slug.closest('.field')?.querySelector('label'); if(lab)lab.childNodes.forEach(n=>{if(n.nodeType===1)n.remove();}); if(lab)lab.textContent='Slug / Link Extension';}
    labelCounter(title,90); putHint(title,'Maximum 90 characters. Keep the audition title short and clear.');
    putHint(slug,'Optional. If left blank, the link ending is created from the audition title.');
    if(tags){tags.maxLength=180; putHint(tags,'Use up to 12 tags, separated with commas. Example: audition, casting, ott, hyderabad.');}
    labelCounter(excerpt,220); putHint(excerpt,'Maximum 220 characters. This appears as the short summary on the Fitness Tips page.');
    labelCounter(body,10000); putHint(body,'Recommended: 150 to 1,500 words. Maximum 10,000 characters. Write normal paragraphs; the website formats them automatically.');
    putHint(cover,'Paste a direct public image URL, website media URL, CDN URL, or direct image link.');
    putHint(status,'Draft keeps it hidden. Published only after SEO is configured.');
  }
  const prevTab=window.tab;
  window.tab=function(id){if(typeof prevTab==='function')prevTab(id);setTimeout(()=>{if(id==='adIntegrations')window.load_adIntegrations();if(id==='placements')window.load_placements();if(id==='blogs')patchAuditionsFinal();},420);};
  function init(){if($('#adIntegrations')?.classList.contains('active'))window.load_adIntegrations();if($('#placements')?.classList.contains('active'))window.load_placements();patchAuditionsFinal();if($('#couponTable')&&A.coupons)window.renderCoupons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,900));else setTimeout(init,900);
  setTimeout(init,3800);setTimeout(init,6500);
})();
