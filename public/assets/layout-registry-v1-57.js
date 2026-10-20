/* Public theme contract shared by the editor, renderer and D1 API. No executable HTML is stored. */
export const LAYOUT_THEMES=Object.freeze({
 dropbeat:{name:'DropBeat Original',gallery:true,description:'Cinematic banner, highlights, studio introduction and class catalogue.'},
 casting:{name:'Casting Editorial',gallery:false,description:'Editorial banner and a full-width text introduction.'},
 spotlight:{name:'Studio Spotlight',gallery:true,description:'Performance banner, studio imagery and a strong class catalogue.'},
 minimal:{name:'Modern Minimal',gallery:false,description:'A compact banner and simplified text-led sections.'}
});
export const LAYOUT_NAMES=Object.freeze({
 home:{label:'Home',nav:'home',href:'/'},offers:{label:'Offers',nav:'offers',href:'/offers'},about:{label:'About',nav:'about',href:'/about'},blog:{label:'Dance Tips',nav:'blog',href:'/blog'},contact:{label:'Contact',nav:'contact',href:'/contact'},
 login:{label:'Login',nav:'admin-login',button:'front.auth.login',href:'/login'},checkout:{label:'Checkout',button:'front.header.checkout',href:'/checkout'},trial:{label:'Book a Trial',button:'front.header.trial',href:'/submit-profile'},stories:{label:'Student Stories',href:'/success-stories'}
});
const block=(id,title,region,extra={})=>({id,title,region,...extra});
const shared=[
 block('brand','Brand Logo','header',{selector:'.topbar .brand',description:'Uses the Brand Profile logo and studio name.'}),
 block('menu','Main Navigation','navigation',{selector:'.topbar .navlinks',description:'Header links and their existing submenus.'}),
 ...['home','offers','about','blog','contact','login'].map(name=>block('nav_'+name,LAYOUT_NAMES[name].label,'menu',{name,description:'Shared navigation name. The existing page URL and content are retained.'})),
 block('checkout','Checkout','header',{name:'checkout',button:'front.header.checkout',selector:'.nav-actions .cart-pill'}),
 block('trial','Book a Trial','header',{name:'trial',button:'front.header.trial',selector:'.nav-actions .join-pill'}),
 block('hero','Home Banner','main',{selector:'.hero-shell',description:'Uses the current Home Banners and their existing links.'}),
 block('highlights','Class Highlights','main',{selector:'.dropbeat-quick-strip'}),
 block('welcome','Studio Introduction','main',{selector:'.dropbeat-welcome',heading:'.dropbeat-welcome-copy h2'}),
 block('gallery','Studio Images','welcome',{selector:'#dropbeatStudioVisual',gallery:true}),
 block('plans','Plans & Offers','main',{selector:'#featuredProducts',closest:'section',heading:'.section-head h2',grid:'#featuredProducts'}),
 block('steps','How It Works','main',{selector:'.how-section',heading:'.section-head h2',grid:'.grid.steps'}),
 block('stories','Student Stories','main',{name:'stories',selector:'#successStoriesGrid',closest:'section',heading:'.section-head h2',grid:'#successStoriesGrid'}),
 block('notice','Class Information','main',{selector:'main>.section:last-child:has(.notice)'}),
 block('footer','Footer Content','footer',{selector:'.footer-grid',description:'Footer links and social profiles. The existing site attribution remains in place.'})
];
export function themeBlocks(theme='dropbeat'){
 const preset=LAYOUT_THEMES[theme]||LAYOUT_THEMES.dropbeat;return shared.filter(row=>!row.gallery||preset.gallery).map(row=>({...row}));
}
export function cleanLayoutTitle(value){const s=String(value??'').trim();if(!s||s.length>80||/[<>\u0000-\u001f\u007f]/.test(s))throw new Error('Use a plain-text name of 1–80 characters.');return s;}
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=message=>{throw new Error(message);};
export function normalizeThemeLayout(theme,input={}){
 if(!Object.hasOwn(LAYOUT_THEMES,theme)||!object(input))fail('Choose a supported theme.');
 const definitions=themeBlocks(theme),allowed=new Map(definitions.map(row=>[row.id,row]));const result={blocks:{},order:{}};
 if(input.blocks&&!object(input.blocks))fail('Invalid layout blocks.');
 for(const[id,raw]of Object.entries(input.blocks||{})){
  const definition=allowed.get(id);if(!definition||!object(raw))fail('This block is not available in the selected theme.');
  if(Object.keys(raw).some(k=>!['title','removed','viewports'].includes(k)))fail('Unknown block setting.');
  const item={};if(raw.title){if(definition.name)fail('Edit shared names using the shared name field.');item.title=cleanLayoutTitle(raw.title);}
  if(raw.removed!==undefined){if(typeof raw.removed!=='boolean')fail('Invalid block visibility.');if(raw.removed)item.removed=true;}
  if(raw.viewports!==undefined&&!object(raw.viewports))fail('Invalid viewport settings.');
  for(const[device,settings]of Object.entries(raw.viewports||{})){
   if(!['desktop','mobile'].includes(device)||!object(settings))fail('Invalid viewport.');const values={};
   for(const[key,value]of Object.entries(settings)){
    if(value===null||value===''||value==='theme')continue;
    if(key==='visibility'){if(!['show','hide'].includes(value))fail('Invalid visibility.');values[key]=value;}
    else if(key==='width'){if(!['full','contained'].includes(value))fail('Invalid block width.');values[key]=value;}
    else if(key==='align'){if(!['left','center','right'].includes(value))fail('Invalid alignment.');values[key]=value;}
    else if(['padding','gap','columns'].includes(key)){
     const max=key==='columns'?(device==='mobile'?2:4):key==='gap'?32:64,min=key==='columns'?1:0;
     if(!Number.isInteger(value)||value<min||value>max)fail('Layout dimensions are outside the supported range.');
     if(key==='columns'&&!definition.grid)fail('This block does not have a card grid.');values[key]=value;
    }else fail('Unknown viewport constraint.');
   }
   if(Object.keys(values).length)(item.viewports??={})[device]=values;
  }
  if(Object.keys(item).length)result.blocks[id]=item;
 }
 if(input.order!==undefined&&!object(input.order))fail('Invalid block order.');
 const main=definitions.filter(row=>row.region==='main').map(row=>row.id);
 for(const[device,order]of Object.entries(input.order||{})){
  if(!['desktop','mobile'].includes(device)||!Array.isArray(order)||order.length!==main.length||new Set(order).size!==main.length||order.some(id=>!main.includes(id)))fail('Include each home section exactly once in the block order.');
  if(order.some((id,i)=>id!==main[i]))result.order[device]=[...order];
 }
 return result;
}
export function resolvedBlocks(theme,layout={},names={}){return themeBlocks(theme).map(row=>({...row,title:row.name?(names[row.name]||row.title):(layout.blocks?.[row.id]?.title||row.title),config:layout.blocks?.[row.id]||{}}));}
export const EMPTY_LAYOUT_REVISION='layout-defaults-v157';
