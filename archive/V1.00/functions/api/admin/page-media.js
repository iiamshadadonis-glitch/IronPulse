import { json, requireAdmin } from '../../_lib/utils.js';
import { uploadWebsiteImageToGoogleDrive } from '../../_lib/google-drive-upload.js';

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  try {
    const form = await request.formData();
    const file = form.get('file');
    const purpose = String(form.get('purpose') || 'about-cover').trim();
    if (!file || typeof file === 'string') return json({ error:'Choose an image first.' }, 400);
    const asset = await uploadWebsiteImageToGoogleDrive(env, file, {folderName:purpose === 'about-cover' ? 'About Page Images' : 'Page Images',settingsPrefix:purpose === 'about-cover' ? 'aboutPageImages' : 'pageImages',maxBytes:15*1024*1024});
    return json({ ok:true, url:asset.url, asset });
  } catch (e) {
    return json({ error:e.message || 'Page image upload failed.' }, 400);
  }
}
