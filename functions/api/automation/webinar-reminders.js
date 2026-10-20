import { json, requireAutomation } from '../../_lib/utils.js';
import { processWebinarReminders } from '../../_lib/marketing-suite.js';
import { processStudioHolidayNotifications } from '../../_lib/studio-schedule.js';
export async function onRequestGet({request,env}){try{await requireAutomation(request,env);}catch(e){return json({error:e.message},401);}try{const reminders=await processWebinarReminders(env,{limit:40}),holidays=await processStudioHolidayNotifications(env,{limit:500});return json({...reminders,holidayNotifications:holidays});}catch(e){return json({error:e.message||'Webinar reminders could not be processed.'},500);}}
export const onRequestPost=onRequestGet;
