import { getSetting, setSetting } from './utils.js';

export const CORE_NAV_ITEMS = [
  { key:'home', label:'Home', href:'/', canonicalHref:'/', defaultSlug:'home', locked:true, editable:false },
  { key:'offers', label:'Offers', href:'/offers', canonicalHref:'/offers', defaultSlug:'offers', editable:true },
  { key:'about', label:'About', href:'/about', canonicalHref:'/about', defaultSlug:'about', editable:true },
  { key:'blog', label:'Dance Tips', href:'/blog', canonicalHref:'/blog', defaultSlug:'blog', editable:true },
  { key:'contact', label:'Contact', href:'/contact', canonicalHref:'/contact', defaultSlug:'contact', editable:true },
  { key:'admin-login', label:'Login', href:'/login', canonicalHref:'/login', defaultSlug:'login', editable:false, locked:true }
];

export const CORE_SUBMENU_ITEMS = {
  offers: [
    { key:'submenu:offers:memberships', parentKey:'offers', label:'Memberships', href:'/offers', canonicalHref:'/offers', defaultSlug:'offers', editable:true, builtin:true },
    { key:'submenu:offers:festival-offers', parentKey:'offers', label:'Festival Offers', href:'/festival-offers', canonicalHref:'/festival-offers', defaultSlug:'festival-offers', editable:true, builtin:true },
    { key:'submenu:offers:yearly-plans', parentKey:'offers', label:'Yearly Plans', href:'/yearly-plans', canonicalHref:'/yearly-plans', defaultSlug:'yearly-plans', editable:true, builtin:true }
  ]
};

const clean=(v,n=240)=>String(v??'').trim().slice(0,n);
export const slugifyNav=v=>clean(v,180).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
const clone=o=>JSON.parse(JSON.stringify(o||{}));

function topAliasHref(item,slug){
  const s=slugifyNav(slug||item.defaultSlug);
  return s===item.defaultSlug ? item.canonicalHref : `/nav/${encodeURIComponent(s)}`;
}
function childAliasHref(item,slug){
  const s=slugifyNav(slug||item.defaultSlug);
  return s===item.defaultSlug ? item.canonicalHref : `/nav/sub/${encodeURIComponent(s)}`;
}
function customHref(row){return `/page/${encodeURIComponent(clean(row.slug,120))}`;}
function overrideItem(item,overrides={}){
  // Login is a role-aware system destination. Keep it stable even when an
  // older database still contains the former administrator-only label/slug.
  if(item.key==='admin-login')return {...item,label:'Login',slug:'login',href:'/login',custom:false,kind:'core',locked:true,editable:false};
  const o=overrides[item.key]||{};
  const slug=slugifyNav(o.slug||item.defaultSlug)||item.defaultSlug;
  const label=clean(o.label||item.label,120)||item.label;
  return {...item,label,slug,href:item.key.startsWith('submenu:')?childAliasHref(item,slug):topAliasHref(item,slug),custom:false,kind:item.key.startsWith('submenu:')?'builtin-child':'core',locked:!!item.locked,editable:item.editable!==false};
}
function customItem(row){
  return {
    key:clean(row.page_key,180),
    label:clean(row.page_name||row.title||row.slug||'Page',120),
    slug:clean(row.slug,120),
    href:customHref(row),
    canonicalHref:customHref(row),
    custom:true,
    kind:'custom',
    parentKey:clean(row.nav_parent,180),
    nav_sort_order:Number(row.nav_sort_order||0),
    editable:true,
    locked:false,
    title:clean(row.title,220),
    productDisplayEnabled:Number(row.product_display_enabled||0)===1
  };
}

export function normalizeNavigationOrder(stored=[], customRows=[], overrides={}){
  const custom=(Array.isArray(customRows)?customRows:[])
    .filter(r=>r && r.page_key && !clean(r.nav_parent))
    .map(customItem);
  const core=CORE_NAV_ITEMS.map(x=>overrideItem(x,overrides));
  const defaults=[...core.slice(0,-1),...custom,core.at(-1)];
  const allowed=new Set(defaults.map(x=>x.key));
  const out=[];
  // Home is deliberately fixed at position 1.
  out.push('home');
  for(const raw of Array.isArray(stored)?stored:[]){const key=clean(raw,180);if(key!=='home'&&allowed.has(key)&&!out.includes(key))out.push(key);}
  for(const item of defaults)if(!out.includes(item.key))out.push(item.key);
  return {order:out,items:defaults};
}

