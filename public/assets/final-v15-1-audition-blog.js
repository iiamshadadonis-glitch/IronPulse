/* V15.1 — Fitness Tips editorial experience.
   Loaded only on /blog routes. It reuses the existing site theme/settings and does not alter them. */
(function(){
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=window.escapeHtml||((v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  async function request(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
  const fmtDate=v=>{if(!v)return '';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(d);};
  const fmtTime=v=>{if(!v)return '';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(d);};
  const imageFor=(p,settings)=>String(p?.cover_image_url||settings?.logoUrl||'/assets/ironpulse-logo.svg');
  const firstTag=p=>String(p?.tags?.[0]||'Fitness Tip');
  const urlFor=p=>`/blog/${encodeURIComponent(p?.slug||'')}`;
  const readCount=p=>Number(p?.view_count||0)>0?`${Number(p.view_count)} read${Number(p.view_count)===1?'':'s'}`:'';
  function uniquePosts(groups=[]){const seen=new Set(),out=[];for(const group of groups)for(const p of group||[]){const k=String(p?.id||p?.slug||'');if(!k||seen.has(k))continue;seen.add(k);out.push(p);}return out;}
  function postMeta(p){return [fmtDate(p?.published_at||p?.updated_at),readCount(p)].filter(Boolean).map(H).join('<span aria-hidden="true">•</span>');}
  function articleCard(p,settings){return `<article class="uc-blog-card"><a class="uc-blog-card-media" href="${urlFor(p)}" aria-label="Read ${H(p.title)}"><img src="${H(imageFor(p,settings))}" alt="${H(p.title)}" loading="lazy"></a><div class="uc-blog-card-body"><span class="uc-blog-tag">${H(firstTag(p))}</span><h3><a href="${urlFor(p)}">${H(p.title)}</a></h3><div class="uc-blog-meta">${postMeta(p)}</div><p class="uc-blog-excerpt">${H(p.excerpt||'Read the latest Fitness Tip and gym update from IronPulse Gym.')}</p><a class="btn secondary small" href="${urlFor(p)}">Read More</a></div></article>`;}
  function smallPost(p,settings){return `<a class="uc-side-item" href="${urlFor(p)}"><img src="${H(imageFor(p,settings))}" alt="" loading="lazy"><span><strong>${H(p.title)}</strong><small>${H(fmtDate(p.published_at||p.updated_at))}${Number(p.view_count||0)>0?` · ${Number(p.view_count)} reads`:''}</small></span></a>`;}
  function sideBlock(title,content,extra=''){return `<section class="uc-side-block ${extra}"><h3>${H(title)}</h3>${content}</section>`;}
  function socialBlock(settings){const socials=(settings?.socials||[]).filter(s=>s?.enabled&&s?.url);if(!socials.length)return '';return sideBlock('Follow Us On',`<div class="uc-side-socials">${socials.map(s=>`<a href="${H(s.url)}" target="_blank" rel="noopener" aria-label="${H(s.label||s.key)}">${typeof window.socialIcon==='function'?window.socialIcon(s.key):''}<span>${H(s.label||s.key)}</span></a>`).join('')}</div>`);}
  function tagsBlock(posts=[]){const tags=[...new Set(posts.flatMap(p=>Array.isArray(p?.tags)?p.tags:[]).map(x=>String(x).trim()).filter(Boolean))].slice(0,18);if(!tags.length)return '';return sideBlock('Tags',`<div class="uc-tag-cloud">${tags.map(t=>`<a href="/blog?tag=${encodeURIComponent(t)}" title="Fitness Tip tag: ${H(t)}">${H(t)}</a>`).join('')}</div>`);}
  function sidebar(data,settings,{excludeId=0}={}){
    const featured=data.featured&&Number(data.featured.id||0)!==Number(excludeId||0)?data.featured:(data.recent||[]).find(p=>Number(p.id||0)!==Number(excludeId||0));
    const recent=(data.recent||[]).filter(p=>Number(p.id||0)!==Number(excludeId||0)).slice(0,5);
    const popular=(data.popular||[]).filter(p=>Number(p.id||0)!==Number(excludeId||0)).slice(0,5);
    const random=(data.random||[]).filter(p=>Number(p.id||0)!==Number(excludeId||0)).slice(0,4);
    const all=uniquePosts([[featured].filter(Boolean),recent,popular,random]);
    return `<aside class="uc-blog-sidebar">${featured?sideBlock('Featured',`<a class="uc-featured-side" href="${urlFor(featured)}"><img src="${H(imageFor(featured,settings))}" alt="${H(featured.title)}" loading="lazy"><strong>${H(featured.title)}</strong><div class="uc-blog-meta">${postMeta(featured)}</div></a>`,'uc-featured-side-block'):''}${recent.length?sideBlock('Recent Posts',`<div class="uc-side-list">${recent.map(p=>smallPost(p,settings)).join('')}</div>`):''}${popular.length?sideBlock('Most Popular',`<div class="uc-side-list">${popular.map(p=>smallPost(p,settings)).join('')}</div>`):''}${random.length?sideBlock('Random Picks',`<div class="uc-side-list">${random.map(p=>smallPost(p,settings)).join('')}</div>`):''}${socialBlock(settings)}${tagsBlock(all)}</aside>`;
  }
  function pagination(p={}){if(Number(p.pages||1)<=1)return '';const current=Number(p.page||1),pages=Number(p.pages||1),nums=[],suffix=p.tag?`&tag=${encodeURIComponent(p.tag)}`:'';for(let i=Math.max(1,current-2);i<=Math.min(pages,current+2);i++)nums.push(i);return `<nav class="uc-blog-pagination" aria-label="Fitness Tips pages"><a class="${p.hasPrev?'':'disabled'}" href="/blog?page=${Math.max(1,current-1)}${suffix}" aria-label="Previous page">‹</a>${current>3?`<a href="/blog?page=1${suffix}">1</a>`:''}${current>4?'<span>…</span>':''}${nums.map(n=>`<a class="${n===current?'active':''}" href="/blog?page=${n}${suffix}" ${n===current?'aria-current="page"':''}>${n}</a>`).join('')}${current<pages-3?'<span>…</span>':''}${current<pages-2?`<a href="/blog?page=${pages}${suffix}">${pages}</a>`:''}<a class="${p.hasNext?'':'disabled'}" href="/blog?page=${Math.min(pages,current+1)}${suffix}" aria-label="Next page">›</a></nav>`;}
  function pageIntro(){return `<div class="uc-blog-intro"><div class="uc-blog-intro-copy"><span class="eyebrow">💪 Fitness Tips</span><h1 data-db159-name="blog"><span data-db159-label></span></h1><p>Technique guidance, class preparation and gym news in one clean place. Open any Fitness Tip to read the complete details.</p></div></div>`;}
  async function commonSettings(){try{const site=await request('/api/public/site');if(typeof window.prepareCommon==='function')await window.prepareCommon(site.settings||{});else if(window.UC?.loadCommon)await window.UC.loadCommon();return site.settings||{};}catch(_){try{await window.UC?.loadCommon?.();}catch{}return window.__ucLatestSettings||{};}}

  async function loadBlogListV151(){
    document.body.classList.add('uc-blog-page');
    const root=$('#blogExperience')||$('#blogGrid')?.parentElement||$('main .container');if(!root)return;
    root.innerHTML=`${pageIntro()}<div class="notice">Loading Fitness Tips…</div>`;
    try{
      const params=new URLSearchParams(location.search),page=Math.max(1,Number(params.get('page')||1)||1),tag=String(params.get('tag')||'').trim();
      const [settings,data]=await Promise.all([commonSettings(),request(`/api/public/blogs?page=${page}${tag?`&tag=${encodeURIComponent(tag)}`:''}`)]);
      const posts=data.posts||[],heading=tag?`Fitness Tips: ${H(tag)}`:(page===1?'Latest Fitness Tips':'More Fitness Tips');
      const main=posts.length?`<div class="uc-blog-section-title"><h2>${heading}</h2><span>${Number(data.pagination?.total||posts.length)} update${Number(data.pagination?.total||posts.length)===1?'':'s'}</span></div><div class="uc-blog-list">${posts.map(p=>articleCard(p,settings)).join('')}</div>${pagination(data.pagination||{})}`:`<div class="notice uc-blog-empty"><strong>${tag?`No published Fitness Tips are using the “${H(tag)}” tag yet.`:'Stay tuned — Fitness Tips are coming soon.'}</strong><br>${tag?'<a href="/blog">View all Fitness Tips</a>':'Fresh Fitness Tips will appear here as soon as they are published from the IronPulse Gym admin panel.'}</div>`;
      root.innerHTML=`${pageIntro()}<div class="uc-blog-layout"><div class="uc-blog-main">${main}</div>${sidebar(data,settings)}</div>`;
    }catch(e){root.innerHTML=`${pageIntro()}<div class="notice uc-blog-empty"><strong>Fitness Tips could not be loaded right now.</strong><br>${H(e.message||'Please refresh once.')}</div>`;}
  }

  function sanitizeArticleHtml(html=''){
    const t=document.createElement('template');t.innerHTML=String(html||'');
    t.content.querySelectorAll('script,style,object,embed,form').forEach(n=>n.remove());
    t.content.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{const n=a.name.toLowerCase(),v=String(a.value||'').trim();if(n.startsWith('on')||((n==='href'||n==='src')&&/^javascript:/i.test(v)))el.removeAttribute(a.name);});if(el.tagName==='IFRAME'){const src=String(el.getAttribute('src')||'');if(!/^https:\/\//i.test(src))el.remove();else{el.setAttribute('loading','lazy');el.setAttribute('referrerpolicy','strict-origin-when-cross-origin');}}});
    return t.innerHTML;
  }
  function relatedGrid(posts=[],settings){if(!posts.length)return '';return `<section class="uc-related"><h2>More Fitness Tips</h2><div class="uc-related-grid">${posts.slice(0,4).map(p=>`<a class="uc-related-card" href="${urlFor(p)}"><img src="${H(imageFor(p,settings))}" alt="${H(p.title)}" loading="lazy"><div><span class="uc-blog-tag">${H(firstTag(p))}</span><strong>${H(p.title)}</strong><small>${H(fmtDate(p.published_at||p.updated_at))}</small></div></a>`).join('')}</div></section>`;}
  function visitorId(){try{return localStorage.getItem('uc_vid')||'';}catch{return '';}}
  async function loadComments(slug){const box=$('#ucCommentList');if(!box)return;try{const r=await request(`/api/public/blog-comments?slug=${encodeURIComponent(slug)}`),rows=r.comments||[];box.innerHTML=rows.length?rows.map(c=>`<article class="uc-comment"><div class="uc-comment-head"><strong>${H(c.name||'Visitor')}</strong><small>${H(fmtTime(c.created_at))}</small></div><p>${H(c.comment_text||'')}</p></article>`).join(''):'<div class="notice">No comments yet. You can be the first to comment.</div>';}catch(e){box.innerHTML=`<div class="notice">Comments could not be loaded right now.</div>`;}}
  async function submitComment(ev,slug){ev.preventDefault();const f=ev.currentTarget,msg=$('#ucCommentMessage',f),btn=$('button[type="submit"]',f);const payload={slug,name:f.elements.name.value,comment:f.elements.comment.value,visitor_id:visitorId()};if(btn)btn.disabled=true;if(msg)msg.textContent='Posting comment…';try{await request('/api/public/blog-comments',{method:'POST',body:JSON.stringify(payload)});f.elements.comment.value='';if(msg)msg.textContent='Comment posted.';await loadComments(slug);}catch(e){if(msg)msg.textContent=e.message||'Comment could not be posted.';}finally{if(btn)btn.disabled=false;}}
  function commentsBlock(slug){return `<section class="uc-comments"><h2>Comments</h2><p>Share a useful comment using your name.</p><form id="ucCommentForm" class="uc-comment-form"><input name="name" maxlength="60" required placeholder="Your name" aria-label="Your name"><textarea name="comment" maxlength="600" required placeholder="Write your comment" aria-label="Your comment"></textarea><button class="btn small" type="submit">Post Comment</button><div id="ucCommentMessage" class="uc-comment-message" aria-live="polite"></div></form><div id="ucCommentList" class="uc-comment-list"><div class="notice">Loading comments…</div></div></section>`;}

  async function loadBlogPostV151(){
    document.body.classList.add('uc-blog-page');
    const root=$('#blogPostExperience')||$('#blogPost')||$('main .container');if(!root)return;
    const slug=new URLSearchParams(location.search).get('slug')||window.UC_BLOG_SLUG||location.pathname.split('/').filter(Boolean).pop();
    root.innerHTML='<div class="notice">Loading Fitness Tip…</div>';
    try{
      const [settings,data]=await Promise.all([commonSettings(),request(`/api/public/blogs?slug=${encodeURIComponent(slug||'')}`)]),p=data.post;
      if(!p){root.innerHTML='<div class="notice"><strong>Fitness Tip not found.</strong><br><a href="/blog">Return to Fitness Tips</a></div>';return;}
      const tags=(p.tags||[]).map(t=>`<a class="uc-blog-tag" href="/blog?tag=${encodeURIComponent(t)}">${H(t)}</a>`).join('');
      const body=`<article class="uc-article"><div class="uc-article-breadcrumb"><a href="/blog">Fitness Tips</a> / ${H(firstTag(p))}</div><div class="uc-blog-meta">Posted ${H(fmtDate(p.published_at||p.created_at))}${Number(p.view_count||0)>0?`<span aria-hidden="true">•</span>${Number(p.view_count)} reads`:''}</div><h1>${H(p.title)}</h1>${p.excerpt?`<p class="uc-article-lead">${H(p.excerpt)}</p>`:''}${p.cover_image_url?`<img class="uc-article-cover" src="${H(p.cover_image_url)}" alt="${H(p.title)}">`:''}<div class="uc-article-body">${sanitizeArticleHtml(p.body_html||'')}</div>${tags?`<div class="uc-article-tags">${tags}</div>`:''}${relatedGrid(data.related||[],settings)}${commentsBlock(slug)}</article>`;
      root.innerHTML=`<div class="uc-article-wrap">${body}${sidebar({...data,featured:(data.popular||[])[0]||(data.recent||[])[0]||null},settings,{excludeId:p.id})}</div>`;
      const form=$('#ucCommentForm');if(form)form.addEventListener('submit',ev=>submitComment(ev,slug));loadComments(slug);
    }catch(e){root.innerHTML=`<div class="notice"><strong>Fitness Tip could not be loaded.</strong><br>${H(e.message||'Please refresh once.')}</div>`;}
  }

  if(window.UC){window.UC.loadBlogList=loadBlogListV151;window.UC.loadBlogPost=loadBlogPostV151;}
  window.UCBlogV151={loadBlogList:loadBlogListV151,loadBlogPost:loadBlogPostV151};
})();
