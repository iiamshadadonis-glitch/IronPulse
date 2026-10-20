import { json, requireAdmin, withD1Retry } from '../../_lib/utils.js';
import { deleteGoogleDriveFile, uploadWebsiteImageToGoogleDrive } from '../../_lib/google-drive-upload.js';

const NO_STORE = { 'cache-control':'no-store, max-age=0, must-revalidate' };
const MAX_IMAGES = 12;

function reply(data, status = 200) { return json(data, status, NO_STORE); }
function text(value, max = 160) { return String(value || '').trim().slice(0, max); }

async function rows(env) {
  const result = await withD1Retry(() => env.DB.prepare(
    'SELECT id,image_url,object_key,alt_text,visible,sort_order,created_at,updated_at FROM studio_gallery_images ORDER BY sort_order,id'
  ).all());
  return result.results || [];
}

async function authenticate(request, env) {
  try { await requireAdmin(request, env); return null; }
  catch (error) { return reply({ ok:false, error:error.message || 'Admin login required' }, 401); }
}

function imageFiles(form) {
  const combined = [...form.getAll('images'), ...form.getAll('image')];
  const seen = new Set();
  return combined.filter(file => {
    if (!file || typeof file === 'string' || !file.size || seen.has(file)) return false;
    seen.add(file);
    return true;
  });
}

export async function onRequestGet({ request, env }) {
  const auth = await authenticate(request, env); if (auth) return auth;
  try { return reply({ ok:true, images:await rows(env), maxImages:MAX_IMAGES }); }
  catch (error) { return reply({ ok:false, error:error.message || 'Studio images could not be loaded.' }, 500); }
}

export async function onRequestPost({ request, env }) {
  const auth = await authenticate(request, env); if (auth) return auth;
  const stored = [];
  const created = [];
  try {
    const form = await request.formData();
    const files = imageFiles(form);
    if (!files.length) return reply({ ok:false, error:'Choose at least one DropBeat Studio image.' }, 400);
    const count = Number((await withD1Retry(() => env.DB.prepare('SELECT COUNT(*) n FROM studio_gallery_images').first()))?.n || 0);
    if (count + files.length > MAX_IMAGES) {
      return reply({ ok:false, error:`You can keep up to ${MAX_IMAGES} DropBeat Studio images. Remove an image or select fewer files.` }, 400);
    }
    const max = await withD1Retry(() => env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM studio_gallery_images').first());
    const firstSort = Number(max?.n || 0) + 1;
    const baseAlt = text(form.get('alt_text')) || 'DropBeat Studio dance class';
    const visible = form.get('visible') === '0' ? 0 : 1;
    for (let index = 0; index < files.length; index++) {
      const asset = await uploadWebsiteImageToGoogleDrive(env, files[index], { maxBytes:15*1024*1024, folderName:'DropBeat Studio Gallery', settingsPrefix:'studioGallery' });
      stored.push(asset);
      const alt = files.length > 1 ? `${baseAlt} ${index + 1}`.slice(0, 160) : baseAlt;
      const result = await withD1Retry(() => env.DB.prepare(
        'INSERT INTO studio_gallery_images(image_url,object_key,alt_text,visible,sort_order) VALUES(?,?,?,?,?)'
      ).bind(asset.url, `drive:${asset.id}`, alt, visible, firstSort + index).run());
      created.push(Number(result?.meta?.last_row_id || 0));
    }
    return reply({ ok:true, ids:created, images:await rows(env), message:`${files.length} studio image${files.length === 1 ? '' : 's'} saved.` }, 201);
  } catch (error) {
    if (stored.length) await env.DB.batch(stored.map(asset => env.DB.prepare('DELETE FROM studio_gallery_images WHERE object_key=?').bind(`drive:${asset.id}`))).catch(() => {});
    await Promise.all(stored.map(asset => deleteGoogleDriveFile(env, asset.id).catch(() => {})));
    return reply({ ok:false, error:error.message || 'Studio images could not be saved.' }, 400);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await authenticate(request, env); if (auth) return auth;
  let replacement = null;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (body.action !== 'move') return reply({ ok:false, error:'Unsupported studio-image action.' }, 400);
      const id = Number(body.id || 0), direction = Number(body.dir || 0);
      if (!id || !direction) return reply({ ok:false, error:'Studio image and direction are required.' }, 400);
      const ordered = await rows(env), index = ordered.findIndex(item => Number(item.id) === id);
      if (index < 0) return reply({ ok:false, error:'Studio image not found.' }, 404);
      const swap = direction < 0 ? index - 1 : index + 1;
      if (swap < 0 || swap >= ordered.length) return reply({ ok:true, unchanged:true, images:ordered });
      const ids = ordered.map(item => item.id);
      [ids[index], ids[swap]] = [ids[swap], ids[index]];
      await withD1Retry(() => env.DB.batch(ids.map((imageId, position) => env.DB.prepare(
        'UPDATE studio_gallery_images SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(position + 1, imageId))));
      return reply({ ok:true, images:await rows(env) });
    }

    const form = await request.formData();
    const id = Number(form.get('id') || 0);
    if (!id) return reply({ ok:false, error:'Studio image id is required.' }, 400);
    const current = await withD1Retry(() => env.DB.prepare('SELECT * FROM studio_gallery_images WHERE id=?').bind(id).first());
    if (!current) return reply({ ok:false, error:'Studio image not found.' }, 404);
    const file = imageFiles(form)[0] || null;
    if (file) replacement = await uploadWebsiteImageToGoogleDrive(env, file, { maxBytes:15*1024*1024, folderName:'DropBeat Studio Gallery', settingsPrefix:'studioGallery' });
    await withD1Retry(() => env.DB.prepare(
      'UPDATE studio_gallery_images SET image_url=?,object_key=?,alt_text=?,visible=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(
      replacement?.url || current.image_url,
      replacement?.id ? `drive:${replacement.id}` : current.object_key || '',
      text(form.get('alt_text')) || current.alt_text || 'DropBeat Studio dance class',
      form.get('visible') === '0' ? 0 : 1,
      id
    ).run());
    if (replacement && current.object_key) await deleteGoogleDriveFile(env, current.object_key).catch(() => {});
    return reply({ ok:true, image:(await rows(env)).find(item => Number(item.id) === id) || null, images:await rows(env) });
  } catch (error) {
    if (replacement) await deleteGoogleDriveFile(env, replacement.id).catch(() => {});
    return reply({ ok:false, error:error.message || 'Studio image could not be updated.' }, 400);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await authenticate(request, env); if (auth) return auth;
  try {
    const id = Number(new URL(request.url).searchParams.get('id') || 0);
    if (!id) return reply({ ok:false, error:'Studio image id is required.' }, 400);
    const current = await withD1Retry(() => env.DB.prepare('SELECT * FROM studio_gallery_images WHERE id=?').bind(id).first());
    if (!current) return reply({ ok:false, error:'Studio image not found.' }, 404);
    await withD1Retry(() => env.DB.prepare('DELETE FROM studio_gallery_images WHERE id=?').bind(id).run());
    await deleteGoogleDriveFile(env, current.object_key || current.image_url).catch(() => {});
    const ordered = await rows(env);
    if (ordered.length) await withD1Retry(() => env.DB.batch(ordered.map((item, index) => env.DB.prepare(
      'UPDATE studio_gallery_images SET sort_order=? WHERE id=?'
    ).bind(index + 1, item.id))));
    return reply({ ok:true, images:await rows(env) });
  } catch (error) {
    return reply({ ok:false, error:error.message || 'Studio image could not be removed.' }, 400);
  }
}
