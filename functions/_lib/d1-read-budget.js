const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
const bounded=(v,fallback,min,max)=>Math.max(min,Math.min(max,Number(v)||fallback));
let ready=false;

function limits(env){
  const hard=bounded(env?.D1_DAILY_READ_HARD_LIMIT,1250000,100000,50000000);
  const configuredSoft=bounded(env?.D1_DAILY_READ_SOFT_LIMIT,750000,50000,hard);
  return {soft:Math.min(configuredSoft,hard),hard};
}

export async function ensureD1ReadBudgetSchema(env){
  if(ready||!env?.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS d1_background_read_budget (
    day_key TEXT PRIMARY KEY,
    estimated_rows INTEGER NOT NULL DEFAULT 0,
    soft_limit INTEGER NOT NULL DEFAULT 750000,
    hard_limit INTEGER NOT NULL DEFAULT 1250000,
    hard_paused INTEGER NOT NULL DEFAULT 0,
    last_operation TEXT NOT NULL DEFAULT '',
    last_reserved_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  ready=true;
}

export async function getD1ReadBudgetStatus(env){
  await ensureD1ReadBudgetSchema(env);
  const dayKey=new Date().toISOString().slice(0,10),{soft,hard}=limits(env);
  await env.DB.prepare(`INSERT INTO d1_background_read_budget(day_key,estimated_rows,soft_limit,hard_limit,hard_paused,updated_at)
    VALUES(?,0,?,?,0,CURRENT_TIMESTAMP) ON CONFLICT(day_key) DO NOTHING`).bind(dayKey,soft,hard).run();
  await env.DB.prepare('UPDATE d1_background_read_budget SET soft_limit=?,hard_limit=?,updated_at=CURRENT_TIMESTAMP WHERE day_key=? AND (soft_limit<>? OR hard_limit<>?)').bind(soft,hard,dayKey,soft,hard).run();
  const row=await env.DB.prepare('SELECT * FROM d1_background_read_budget WHERE day_key=?').bind(dayKey).first();
  const used=Math.max(0,Number(row?.estimated_rows||0));
  return {dayKey,estimatedRows:used,softLimit:soft,hardLimit:hard,hardPaused:!!Number(row?.hard_paused||0),remainingToSoft:Math.max(0,soft-used),remainingToHard:Math.max(0,hard-used),lastOperation:clean(row?.last_operation),lastReservedAt:clean(row?.last_reserved_at,80)};
}

// Reserve conservatively before app-controlled background work. "standard"
// work pauses at 750k; event-specific critical delivery can use the 500k reserve
// but is stopped before the 1.25m background ceiling. This leaves at least 750k
// rows of headroom beneath the overall 2m daily design target.
export async function reserveD1ReadBudget(env,{operation='background',estimatedRows=1,priority='standard'}={}){
  await ensureD1ReadBudgetSchema(env);
  const dayKey=new Date().toISOString().slice(0,10),rows=bounded(estimatedRows,1,1,250000),{soft,hard}=limits(env),ceiling=priority==='critical'?hard:soft,op=clean(operation)||'background';
  await env.DB.prepare(`INSERT INTO d1_background_read_budget(day_key,estimated_rows,soft_limit,hard_limit,hard_paused,updated_at)
    VALUES(?,0,?,?,0,CURRENT_TIMESTAMP) ON CONFLICT(day_key) DO NOTHING`).bind(dayKey,soft,hard).run();
  const claimed=await env.DB.prepare(`UPDATE d1_background_read_budget SET
      estimated_rows=estimated_rows+?,soft_limit=?,hard_limit=?,last_operation=?,last_reserved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
    WHERE day_key=? AND hard_paused=0 AND estimated_rows+?<=?
    RETURNING estimated_rows,soft_limit,hard_limit,hard_paused,last_reserved_at`).bind(rows,soft,hard,op,dayKey,rows,ceiling).first();
  if(claimed)return {allowed:true,priority,operation:op,reservedRows:rows,estimatedRows:Number(claimed.estimated_rows||0),softLimit:soft,hardLimit:hard,hardPaused:false};
  const state=await getD1ReadBudgetStatus(env);
  if(state.estimatedRows+rows>hard||state.hardPaused){
    await env.DB.prepare('UPDATE d1_background_read_budget SET hard_paused=1,last_operation=?,updated_at=CURRENT_TIMESTAMP WHERE day_key=?').bind(`${op}:hard-pause`,dayKey).run();
    state.hardPaused=true;
  }
  return {allowed:false,priority,operation:op,reservedRows:rows,...state,reason:state.hardPaused?'Daily D1 background-read hard ceiling reached. Background processing is paused until the next UTC day.':'Daily D1 background-read soft ceiling reached. Scheduled batch scanning is paused; event-specific critical delivery retains the safety reserve.'};
}
