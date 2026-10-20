/* Final V6 additive Maps & Reviews + Favorites panels. Existing admin logic remains authoritative. */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
  let MAPS={settings:null,cache:null};

  function toast(text,type='success'){
    if(window.ucAdminToast)return window.ucAdminToast(text,type);
    const e=document.createElement('div');e.className=type==='error'?'error':'success';e.textContent=text;document.body.appendChild(e);setTimeout(()=>e.remove(),3200);
  }
  function info(details,html){
    if(window.ucMakeInfoDetails)window.ucMakeInfoDetails(details,html);
  }
  function toggleField(label,name,helper){return `<label class="uc-v6-toggle-row"><span><strong>${H(label)}</strong>${helper?`<small>${H(helper)}</small>`:''}</span><span class="switch"><input type="checkbox" name="${H(name)}"><span class="slider"></span></span></label>`;}

  const MAP_HELP=`<h3>Google Map on the Contact Page</h3>
    <p class="uc-help-lead">Use this card only when you want visitors to see your office/branch location beneath the Contact form. Nothing appears publicly until the toggle is enabled and at least one usable location is saved.</p>
    <h4>Fastest setup — no code editing</h4><ol>
      <li>Open your business in Google Maps.</li><li>Choose <strong>Share → Embed a map</strong>.</li><li>Copy the iframe code and paste it into <strong>Embed URL / iframe</strong>. The website extracts the map URL automatically.</li><li>Paste the normal Google Maps share link into <strong>Google Maps / Directions URL</strong>.</li><li>Enter the branch label and address, enable the location, then save.</li></ol>
    <h4>API-key setup — useful for several locations</h4><ol><li>Create a browser-restricted Maps Embed API key in Google Cloud and paste it once in <strong>Maps Embed API Key</strong>.</li><li>For each branch, enter an address or Place ID. The website builds the embedded map automatically.</li><li>Restrict the key to this website domain before production use.</li></ol>
    <h4>Multiple branches</h4><p>Click <strong>+ Location</strong> for every branch. You can disable or remove a branch later without changing the other locations.</p>
    <div class="uc-warning"><strong>If no map appears:</strong> confirm the main toggle and that location are enabled. If using an iframe, paste the full Google Maps embed iframe/URL—not a normal search-result page. If using an API key, confirm Maps Embed API is enabled and the key's website restriction includes your live domain.</div>`;

  const REVIEW_HELP=`<h3>Google Reviews — Choose the Correct Connection</h3>
    <p class="uc-help-lead">The homepage can show up to four high-rating Google reviews beneath Client Success Stories. New eligible reviews replace older displayed reviews after the next refresh.</p>
    <h4>Option A — Places API (easier)</h4><ol><li>Enable <strong>Places API (New)</strong> in Google Cloud.</li><li>Copy the business <strong>Place ID</strong>.</li><li>Create a restricted API key and paste it into <strong>Places API Key</strong>.</li><li>Paste your public Google Maps business/reviews URL so <strong>View All Reviews</strong> can open it.</li><li>Save, then click <strong>Refresh Reviews Now</strong>.</li></ol>
    <p><strong>Use this when:</strong> you want the simplest integration. Google Place Details returns a Google-selected set of reviews, so this mode cannot guarantee that the four returned reviews are always the four newest reviews from the full Business Profile history.</p>
    <h4>Option B — Business Profile (best for newest-review control)</h4><ol><li>Use a verified Google Business Profile location.</li><li>Create OAuth credentials with Google Business Profile access.</li><li>Paste the OAuth Client ID, Client Secret and Refresh Token.</li><li>Paste only the Account ID and Location ID values.</li><li>Save, then refresh. This connection can request reviews ordered by latest update time.</li></ol>
    <h4>What the website displays</h4><ul><li>5-star reviews are selected first.</li><li>If <strong>Fill with 4-star reviews</strong> is enabled and there are fewer than four 5-star reviews, remaining spaces can use 4-star reviews.</li><li>Maximum four cards are shown.</li><li><strong>View All Reviews</strong> opens the Google Maps URL you saved.</li></ul>
    <div class="uc-warning"><strong>If reviews do not load:</strong> check that the chosen source is enabled, its credentials are valid, the Place/Location ID is correct, and the Business Profile location is verified when using Business Profile mode. Saving a Google Maps link by itself cannot fetch live review text.</div>`;

  function ensurePanels(){
    const main=$('main.main');if(!main)return;
    if(!$('#favorites')){
      const s=document.createElement('section');s.id='favorites';s.className='panel';s.innerHTML=`
        <div class="top"><h1>Favorites</h1><div class="top-actions"><input id="ucFavSearch" class="search-input" placeholder="Search favorite clients"><button class="btn secondary compact" type="button" onclick="load_favorites()">Search / Refresh</button><button class="btn secondary compact" type="button" onclick="downloadFavoritesExcel()">Download Excel</button></div></div>
        <div class="card"><div class="block-head"><div><h2>Favorite Clients</h2><p class="muted">Clients marked as Favorite from Client Details appear here. Click a name to open the complete client record.</p></div></div><div id="ucFavoritesTable" class="table-wrap"></div></div>`;main.appendChild(s);
    }
    if(!$('#mapsReviews')){
      const s=document.createElement('section');s.id='mapsReviews';s.className='panel';s.innerHTML=`
        <div class="top"><div><h1>Maps & Reviews</h1><p class="muted">Connect public office maps and Google review cards without changing website code.</p></div><button class="btn secondary compact" type="button" onclick="load_mapsReviews()">Refresh</button></div>
        <div id="ucMapsGlobalMsg"></div>
        <details id="ucContactMapDetails" class="card admin-collapsed-card uc-maps-card"><summary>Google Map — Contact Page</summary><div class="collapsed-body">
          <form id="ucContactMapForm" class="form" onsubmit="saveUCContactMap(event)">
            ${toggleField('Show Google Map on Contact Page','enabled','The map section stays completely hidden when this is off.')}
            <div class="field"><label>Maps Embed API Key Optional <small id="ucEmbedKeyState" class="hint inline-hint"></small></label><input name="embedApiKey" type="password" placeholder="Leave blank to keep saved key"><small class="hint">Optional when you paste a Google Maps Embed URL for each location. If used, create it in Google Cloud and restrict it to your live website.</small></div>
            <div class="uc-map-head"><div><h3>Locations</h3><p class="muted">Add one or more offices/branches. At least an Embed URL, or an API key plus Address/Place ID, is needed for an interactive map.</p></div><button class="btn secondary compact" type="button" onclick="addUCMapLocation()">+ Location</button></div>
            <div id="ucMapLocations"></div>
            <div class="form-actions"><button class="btn compact">Save Contact Map</button></div><div id="ucContactMapMsg"></div>
          </form></div></details>
        <details id="ucReviewsDetails" class="card admin-collapsed-card uc-maps-card"><summary>Google Reviews — Home Page</summary><div class="collapsed-body">
          <form id="ucReviewsForm" class="form" onsubmit="saveUCReviews(event)">
            ${toggleField('Show Google Reviews on Home Page','enabled','Up to four eligible review cards appear beneath Client Success Stories when enabled.')}
            <div class="row"><div class="field"><label>Review Connection</label><select name="source" onchange="syncUCReviewSource()"><option value="places">Places API — Easier</option><option value="business_profile">Business Profile — Newest Review Control</option></select><small class="hint">Places is simpler. Business Profile is the better choice when you need reviews ordered by newest update.</small></div><div class="field"><label>Refresh Interval</label><select name="refreshMinutes"><option value="15">Every 15 minutes</option><option value="30">Every 30 minutes</option><option value="60">Every 1 hour</option><option value="180">Every 3 hours</option><option value="360">Every 6 hours</option></select><small class="hint">The public site uses the last good cached reviews and refreshes again after this interval.</small></div></div>
            <div class="field"><label>Google Maps / All Reviews URL</label><input name="mapsUrl" placeholder="https://maps.app.goo.gl/... or Google Maps business URL"><small class="hint">Used only for the public “View All Reviews” button.</small></div>
            <div id="ucPlacesReviewFields" class="uc-review-source-fields"><div class="row"><div class="field"><label>Google Place ID</label><input name="placeId" placeholder="ChIJ..."><small class="hint">The unique Place ID for the business location.</small></div><div class="field"><label>Places API Key <small id="ucPlacesKeyState" class="hint inline-hint"></small></label><input name="placesApiKey" type="password" placeholder="Leave blank to keep saved key"><small class="hint">Google Cloud → APIs & Services → Credentials. Enable Places API (New) and restrict this server key appropriately.</small></div></div></div>
            <div id="ucBusinessReviewFields" class="uc-review-source-fields" hidden>
              <div class="notice">Business Profile mode is for a verified business location and requires Google Business Profile OAuth access.</div>
              <div class="row"><div class="field"><label>OAuth Client ID</label><input name="businessClientId"><small class="hint">Provided by Google Cloud OAuth credentials for the project that has Business Profile API access.</small></div><div class="field"><label>OAuth Client Secret <small id="ucBusinessSecretState" class="hint inline-hint"></small></label><input name="businessClientSecret" type="password" placeholder="Leave blank to keep saved secret"><small class="hint">Provided with the OAuth Client ID. Keep this private.</small></div></div>
              <div class="field"><label>OAuth Refresh Token <small id="ucBusinessRefreshState" class="hint inline-hint"></small></label><input name="businessRefreshToken" type="password" placeholder="Leave blank to keep saved refresh token"><small class="hint">Generated after the business owner authorizes the Business Profile management scope. It lets the server refresh access without asking the admin to sign in every time.</small></div>
              <div class="row"><div class="field"><label>Business Profile Account ID</label><input name="businessAccountId" placeholder="123456789"><small class="hint">Paste the numeric Account ID only, not “accounts/”.</small></div><div class="field"><label>Business Profile Location ID</label><input name="businessLocationId" placeholder="987654321"><small class="hint">Paste the Location ID only, not “locations/”. The location must be verified for review access.</small></div></div>
            </div>
            <label class="uc-v6-toggle-row compact"><span><strong>Fill empty review spaces with 4-star reviews</strong><small>5-star reviews always come first. This is only used when fewer than four 5-star reviews are available from the selected API response.</small></span><span class="switch"><input type="checkbox" name="fillWithFourStar"><span class="slider"></span></span></label>
            <div class="form-actions"><button class="btn compact">Save Review Integration</button><button class="btn secondary compact" type="button" onclick="refreshUCReviewsNow()">Refresh Reviews Now</button></div><div id="ucReviewsMsg"></div>
            <div id="ucReviewCachePreview" class="uc-review-cache"></div>
          </form></div></details>`;main.appendChild(s);
      info($('#ucContactMapDetails'),MAP_HELP);info($('#ucReviewsDetails'),REVIEW_HELP);
    }
  }

  function ensureNavigation(){
    ensurePanels();
    const customers=$('.nav-group[data-group-title="Customers"] .nav-group-items');
    if(customers&&!customers.querySelector('[data-tab="favorites"]')){const b=document.createElement('button');b.dataset.tab='favorites';b.className='nav-subitem';b.textContent='Favorites';b.onclick=()=>window.tab('favorites');customers.appendChild(b);}
    const settings=$('.nav-group[data-group-title="Settings"] .nav-group-items');
    if(settings&&!settings.querySelector('[data-tab="mapsReviews"]')){const b=document.createElement('button');b.dataset.tab='mapsReviews';b.className='nav-subitem';b.textContent='Maps & Reviews';b.onclick=()=>window.tab('mapsReviews');const storage=settings.querySelector('[data-tab="storage"]');settings.insertBefore(b,storage||null);}
  }

  window.load_favorites=async function(silent){
    ensurePanels();const box=$('#ucFavoritesTable');if(!box)return;const q=$('#ucFavSearch')?.value||'';
    if(!silent)box.innerHTML='<div class="notice">Loading favorite clients…</div>';
    try{
      const r=await api('/api/admin/favorites'+(q?`?q=${encodeURIComponent(q)}`:'')),rows=r.rows||[];
      box.innerHTML=rows.length?`<table class="table fixed-table uc-favorites-table"><thead><tr><th>Favorite Client</th><th>WhatsApp</th><th>Email</th><th>Interest</th><th>Next Action</th><th>Visits</th><th>Time Spent</th><th>Updated</th></tr></thead><tbody>${rows.map(x=>`<tr><td><button class="link-button uc-fav-name" type="button" onclick="openClientDetails('lead:${Number(x.id)}')"><span class="uc-fav-badge">FAV</span>${H(x.name||'Client')}</button></td><td>${H(x.phone||'-')}</td><td>${H(x.email||'-')}</td><td>${H(x.interest_level||x.status||'-')}</td><td>${H(x.next_action||'-')}</td><td>${Number(x.visit_count||0)}</td><td>${H(formatFavDuration(x.time_spent_ms))}</td><td>${H(String(x.updated_at||x.created_at||'').replace('T',' ').slice(0,16)||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="notice">No favorite clients yet. Open a Client Details card and switch Favorite on.</div>';
    }catch(e){box.innerHTML=`<div class="error">${H(e.message||'Could not load Favorites.')}</div>`;}
  };
  function formatFavDuration(ms){let s=Math.max(0,Math.floor(Number(ms||0)/1000)),m=Math.floor(s/60),sec=s%60,h=Math.floor(m/60),min=m%60,d=Math.floor(h/24),hr=h%24,mo=Math.floor(d/30),day=d%30;const a=[];if(mo)a.push(`${mo} mo`);if(day)a.push(`${day} d`);if(hr)a.push(`${hr} h`);if(min)a.push(`${min} m`);if(sec||!a.length)a.push(`${sec} s`);return a.join(' ');}
  window.downloadFavoritesExcel=async function(){
    try{const q=$('#ucFavSearch')?.value||'',r=await api('/api/admin/favorites'+(q?`?q=${encodeURIComponent(q)}`:'')),rows=r.rows||[];if(!rows.length)return toast('No favorite clients to export.','error');
      const esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      const html=`<table><tr><th>Name</th><th>Phone</th><th>Email</th><th>Instagram</th><th>Interest</th><th>Next Action</th><th>Follow-up</th><th>Visits</th><th>Time Spent</th></tr>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td>${esc(x.instagram_id)}</td><td>${esc(x.interest_level||x.status)}</td><td>${esc(x.next_action)}</td><td>${esc(x.follow_up_date)}</td><td>${Number(x.visit_count||0)}</td><td>${esc(formatFavDuration(x.time_spent_ms))}</td></tr>`).join('')}</table>`;
      const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`dropbeat-dance-studio-favorites-${new Date().toISOString().slice(0,10)}.xls`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
    }catch(e){toast(e.message||'Could not download Favorites.','error');}
  };

  function locationTemplate(x={},i=0){return `<article class="uc-map-location" data-location-id="${H(x.id||crypto.randomUUID())}"><div class="uc-map-location-head"><h4>Location ${i+1}</h4><div><label class="uc-mini-check"><input type="checkbox" data-map-field="enabled" ${x.enabled===false?'':'checked'}> Enabled</label><button class="btn danger small" type="button" onclick="removeUCMapLocation(this)">Remove</button></div></div><div class="row"><div class="field"><label>Location / Branch Name</label><input data-map-field="label" value="${H(x.label||'')}"></div><div class="field"><label>Full Address</label><input data-map-field="address" value="${H(x.address||'')}"></div></div><div class="row"><div class="field"><label>Google Place ID Optional</label><input data-map-field="placeId" value="${H(x.placeId||'')}"><small class="hint">Use when you have the exact Place ID. It gives Google a stable location reference.</small></div><div class="field"><label>Google Maps / Directions URL</label><input data-map-field="mapsUrl" value="${H(x.mapsUrl||'')}"><small class="hint">Paste the public Google Maps business/share link. Used by Get Directions.</small></div></div><div class="field"><label>Embed URL / iframe Optional</label><input data-map-field="embedUrl" value="${H(x.embedUrl||'')}"><small class="hint">Google Maps → Share → Embed a map → copy the iframe. You can paste the full iframe or only its https://www.google.com/maps/embed… URL.</small></div></article>`;}
  function renderLocations(rows){const box=$('#ucMapLocations');if(!box)return;const list=Array.isArray(rows)&&rows.length?rows:[{enabled:true,label:'Main Office',address:'',placeId:'',mapsUrl:'',embedUrl:''}];box.innerHTML=list.map(locationTemplate).join('');renumberLocations();}
  function renumberLocations(){ $$('#ucMapLocations .uc-map-location').forEach((x,i)=>{const h=x.querySelector('h4');if(h)h.textContent=`Location ${i+1}`;}); }
  window.addUCMapLocation=function(){const box=$('#ucMapLocations');if(!box)return;if(box.children.length>=12)return toast('A maximum of 12 locations can be configured.','error');box.insertAdjacentHTML('beforeend',locationTemplate({},box.children.length));};
  window.removeUCMapLocation=function(btn){btn.closest('.uc-map-location')?.remove();renumberLocations();};
  function collectLocations(){return $$('#ucMapLocations .uc-map-location').map(x=>{const g=k=>x.querySelector(`[data-map-field="${k}"]`);return{id:x.dataset.locationId,enabled:!!g('enabled')?.checked,label:g('label')?.value||'',address:g('address')?.value||'',placeId:g('placeId')?.value||'',mapsUrl:g('mapsUrl')?.value||'',embedUrl:g('embedUrl')?.value||''};});}

  window.syncUCReviewSource=function(){const f=$('#ucReviewsForm');if(!f)return;const business=f.source.value==='business_profile';$('#ucPlacesReviewFields').hidden=business;$('#ucBusinessReviewFields').hidden=!business;};
  function reviewPreview(cache){const box=$('#ucReviewCachePreview');if(!box)return;if(!cache?.reviews?.length){box.innerHTML='<div class="notice">No cached review preview yet. Save valid credentials, then use Refresh Reviews Now.</div>';return;}box.innerHTML=`<div class="uc-cache-head"><strong>Current Website Review Preview</strong><small>${H(cache.businessName||'Google Business')} • ${Number(cache.totalReviewCount||0)} total review(s) • Last fetched ${H(cache.fetchedAt||'-')}</small></div><div class="uc-cache-grid">${cache.reviews.slice(0,4).map(x=>`<article><div class="uc-review-stars">${'★'.repeat(Math.max(0,Math.min(5,Number(x.rating||0))))}</div><strong>${H(x.author||'Google reviewer')}</strong><p>${H(x.text||'No written comment.')}</p></article>`).join('')}</div>`;}

  window.load_mapsReviews=async function(){
    ensurePanels();
    try{
      const r=await api('/api/admin/maps-reviews');MAPS.settings=r.settings||{};MAPS.cache=r.cache||null;
      const c=MAPS.settings.contactMap||{},cf=$('#ucContactMapForm');if(cf){cf.enabled.checked=!!c.enabled;cf.embedApiKey.value='';$('#ucEmbedKeyState').textContent=c.embedApiKeyState?`(${c.embedApiKeyState})`:'';renderLocations(c.locations||[]);}
      const v=MAPS.settings.reviews||{},rf=$('#ucReviewsForm');if(rf){rf.enabled.checked=!!v.enabled;rf.source.value=v.source||'places';rf.mapsUrl.value=v.mapsUrl||'';rf.placeId.value=v.placeId||'';rf.placesApiKey.value='';rf.refreshMinutes.value=String(v.refreshMinutes||30);rf.fillWithFourStar.checked=v.fillWithFourStar!==false;rf.businessClientId.value=v.businessClientId||'';rf.businessClientSecret.value='';rf.businessRefreshToken.value='';rf.businessAccountId.value=v.businessAccountId||'';rf.businessLocationId.value=v.businessLocationId||'';$('#ucPlacesKeyState').textContent=v.placesApiKeyState?`(${v.placesApiKeyState})`:'';$('#ucBusinessSecretState').textContent=v.businessClientSecretState?`(${v.businessClientSecretState})`:'';$('#ucBusinessRefreshState').textContent=v.businessRefreshTokenState?`(${v.businessRefreshTokenState})`:'';syncUCReviewSource();reviewPreview(MAPS.cache);}
    }catch(e){const b=$('#ucMapsGlobalMsg');if(b)b.innerHTML=`<div class="error">${H(e.message||'Could not load Maps & Reviews.')}</div>`;}
  };
  window.saveUCContactMap=async function(e){e.preventDefault();const f=e.currentTarget,b=$('#ucContactMapMsg');b.innerHTML='<div class="notice">Saving map settings…</div>';try{const p={action:'save_contact_map',contactMap:{enabled:f.enabled.checked,embedApiKey:f.embedApiKey.value,locations:collectLocations()}};await api('/api/admin/maps-reviews',{method:'POST',body:JSON.stringify(p)});b.innerHTML='<div class="notice success">Contact map settings saved. Public map visibility now follows the toggle and saved locations.</div>';await load_mapsReviews();}catch(err){b.innerHTML=`<div class="error">${H(err.message)}</div>`;}};
  window.saveUCReviews=async function(e){e.preventDefault();const f=e.currentTarget,b=$('#ucReviewsMsg');b.innerHTML='<div class="notice">Saving review integration…</div>';try{const p={action:'save_reviews',reviews:{enabled:f.enabled.checked,source:f.source.value,mapsUrl:f.mapsUrl.value,placeId:f.placeId.value,placesApiKey:f.placesApiKey.value,refreshMinutes:f.refreshMinutes.value,fillWithFourStar:f.fillWithFourStar.checked,businessClientId:f.businessClientId.value,businessClientSecret:f.businessClientSecret.value,businessRefreshToken:f.businessRefreshToken.value,businessAccountId:f.businessAccountId.value,businessLocationId:f.businessLocationId.value}};await api('/api/admin/maps-reviews',{method:'POST',body:JSON.stringify(p)});b.innerHTML='<div class="notice success">Review integration saved. Use Refresh Reviews Now to test the connection.</div>';await load_mapsReviews();}catch(err){b.innerHTML=`<div class="error">${H(err.message)}</div>`;}};
  window.refreshUCReviewsNow=async function(){const b=$('#ucReviewsMsg');if(b)b.innerHTML='<div class="notice">Fetching Google reviews… please wait.</div>';try{const r=await api('/api/admin/maps-reviews',{method:'POST',body:JSON.stringify({action:'refresh_reviews'})});MAPS.cache=r.cache||null;if(b)b.innerHTML='<div class="notice success">Reviews fetched successfully. The homepage will use the newest eligible cached set.</div>';reviewPreview(MAPS.cache);}catch(e){if(b)b.innerHTML=`<div class="error">${H(e.message||'Review refresh failed.')}</div>`;}};

  const oldTab=window.tab;
  window.tab=function(id){const r=typeof oldTab==='function'?oldTab.apply(this,arguments):undefined;ensureNavigation();if(id==='favorites')setTimeout(()=>load_favorites(),30);if(id==='mapsReviews')setTimeout(()=>load_mapsReviews(),30);return r;};

  function init(){ensurePanels();ensureNavigation();info($('#ucContactMapDetails'),MAP_HELP);info($('#ucReviewsDetails'),REVIEW_HELP);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,350));else setTimeout(init,350);
  setTimeout(init,1800);setTimeout(init,3600);setTimeout(init,6500);
})();
