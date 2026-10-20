/* V15.1 — Blogger recovery diagnostics + Auditions actions/sync.
   Loaded after V15.0 so it only enhances the current workflow. */
(function(){
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function req(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.payload=d;throw e;}return d;}
  function say(target,text,type='notice'){if(typeof window.msg==='function'){window.msg(target,text,type);return;}const el=$(target);if(el)el.innerHTML=`<div class="${type==='error'?'error':'notice'}">${H(text)}</div>`;}
  function localDate(v){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}

  function renderBloggerDiagnostic(r={}){
    const status=$('#bloggerConnectionStatus');if(!status)return;
    const state=String(r.bloggerConnectionState||'disconnected'),checked=r.bloggerLastCheckedAt?`<span class="uc-v151-blogger-status-meta">Last checked: ${H(localDate(r.bloggerLastCheckedAt))}</span>`:'';
    if(r.bloggerConnected){status.innerHTML=`<strong>Connected${r.bloggerConnectedUser?` as ${H(r.bloggerConnectedUser)}`:''}.</strong> ${r.bloggerBlogId?`Selected blog: ${H(r.bloggerBlogName||r.bloggerBlogId)}.`:'Choose a blog below and save API Settings.'}${checked}`;return;}
    if(r.bloggerAuthorized){
      if(state==='authorized_api_error')status.innerHTML=`<strong>Google authorization is saved, but Blogger API could not read the blog.</strong><div class="uc-v151-blogger-error"><strong>Google API response:</strong> ${H(r.bloggerLastError||'No detailed response was returned.')}</div><span class="uc-v151-blogger-status-meta">Enable Blogger API v3 in the same Google Cloud project, then click Retry Blogger Check. You do not need to recreate the OAuth client.</span>${checked}`;
      else if(state==='authorized_no_blogs')status.innerHTML=`<strong>Google authorization is saved, but no blogs were returned.</strong><span class="uc-v151-blogger-status-meta">Retry the Blogger check. If the account manages the blog but it still does not appear, paste its numeric Blog ID below.</span>${checked}`;
      else status.innerHTML=`<strong>Google authorization is saved.</strong> Complete the Blogger check or select the blog.${checked}`;
      return;
    }
    status.innerHTML='<strong>Not connected.</strong> Save the Google OAuth Client ID and Client Secret, then click Connect Blogger.';
  }

  const previousLoadApi=window.load_apiSettings;
  if(typeof previousLoadApi==='function')window.load_apiSettings=async function(){const r=await previousLoadApi.apply(this,arguments);const data=r||window.A?.api||{};renderBloggerDiagnostic(data);const manual=$('#bloggerManualBlogId');if(manual&&!manual.value&&data.bloggerBlogId)manual.value=data.bloggerBlogId;return data;};

  window.retryBloggerCheck=async function(){
    try{say('#apiMsg','Checking the saved Google authorization and Blogger API…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'test'})});await window.load_apiSettings?.();say('#apiMsg',r.message||'Blogger connection check completed.');}
    catch(e){await window.load_apiSettings?.().catch(()=>{});say('#apiMsg',`${e.message}${e.payload?.hint?` ${e.payload.hint}`:''}`,'error');}
  };
  window.useManualBloggerBlogId=async function(){
    const blogId=String($('#bloggerManualBlogId')?.value||'').replace(/\D/g,'');if(!blogId){say('#apiMsg','Paste the numeric Blogger Blog ID first.','error');return;}
    try{say('#apiMsg','Verifying this Blogger Blog ID…');const r=await req('/api/admin/blogger-auth',{method:'POST',body:JSON.stringify({action:'manual_blog',blogId})});await window.load_apiSettings?.();say('#apiMsg',r.message||'Blogger blog connected.');}
    catch(e){say('#apiMsg',`${e.message}${e.payload?.hint?` ${e.payload.hint}`:''}`,'error');}
  };

  function auditionHelp(){const table=$('#blogTable');if(!table||$('#ucV151AuditionHelp'))return;table.insertAdjacentHTML('beforebegin','<div id="ucV151AuditionHelp" class="notice uc-v151-blog-help"><strong>Fitness Tip publishing:</strong> Published updates appear on the IronPulse Gym <strong>/blog</strong> page and are synchronized with the connected publishing blog. Use <strong>Edit</strong> to update, <strong>D</strong> to move a published update back to Draft (hidden from the website), and <strong>×</strong> to delete it. <strong>Sync Published Posts</strong> imports live posts that were created directly in the connected publishing account.</div>');}

  window.load_blogs=async function(){
    auditionHelp();const box=$('#blogTable');if(box)box.innerHTML='<div class="notice">Loading fitness updates…</div>';
    try{const r=await req('/api/admin/blogs'),posts=r.posts||[];window.A=window.A||{};window.A.blogs=posts;if(!box)return;
      box.innerHTML=posts.length?`<div class="table-wrap"><table class="table uc-v151-blog-table"><thead><tr><th>Fitness Tip Update</th><th>Status</th><th>Tags</th><th>Publishing</th><th>Actions</th></tr></thead><tbody>${posts.map(p=>{const published=String(p.status||'').toLowerCase()==='published',linked=!!p.blogger_post_id;return `<tr><td><strong>${H(p.title)}</strong><br><small>${H(p.slug)}</small></td><td><span class="status ${H(p.status||'draft')}">${H(p.status||'draft')}</span></td><td>${(p.tags||[]).map(t=>`<span class="status">${H(t)}</span>`).join(' ')||'<small>—</small>'}</td><td><div class="uc-v151-sync-state"><strong>${linked?'Synced':'Local'}</strong><br>${linked?`Post ID: ${H(p.blogger_post_id)}`:published?'Awaiting publishing link':'Draft is hidden'}</div></td><td><div class="uc-v151-blog-actions"><button class="btn secondary icon-btn" type="button" title="Edit audition update" aria-label="Edit audition update" onclick="editBlog(${Number(p.id)})">✎</button><button class="btn secondary icon-btn" type="button" title="Save as Draft" aria-label="Save as Draft" ${published?'': 'disabled'} onclick="setAuditionDraft(${Number(p.id)})">◫</button><button class="btn danger icon-btn" type="button" title="Delete audition update" aria-label="Delete audition update" onclick="deleteBlog(${Number(p.id)})">×</button></div></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="notice">No auditions have been loaded yet. Create your first audition above or use Sync Published Posts if the connected publishing blog already has live posts.</div>';
    }catch(e){if(box)box.innerHTML=`<div class="error">${H(e.message||'Could not load fitness updates.')}</div>`;}
  };

  window.setAuditionDraft=async function(id){
    if(!confirm('Move this audition update to Draft? It will be hidden from the public Fitness Tip Updates page.'))return;
    try{await req('/api/admin/blogs',{method:'POST',body:JSON.stringify({action:'set_draft',id:Number(id)})});say('#blogMsg','Fitness Tip update moved to Draft.');await window.load_blogs();}
    catch(e){say('#blogMsg',e.message||'Could not move this audition update to Draft.','error');}
  };
  window.syncBloggerAuditions=async function(){
    try{say('#blogMsg','Synchronizing published posts…');const r=await req('/api/admin/blogger-sync',{method:'POST',body:'{}'});say('#blogMsg',r.message||'Published posts synchronized.');await window.load_blogs();}
    catch(e){say('#blogMsg',e.message||'Published posts could not be synchronized.','error');}
  };

  function showQueryDiagnostic(){const q=new URLSearchParams(location.search).get('blogger');if(!q)return;setTimeout(async()=>{try{const r=await window.load_apiSettings?.();if(q==='api_error'&&r?.bloggerLastError)say('#apiMsg',`Google authorization succeeded, but Blogger API returned: ${r.bloggerLastError}`,'error');}catch{}},650);}
  function init(){auditionHelp();showQueryDiagnostic();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
