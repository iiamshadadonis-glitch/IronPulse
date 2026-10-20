import { ensureMarketingSchema } from './marketing-suite.js';

const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const number=v=>Math.max(0,Number(v)||0);
const parse=(v,f=[])=>{try{return JSON.parse(v??'')??f;}catch{return f;}};
const normalizePath=v=>{const s=clean(v,300);return s?`/${s.replace(/^\/+|\/+$/g,'')}`:'/';};

function sanitize(input={}){
  const placement=['head','body_start','body_end'].includes(input.placement)?input.placement:'head';
  const scope=input.scope==='specific'?'specific':'all';
  const consentCategory=['essential','analytics','ads'].includes(input.consentCategory)?input.consentCategory:'analytics';
  const pages=[...new Set((Array.isArray(input.pages)?input.pages:[]).map(normalizePath))].slice(0,100);
  return {name:clean(input.name,120),code:clean(input.code,100000),placement,scope,pages,consentCategory,enabled:input.enabled===true||input.enabled===1||input.enabled==='true'};
}

export async function listCustomCode(env){
  await ensureMarketingSchema(env);
  const r=await env.DB.prepare('SELECT id,name,code,placement,scope,pages_json,consent_category,enabled,created_at,updated_at FROM custom_code_snippets ORDER BY id DESC LIMIT 200').all();
  return (r.results||[]).map(x=>({...x,pages:parse(x.pages_json,[]),enabled:!!Number(x.enabled)}));
}

export async function saveCustomCode(env,input={}){
  await ensureMarketingSchema(env);const row=sanitize(input),id=number(input.id);
  if(!row.name)throw new Error('Enter a clear code name.');
  if(!row.code)throw new Error('Paste the code snippet before saving.');
  if(row.scope==='specific'&&!row.pages.length)throw new Error('Choose at least one website page for this snippet.');
  if(id){await env.DB.prepare(`UPDATE custom_code_snippets SET name=?,code=?,placement=?,scope=?,pages_json=?,consent_category=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.name,row.code,row.placement,row.scope,JSON.stringify(row.pages),row.consentCategory,row.enabled?1:0,id).run();return id;}
  const r=await env.DB.prepare(`INSERT INTO custom_code_snippets(name,code,placement,scope,pages_json,consent_category,enabled) VALUES(?,?,?,?,?,?,?) RETURNING id`).bind(row.name,row.code,row.placement,row.scope,JSON.stringify(row.pages),row.consentCategory,row.enabled?1:0).first();return r.id;
}

export async function toggleCustomCode(env,id,enabled){await ensureMarketingSchema(env);await env.DB.prepare('UPDATE custom_code_snippets SET enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(enabled?1:0,number(id)).run();}
export async function deleteCustomCode(env,id){await ensureMarketingSchema(env);await env.DB.prepare('DELETE FROM custom_code_snippets WHERE id=?').bind(number(id)).run();}

export async function publicCustomCode(env,path='/'){
  await ensureMarketingSchema(env);const normalized=normalizePath(path),r=await env.DB.prepare(`SELECT id,name,code,placement,scope,pages_json,consent_category FROM custom_code_snippets WHERE enabled=1 ORDER BY id`).all();
  return (r.results||[]).filter(x=>x.scope==='all'||parse(x.pages_json,[]).map(normalizePath).includes(normalized)).map(x=>({id:x.id,name:x.name,code:x.code,placement:x.placement,consentCategory:x.consent_category}));
}
