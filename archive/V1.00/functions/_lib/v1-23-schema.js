import { ensureV122Schema } from './v1-22-schema.js';

const ready=new WeakSet();
const pending=new WeakMap();

/** Runtime rollout guard for the additive V1.23 leave-rule table. */
export async function ensureV123Schema(env){
  if(!env?.DB)throw new Error('The account database binding (DB) is not available.');
  if(ready.has(env.DB))return;
  if(pending.has(env.DB))return pending.get(env.DB);
  const task=(async()=>{
    await ensureV122Schema(env);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS coach_leave_rule_overrides (
      coach_id INTEGER PRIMARY KEY,
      rule_mode TEXT NOT NULL DEFAULT 'inherit' CHECK(rule_mode IN ('inherit','custom','disabled')),
      paid_leaves_per_month INTEGER NOT NULL DEFAULT 0,
      deduction_method TEXT NOT NULL DEFAULT 'per_session' CHECK(deduction_method IN ('per_session','per_day','percentage')),
      deduction_percent REAL NOT NULL DEFAULT 0,
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(coach_id) REFERENCES dance_coaches(id) ON DELETE CASCADE
    )`).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_coach_leave_rule_mode ON coach_leave_rule_overrides(rule_mode,coach_id)').run().catch(()=>{});
    ready.add(env.DB);
  })().finally(()=>pending.delete(env.DB));
  pending.set(env.DB,task);return task;
}
