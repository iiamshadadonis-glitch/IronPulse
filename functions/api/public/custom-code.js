import { json } from '../../_lib/utils.js';
import { publicCustomCode } from '../../_lib/custom-code.js';

export async function onRequestGet({request,env}){try{const path=new URL(request.url).searchParams.get('path')||'/';return json({ok:true,snippets:await publicCustomCode(env,path)},200,{'cache-control':'public, max-age=60'});}catch(e){return json({error:e.message||'Custom code could not be loaded.'},400);}}
