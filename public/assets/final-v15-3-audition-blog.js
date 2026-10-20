/* V15.3 public Dance Tips layout refinements.
   Uses the existing site theme variables. No color palette/theme values are changed. */
(function(){
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const H=window.escapeHtml||((v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  async function request(path,opts={}){const r=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
  const fmtDate=v=>{if(!v)return '';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(d);};
  const fmtTime=v=>{if(!v)return '';const d=new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return '';return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(d);};
  const imageFor=(p,settings)=>String(p?.cover_image_url||settings?.logoUrl||'/assets/dropbeat-logo.svg');
  const firstTag=p=>String(p?.tags?.[0]||'Dance Tip');
  const urlFor=p=>`/blog/${encodeURIComponent(p?.slug||'')}`;
  const readCount=p=>Number(p?.view_count||0)>0?`${Number(p.view_count)} read${Number(p.view_count)===1?'':'s'}`:'';
  function postKey(p){return String(p?.id||p?.slug||'');}
  function postMeta(p){return [fmtDate(p?.published_at||p?.updated_at),readCount(p)].filter(Boolean).map(H).join('<span aria-hidden="true">•</span>');}

  function articleCard(p,settings){
    return `<article class="uc-blog-card"><a class="uc-blog-card-media" href="${urlFor(p)}" aria-label="Read ${H(p.title)}"><img src="${H(imageFor(p,settings))}" alt="${H(p.title)}" loading="lazy"></a><div class="uc-blog-card-body"><span class="uc-blog-tag">${H(firstTag(p))}</span><h3><a href="${urlFor(p)}">${H(p.title)}</a></h3><div class="uc-blog-meta">${postMeta(p)}</div><p class="uc-blog-excerpt">${H(p.excerpt||'Read the latest dance tip and studio update from DropBeat Dance Studio.')}</p><a class="btn secondary small" href="${urlFor(p)}">Read More</a></div></article>`;
  }
  function smallPost(p,settings){return `<a class="uc-side-item" href="${urlFor(p)}"><img src="${H(imageFor(p,settings))}" alt="" loading="lazy"><span><strong>${H(p.title)}</strong><small>${H(fmtDate(p.published_at||p.updated_at))}${Number(p.view_count||0)>0?` · ${Number(p.view_count)} reads`:''}</small></span></a>`;}
  function sideBlock(title,content,extra=''){return `<section class="uc-side-block ${extra}"><h3>${H(title)}</h3>${content}</section>`;}
  function tagsBlock(tags=[]){
    const list=(tags||[]).map(x=>typeof x==='string'?{tag:x,count:0}:x).filter(x=>String(x?.tag||'').trim()).slice(0,20);
    if(!list.length)return '';
    return sideBlock('Tags',`<div class="uc-tag-cloud">${list.map(x=>`<a href="/blog?tag=${encodeURIComponent(x.tag)}" title="Show ${H(x.tag)} dance tips">${H(x.tag)}</a>`).join('')}</div>`);
  }
  function pickUnique(rows,used,limit){const out=[];for(const p of rows||[]){const k=postKey(p);if(!k||used.has(k))continue;used.add(k);out.push(p);if(out.length>=limit)break;}return out;}
  function sidebar(data,settings,{excludeId=0}={}){
    const used=new Set();if(excludeId)used.add(String(excludeId));
    let featured=null;if(data.featured&&Number(data.featured.id||0)!==Number(excludeId||0)){featured=data.featured;used.add(postKey(featured));}
    const recent=pickUnique(data.recent||[],used,3);
    const popular=pickUnique(data.popular||[],used,3);
    const random=pickUnique(data.random||[],used,3);
    return `<aside class="uc-blog-sidebar">${featured?sideBlock('Featured',`<a class="uc-featured-side" href="${urlFor(featured)}"><img src="${H(imageFor(featured,settings))}" alt="${H(featured.title)}" loading="lazy"><strong>${H(featured.title)}</strong><div class="uc-blog-meta">${postMeta(featured)}</div></a>`,'uc-featured-side-block'):''}${recent.length?sideBlock('Recent Posts',`<div class="uc-side-list">${recent.map(p=>smallPost(p,settings)).join('')}</div>`):''}${tagsBlock(data.tags||[])}${popular.length?sideBlock('Most Popular',`<div class="uc-side-list">${popular.map(p=>smallPost(p,settings)).join('')}</div>`):''}${random.length?sideBlock('Random Picks',`<div class="uc-side-list">${random.map(p=>smallPost(p,settings)).join('')}</div>`):''}</aside>`;
  }
  function pagination(p={}){if(Number(p.pages||1)<=1)return '';const current=Number(p.page||1),pages=Number(p.pages||1),nums=[],suffix=p.tag?`&tag=${encodeURIComponent(p.tag)}`:'';for(let i=Math.max(1,current-2);i<=Math.min(pages,current+2);i++)nums.push(i);return `<nav class="uc-blog-pagination" aria-label="Dance Tips pages"><a class="${p.hasPrev?'':'disabled'}" href="/blog?page=${Math.max(1,current-1)}${suffix}" aria-label="Previous page">‹</a>${current>3?`<a href="/blog?page=1${suffix}">1</a>`:''}${current>4?'<span>…</span>':''}${nums.map(n=>`<a class="${n===current?'active':''}" href="/blog?page=${n}${suffix}" ${n===current?'aria-current="page"':''}>${n}</a>`).join('')}${current<pages-3?'<span>…</span>':''}${current<pages-2?`<a href="/blog?page=${pages}${suffix}">${pages}</a>`:''}<a class="${p.hasNext?'':'disabled'}" href="/blog?page=${Math.min(pages,current+1)}${suffix}" aria-label="Next page">›</a></nav>`;}
  function pageIntro(){return `<div class="uc-blog-intro"><div class="uc-blog-intro-copy"><span class="eyebrow">🎬 Dance Tips</span><h1>Daily Dance Tips</h1><p>Technique guidance, class preparation and studio news in one clean place. Open any dance tip to read the complete details.</p></div></div>`;}
  async function commonSettings(){try{const site=await request('/api/public/site');if(typeof window.prepareCommon==='function')await window.prepareCommon(site.settings||{});else if(window.UC?.loadCommon)await window.UC.loadCommon();return site.settings||{};}catch(_){try{await window.UC?.loadCommon?.();}catch{}return window.__ucLatestSettings||{};}}

  async function loadBlogListV153(){
    document.body.classList.add('uc-blog-page','uc-blog-v153');
    const root=$('#blogExperience')||$('#blogGrid')?.parentElement||$('main .container');if(!root)return;
    root.innerHTML=`${pageIntro()}<div class="notice">Loading dance tips…</div>`;
    try{
      const params=new URLSearchParams(location.search),page=Math.max(1,Number(params.get('page')||1)||1),tag=String(params.get('tag')||'').trim();
      const [settings,data]=await Promise.all([commonSettings(),request(`/api/public/blogs?page=${page}${tag?`&tag=${encodeURIComponent(tag)}`:''}`)]);
      const posts=data.posts||[],heading=tag?`Dance Tips: ${H(tag)}`:(page===1?'Latest Dance Tips':'More Dance Tips');
      const main=posts.length?`<div class="uc-blog-section-title"><h2>${heading}</h2><span>${Number(data.pagination?.total||posts.length)} update${Number(data.pagination?.total||posts.length)===1?'':'s'}</span></div><div class="uc-blog-list">${posts.map(p=>articleCard(p,settings)).join('')}</div>${pagination(data.pagination||{})}`:`<div class="notice uc-blog-empty"><strong>${tag?`No published dance tips are using the “${H(tag)}” tag yet.`:'Stay tuned — dance tips are coming soon.'}</strong><br>${tag?'<a href="/blog">View all Dance Tips</a>':'Fresh dance tips will appear here as soon as they are published from the DropBeat Dance Studio admin panel.'}</div>`;
      root.innerHTML=`${pageIntro()}<div class="uc-blog-layout"><div class="uc-blog-main">${main}</div>${sidebar(data,settings)}</div>`;
    }catch(e){root.innerHTML=`${pageIntro()}<div class="notice uc-blog-empty"><strong>Dance tips could not be loaded right now.</strong><br>${H(e.message||'Please refresh once.')}</div>`;}
  }

  function sanitizeArticleHtml(html=''){
    const t=document.createElement('template');t.innerHTML=String(html||'');
    t.content.querySelectorAll('script,style,object,embed,form').forEach(n=>n.remove());
    t.content.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{const n=a.name.toLowerCase(),v=String(a.value||'').trim();if(n.startsWith('on')||((n==='href'||n==='src')&&/^javascript:/i.test(v)))el.removeAttribute(a.name);});if(el.tagName==='IFRAME'){const src=String(el.getAttribute('src')||'');if(!/^https:\/\//i.test(src))el.remove();else{el.setAttribute('loading','lazy');el.setAttribute('referrerpolicy','strict-origin-when-cross-origin');}}});
    return t.innerHTML;
  }
  function parseAds(raw){try{const v=typeof raw==='string'?JSON.parse(raw):raw;return Array.isArray(v)?v:[];}catch{return [];}}
  function isImage(url){return /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(String(url||''));}
  function adBox(ad){
    const type=H(ad.type||'Advertisement'),place=H(ad.placement||'In article'),size=H(ad.size||'Auto responsive');
    const code=String(ad.code||ad.url||'').trim(),redirect=String(ad.redirect_url||'').trim(),custom=!!(ad.custom||ad.is_custom||/Custom Advertisement|Custom Ad/i.test(ad.type||''));
    if(!code)return '';
    if(custom){const image=`<img src="${H(code)}" alt="Sponsored advertisement" loading="lazy">`;const linked=redirect?`<a href="${H(redirect)}" target="_blank" rel="sponsored noopener">${image}</a>`:image;return `<aside class="ad-slot custom-sponsored-ad"><small>Advertisement • ${place} • ${size}</small>${linked}</aside>`;}
    const content=/<\w|<script|<ins|<iframe/i.test(code)?code:(isImage(code)?`<img src="${H(code)}" alt="${type}" loading="lazy">`:`<a href="${H(code)}" target="_blank" rel="sponsored noopener">${H(code)}</a>`);
    return `<aside class="ad-slot"><small>${type} • ${place} • ${size}</small>${content}</aside>`;
  }
  function injectAds(bodyHtml,ads){
    if(!ads.length)return bodyHtml;const top=ads.filter(a=>/top|header|before/i.test(a.placement||'')).map(adBox).join(''),first=ads.filter(a=>/after first/i.test(a.placement||'')).map(adBox).join(''),bottom=ads.filter(a=>/bottom|after update|footer/i.test(a.placement||'')).map(adBox).join(''),middle=ads.filter(a=>!/top|header|before|after first|bottom|after update|footer/i.test(a.placement||'')).map(adBox).join('');let body=String(bodyHtml||'');if(first){const m=body.match(/<\/p>/i);body=m?body.slice(0,m.index+m[0].length)+first+body.slice(m.index+m[0].length):first+body;}return `${top}${body}${middle}${bottom}`;
  }
  function relatedGrid(posts=[],settings){if(!posts.length)return '';return `<section class="uc-related"><h2>More Dance Tips</h2><div class="uc-related-grid">${posts.slice(0,4).map(p=>`<a class="uc-related-card" href="${urlFor(p)}"><img src="${H(imageFor(p,settings))}" alt="${H(p.title)}" loading="lazy"><div><span class="uc-blog-tag">${H(firstTag(p))}</span><strong>${H(p.title)}</strong><small>${H(fmtDate(p.published_at||p.updated_at))}</small></div></a>`).join('')}</div></section>`;}
  function visitorId(){try{return localStorage.getItem('uc_vid')||'';}catch{return '';}}
  async function loadComments(slug){const box=$('#ucCommentList');if(!box)return;try{const r=await request(`/api/public/blog-comments?slug=${encodeURIComponent(slug)}`),rows=r.comments||[];box.innerHTML=rows.length?rows.map(c=>`<article class="uc-comment"><div class="uc-comment-head"><strong>${H(c.name||'Visitor')}</strong><small>${H(fmtTime(c.created_at))}</small></div><p>${H(c.comment_text||'')}</p></article>`).join(''):'<div class="notice">No comments yet. You can be the first to comment.</div>';}catch{box.innerHTML='<div class="notice">Comments could not be loaded right now.</div>';}}
  async function submitComment(ev,slug){ev.preventDefault();const f=ev.currentTarget,msg=$('#ucCommentMessage',f),btn=$('button[type="submit"]',f),payload={slug,name:f.elements.name.value,comment:f.elements.comment.value,visitor_id:visitorId()};if(btn)btn.disabled=true;if(msg)msg.textContent='Posting comment…';try{await request('/api/public/blog-comments',{method:'POST',body:JSON.stringify(payload)});f.elements.comment.value='';if(msg)msg.textContent='Comment posted.';await loadComments(slug);}catch(e){if(msg)msg.textContent=e.message||'Comment could not be posted.';}finally{if(btn)btn.disabled=false;}}
  function commentsBlock(slug){return `<section class="uc-comments"><h2>Comments</h2><p>Share a useful comment using your name.</p><form id="ucCommentForm" class="uc-comment-form"><input name="name" maxlength="60" required placeholder="Your name" aria-label="Your name"><textarea name="comment" maxlength="600" required placeholder="Write your comment" aria-label="Your comment"></textarea><button class="btn small" type="submit">Post Comment</button><div id="ucCommentMessage" class="uc-comment-message" aria-live="polite"></div></form><div id="ucCommentList" class="uc-comment-list"><div class="notice">Loading comments…</div></div></section>`;}

  function shareIcon(key){if(typeof window.socialIcon==='function')return window.socialIcon(key);return `<span aria-hidden="true">${H(key.slice(0,1).toUpperCase())}</span>`;}
  function shareBlock(p){
    const platforms=[['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook'],['threads','Threads'],['telegram','Telegram'],['snapchat','Snapchat'],['linkedin','LinkedIn'],['x','X']];
    return `<section class="uc-share-audition"><h2>Share This Dance Tip</h2><p>Help your friends or family members be a part of this dance tip by sharing this information on your preferred platform.</p><div class="uc-share-icons">${platforms.map(([k,label])=>`<button type="button" class="uc-share-icon" data-share-platform="${k}" title="Share on ${label}" aria-label="Share on ${label}" onclick="ucShareAudition('${k}')">${shareIcon(k)}</button>`).join('')}</div><small id="ucShareMessage" aria-live="polite"></small></section>`;
  }
  async function copyShareLink(){try{await navigator.clipboard.writeText(location.href);return true;}catch{try{const t=document.createElement('textarea');t.value=location.href;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();return true;}catch{return false;}}}
  window.ucShareAudition=async function(platform){
    const p=window.__ucV153CurrentPost||{},url=location.href,title=p.title||document.title,text=`${title} — ${url}`,encodedUrl=encodeURIComponent(url),encodedText=encodeURIComponent(title);
    const targets={whatsapp:`https://wa.me/?text=${encodeURIComponent(text)}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,x:`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,telegram:`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`};
    if(targets[platform]){window.open(targets[platform],'_blank','noopener,noreferrer');return;}
    if(navigator.share){try{await navigator.share({title,text:title,url});return;}catch(e){if(e?.name==='AbortError')return;}}
    const ok=await copyShareLink(),m=$('#ucShareMessage');if(m)m.textContent=ok?`Link copied. Open ${platform==='instagram'?'Instagram':platform==='snapchat'?'Snapchat':'Threads'} and paste it to share.`:'Copy this page link and share it on your preferred app.';
  };

  async function loadBlogPostV153(){
    document.body.classList.add('uc-blog-page','uc-blog-v153');
    const root=$('#blogPostExperience')||$('#blogPost')||$('main .container');if(!root)return;
    const slug=new URLSearchParams(location.search).get('slug')||window.UC_BLOG_SLUG||location.pathname.split('/').filter(Boolean).pop();root.innerHTML='<div class="notice">Loading dance tip…</div>';
    try{
      const [settings,data]=await Promise.all([commonSettings(),request(`/api/public/blogs?slug=${encodeURIComponent(slug||'')}`)]),p=data.post;
      if(!p){root.innerHTML='<div class="notice"><strong>Dance tip not found.</strong><br><a href="/blog">Return to Dance Tips</a></div>';return;}
      window.__ucV153CurrentPost=p;window.__ucArticleAutoAds=!!Number(p.auto_ads_enabled||0);
      const tags=(p.tags||[]).map(t=>`<a class="uc-blog-tag" href="/blog?tag=${encodeURIComponent(t)}">${H(t)}</a>`).join('');
      const articleHtml=injectAds(sanitizeArticleHtml(p.body_html||''),parseAds(p.ads_json));
      const body=`<article class="uc-article"><div class="uc-article-breadcrumb"><a href="/blog">Dance Tips</a> / ${H(firstTag(p))}</div><div class="uc-blog-meta">Posted ${H(fmtDate(p.published_at||p.created_at))}${Number(p.view_count||0)>0?`<span aria-hidden="true">•</span>${Number(p.view_count)} reads`:''}</div><h1>${H(p.title)}</h1>${p.excerpt?`<p class="uc-article-lead">${H(p.excerpt)}</p>`:''}${p.cover_image_url?`<img class="uc-article-cover" src="${H(p.cover_image_url)}" alt="${H(p.title)}" fetchpriority="high">`:''}<div class="uc-article-body">${articleHtml}</div>${tags?`<div class="uc-article-tags">${tags}</div>`:''}${shareBlock(p)}${relatedGrid(data.related||[],settings)}${commentsBlock(slug)}</article>`;
      root.innerHTML=`<div class="uc-article-wrap">${body}${sidebar(data,settings,{excludeId:p.id})}</div>`;
      const form=$('#ucCommentForm');if(form)form.addEventListener('submit',ev=>submitComment(ev,slug));loadComments(slug);
    }catch(e){root.innerHTML=`<div class="notice"><strong>Dance tip could not be loaded.</strong><br>${H(e.message||'Please refresh once.')}</div>`;}
  }

  if(window.UC){window.UC.loadBlogList=loadBlogListV153;window.UC.loadBlogPost=loadBlogPostV153;}
  window.UCBlogV153={loadBlogList:loadBlogListV153,loadBlogPost:loadBlogPostV153};
})();