function childrenFor(parentKey,customRows,overrides,childOrders){
  const builtin=(CORE_SUBMENU_ITEMS[parentKey]||[]).map(x=>overrideItem(x,overrides));
  const custom=(Array.isArray(customRows)?customRows:[]).filter(r=>clean(r.nav_parent,180)===parentKey).map(customItem);
  const children=[...builtin,...custom];
  const allowed=new Set(children.map(x=>x.key));
  const stored=Array.isArray(childOrders?.[parentKey])?childOrders[parentKey]:[];
  const order=[];
  for(const raw of stored){const key=clean(raw,180);if(allowed.has(key)&&!order.includes(key))order.push(key);}
  // Preserve the existing database order for custom rows, and built-in order for defaults.
  for(const item of children.sort((a,b)=>{
    if(a.kind==='builtin-child'&&b.kind!=='builtin-child')return -1;
    if(b.kind==='builtin-child'&&a.kind!=='builtin-child')return 1;
    return Number(a.nav_sort_order||0)-Number(b.nav_sort_order||0);
  }))if(!order.includes(item.key))order.push(item.key);
  const map=new Map(children.map(x=>[x.key,x]));
  return order.map(k=>map.get(k)).filter(Boolean);
}

export async function getNavigationModel(env, customRows=null){
  let rows=customRows;
  if(!Array.isArray(rows)){
    try{rows=(await env.DB.prepare("SELECT page_key,COALESCE(NULLIF(page_name,''),title) AS page_name,title,slug,nav_parent,nav_sort_order,product_display_enabled FROM content_pages WHERE is_custom=1 AND nav_visible=1 ORDER BY nav_sort_order,id").all()).results||[];}catch(_){rows=[];}
  }
  const [stored,overrides,childOrders]=await Promise.all([
    getSetting(env,'navigation_order',[]).catch(()=>[]),
    getSetting(env,'navigation_overrides',{}).catch(()=>({})),
    getSetting(env,'navigation_child_orders',{}).catch(()=>({}))
  ]);
  const base=normalizeNavigationOrder(stored,rows,overrides||{});
  const byKey=new Map(base.items.map(x=>[x.key,x]));
  const ordered=base.order.map(k=>byKey.get(k)).filter(Boolean).map(item=>{
    const children=childrenFor(item.key,rows,overrides||{},childOrders||{});
    return {...item,children,hasChildren:children.length>0};
  });
  return {
    order:base.order,
    items:ordered,
    customRows:rows,
    overrides:overrides||{},
    childOrders:childOrders||{}
  };
}

export async function saveNavigationOrder(env, requested=[]){
  const model=await getNavigationModel(env);
  const requestedModel=normalizeNavigationOrder(requested,model.customRows,model.overrides);
  await setSetting(env,'navigation_order',requestedModel.order);
  return getNavigationModel(env,model.customRows);
}

export async function saveNavigationChildOrder(env,parentKey,requested=[]){
  const parent=clean(parentKey,180);if(!parent)throw new Error('Choose the parent menu whose sub-options should be reordered.');
  const model=await getNavigationModel(env),parentItem=model.items.find(x=>x.key===parent);
  if(!parentItem)throw new Error('The selected header option no longer exists. Refresh Pages and try again.');
  const allowed=new Set((parentItem.children||[]).map(x=>x.key)),order=[];
  for(const raw of Array.isArray(requested)?requested:[]){const key=clean(raw,180);if(allowed.has(key)&&!order.includes(key))order.push(key);}
  for(const c of parentItem.children||[])if(!order.includes(c.key))order.push(c.key);
  const all=clone(model.childOrders);all[parent]=order;await setSetting(env,'navigation_child_orders',all);
  return getNavigationModel(env,model.customRows);
}

