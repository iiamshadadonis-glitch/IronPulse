import { json } from '../../_lib/utils.js';
import { getPublicStories } from '../../_lib/public-data.js';
import { ensureSuccessStoriesSchema } from '../../_lib/success-stories-schema.js';
export async function onRequestGet({ env }) {
  try {
    await ensureSuccessStoriesSchema(env);
    return json({ stories: await getPublicStories(env, 24) }, 200, {
      'cache-control': 'no-store, max-age=0, must-revalidate'
    });
  } catch (error) {
    return json({ stories:[], error:error.message || 'Student Stories could not be loaded.' }, 500, {
      'cache-control': 'no-store, max-age=0, must-revalidate'
    });
  }
}
