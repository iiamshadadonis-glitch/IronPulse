import { json } from '../../_lib/utils.js';
import { ensureDanceStudioSchema, listDanceCoaches } from '../../_lib/dance-studio.js';

export async function onRequestGet({env}){
  await ensureDanceStudioSchema(env);const coaches=await listDanceCoaches(env);return json({coaches},200,{'cache-control':'no-store, max-age=0'});
}
