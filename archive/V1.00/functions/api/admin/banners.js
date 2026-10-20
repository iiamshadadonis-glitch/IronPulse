import { json, requireAdmin } from '../../_lib/utils.js';
import { deleteGoogleDriveFile, parseDriveReference, uploadWebsiteImageToGoogleDrive } from '../../_lib/google-drive-upload.js';

async function saveFile(env, file, folder) {
  if (!file || typeof file === 'string' || !file.size) return null;
  const mobile=folder.includes('mobile');
  return uploadWebsiteImageToGoogleDrive(env, file, { maxBytes:15*1024*1024, folderName:mobile?'Home Banners - Mobile':'Home Banners - Desktop', settingsPrefix:mobile?'homeBannersMobile':'homeBannersDesktop' });
}

function clean(form, name, fallback = '') {
  return String(form.get(name) ?? fallback).slice(0, name === 'title' ? 85 : 190);
}

async function nextBannerSort(env) {
  const row = await env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM banners').first();
  return Number(row?.n || 0) + 1;
}

export async function onRequestGet({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const { results } = await env.DB.prepare('SELECT * FROM banners ORDER BY sort_order, id').all();
  return json({ banners: results || [] });
}

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  try {
    const form = await request.formData();
    const desktop = await saveFile(env, form.get('desktop_image'), 'banners/desktop');
    const mobile = await saveFile(env, form.get('mobile_image'), 'banners/mobile');
    const requestedSort = Number(form.get('sort_order') || 0);
    const sortOrder = requestedSort || await nextBannerSort(env);

    await env.DB.prepare('INSERT INTO banners(title,subtitle,desktop_image_url,mobile_image_url,object_key,link_type,link_value,badge,visible,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(
        clean(form, 'title'),
        clean(form, 'subtitle'),
        desktop?.url || '/assets/gym-hero.jpg',
        mobile?.url || desktop?.url || '/assets/gym-hero.jpg',
        desktop?.id ? `drive:${desktop.id}` : '',
        form.get('link_type') || 'page',
        form.get('link_value') || '/offers',
        form.get('badge') || '',
        form.get('visible') === '0' ? 0 : 1,
        sortOrder
      ).run();
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}

export async function onRequestPut({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  try {
    const ctype = request.headers.get('content-type') || '';
    if (ctype.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      if (body.action === 'move') {
        const id = Number(body.id);
        const dir = Number(body.dir || 0);
        if (!id || !dir) return json({ error: 'Banner id and direction are required' }, 400);

        const rows = (await env.DB.prepare('SELECT id FROM banners ORDER BY sort_order, id').all()).results || [];
        const idx = rows.findIndex((r) => Number(r.id) === id);
        if (idx < 0) return json({ error: 'Banner not found' }, 404);
        const swapIdx = dir < 0 ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= rows.length) return json({ ok: true, unchanged: true });

        const ordered = rows.map((r) => r.id);
        const tmp = ordered[idx];
        ordered[idx] = ordered[swapIdx];
        ordered[swapIdx] = tmp;
        await env.DB.batch(
          ordered.map((bannerId, i) =>
            env.DB.prepare('UPDATE banners SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(i + 1, bannerId)
          )
        );
        return json({ ok: true });
      }
    }

    const form = await request.formData();
    const id = form.get('id');
    if (!id) return json({ error: 'Banner id is required' }, 400);
    const current = await env.DB.prepare('SELECT * FROM banners WHERE id=?').bind(id).first();
    if (!current) return json({ error: 'Banner not found' }, 404);
    const desktop = await saveFile(env, form.get('desktop_image'), 'banners/desktop');
    const mobile = await saveFile(env, form.get('mobile_image'), 'banners/mobile');
    const requestedSort = Number(form.get('sort_order') || 0);
    const sortOrder = requestedSort || Number(current.sort_order || 0) || await nextBannerSort(env);

    await env.DB.prepare('UPDATE banners SET title=?, subtitle=?, desktop_image_url=?, mobile_image_url=?, object_key=?, link_type=?, link_value=?, badge=?, visible=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(
        clean(form, 'title', current.title),
        clean(form, 'subtitle', current.subtitle),
        desktop?.url || current.desktop_image_url,
        mobile?.url || current.mobile_image_url || desktop?.url || current.desktop_image_url,
        desktop?.id ? `drive:${desktop.id}` : current.object_key || '',
        form.get('link_type') || current.link_type || 'page',
        form.get('link_value') || current.link_value || '/offers',
        form.get('badge') || '',
        form.get('visible') === '0' ? 0 : 1,
        sortOrder,
        id
      ).run();
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}

export async function onRequestDelete({ request, env }) {
  try { await requireAdmin(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Banner id is required' }, 400);
  const banner = await env.DB.prepare('SELECT * FROM banners WHERE id=?').bind(id).first();
  if (banner) {
    await env.DB.prepare('DELETE FROM banners WHERE id=?').bind(id).run();
    if (banner.object_key) await deleteGoogleDriveFile(env, banner.object_key).catch(()=>{});
    const mobileId=parseDriveReference(banner.mobile_image_url).id;if(mobileId)await deleteGoogleDriveFile(env,mobileId).catch(()=>{});
  }
  return json({ ok: true });
}
