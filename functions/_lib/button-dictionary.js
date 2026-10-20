import {configurationGeneration,invalidateConfiguration,LAYOUT_CACHE} from './configuration-cache-v1-57.js';
import { BUTTON_BY_KEY, DEFAULT_BUTTON_REVISION, dictionaryButtons, normalizeButtonLabel, normalizeButtonTarget } from '../../public/assets/button-dictionary-defaults-v1-56.js';
import { sha256Hex } from './utils.js';
export const BUTTON_DICTIONARY_KEY='button_dictionary';
export const BUTTON_DICTIONARY_CACHE=[{path:'/api/public/button-dictionary',key:'button-dictionary-v156'},...LAYOUT_CACHE];
const flights=new Map();
export async function readButtonDictionary(env){
 const row=await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(BUTTON_DICTIONARY_KEY).first();const raw=row?.value??null;let stored={};try{stored=JSON.parse(raw||'{}')||{};}catch{}
 const revision=typeof stored.revision==='string'?stored.revision:raw?'legacy-'+(await sha256Hex(raw)).slice(0,32):DEFAULT_BUTTON_REVISION;
 return {raw,revision,updatedAt:typeof stored.updatedAt==='string'?stored.updatedAt:'',overrides:stored.overrides&&typeof stored.overrides==='object'&&!Array.isArray(stored.overrides)?stored.overrides:{}};
}
export function buttonPayload(document,{publicOnly=false}={}){
 const buttons=dictionaryButtons(document.overrides,publicOnly?'front':'');
 return {ok:true,revision:document.revision,updatedAt:document.updatedAt,buttons:buttons.map(({selector,...row})=>row)};
}
export async function freshPublicButtonPayload(env,origin,prepare){
 const key=origin+':'+configurationGeneration();if(flights.has(key))return flights.get(key);
 const promise=Promise.resolve().then(()=>prepare?.()).then(()=>readButtonDictionary(env)).then(doc=>buttonPayload(doc,{publicOnly:true})).finally(()=>{if(flights.get(key)===promise)flights.delete(key);});
 flights.set(key,promise);return promise;
}
export async function saveButtonDictionary(env,body){
 if(body.confirmation!=='confirm')throw Object.assign(new Error('Type confirm before changing or resetting button settings.'),{status:400});
 if(!['save','reset'].includes(body.action))throw Object.assign(new Error('Unknown dictionary action.'),{status:400});
 const current=await readButtonDictionary(env);if(body.expectedRevision!==current.revision)throw Object.assign(new Error('Button settings changed in another window. Reload and review the latest version.'),{status:409});
 const overrides=Object.fromEntries(dictionaryButtons(current.overrides).filter(row=>row.label!==row.defaultLabel||row.target!==row.defaultTarget).map(row=>[row.key,{label:row.label,target:row.target}]));
 if(body.action==='reset')for(const key of Object.keys(overrides))delete overrides[key];
 else{
  const definition=BUTTON_BY_KEY.get(body.key);if(!definition)throw Object.assign(new Error('Unknown button.'),{status:400});
  const label=normalizeButtonLabel(body.label),target=normalizeButtonTarget(body.target,definition);
  if(label===definition.label&&target===definition.target)delete overrides[definition.key];else overrides[definition.key]={label,target};
 }
 const next={version:1,revision:crypto.randomUUID(),updatedAt:new Date(Math.max(Date.now(),Date.parse(current.updatedAt||'')+1||0)).toISOString(),overrides};
 const result=await env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP WHERE settings.value = ? RETURNING value`).bind(BUTTON_DICTIONARY_KEY,JSON.stringify(next),current.raw).first();
 if(!result)throw Object.assign(new Error('Button settings changed in another window. Reload and review the latest version.'),{status:409});
 invalidateConfiguration();return buttonPayload(next);
}
