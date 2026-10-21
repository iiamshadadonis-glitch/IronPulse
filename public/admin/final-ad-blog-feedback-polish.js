/* Final patch: Ad Integration UI cleanup, Product Display page links, Blogger guard and admin feedback. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function toast(text,type='success'){
    let t=$('#adminToast');
    if(!t){t=document.createElement('div');t.id='adminToast';document.body.appendChild(t);}
    t.className=`admin-toast ${type}`;
    t.textContent=text;
    t.hidden=false;
    clearTimeout(window.__adminToastTimerFinal);
    window.__adminToastTimerFinal=setTimeout(()=>{t.hidden=true;},5200);
  }
  window.ucAdminToast=toast;

  function writeMsg(sel,text,type='success'){
    const el=$(sel); if(!el) return;
    el.innerHTML=text?`<div class="${type==='error'?'error':'success'}">${H(text)}</div>`:'';
  }

  // Show clear success/error feedback for admin API actions.
  if(typeof window.api==='function' && !window.api.__ucFeedback){
    const oldApi=window.api;
    const messages={
      '/api/admin/settings':'Settings saved successfully.',
      '/api/admin/products':'Plan / offer saved successfully.',
      '/api/admin/placements':'Product display placement saved successfully.',
      '/api/admin/success-stories':'Success story saved successfully.',
      '/api/admin/pages':'Page content saved successfully.',
      '/api/admin/checkout-settings':'Checkout settings saved successfully.',
      '/api/admin/integrations':'Payment integration saved successfully.',
      '/api/admin/api-settings':'API settings saved successfully.',
      '/api/admin/subscribers':'Customer record saved successfully.',
      '/api/admin/refunds':'Refund record saved successfully.',
      '/api/admin/blogs':'Fitness Tip update saved successfully.',
      '/api/admin/auth/security':'Admin security saved successfully.',
      '/api/admin/import-products':'Bulk import completed successfully.',
      '/api/admin/custom-subscription':'Payment link created successfully.',
      '/api/admin/custom-payment':'One-time payment link created successfully.'
    };
    const wrapped=async function(path,opts={}){
      try{
        const res=await oldApi(path,opts);
        const method=(opts.method||'GET').toUpperCase();
        if(method!=='GET'){
          const key=Object.keys(messages).find(k=>String(path).startsWith(k));
          if(key) toast(messages[key],'success');
        }
        return res;
      }catch(err){
        toast(err.message||'Action failed. Please check the highlighted information and try again.','error');
        throw err;
      }
    };
    wrapped.__ucFeedback=true;
    window.api=wrapped;
  }

  function makeAdIntegrationsPanel(){
    const panel=$('#adIntegrations'); if(!panel) return;
    const current=panel.querySelector('#adIntegrationsForm');
    const formValues={};
    if(current){try{new FormData(current).forEach((v,k)=>formValues[k]=v); current.querySelectorAll('input[type="checkbox"]').forEach(x=>formValues[x.name]=x.checked);}catch(_){}}
    panel.innerHTML=`
      <div class="top"><h1>Ad Integrations</h1><button class="btn secondary compact" type="button" onclick="load_adIntegrations()">Refresh</button></div>
      <div class="notice">Paste the ad-network code given by Google AdSense or another ad network. This is only for connecting ad networks to the website. Advertisement placements inside individual Fitness Tips can still be managed from the Fitness Tips page.</div>
      <form id="adIntegrationsForm" class="form ad-clean-form" onsubmit="saveAdIntegrations(event)">
        <details class="card ad-clean-detail"><summary>Google AdSense</summary><div class="ad-clean-body">
          <div class="ad-toggle-row"><label class="ad-toggle"><input type="checkbox" name="googleAdsenseEnabled"> Enable Google AdSense</label></div>
          <div class="field"><label>Publisher ID Optional</label><input name="googleAdsensePublisherId" placeholder="ca-pub-1234567890123456"><small class="hint">Paste your AdSense publisher ID if available. It normally starts with ca-pub-.</small></div>
          <div class="field"><label>Header Code</label><textarea name="googleAdsenseHeadCode" rows="5" placeholder="Paste the AdSense script code that Google asks you to place in the head section"></textarea><small class="hint">Use this for the main AdSense verification or loader script.</small></div>
          <div class="field"><label>Body / Auto Ads Code Optional</label><textarea name="googleAdsenseBodyCode" rows="4" placeholder="Paste additional AdSense code if Google gives a body snippet"></textarea><small class="hint">Leave blank if AdSense provides only one script.</small></div>
          <div class="field"><label>Internal Notes Optional</label><input name="googleAdsenseNotes" placeholder="Example: AdSense account approved on date"></div>
        </div></details>
        <details class="card ad-clean-detail"><summary>Other Ad Networks</summary><div class="ad-clean-body">
          <div class="ad-toggle-row"><label class="ad-toggle"><input type="checkbox" name="adsterraEnabled"> Enable Adsterra</label><label class="ad-toggle"><input type="checkbox" name="mediaNetEnabled"> Enable Media.net / Similar Network</label></div>
          <div class="ad-two"><div class="field"><label>Adsterra Header Code</label><textarea name="adsterraHeadCode" rows="4" placeholder="Paste Adsterra header/script code"></textarea></div><div class="field"><label>Adsterra Body Code Optional</label><textarea name="adsterraBodyCode" rows="4" placeholder="Paste Adsterra body/widget code if available"></textarea></div></div>
          <div class="ad-two"><div class="field"><label>Media.net / Similar Network Header Code</label><textarea name="mediaNetHeadCode" rows="4" placeholder="Paste ad-network header code"></textarea></div><div class="field"><label>Media.net / Similar Network Body Code Optional</label><textarea name="mediaNetBodyCode" rows="4" placeholder="Paste body/widget code if available"></textarea></div></div>
        </div></details>
        <details class="card ad-clean-detail"><summary>Custom Ad Network</summary><div class="ad-clean-body">
          <div class="ad-toggle-row"><label class="ad-toggle"><input type="checkbox" name="customAdEnabled"> Enable Custom Ad Network</label></div>
          <div class="field"><label>Network Name</label><input name="customAdNetworkName" placeholder="Other Ad Network"></div>
          <div class="field"><label>Custom Header Code</label><textarea name="customAdHeadCode" rows="5" placeholder="Paste the ad-network code that should load in the page head"></textarea></div>
          <div class="field"><label>Custom Body Code Optional</label><textarea name="customAdBodyCode" rows="5" placeholder="Paste body/widget code if the ad network gives one"></textarea></div>
          <div class="field"><label>Internal Notes Optional</label><input name="customAdNotes" placeholder="Any internal setup note"></div>
        </div></details>
        <div class="ad-form-actions"><button class="btn compact" type="submit">Save Ad Integrations</button></div>
        <div id="adIntegrationsMsg"></div>
      </form>`;
    if(current){
      const f=$('#adIntegrationsForm');
      Object.entries(formValues).forEach(([k,v])=>{ const el=f?.elements?.[k]; if(!el) return; if(el.type==='checkbox') el.checked=!!v; else el.value=v; });
    }
  }

  function closeAdDetails(){ $$('#adIntegrations details').forEach(d=>d.open=false); }
  const oldLoadAd=window.load_adIntegrations;
  window.load_adIntegrations=async function(){
    makeAdIntegrationsPanel();
    if(typeof oldLoadAd==='function') await oldLoadAd();
    makeAdIntegrationsPanel();
    if(typeof oldLoadAd==='function') await oldLoadAd();
    closeAdDetails();
  };

  function patchPlacementsPanel(){
    const panel=$('#placements'); if(!panel || panel.dataset.finalPlacementLinks==='1') return;
    panel.dataset.finalPlacementLinks='1';
    panel.innerHTML=`<div class="top"><h1>Product Display</h1></div><div class="card placement-section-card"><h3>What this page is used for</h3><p>Product Display controls where each plan or offer appears on the website. Example: show Starter Access on the Home Page, show Elite Circle on Offers, or show the same plan on both pages. This does not create duplicate products; it only decides where existing products are displayed.</p><div class="notice">Select plans below, choose the pages, then click Add Selected Products to Pages. Click any page name to preview that page in a new tab.</div><h3>Select Plans / Offers</h3><div id="placementProductList" class="check-grid"></div><h3>Select Pages</h3><div class="check-grid placement-pages">
      <label class="check"><span><input data-place-page type="checkbox" value="home"> <a href="/" target="_blank" rel="noopener">Home Page</a></span></label>
      <label class="check"><span><input data-place-page type="checkbox" value="offers"> <a href="/offers" target="_blank" rel="noopener">Offers & Memberships</a></span></label>
      <label class="check"><span><input data-place-page type="checkbox" value="special"> <a href="/offers#special-access" target="_blank" rel="noopener">Special Access Page</a></span></label>
      <label class="check"><span><input data-place-page type="checkbox" value="elite"> <a href="/offers#elite-circle" target="_blank" rel="noopener">Elite Circle Page</a></span></label>
      <label class="check"><span><input data-place-page type="checkbox" value="festival"> <a href="/offers#festival" target="_blank" rel="noopener">Festival Offer Page</a></span></label>
      <label class="check"><span><input data-place-page type="checkbox" value="upgrade"> <a href="/offers#upgrade" target="_blank" rel="noopener">Upgrade Page</a></span></label>
      </div><div class="field" style="margin-top:16px"><label>Section key</label><input id="placementSection" value="featured"><small class="hint">Example: featured, memberships, premium, festival.</small></div><div class="form-actions"><button class="btn compact" type="button" onclick="bulkPlace()">Add Selected Products to Pages</button></div><div id="placeResult"></div></div>`;
  }
  const oldLoadPlacements=window.load_placements;
  window.load_placements=async function(){ patchPlacementsPanel(); if(typeof oldLoadPlacements==='function') await oldLoadPlacements(); };
  const oldBulkPlace=window.bulkPlace;
  window.bulkPlace=async function(){ try{ if(typeof oldBulkPlace==='function') await oldBulkPlace(); writeMsg('#placeResult','Product display placement saved successfully. The selected plans will appear on the chosen pages.','success'); }catch(err){ writeMsg('#placeResult',err.message||'Product display placement could not be saved.','error'); } };

  function addBlogHints(){
    const panel=$('#blogs'); if(!panel || panel.dataset.finalBlogHints==='1') return;
    panel.dataset.finalBlogHints='1';
    const summary=panel.querySelector('details summary'); if(summary) summary.textContent='Post New Fitness Tip Update';
    const form=$('#blogForm'); if(!form) return;
    form.insertAdjacentHTML('afterbegin','<div class="blogger-required-note"><strong>SEO connection required for posting:</strong> Published fitness updates should be posted after SEO is configured in API Settings. Drafts can be saved for preparation.</div>');
    const title=form.elements.title; if(title){title.maxLength=90; title.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Maximum 90 characters. Keep the fitness tip title short and clear.</small>');}
    const slug=form.elements.slug; if(slug){slug.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Optional. If left blank, the link ending is created from the fitness tip title.</small>');}
    const tags=form.elements.tags; if(tags){tags.maxLength=180; tags.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Use up to 12 tags, separated with commas. Example: strength, cardio, nutrition.</small>');}
    const excerpt=form.elements.excerpt; if(excerpt){excerpt.maxLength=220; excerpt.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Maximum 220 characters. This appears as the short summary on the Fitness Tips page.</small>');}
    const body=form.elements.body_text; if(body){body.maxLength=10000; body.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Recommended: 150 to 1,500 words. Maximum 10,000 characters. Write normal paragraphs; the website formats them automatically.</small>');}
    const cover=form.elements.cover_image_url; if(cover){cover.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Paste a direct public image URL, website media URL, CDN URL, or direct image link.</small>');}
    const status=form.elements.status; if(status){status.insertAdjacentHTML('afterend','<small class="blog-limit-hint">Draft keeps it hidden. Published only after SEO is configured.</small>');}
  }

  async function bloggerReady(){
    try{ if(!A.api && typeof window.load_apiSettings==='function') await window.load_apiSettings(); }
    catch(_){ }
    return !!(A.api && String(A.api.bloggerBlogId||'').trim());
  }
  const oldSaveBlogAudition=window.saveBlogAudition;
  window.saveBlogAudition=async function(ev,statusOverride){
    ev?.preventDefault?.();
    const f=$('#blogForm'); if(!f) return;
    const status=statusOverride || f.status?.value || 'draft';
    if(status==='published' && !(await bloggerReady())){
      writeMsg('#blogMsg','Kindly configure SEO in API Settings before posting fitness updates. Save as Draft is available until SEO is connected.','error');
      toast('SEO connection is required before posting fitness updates.','error');
      return;
    }
    try{
      if(typeof oldSaveBlogAudition==='function') await oldSaveBlogAudition(ev,statusOverride);
      writeMsg('#blogMsg',status==='published'?'Fitness Tip update posted successfully. Public link will use /blog/your-link-ending.':'Fitness Tip update saved as draft successfully.','success');
    }catch(err){
      writeMsg('#blogMsg',err.message||'Fitness Tip update could not be saved.','error');
      toast(err.message||'Fitness Tip update could not be saved.','error');
    }
  };

  const oldLoadApiSettings=window.load_apiSettings;
  window.load_apiSettings=async function(){
    if(typeof oldLoadApiSettings==='function') await oldLoadApiSettings();
    const docs=$('#apiDocs');
    if(docs) docs.innerHTML += '<br><br><strong>Fitness Tips / SEO:</strong> To publish fitness updates, first save the SEO/Blogger connection details here and connect through your automation/OAuth setup. Without this connection, the Fitness Tips page will allow drafts but block publishing.';
  };

  // Public blog path support in admin table: show /blog/slug style links.
  const oldLoadBlogs=window.load_blogs;
  window.load_blogs=async function(){
    if(typeof oldLoadBlogs==='function') await oldLoadBlogs();
    $$('#blogTable tbody tr').forEach(tr=>{
      const small=tr.querySelector('td small');
      if(small && small.textContent && !small.textContent.startsWith('/blog/')) small.textContent='/blog/'+small.textContent.replace(/^\/+/, '');
    });
  };

  const oldTab=window.tab;
  window.tab=function(id){
    if(typeof oldTab==='function') oldTab(id);
    if(id==='adIntegrations') setTimeout(()=>{makeAdIntegrationsPanel(); if(typeof oldLoadAd==='function') oldLoadAd().then(()=>{makeAdIntegrationsPanel(); oldLoadAd(); closeAdDetails();});},60);
    if(id==='placements') setTimeout(()=>{patchPlacementsPanel(); window.load_placements&&window.load_placements();},60);
    if(id==='blogs') setTimeout(()=>{addBlogHints();},60);
  };

  function init(){ makeAdIntegrationsPanel(); patchPlacementsPanel(); addBlogHints(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500)); else setTimeout(init,500);
  setTimeout(init,1800); setTimeout(init,2600);
})();
