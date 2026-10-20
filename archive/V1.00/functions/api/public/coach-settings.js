import { json } from '../../_lib/utils.js';
import { getCoachSettings } from '../../_lib/coach-remuneration.js';
export async function onRequestGet({env}){try{const settings=await getCoachSettings(env);return json({ok:true,settings:{askRemunerationExpectation:!!settings.askRemunerationExpectation}},200,{'cache-control':'public, max-age=60'});}catch{return json({ok:true,settings:{askRemunerationExpectation:false}});}}