async function assertUniqueAlias(env,{key,slug,kind}){
  const s=slugifyNav(slug);if(!s)throw new Error('Enter a URL slug containing at least one letter or number.');
  const model=await getNavigationModel(env);
  const peers=[];
  for(const item of model.items){
    if(kind==='top'&&!item.custom)peers.push(item);
    if(kind==='child')for(const c of item.children||[])if(c.kind==='builtin-child')peers.push(c);
  }
  const clash=peers.find(x=>x.key!==key&&slugifyNav(x.slug)===s);
  if(clash)throw new Error(`The URL slug “${s}” is already used by ${clash.label}. Choose a different slug.`);
  return s;
}

export async function saveNavigationItem(env,{key,label,slug}={}){
  const itemKey=clean(key,180);if(!itemKey)throw new Error('The header item is missing. Refresh Pages and try again.');
  const model=await getNavigationModel(env);
  let item=model.items.find(x=>x.key===itemKey),parent=null;
  if(!item){for(const p of model.items){const c=(p.children||[]).find(x=>x.key===itemKey);if(c){item=c;parent=p;break;}}}
  if(!item)throw new Error('This header item no longer exists. Refresh Pages and try again.');
  if(item.key==='home'||item.locked)throw new Error('Home is fixed so the public website always has a reliable first navigation link. It cannot be renamed, moved or given a different slug.');
  const nextLabel=clean(label,80);if(!nextLabel)throw new Error('Header Name cannot be blank.');
  const nextSlug=slugifyNav(slug||item.slug||nextLabel);if(!nextSlug)throw new Error('Enter a valid URL Slug containing at least one letter or number.');
  const oldHref=item.href,oldSlug=item.slug;
  if(item.custom){
    const exists=await env.DB.prepare('SELECT page_key FROM content_pages WHERE is_custom=1 AND slug=? AND page_key<>? LIMIT 1').bind(nextSlug,item.key).first();
    if(exists)throw new Error(`The URL slug “${nextSlug}” is already used by another custom page. Choose a different slug.`);
    await env.DB.prepare('UPDATE content_pages SET page_name=?,slug=?,updated_at=CURRENT_TIMESTAMP WHERE page_key=?').bind(nextLabel,nextSlug,item.key).run();
    if(oldSlug!==nextSlug){
      const aliases=clone(await getSetting(env,'custom_page_slug_aliases',{}).catch(()=>({})));for(const k of Object.keys(aliases))if(String(aliases[k])===oldSlug)aliases[k]=nextSlug;aliases[oldSlug]=nextSlug;await setSetting(env,'custom_page_slug_aliases',aliases);
      const rawDeleted=await getSetting(env,'custom_page_deleted_slugs',[]).catch(()=>[]),deleted=Array.isArray(rawDeleted)?rawDeleted:[];
      if(deleted.includes(nextSlug))await setSetting(env,'custom_page_deleted_slugs',deleted.filter(x=>x!==nextSlug));
    }
  }else{
    const kind=item.kind==='builtin-child'?'child':'top';await assertUniqueAlias(env,{key:item.key,slug:nextSlug,kind});
    const overrides=clone(model.overrides);overrides[item.key]={label:nextLabel,slug:nextSlug};await setSetting(env,'navigation_overrides',overrides);
    if(oldSlug!==nextSlug&&oldHref.startsWith('/nav/')){
      const history=clone(await getSetting(env,'navigation_alias_history',{}).catch(()=>({})));
      const nextHref=item.kind==='builtin-child'?childAliasHref(item,nextSlug):topAliasHref(item,nextSlug);history[oldHref]=nextHref;await setSetting(env,'navigation_alias_history',history);
    }
  }
  const fresh=await getNavigationModel(env);
  let updated=fresh.items.find(x=>x.key===itemKey);if(!updated){for(const p of fresh.items){updated=(p.children||[]).find(x=>x.key===itemKey);if(updated)break;}}
  return {model:fresh,item:updated,oldHref};
}

export function publicNavigationPayload(model){
  return (model?.items||[]).map(item=>({
    key:item.key,label:item.label,slug:item.slug,href:item.href,custom:!!item.custom,kind:item.kind,
    children:(item.children||[]).map(c=>({key:c.key,label:c.label,slug:c.slug,href:c.href,custom:!!c.custom,kind:c.kind,parentKey:item.key}))
  }));
}
