import { ensureV123Schema } from './v1-23-schema.js';

const ready=new WeakSet();
const pending=new WeakMap();

/** Runtime rollout guard for the additive V1.24 coach-detail field. */
export async function ensureV124Schema(env){
  if(!env?.DB)throw new Error('The account database binding (DB) is not available.');
  if(ready.has(env.DB))return;
  if(pending.has(env.DB))return pending.get(env.DB);
  const task=(async()=>{
    await ensureV123Schema(env);
    await env.DB.prepare(`ALTER TABLE coach_remuneration_terms ADD COLUMN last_payment_date TEXT NOT NULL DEFAULT ''`).run().catch(error=>{
      if(!/duplicate column|already exists/i.test(String(error?.message||error)))throw error;
    });
    ready.add(env.DB);
  })().finally(()=>pending.delete(env.DB));
  pending.set(env.DB,task);return task;
}
