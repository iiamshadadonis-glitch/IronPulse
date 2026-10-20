// V16.71 — tiny change clock for Admin realtime watchers.
//
// The browser used to discover new Inbox/comments by repeatedly loading the
// complete D1 datasets. On D1 Free that can consume millions of row reads even
// with a single administrator. This table is intentionally one row per scope;
// frequent watchers read only that row and load the larger dataset only when
// its revision changes.

const SCHEMA_KEY='admin_activity_schema_v1671';
const SCHEMA_VERSION='1';
let ready=false;

function scopeName(v=''){
  const s=String(v||'').trim().toLowerCase();
  return ['dm','comments','orders','subscriptions'].includes(s)?s:'dm';
}

export async function ensureAdminActivitySchema(env){
  if(ready||!env?.DB)return;
  let marked=false;
  try{
    const row=await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(SCHEMA_KEY).first();
    marked=String(row?.value||'')===SCHEMA_VERSION;
  }catch(_){/* full application bootstrap normally creates settings first */}
  if(!marked){
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_activity_state (
      scope TEXT PRIMARY KEY,
      revision INTEGER NOT NULL DEFAULT 0,
      unread_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare("INSERT OR IGNORE INTO admin_activity_state(scope,revision,unread_count,updated_at) VALUES('dm',0,0,CURRENT_TIMESTAMP),('comments',0,0,CURRENT_TIMESTAMP),('orders',0,0,CURRENT_TIMESTAMP)").run();
    try{
      const row=await env.DB.prepare('SELECT COALESCE(SUM(unread_count),0) n FROM social_dm_conversations').first();
      await env.DB.prepare("UPDATE admin_activity_state SET unread_count=?,updated_at=CURRENT_TIMESTAMP WHERE scope='dm'").bind(Math.max(0,Number(row?.n||0))).run();
    }catch(_){}
    try{
      await env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(SCHEMA_KEY,SCHEMA_VERSION).run();
    }catch(_){}
  }
  ready=true;
}

export async function getAdminActivity(env,scope='dm'){
  await ensureAdminActivitySchema(env);const s=scopeName(scope);
  const row=await env.DB.prepare('SELECT scope,revision,unread_count,updated_at FROM admin_activity_state WHERE scope=?').bind(s).first();
  return {scope:s,revision:Math.max(0,Number(row?.revision||0)),unreadCount:Math.max(0,Number(row?.unread_count||0)),updatedAt:String(row?.updated_at||'')};
}

export async function bumpAdminActivity(env,scope='dm',{unreadDelta=0}={}){
  await ensureAdminActivitySchema(env);const s=scopeName(scope),delta=Number.isFinite(Number(unreadDelta))?Number(unreadDelta):0;
  const row=await env.DB.prepare(`INSERT INTO admin_activity_state(scope,revision,unread_count,updated_at)
    VALUES(?,1,?,CURRENT_TIMESTAMP)
    ON CONFLICT(scope) DO UPDATE SET
      revision=admin_activity_state.revision+1,
      unread_count=MAX(0,admin_activity_state.unread_count+?),
      updated_at=CURRENT_TIMESTAMP
    RETURNING scope,revision,unread_count,updated_at`).bind(s,Math.max(0,delta),delta).first();
  return {scope:s,revision:Math.max(0,Number(row?.revision||0)),unreadCount:Math.max(0,Number(row?.unread_count||0)),updatedAt:String(row?.updated_at||'')};
}

export async function setAdminActivityUnread(env,scope='dm',count=0,{bump=false}={}){
  await ensureAdminActivitySchema(env);const s=scopeName(scope),n=Math.max(0,Number(count||0));
  const row=await env.DB.prepare(`INSERT INTO admin_activity_state(scope,revision,unread_count,updated_at)
    VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(scope) DO UPDATE SET
      revision=admin_activity_state.revision+?,
      unread_count=excluded.unread_count,
      updated_at=CURRENT_TIMESTAMP
    RETURNING scope,revision,unread_count,updated_at`).bind(s,bump?1:0,n,bump?1:0).first();
  return {scope:s,revision:Math.max(0,Number(row?.revision||0)),unreadCount:Math.max(0,Number(row?.unread_count||0)),updatedAt:String(row?.updated_at||'')};
}

export async function reconcileDmUnread(env,{bump=false}={}){
  await ensureAdminActivitySchema(env);
  const row=await env.DB.prepare('SELECT COALESCE(SUM(unread_count),0) n FROM social_dm_conversations').first().catch(()=>({n:0}));
  return setAdminActivityUnread(env,'dm',Math.max(0,Number(row?.n||0)),{bump});
}
