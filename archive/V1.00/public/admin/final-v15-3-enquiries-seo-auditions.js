/* V15.3 — additive admin workflow polish.
   - Repairs legacy/current enquiry visibility and defaults Enquiries to New.
   - Adds New/Published/Drafts/Deleted/All audition filters + newest/oldest sorting.
   - Adds Featured and one-click Publish-from-Draft controls.
   - Renames Blogger-facing admin language to SEO without changing backend field names.
   Existing admin colors/theme variables are intentionally untouched. */
(function(){
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function req(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.payload=d;throw e;}return d;}
  function say(target,text,type='notice'){if(typeof window.msg==='function'){window.msg(target,text,type);return;}const el=$(target);if(el)el.innerHTML=`<div class="${type==='error'?'error':'notice'}">${H(text)}</div>`;}
  function dateVal(v){if(!v)return 0;const raw=String(v);const d=new Date(raw.includes('T')?raw:raw.replace(' ','T')+'Z');return Number.isNaN(d.getTime())?0:d.getTime();}
  function localDate(v){if(!v)return '-';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(d);}
  function titleCase(v=''){return String(v).replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());}

  /* ----------------------------- Enquiries ----------------------------- */
  window.__inquiryStatus='new';
  function ensureInquiryTabs(){
    const panel=$('#leads'); if(!panel)return;
    let tabs=panel.querySelector('.uc-v15-inquiry-tabs')||panel.querySelector('.tabs'); if(!tabs)return;
    tabs.className='tabs uc-v15-inquiry-tabs uc-v153-inquiry-tabs';
    tabs.innerHTML=`<button class="pill active" data-inquiry-status="new" onclick="ucV153InquiryFilter('new',this)">New</button><button class="pill" data-inquiry-status="in_progress" onclick="ucV153InquiryFilter('in_progress',this)">In Progress</button><button class="pill" data-inquiry-status="resolved" onclick="ucV153InquiryFilter('resolved',this)">Resolved</button><button class="pill" data-inquiry-status="all" onclick="ucV153InquiryFilter('all',this)">All</button>`;
  }
  function inquiryBadge(s){const v=String(s||'new').toLowerCase();const cls=v==='resolved'?'active':v==='new'?'new':'pending';return `<span class="status ${cls}">${H(titleCase(v))}</span>`;}
  function inquiryTable(rows=[]){
    return `<div class="table-wrap"><table class="table fixed-table uc-v15-inquiry-table uc-v153-inquiry-table"><thead><tr><th>Lead</th><th>Contact</th><th>Message / Details</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.length?rows.map(x=>{
      const id=Number(x.inquiry_id||0),lead=Number(x.lead_id||0),legacy=Number(x.legacy||0)===1;
      const resolveCall=id?`ucV153SetInquiryStatus(${id},0,'resolved')`:`ucV153SetInquiryStatus(0,${lead},'resolved')`;
      const deleteCall=id?`ucV153DeleteInquiry(${id},0)`:`ucV153DeleteInquiry(0,${lead})`;
      return `<tr><td class="text-cell"><button class="link-button" type="button" onclick="openClientDetails('lead:${lead}')"><strong>${H(x.name||'Client')}</strong></button><br><small>${H(localDate(x.created_at||x.updated_at))}${legacy?' · Earlier enquiry':''}</small></td><td class="text-cell">${H(x.phone||'-')}<br><small>${H(x.email||'')}</small></td><td class="text-cell">${H(x.message||'-')}<br><small>${H(x.source_detail||x.lead_source||'/contact')}</small></td><td>${inquiryBadge(x.inquiry_status)}</td><td><div class="action-row nowrap"><button class="btn secondary small icon-action" type="button" title="Edit client" aria-label="Edit client" onclick="openLeadEditor(${lead})">✎</button>${String(x.inquiry_status||'new')!=='resolved'?`<button class="btn secondary small icon-action" type="button" title="Mark inquiry resolved" aria-label="Mark inquiry resolved" onclick="${resolveCall}">✓</button>`:''}<button class="btn danger small icon-action" type="button" title="Delete inquiry from workspace" aria-label="Delete inquiry from workspace" onclick="${deleteCall}">×</button></div></td></tr>`;
    }).join(''):'<tr class="empty-row"><td colspan="5">No enquiries found for this filter.</td></tr>'}</tbody></table></div>`;
  }
  function updateInquiryCount(r){
    const count=Number(r?.all_count||0);
    const nav=$('[data-tab="leads"]')||Array.from(document.querySelectorAll('button,a')).find(x=>/^Enquiries(?:\s*\(\d+\))?$/i.test((x.textContent||'').trim()));
    if(nav){let badge=nav.querySelector('.nav-badge');if(!badge){badge=document.createElement('span');badge.className='nav-badge';nav.appendChild(badge);}badge.textContent=count?`(${count})`:'';badge.hidden=!count;}
    const stat=$('#statInquiries');if(stat)stat.textContent=String(Number(r?.in_progress_count||0));
  }
  window.load_leads=async function(status){
    ensureInquiryTabs(); const wanted=['new','in_progress','resolved','all'].includes(String(status||''))?String(status):String(window.__inquiryStatus||'new'); window.__inquiryStatus=wanted;
    $$('.uc-v153-inquiry-tabs .pill').forEach(b=>b.classList.toggle('active',b.dataset.inquiryStatus===wanted));
    const box=$('#leadsTable');if(box)box.innerHTML='<div class="notice">Loading enquiries…</div>';
    try{
      const q=$('#leadSearch')?.value||'';const params=new URLSearchParams({mode:'inquiries',status:wanted});if(q)params.set('q',q);
      const r=await req('/api/admin/leads?'+params.toString());window.A=window.A||{};A.inquiries=r.inquiries||[];updateInquiryCount(r);if(box)box.innerHTML=inquiryTable(A.inquiries);
    }catch(e){if(box)box.innerHTML=`<div class="error">${H(e.message||'Enquiries could not be loaded.')}</div>`;}
  };
  window.ucV153InquiryFilter=function(status,btn){window.__inquiryStatus=status;$$('.uc-v153-inquiry-tabs .pill').forEach(x=>x.classList.toggle('active',x===btn));window.load_leads(status);};
  window.ucV15InquiryFilter=window.ucV153InquiryFilter;
  window.ucV153SetInquiryStatus=async function(inquiryId,leadId,status){try{await req('/api/admin/leads',{method:'POST',body:JSON.stringify({action:'inquiry_status',inquiry_id:Number(inquiryId||0),lead_id:Number(leadId||0),status})});await window.load_leads(window.__inquiryStatus);await window.load_dashboard?.();}catch(e){alert(e.message||'Could not update enquiry.');}};
  window.ucV15SetInquiryStatus=function(id,status){return window.ucV153SetInquiryStatus(id,0,status);};
  window.ucV153DeleteInquiry=async function(inquiryId,legacyLeadId){if(!confirm('Remove this enquiry from the enquiry workspace? The client record will remain available.'))return;try{const url=inquiryId?`/api/admin/leads?inquiry_id=${encodeURIComponent(inquiryId)}`:`/api/admin/leads?legacy_lead_id=${encodeURIComponent(legacyLeadId)}`;await req(url,{method:'DELETE'});await window.load_leads(window.__inquiryStatus);await window.load_dashboard?.();}catch(e){alert(e.message||'Could not remove enquiry.');}};
  window.ucV15DeleteInquiry=function(id){return window.ucV153DeleteInquiry(id,0);};

  // Keep the navigation badge tied to every visible enquiry while the dashboard card
  // remains the In Progress follow-up queue. This also replaces the older badge logic
  // that counted only contact_leads.status='new'.
  const oldDashboardV153=window.load_dashboard;
  if(typeof oldDashboardV153==='function')window.load_dashboard=async function(){
    const r=await oldDashboardV153.apply(this,arguments);
    try{const counts=await req('/api/admin/leads?mode=inquiries&status=all');updateInquiryCount(counts);}catch(_){}
    return r;
  };

  /* Dashboard inquiry shortcut intentionally remains In Progress: it is the work queue. */
  window.openDashboardInquiries=function(){window.__ucV153InquiryLaunch='in_progress';window.__inquiryStatus='in_progress';window.tab?.('leads');setTimeout(()=>{window.__ucV153InquiryLaunch='';const b=$('.uc-v153-inquiry-tabs [data-inquiry-status="in_progress"]');window.ucV153InquiryFilter('in_progress',b);},100);};

  /* ----------------------------- Auditions ----------------------------- */
  window.__ucV153AuditionFilter=window.__ucV153AuditionFilter||'new';
  window.__ucV153AuditionSort=window.__ucV153AuditionSort||'desc';
  const draftSvg=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4"/><path d="M9 15.5l5.6-5.6 1.8 1.8-5.6 5.6-2.3.5z"/></svg>`;
  const postSvg=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 20 4l-6.9 16-2.4-6.1z"/><path d="M10.7 13.9 20 4"/></svg>`;
  const sortSvg=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M7.5 12h9M10 17h4"/></svg>`;
  function addFeaturedControl(){
    const f=$('#blogForm');if(!f||f.querySelector('[name="is_featured"]'))return;
    const titleField=f.querySelector('[name="title"]')?.closest('.field');const anchor=titleField?.parentElement?.classList.contains('row')?titleField.parentElement:titleField;
    if(anchor)anchor.insertAdjacentHTML('beforebegin',`<label class="uc-v153-featured-control"><span><strong>Featured Fitness Tip</strong><small>Show this one published audition in the Featured box on the public Fitness Tip Updates page.</small></span><input type="checkbox" name="is_featured" value="1" aria-label="Feature this audition"><i aria-hidden="true"></i></label>`);
  }
  function parseAds(p){try{return Array.isArray(p?.ads_json)?p.ads_json:JSON.parse(String(p?.ads_json||'[]'));}catch{return [];}}
  function adBadges(p){
    const ads=parseAds(p),items=[];
    const custom=ads.some(x=>x?.custom||String(x?.type||'').toLowerCase()==='custom advertisement');
    const manual=ads.some(x=>!x?.custom&&String(x?.type||'').toLowerCase()!=='custom advertisement');
    if(custom)items.push('<span class="status active">Custom</span>');
    if(Number(p?.auto_ads_enabled||0))items.push('<span class="status pending">Automatic</span>');
    if(manual)items.push('<span class="status">Manual Ads</span>');
    return items.length?items.join(' '):'<span class="status draft">None</span>';
  }
  function auditionDate(p){return dateVal(p?.published_at||p?.updated_at||p?.created_at);}
  function filteredAuditions(posts=[]){
    const filter=window.__ucV153AuditionFilter||'new',week=7*24*60*60*1000,now=Date.now();
    let rows=posts.filter(p=>{
      const s=String(p.status||'draft').toLowerCase(),age=now-auditionDate(p);
      if(filter==='new')return s==='published'&&age>=0&&age<=week;
      if(filter==='published')return s==='published'&&(age>week||auditionDate(p)===0);
      if(filter==='drafts')return s==='draft';
      if(filter==='deleted')return s==='deleted';
      return true;
    });
    rows.sort((a,b)=>{const n=auditionDate(b)-auditionDate(a)||Number(b.id||0)-Number(a.id||0);return window.__ucV153AuditionSort==='asc'?-n:n;});
    return rows;
  }
  function statusText(s){return titleCase(String(s||'draft'));}
  function auditionToolbar(posts=[]){
    const f=window.__ucV153AuditionFilter||'new',counts={new:0,published:0,drafts:0,deleted:0,all:posts.length},week=7*24*60*60*1000,now=Date.now();
    for(const p of posts){const s=String(p.status||'draft').toLowerCase(),age=now-auditionDate(p);if(s==='published'&&age>=0&&age<=week)counts.new++;else if(s==='published')counts.published++;else if(s==='draft')counts.drafts++;else if(s==='deleted')counts.deleted++;}
    const btn=(k,t)=>`<button class="pill ${f===k?'active':''}" type="button" onclick="ucV153AuditionFilter('${k}',this)">${t} <small>${Number(counts[k]||0)}</small></button>`;
    return `<div class="uc-v153-audition-toolbar"><div class="tabs uc-v153-audition-tabs">${btn('new','New')}${btn('published','Published')}${btn('drafts','Drafts')}${btn('deleted','Deleted')}${btn('all','All')}</div><details class="uc-v153-sort"><summary title="Sort fitness updates" aria-label="Sort fitness updates">${sortSvg}</summary><div><button type="button" class="${window.__ucV153AuditionSort==='desc'?'active':''}" onclick="ucV153AuditionSort('desc')">Newest to Oldest</button><button type="button" class="${window.__ucV153AuditionSort==='asc'?'active':''}" onclick="ucV153AuditionSort('asc')">Oldest to Newest</button></div></details></div>`;
  }
  function auditionTable(rows=[]){
    return `<div class="table-wrap uc-v153-audition-table-wrap"><table class="table uc-v153-audition-table"><thead><tr><th>Fitness Tip Update</th><th>Status</th><th>Tags</th><th>Ads</th><th>Publishing</th><th>Actions</th></tr></thead><tbody>${rows.length?rows.map(p=>{
      const s=String(p.status||'draft').toLowerCase(),published=s==='published',draft=s==='draft',deleted=s==='deleted',linked=!!p.blogger_post_id;
      return `<tr><td><strong>${H(p.title)}</strong><br><small>${H(p.slug||'')}</small>${Number(p.is_featured||0)?'<br><span class="status active">Featured</span>':''}</td><td><span class="status ${H(s)}">${H(statusText(s))}</span></td><td>${(p.tags||[]).map(t=>`<span class="status">${H(t)}</span>`).join(' ')||'<small>—</small>'}</td><td>${adBadges(p)}</td><td><div class="uc-v153-sync-state"><strong>${linked?'Synced':deleted?'Removed':'Local'}</strong><br>${linked?`Post ID: ${H(p.blogger_post_id)}`:published?'Published locally':draft?'Draft is hidden':'Deleted from public view'}</div></td><td><div class="uc-v153-blog-actions"><button class="btn secondary icon-btn" type="button" title="Edit audition update" aria-label="Edit audition update" onclick="editBlog(${Number(p.id)})">✎</button>${draft?`<button class="btn secondary icon-btn uc-v153-post-btn" type="button" title="Post audition update" aria-label="Post audition update" onclick="ucV153PostDraft(${Number(p.id)})">${postSvg}</button>`:''}${published?`<button class="btn secondary icon-btn" type="button" title="Move to Draft" aria-label="Move to Draft" onclick="setAuditionDraft(${Number(p.id)})">${draftSvg}</button>`:''}${!deleted?`<button class="btn danger icon-btn" type="button" title="Move to Deleted" aria-label="Move to Deleted" onclick="deleteBlog(${Number(p.id)})">×</button>`:''}</div></td></tr>`;
    }).join(''):'<tr class="empty-row"><td colspan="6">No fitness updates found in this section.</td></tr>'}</tbody></table></div>`;
  }
  function renderAuditions(){
    const box=$('#blogTable');if(!box)return;const posts=window.A?.blogs||[],rows=filteredAuditions(posts);
    box.innerHTML=`${auditionToolbar(posts)}${auditionTable(rows)}`;
  }
  window.load_blogs=async function(){
    addFeaturedControl();const box=$('#blogTable');if(box)box.innerHTML='<div class="notice">Loading fitness updates…</div>';
    try{const r=await req('/api/admin/blogs');window.A=window.A||{};A.blogs=r.posts||[];renderAuditions();await refreshSeoPublishingNotice();return r;}catch(e){if(box)box.innerHTML=`<div class="error">${H(e.message||'Could not load fitness updates.')}</div>`;}
  };
  window.ucV153AuditionFilter=function(filter){window.__ucV153AuditionFilter=filter;renderAuditions();};
  window.ucV153AuditionSort=function(dir){window.__ucV153AuditionSort=dir==='asc'?'asc':'desc';renderAuditions();};
  window.ucV153PostDraft=async function(id){if(!confirm('Post this saved Draft now? It will become visible on the public Fitness Tip Updates page.'))return;try{say('#blogMsg','Posting the saved audition update…');await req('/api/admin/blogs',{method:'POST',body:JSON.stringify({action:'publish',id:Number(id)})});window.__ucV153AuditionFilter='new';say('#blogMsg','Fitness Tip update posted successfully.');await window.load_blogs();}catch(e){say('#blogMsg',e.message||'The audition update could not be posted.','error');}};
  window.setAuditionDraft=async function(id){if(!confirm('Move this published audition update to Draft? It will be hidden from the public Fitness Tip Updates page.'))return;try{await req('/api/admin/blogs',{method:'POST',body:JSON.stringify({action:'set_draft',id:Number(id)})});window.__ucV153AuditionFilter='drafts';say('#blogMsg','Fitness Tip update moved to Draft.');await window.load_blogs();}catch(e){say('#blogMsg',e.message||'Could not move this audition update to Draft.','error');}};
  window.deleteBlog=async function(id){if(!confirm('Move this audition update to Deleted? It will be removed from the public website but kept in the Deleted section for admin history.'))return;try{await req(`/api/admin/blogs?id=${encodeURIComponent(id)}`,{method:'DELETE'});window.__ucV153AuditionFilter='deleted';say('#blogMsg','Fitness Tip update moved to Deleted.');await window.load_blogs();}catch(e){say('#blogMsg',e.message||'Could not delete this audition update.','error');}};

  const oldEdit=window.editBlog;
  if(typeof oldEdit==='function')window.editBlog=async function(id){const r=await oldEdit.apply(this,arguments);setTimeout(()=>{addFeaturedControl();const p=(window.A?.blogs||[]).find(x=>Number(x.id)===Number(id));const cb=$('#blogForm [name="is_featured"]');if(cb)cb.checked=!!Number(p?.is_featured||0);if(p&&String(p.status||'').toLowerCase()==='deleted'){const st=$('#blogForm [name="status"]');if(st)st.value='draft';say('#blogMsg','This record is in Deleted. Saving it again will restore it as Draft or Published based on the selected Status.');}},50);return r;};
  const oldReset=window.resetBlogForm;
  if(typeof oldReset==='function')window.resetBlogForm=function(){const r=oldReset.apply(this,arguments);const cb=$('#blogForm [name="is_featured"]');if(cb)cb.checked=false;return r;};

  function adGuidance(){
    const form=$('#blogForm');if(!form||$('#ucV153AdGuidance'))return;
    const auto=form.querySelector('[name="auto_ads_enabled"]')?.closest('.field, .uc-auto-ads-row, label')||form.querySelector('[name="auto_ads_enabled"]')?.parentElement;
    if(auto)auto.insertAdjacentHTML('afterend','<small id="ucV153AdGuidance" class="hint uc-v153-ad-guidance">Automatic or manual ad-network placements require an enabled platform in Settings → Integrations → Ad Networks. Direct Custom Advertisements can be used without an ad-network integration.</small>');
  }

  /* ----------------------------- SEO connection UI ----------------------------- */
  function setLabelFor(id,text){const el=$('#'+id);const field=el?.closest('.field');const label=field?.querySelector('label');if(label)label.textContent=text;}
  function replaceVisibleText(root){
    if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){const parent=n.parentElement;if(!parent||['OPTION','INPUT','TEXTAREA','SELECT','SCRIPT','STYLE'].includes(parent.tagName))continue;let t=n.nodeValue||'';t=t.replace(/Blogger Connection/g,'SEO Connection').replace(/Blogger API Key/g,'SEO API Key').replace(/Blogger Blog ID/g,'SEO ID').replace(/Blogger Blog/g,'SEO').replace(/Blogger blog/g,'SEO').replace(/Blogger blogs/g,'SEO sources').replace(/Blogger posts/g,'SEO posts').replace(/Blogger post/g,'SEO post').replace(/Blogger/g,'SEO').replace(/Blog Name/g,'SEO Name').replace(/Blog ID/g,'SEO ID').replace(/selected blog/gi,'selected SEO').replace(/choose a blog/gi,'choose an SEO').replace(/the blog/gi,'the SEO').replace(/specific blog/gi,'specific SEO').replace(/every blog/gi,'every SEO source').replace(/old blogs/gi,'old SEO sources').replace(/blogs available/gi,'SEO sources available').replace(/blogs were found/gi,'SEO sources were found');n.nodeValue=t;}
  }
  function patchSeoSettingsUI(){
    const card=$('#ucV152Blogger');if(!card)return;
    const summary=card.querySelector('summary');if(summary)summary.textContent='SEO Connection';
    setLabelFor('bloggerApiKey','SEO API Key Optional');setLabelFor('bloggerBlogId','SEO Name');setLabelFor('bloggerManualBlogId','Manual SEO ID Optional');
    const apiKey=$('#bloggerApiKey');if(apiKey)apiKey.placeholder='Optional for public/read-only SEO access';
    const manual=$('#bloggerManualBlogId');if(manual)manual.placeholder='Paste the numeric SEO ID only';
    const select=$('#bloggerBlogId');if(select&&select.options.length&&select.options[0])select.options[0].textContent=(window.A?.api?.bloggerConnected?'Choose the SEO Name':'Connect SEO first, then choose an SEO');
    const buttons=$$('button',card);for(const b of buttons){const t=(b.textContent||'').trim();if(/Retry Blogger Check/i.test(t))b.textContent='Retry SEO Check';else if(/Connect Blog ID/i.test(t))b.textContent='Connect SEO ID';else if(/Save Blogger Connection/i.test(t))b.textContent='Save SEO Connection';else if(/^Connect Blogger$/i.test(t))b.textContent='Connect SEO';else if(/^Disconnect Blogger$/i.test(t))b.textContent='Disconnect SEO';}
    const hint=$('#bloggerBlogId')?.closest('.field')?.querySelector('.hint');if(hint)hint.textContent='Choose the SEO that should publish and synchronize IronPulse Gym audition fitness tips, then click Save SEO Connection.';
    const mh=$('#bloggerManualBlogId')?.closest('.field')?.querySelector('.hint');if(mh)mh.textContent='Fallback only. Use this when the required SEO cannot be selected normally from SEO Name.';
    const conn=$('.uc-v152-blogger-bottom-row .field:last-child .hint');if(conn)conn.textContent='Retry refreshes the authorized SEO publishing account. Connect SEO ID verifies and selects the numeric SEO ID entered on the left.';
    replaceVisibleText($('#apiSettings'));
    const status=$('#bloggerConnectionStatus');if(status&&window.A?.api){const a=A.api;status.innerHTML=a.bloggerConnected?`<strong>Connected${a.bloggerConnectedUser?` as ${H(a.bloggerConnectedUser)}`:''}.</strong> ${a.bloggerBlogId?`Selected SEO: ${H(a.bloggerBlogName||a.bloggerBlogId)}.`:'Choose an SEO Name below and save the SEO connection.'}`:'<strong>SEO is not connected.</strong> Save the Google OAuth Client ID and Client Secret, then click Connect SEO.';}
  }
  async function loadApiAndPatch(){try{const r=await req('/api/admin/api-settings');window.A=window.A||{};A.api={...(A.api||{}),...r};patchSeoSettingsUI();return r;}catch{return window.A?.api||{};}}
  const oldLoadApi=window.load_apiSettings;
  if(typeof oldLoadApi==='function')window.load_apiSettings=async function(){const r=await oldLoadApi.apply(this,arguments);window.A=window.A||{};A.api={...(A.api||{}),...(r||{})};setTimeout(patchSeoSettingsUI,0);setTimeout(refreshSeoPublishingNotice,20);return r;};

  /* Override user-facing button handlers; backend endpoints/field names remain unchanged. */
  window.saveBloggerConnectionV152=async function(silent=false){
    const payload={bloggerBlogId:$('#bloggerBlogId')?.value||'',bloggerApiKey:$('#bloggerApiKey')?.value||'',bloggerClientId:$('#bloggerClientId')?.value||'',bloggerClientSecret:$('#bloggerClientSecret')?.value||''};
    try{await req('/api/admin/api-settings',{method:'POST',body:JSON.stringify(payload)});const r=await window.load_apiSettings?.();if(!silent)say('#apiMsg',r?.bloggerBlogId?`SEO connection saved: ${r.bloggerBlogName||'selected SEO'}.`:'SEO settings saved. Choose an SEO Name before publishing.');return r;}catch(e){if(!silent)say('#apiMsg',e.message||'SEO settings could not be saved.','error');throw e;}
  };
  window.connectBloggerV152=async function(){try{await window.saveBloggerConnectionV152(true);const r=await req('/api/admin/blogger-auth');if(!r.authorizationUrl)throw new Error('Google authorization URL was not created.');location.href=r.authorizationUrl;}catch(e){say('#apiMsg',e.message||'Could not start SEO authorization.','error');}};
  window.retryBloggerCheckV152=async function(){try{say('#apiMsg','Checking the saved Google authorization and SEO connection…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'test'})});await window.load_apiSettings?.();say('#apiMsg',(r.message||'SEO connection check completed.').replace(/Blogger/gi,'SEO').replace(/blog/gi,'SEO'));}catch(e){await window.load_apiSettings?.().catch(()=>{});say('#apiMsg',String(e.message||'SEO connection check failed.').replace(/Blogger/gi,'SEO'),'error');}};
  window.connectManualBlogIdV152=async function(){const blogId=String($('#bloggerManualBlogId')?.value||'').replace(/\D/g,'');if(!blogId){say('#apiMsg','Enter the numeric Manual SEO ID first.','error');return;}try{say('#apiMsg','Verifying and connecting this SEO ID…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'manual_blog',blogId})});await window.load_apiSettings?.();say('#apiMsg',(r.message||'SEO ID connected.').replace(/Blogger/gi,'SEO').replace(/blog/gi,'SEO'));}catch(e){say('#apiMsg',String(e.message||'SEO ID could not be connected.').replace(/Blogger/gi,'SEO'),'error');}};
  const oldDisconnect=window.disconnectBlogger;
  window.disconnectBlogger=async function(){if(!confirm('Disconnect SEO publishing from this website? Existing published fitness tips will not be deleted.'))return;try{await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'disconnect'})});await window.load_apiSettings?.();say('#apiMsg','SEO disconnected.');await refreshSeoPublishingNotice();}catch(e){say('#apiMsg',e.message||'SEO could not be disconnected.','error');}};

  async function refreshSeoPublishingNotice(){
    const form=$('#blogForm');if(!form)return;
    if(!window.A?.api)await loadApiAndPatch();const connected=!!(A?.api?.bloggerConnected&&String(A?.api?.bloggerBlogId||'').trim());
    form.querySelectorAll('.blogger-required-note').forEach(n=>n.remove());
    if(!connected)form.insertAdjacentHTML('afterbegin','<div class="blogger-required-note uc-v153-seo-warning"><strong>SEO connection required for posting:</strong> Connect SEO in Settings → Integrations → SEO before publishing. Drafts can still be saved for preparation.</div>');
    const hint=form.querySelector('[name="status"]')?.closest('.field')?.querySelector('.blog-limit-hint, .hint');if(hint)hint.textContent=connected?'Draft keeps it hidden. Published posts are synchronized through the connected SEO.':'Draft keeps it hidden. Publishing becomes available after SEO is connected.';
  }

  /* Ensure the latest form payload always includes Featured, and use SEO wording before older wrappers run. */
  const oldSave=window.saveBlogAudition;
  if(typeof oldSave==='function')window.saveBlogAudition=async function(ev,statusOverride){
    addFeaturedControl();const status=statusOverride||$('#blogForm [name="status"]')?.value||'draft';
    if(status==='published'){
      if(!window.A?.api)await loadApiAndPatch();
      if(!(A?.api?.bloggerConnected&&String(A?.api?.bloggerBlogId||'').trim())){ev?.preventDefault?.();say('#blogMsg','Connect SEO and choose the SEO Name in Settings → Integrations → SEO before publishing. Save as Draft is still available.','error');await refreshSeoPublishingNotice();return;}
    }
    return oldSave.apply(this,arguments);
  };

  window.syncAndLoadAuditions=async function(){
    say('#blogMsg','Synchronizing published posts and drafts from the selected SEO…');
    try{const r=await req('/api/admin/blogger-sync',{method:'POST',body:'{}'});say('#blogMsg',String(r.message||'Fitness Tip updates synchronized.').replace(/Blogger/gi,'SEO').replace(/selected blog/gi,'selected SEO'));}
    catch(e){say('#blogMsg',String(e.message||'SEO synchronization could not be completed. Local audition records will still be loaded.').replace(/Blogger/gi,'SEO'),'error');}
    await window.load_blogs?.();
  };
  window.syncBloggerAuditions=window.syncAndLoadAuditions;

  function patchAuditionHelp(){
    $('#ucV151AuditionHelp')?.remove();$('#ucV152AuditionHelp')?.remove();
    const table=$('#blogTable');if(!table||$('#ucV153AuditionHelp'))return;
    table.insertAdjacentHTML('beforebegin','<div id="ucV153AuditionHelp" class="notice uc-v153-audition-help"><strong>Fitness Tip publishing:</strong> Click <strong>Load Fitness Tip Updates</strong> to synchronize published and Draft audition fitness tips from the selected SEO. Use <strong>New</strong> for published updates from the last 7 days, <strong>Published</strong> for older live updates, <strong>Drafts</strong> for prepared fitness tips, <strong>Deleted</strong> for admin history, and <strong>All</strong> for the complete list.</div>');
  }

  /* ----------------------------- Tab hooks / init ----------------------------- */
  const oldTab=window.tab;
  if(typeof oldTab==='function')window.tab=function(id){
    const r=oldTab.apply(this,arguments);
    if(id==='leads'){const target=window.__ucV153InquiryLaunch||'new';setTimeout(()=>{ensureInquiryTabs();window.__inquiryStatus=target;window.load_leads(target);},120);}
    if(id==='blogs')setTimeout(()=>{addFeaturedControl();adGuidance();patchAuditionHelp();refreshSeoPublishingNotice();window.load_blogs?.();},260);
    if(id==='apiSettings')setTimeout(async()=>{await window.load_apiSettings?.().catch(()=>{});patchSeoSettingsUI();},180);
    return r;
  };

  function init(){
    ensureInquiryTabs();addFeaturedControl();adGuidance();patchAuditionHelp();patchSeoSettingsUI();
    const q=new URLSearchParams(location.search).get('blogger');if(q)setTimeout(()=>{patchSeoSettingsUI();const m=$('#apiMsg');if(m&&/Blogger/i.test(m.textContent||''))replaceVisibleText(m);},650);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,650));else setTimeout(init,650);
})();
