/* Final client-request fixes: Home Page Banner naming, table alignment, grouped menu and minutes-based visitor time. */
(function(){
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qsLocal=s=>document.querySelector(s);
  const qsaLocal=s=>Array.from(document.querySelectorAll(s));
  const status=s=>`<span class="status ${H(s)}">${H(s||'-')}</span>`;

  function setButtonLabel(btn,label){
    if(!btn)return;
    const badge=btn.querySelector('.nav-badge');
    btn.textContent=label;
    if(badge) btn.appendChild(badge);
  }

  function renameHomePageBannerLabels(){
    const bannerBtn=qsLocal('[data-tab="banners"]');
    if(bannerBtn) setButtonLabel(bannerBtn,'Home Page Banners');
    const panel=qsLocal('#banners');
    if(!panel)return;
    panel.querySelectorAll('h1,h2,h3,summary,th,button,small,div,p,label').forEach(el=>{
      if(el.childNodes.length===1 && el.childNodes[0].nodeType===3){
        el.textContent=el.textContent
          .replace(/Existing Hero Banners/g,'Existing Home Page Banners')
          .replace(/Add Hero Banner/g,'Add Home Page Banner')
          .replace(/Hero Banners/g,'Home Page Banners')
          .replace(/Hero Banner/g,'Home Page Banner')
          .replace(/Hero banner/g,'Home page banner')
          .replace(/hero banner/g,'home page banner')
          .replace(/hero background/g,'home page background');
      }
    });
    const formTitle=qsLocal('#bannerFormTitle'); if(formTitle && /Hero/.test(formTitle.textContent)) formTitle.textContent=formTitle.textContent.replace(/Hero Banner/g,'Home Page Banner');
    const summary=qsLocal('#bannerFormSummary'); if(summary && /Hero/.test(summary.textContent)) summary.textContent=summary.textContent.replace(/Hero Banner/g,'Home Page Banner');
  }

  window.load_banners=async function(){
    const res=await api('/api/admin/banners');
    A.banners=res.banners||[];
    const box=qsLocal('#bannerTable');
    if(!box)return;
    const rows=A.banners.length?A.banners.map(b=>`<tr>
      <td class="text-cell"><strong>${H(b.title)}</strong><br><small>${H(b.subtitle||'')}</small></td>
      <td><img class="preview-img" src="${H(b.desktop_image_url||'/assets/gym-hero.jpg')}" alt=""></td>
      <td class="text-cell"><small>${H(b.link_type)}: ${H(b.link_value||'')}</small></td>
      <td>${status(b.visible?'visible':'hidden')}</td>
      <td><div class="sort-actions nowrap"><button class="btn secondary small icon-action" title="Move up" onclick="moveBanner(${b.id},-1)">↑</button><button class="btn secondary small icon-action" title="Move down" onclick="moveBanner(${b.id},1)">↓</button></div></td>
      <td><div class="action-row nowrap"><button class="btn secondary small icon-action" title="Edit" onclick="editBanner(${b.id})">✎</button><button class="btn danger small icon-action" title="Delete" onclick="deleteBanner(${b.id})">×</button></div></td>
    </tr>`).join(''):`<tr class="empty-row"><td colspan="6">No home page banners added yet.</td></tr>`;
    box.innerHTML=`<table class="table fixed-table homepage-banner-table banner-admin-table">
      <colgroup>
        <col style="width:34%"><col style="width:11%"><col style="width:17%"><col style="width:10%"><col style="width:13%"><col style="width:15%">
      </colgroup>
      <thead><tr><th>Home Page Banner</th><th>Image</th><th>Link</th><th>Status</th><th>Sort</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    renameHomePageBannerLabels();
  };

  function formatVisitTime(ms){
    const totalSeconds=Math.max(0,Math.round(Number(ms||0)/1000));
    const minutes=Math.floor(totalSeconds/60);
    const seconds=totalSeconds%60;
    return `${minutes}.${String(seconds).padStart(2,'0')} M`;
  }

  window.loadVisitorInfo=async function(force=false){
    let r;
    try{r=await api('/api/admin/visitor-info'+(force?'?refresh=1&cache=17.03':'?cache=17.03'),{cache:'no-store'});if(r.error)throw new Error(r.error);}
    catch(error){for(const id of ['#visitorSummary','#visitorSources','#visitorPages','#visitorRecent']){const box=qsLocal(id);if(box)box.innerHTML=`<div class="error">${H(error.message||'Visitor records could not be loaded.')}</div>`;}throw error;}
    const summary=r.summary||{};
    const cards=qsLocal('#visitorSummary');
    if(cards)cards.innerHTML=r.analytics_error?`<div class="error">Visitor totals are temporarily unavailable: ${H(r.analytics_error)}. The visitor journey below remains available.</div>`:`<div class="card"><span class="muted">Total Visitors</span><span class="stat">${summary.visitors||0}</span><small>Unique website visitors</small></div><div class="card"><span class="muted">Repeat Visitors</span><span class="stat">${summary.repeat_visitors||0}</span><small>Visited more than once</small></div><div class="card"><span class="muted">Page Views</span><span class="stat">${summary.total_events||0}</span><small>Total page visit records</small></div><div class="card"><span class="muted">Average View Time</span><span class="stat">${formatVisitTime(summary.avg_duration_ms)}</span><small>Minutes.seconds from page activity</small></div>`;
    function table(sel,cols,rows,map){
      const b=qsLocal(sel);if(!b)return;
      b.innerHTML=rows?.length?`<table class="table fixed-table"><thead><tr>${cols.map(c=>`<th>${H(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(map).join('')}</tbody></table>`:'<div class="notice">No visitor data yet.</div>';
    }
    if(r.analytics_error){for(const id of ['#visitorSources','#visitorPages']){const box=qsLocal(id);if(box)box.innerHTML='<div class="notice">Totals are temporarily unavailable. Recent visits are shown below.</div>';}}
    else{
      table('#visitorSources',['Source','Visits','Visitors','Avg Time'],r.sources||[],x=>`<tr><td>${H(x.source||'Direct / unknown')}</td><td>${x.visits||0}</td><td>${x.visitors||0}</td><td>${formatVisitTime(x.avg_duration_ms)}</td></tr>`);
      table('#visitorPages',['Page','Visits','Visitors','Avg Time'],r.pages||[],x=>`<tr><td class="text-cell">${H(x.path||'/')}</td><td>${x.visits||0}</td><td>${x.visitors||0}</td><td>${formatVisitTime(x.avg_duration_ms)}</td></tr>`);
    }
    table('#visitorRecent',['Visitor / Lead','Visits','Sources','Pages'],r.recent||[],x=>`<tr><td class="text-cell"><strong>${H(x.lead_name||x.visitor_id||'-')}</strong><br><small>${H(x.lead_phone||'')} ${x.lead_status?`• ${H(x.lead_status)}`:''}</small><br><small>${H(x.last_seen||'')}</small></td><td>${x.visits||0}</td><td class="text-cell"><small>${H(x.sources||'')}</small></td><td class="text-cell"><small>${H(x.pages||'')}</small></td></tr>`);
  };

  function buildGroupedNav(){
    const nav=qsLocal('.side .nav');
    if(!nav || nav.dataset.grouped==='1')return;
    qsaLocal('[data-tab="banners"]').forEach(btn=>setButtonLabel(btn,'Home Page Banners'));

    const allButtons=Array.from(nav.querySelectorAll('button[data-tab]'));
    const byTab={};
    allButtons.forEach(btn=>{byTab[btn.dataset.tab]=btn; btn.classList.add('nav-subitem');});

    nav.innerHTML='';
    const dashboard=byTab.dashboard;
    if(dashboard){
      dashboard.classList.remove('nav-subitem');
      dashboard.onclick=()=>window.tab('dashboard');
      nav.appendChild(dashboard);
    }
    const search=byTab.search;
    if(search){
      search.classList.remove('nav-subitem');
      search.onclick=()=>window.tab('search');
      nav.appendChild(search);
    }

    // V16.62 authoritative navigation. Keep this legacy builder aligned so logout/login
    // can never resurrect the retired Sales Setup / Leads & Orders / Website Content menu.
    const groups=[
      ['Sales',['customSubscription','products','bulk','placements']],
      ['Orders & Leads',['orders','refunds','leads','requests']],
      ['Customers',['subscribers','unsubscribed','oneTimeUsers','favorites']],
      ['Social Media',['blogs','socialPosts','socialDMs','blogComments','socialAutomations']],
      ['Settings',['pages','tracking','socialMediaIntegrations','settings']]
    ];

    groups.forEach(([title,ids])=>{
      const existing=ids.map(id=>byTab[id]).filter(Boolean);
      if(!existing.length)return;
      const group=document.createElement('div');
      group.className='nav-group';
      group.dataset.groupTitle=title;
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='nav-group-toggle';
      toggle.innerHTML=`<span>${H(title)}</span><span class="nav-arrow">⌄</span>`;
      const items=document.createElement('div');
      items.className='nav-group-items';
      existing.forEach(btn=>{
        btn.onclick=()=>{window.tab(btn.dataset.tab); group.classList.add('open');};
        items.appendChild(btn);
      });
      toggle.onclick=()=>{
        const willOpen=!group.classList.contains('open');
        qsaLocal('.nav-group').forEach(g=>{if(g!==group)g.classList.remove('open');});
        group.classList.toggle('open',willOpen);
      };
      group.appendChild(toggle);
      group.appendChild(items);
      nav.appendChild(group);
    });

    // Retired/unmapped navigation buttons remain available to their existing code but
    // are intentionally not reinserted into the visible admin menu.
    const used=new Set(['dashboard','search',...groups.flatMap(g=>g[1])]);
    allButtons.forEach(btn=>{if(!used.has(btn.dataset.tab))btn.remove();});

    nav.dataset.grouped='1';
    setActiveGroup(qsLocal('.nav button.active[data-tab]')?.dataset.tab || 'dashboard');
  }

  function setActiveGroup(tabId){
    qsaLocal('.nav-group').forEach(group=>{
      const has=!!group.querySelector(`[data-tab="${tabId}"]`);
      group.classList.toggle('has-active',has);
      if(has) group.classList.add('open');
      else group.classList.remove('open');
    });
  }

  const oldTab=window.tab;
  window.tab=function(id){
    if(!id)return;
    oldTab(id);
    renameHomePageBannerLabels();
    setActiveGroup(id);
  };

  const oldStart=window.startAdmin;
  window.startAdmin=async function(){
    const ok=await checkAuth();
    if(!ok)return;
    qsaLocal('.nav button[data-tab]').forEach(b=>b.onclick=()=>window.tab(b.dataset.tab));
    buildGroupedNav();
    window.tab('dashboard');
  };

  function afterReady(){
    setTimeout(()=>{renameHomePageBannerLabels();buildGroupedNav();},250);
    setTimeout(()=>{renameHomePageBannerLabels();buildGroupedNav();},900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',afterReady);
  else afterReady();
})();
