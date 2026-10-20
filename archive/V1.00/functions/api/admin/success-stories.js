import { json, readJson, requireAdmin, withD1Retry } from '../../_lib/utils.js';
import { ensureSuccessStoriesSchema } from '../../_lib/success-stories-schema.js';

const NO_STORE = { 'cache-control':'no-store, max-age=0, must-revalidate' };
const reply = (data, status = 200) => json(data, status, NO_STORE);

function diagnosticId(request) {
  const supplied = String(request.headers.get('x-dropbeat-request-id') || '').trim();
  if (/^[a-z0-9-]{8,80}$/i.test(supplied)) return supplied;
  try { return crypto.randomUUID(); }
  catch (_) { return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
}

function normalizeUrl(value = '') {
  let raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/.test(parsed.protocol)) return '';
    return parsed.toString();
  } catch (_) { return ''; }
}
function storyPlatform(url = '') { return /(^|\.)instagram\.com$/i.test(new URL(url).hostname) ? 'instagram' : 'youtube'; }
function supportedStoryUrl(url = '') {
  try { return /(^|\.)(youtube\.com|youtu\.be|instagram\.com)$/i.test(new URL(url).hostname); }
  catch (_) { return false; }
}
function youtubeId(url = '') {
  return String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?[^#]*?v=|shorts\/|embed\/))([A-Za-z0-9_-]{6,})/i)?.[1] || '';
}
function instagramMedia(url = '') {
  const match = String(url).match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/media/?size=l` : '';
}
function autoThumb(url = '') {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : instagramMedia(url);
}
function cleanTitle(value = '') { return String(value || '').trim().slice(0, 160) || 'Member Story'; }
function cleanStatus(value = '') { return String(value).toLowerCase() === 'draft' ? 'draft' : 'active'; }
async function authorize(request, env) {
  try { await requireAdmin(request, env); return null; }
  catch (error) { return reply({ ok:false, error:error.message || 'Admin login required' }, 401); }
}
async function allStories(env) {
  const result = await withD1Retry(() => env.DB.prepare('SELECT * FROM success_stories ORDER BY sort_order,id').all());
  return result.results || [];
}

export async function onRequestGet({ request, env }) {
  const auth = await authorize(request, env); if (auth) return auth;
  try {
    await ensureSuccessStoriesSchema(env);
    return reply({ ok:true, stories:await allStories(env) });
  }
  catch (error) { return reply({ ok:false, error:error.message || 'Member Stories could not be loaded.' }, 500); }
}

export async function onRequestPost({ request, env }) {
  const auth = await authorize(request, env); if (auth) return auth;
  const diagnostic_id = diagnosticId(request);
  try {
    await ensureSuccessStoriesSchema(env);
    const body = await readJson(request);
    const id = body.id ? Number(body.id) : 0;
    const url = normalizeUrl(body.url);
    if (!url) return reply({ ok:false, error:'Paste a complete YouTube or Instagram link.', diagnostic_id }, 400);
    if (!supportedStoryUrl(url)) return reply({ ok:false, error:'Member Stories support YouTube and Instagram links.', diagnostic_id }, 400);
    const platform = storyPlatform(url);
    const suppliedThumb = String(body.thumbnail_url || '').trim();
    const thumbnail = suppliedThumb ? normalizeUrl(suppliedThumb) : autoThumb(url);
    if (suppliedThumb && !thumbnail) return reply({ ok:false, error:'The optional thumbnail must be a complete public HTTPS link.', diagnostic_id }, 400);
    const values = {
      title:cleanTitle(body.title), url, platform,
      thumbnail:thumbnail || '/assets/product-generic.svg', status:cleanStatus(body.status)
    };

    let savedId = id;
    if (id) {
      const current = await withD1Retry(() => env.DB.prepare('SELECT id FROM success_stories WHERE id=?').bind(id).first());
      if (!current) return reply({ ok:false, error:'Member Story not found.', diagnostic_id }, 404);
      const update = await withD1Retry(() => env.DB.prepare(
        'UPDATE success_stories SET title=?,url=?,platform=?,thumbnail_url=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(values.title, values.url, values.platform, values.thumbnail, values.status, id).run());
      if (update?.success === false) throw new Error('The database did not accept the Member Story update.');
    } else {
      const max = await withD1Retry(() => env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM success_stories').first());
      const result = await withD1Retry(() => env.DB.prepare(
        'INSERT INTO success_stories(title,url,platform,thumbnail_url,status,sort_order) VALUES(?,?,?,?,?,?)'
      ).bind(values.title, values.url, values.platform, values.thumbnail, values.status, Number(max?.n || 0) + 1).run());
      if (result?.success === false) throw new Error('The database did not accept the new Member Story.');
      savedId = Number(result?.meta?.last_row_id || 0);
      if (!savedId) {
        const saved = await withD1Retry(() => env.DB.prepare('SELECT id FROM success_stories WHERE url=? ORDER BY id DESC LIMIT 1').bind(values.url).first());
        savedId = Number(saved?.id || 0);
      }
    }
    const story = savedId ? await withD1Retry(() => env.DB.prepare('SELECT * FROM success_stories WHERE id=?').bind(savedId).first()) : null;
    if (!story) throw new Error('The Member Story write completed but could not be verified in storage.');
    return reply({ ok:true, id:savedId, story, diagnostic_id, message:'Member Story saved successfully.' }, id ? 200 : 201);
  } catch (error) {
    console.error(`Member Story save failed [${diagnostic_id}]`, error);
    return reply({ ok:false, error:error.message || 'Member Story could not be saved.', error_code:'STUDENT_STORY_SAVE_FAILED', diagnostic_id }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await authorize(request, env); if (auth) return auth;
  try {
    await ensureSuccessStoriesSchema(env);
    const body = await readJson(request);
    if (body.action !== 'move') return reply({ ok:false, error:'Unsupported Member Story action.' }, 400);
    const id = Number(body.id || 0), direction = Number(body.dir || 0);
    const item = await withD1Retry(() => env.DB.prepare('SELECT id,sort_order FROM success_stories WHERE id=?').bind(id).first());
    if (!item) return reply({ ok:false, error:'Member Story not found.' }, 404);
    const other = direction < 0
      ? await withD1Retry(() => env.DB.prepare('SELECT id,sort_order FROM success_stories WHERE sort_order < ? ORDER BY sort_order DESC,id DESC LIMIT 1').bind(item.sort_order).first())
      : await withD1Retry(() => env.DB.prepare('SELECT id,sort_order FROM success_stories WHERE sort_order > ? ORDER BY sort_order ASC,id ASC LIMIT 1').bind(item.sort_order).first());
    if (other) await withD1Retry(() => env.DB.batch([
      env.DB.prepare('UPDATE success_stories SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(other.sort_order, item.id),
      env.DB.prepare('UPDATE success_stories SET sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(item.sort_order, other.id)
    ]));
    return reply({ ok:true, stories:await allStories(env) });
  } catch (error) { return reply({ ok:false, error:error.message || 'Member Story order could not be changed.' }, 400); }
}

export async function onRequestDelete({ request, env }) {
  const auth = await authorize(request, env); if (auth) return auth;
  try {
    await ensureSuccessStoriesSchema(env);
    const id = Number(new URL(request.url).searchParams.get('id') || 0);
    if (!id) return reply({ ok:false, error:'Member Story id is required.' }, 400);
    await withD1Retry(() => env.DB.prepare('DELETE FROM success_stories WHERE id=?').bind(id).run());
    return reply({ ok:true, stories:await allStories(env) });
  } catch (error) { return reply({ ok:false, error:error.message || 'Member Story could not be deleted.' }, 400); }
}
