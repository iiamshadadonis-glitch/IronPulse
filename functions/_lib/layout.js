import {LAYOUT_THEMES,LAYOUT_NAMES,EMPTY_LAYOUT_REVISION,normalizeThemeLayout,normalizedLayoutThemes,cleanLayoutTitle,resolvedBlocks} from '../../public/assets/layout-registry-v1-57.js';
import {BUTTON_BY_KEY,dictionaryButtons,normalizeButtonTarget} from '../../public/assets/button-dictionary-defaults-v1-56.js';
import {sha256Hex} from './utils.js';
import {configurationGeneration,invalidateConfiguration,LAYOUT_CACHE} from './configuration-cache-v1-57.js';
export {LAYOUT_CACHE};
export const LAYOUT_KEY='visual_layout';
const keys=[LAYOUT_KEY,'site_settings','button_dictionary','navigation_overrides'];
const parse=value=>{try{const x=JSON.parse(value||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
const timestamp=value=>{const n=Date.parse(value||'');return Number.isFinite(n)?n:0;};
export async function readLayoutContext(env){
 const data=await env.DB.prepare('SELECT key,value,updated_at FROM settings WHERE key IN (?,?,?,?)').bind(...keys).all();
 const rows=new Map((data.results||[]).map(row=>[row.key,row]));const raw=Object.fromEntries(keys.map(key=>[key,rows.get(key)?.value??null]));
 const document=parse(raw[LAYOUT_KEY]),settings=parse(raw.site_settings),buttons=parse(raw.button_dictionary),navigation=parse(raw.navigation_overrides);
 const theme=Object.hasOwn(LAYOUT_THEMES,settings.frontendTheme)?settings.frontendTheme:'dropbeat';
 return {raw,document,settings,buttons,navigation,theme,contextRevision:await sha256Hex(JSON.stringify(raw)),updatedAt:new Date(Math.max(0,...[document.updatedAt,settings.updatedAt,buttons.updatedAt,...[...rows.values()].map(row=>row.updated_at)].map(timestamp))).toISOString()};
}
export function layoutPayload(context,{admin=false}={}){
 const {document,buttons,navigation,theme}=context;
 const dictionary=dictionaryButtons(buttons.overrides||{}),names={},customNames={},paths={};
 for(const[key,def]of Object.entries(LAYOUT_NAMES)){
  const button=def.button?dictionary.find(row=>row.key===def.button):null;
  const label=button?.label||navigation[def.nav]?.label||document.names?.[key]||def.label;
  names[key]=label;if(label!==def.label)customNames[key]=label;
  paths[key]=def.nav&&def.nav!=='home'&&navigation[def.nav]?.slug&&navigation[def.nav].slug!==def.href.slice(1)?'/nav/'+encodeURIComponent(navigation[def.nav].slug):def.href;
 }
 let layout;try{layout=normalizeThemeLayout(theme,document.themes?.[theme]||{});}catch{layout=normalizeThemeLayout(theme);}
 const revision=document.revision||EMPTY_LAYOUT_REVISION;
 const buttonDictionary={ok:true,revision:buttons.revision||'defaults-v156',updatedAt:buttons.updatedAt||'',buttons:dictionary.filter(row=>admin||row.category==='front').map(({selector,...row})=>row)};
 return {ok:true,revision,updatedAt:context.updatedAt,theme,themeName:LAYOUT_THEMES[theme].name,contextRevision:context.contextRevision,names,customNames,paths,layout,blocks:resolvedBlocks(theme,layout,names),buttonDictionary,...(admin?{themes:normalizedLayoutThemes(document.themes),themePresets:LAYOUT_THEMES}:{})};
}
const flights=new Map();
export async function freshLayoutPayload(env,origin,prepare){
 const key=origin+':'+configurationGeneration();if(flights.has(key))return flights.get(key);
 const promise=Promise.resolve().then(()=>prepare?.()).then(()=>readLayoutContext(env)).then(context=>layoutPayload(context)).finally(()=>{if(flights.get(key)===promise)flights.delete(key);});flights.set(key,promise);return promise;
}
export async function saveLayout(env,body){
 if(body?.confirmation!=='confirm')throw Object.assign(new Error('Type confirm before executing layout changes.'),{status:400});
 const context=await readLayoutContext(env),current=context.document;
 if(body.expectedRevision!==(current.revision||EMPTY_LAYOUT_REVISION)||body.expectedContextRevision!==context.contextRevision||body.theme!==context.theme)throw Object.assign(new Error('The theme, layout or shared names changed in another window. Reload the current layout before saving.'),{status:409});
 const layout=normalizeThemeLayout(context.theme,body.layout||{}),names={...(current.names||{})},navigation={...context.navigation},buttons={...(context.buttons.overrides||{})};
 let navigationChanged=false,buttonsChanged=false;
 if(body.names!==undefined&&(!body.names||typeof body.names!=='object'||Array.isArray(body.names)))throw new Error('Invalid shared names.');
 for(const[key,value]of Object.entries(body.names||{})){
  const definition=Object.hasOwn(LAYOUT_NAMES,key)?LAYOUT_NAMES[key]:null;if(!definition)throw new Error('Unknown shared layout name.');const label=cleanLayoutTitle(value);
  if(definition.button){const row=dictionaryButtons(buttons).find(row=>row.key===definition.button);buttons[definition.button]={label,target:row.target};buttonsChanged=true;}
  else if(definition.nav&&definition.nav!=='home'){navigation[definition.nav]={...(navigation[definition.nav]||{}),label,slug:navigation[definition.nav]?.slug||definition.href.slice(1)};navigationChanged=true;}
  else names[key]=label;
 }
 for(const[key,target]of Object.entries(body.buttonTargets||{})){
  const definition=BUTTON_BY_KEY.get(key);if(!['front.header.checkout','front.header.trial'].includes(key))throw new Error('This button is configured in the Buttons tab.');
  const row=dictionaryButtons(buttons).find(row=>row.key===key);buttons[key]={label:row.label,target:normalizeButtonTarget(target,definition)};buttonsChanged=true;
 }
 const updatedAt=new Date(Math.max(Date.now(),timestamp(context.updatedAt)+1)).toISOString();
 const next={version:1,revision:crypto.randomUUID(),updatedAt,names,themes:{...normalizedLayoutThemes(current.themes),[context.theme]:layout}};
 const serialized=JSON.stringify(next);const bindings=[LAYOUT_KEY,serialized,...keys.flatMap(key=>[key,context.raw[key]])];
 // The first conditional write guards every source row. D1 batch executes all
 // statements atomically; the dependent writes run only if that guard succeeds.
 const condition=keys.map(()=>'(SELECT value FROM settings WHERE key=?) IS ?').join(' AND ');
 const statements=[env.DB.prepare(`INSERT INTO settings(key,value,updated_at) SELECT ?,?,CURRENT_TIMESTAMP WHERE ${condition} ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP RETURNING value`).bind(...bindings)];
 const dependent=(key,value)=>env.DB.prepare('INSERT INTO settings(key,value,updated_at) SELECT ?,?,CURRENT_TIMESTAMP WHERE EXISTS(SELECT 1 FROM settings WHERE key=? AND value=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP RETURNING value').bind(key,JSON.stringify(value),LAYOUT_KEY,serialized);
 const nextButtons=buttonsChanged?{version:1,revision:crypto.randomUUID(),updatedAt,overrides:buttons}:context.buttons;
 if(buttonsChanged)statements.push(dependent('button_dictionary',nextButtons));
 if(navigationChanged)statements.push(dependent('navigation_overrides',navigation));
 const result=await env.DB.batch(statements);
 if(!result[0]?.results?.length)throw Object.assign(new Error('The layout changed while saving. Reload and review it again.'),{status:409});
 invalidateConfiguration();
 const raw={...context.raw,[LAYOUT_KEY]:serialized,...(buttonsChanged?{button_dictionary:JSON.stringify(nextButtons)}:{}),...(navigationChanged?{navigation_overrides:JSON.stringify(navigation)}:{})};
 return layoutPayload({...context,raw,document:next,buttons:nextButtons,navigation,updatedAt,contextRevision:await sha256Hex(JSON.stringify(raw))},{admin:true});
}
