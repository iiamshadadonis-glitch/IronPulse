import { slugify, contentTypeFromName } from './utils.js';

export const MEDIA_ASSETS_SQL = `CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  data_base64 TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'd1',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const ALLOWED_IMAGE_TYPES = [
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/gif'
];

export function imageHint(kind = 'product') {
  const map = {
    product: 'Recommended size: 900 × 1100 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 700 KB per image. Upload up to 3 images per product.',
    bannerDesktop: 'Recommended size: 1920 × 760 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB.',
    bannerMobile: 'Recommended size: 1080 × 1350 px. Accepted formats: WebP, JPG, PNG, SVG. Recommended format: WebP. Maximum upload size: 900 KB.',
    logo: 'Recommended size: 512 × 512 px. Accepted formats: SVG, PNG, WebP, JPG. Maximum upload size: 300 KB.',
    favicon: 'Recommended size: 512 × 512 px or 32 × 32 px. Accepted formats: PNG, ICO, WebP, GIF. Maximum upload size: 300 KB.'
  };
  return map[kind] || map.product;
}

export async function ensureMediaTable(env) {
  if (!env?.DB) return;
  await env.DB.prepare(MEDIA_ASSETS_SQL).run();
}

function safeName(filename = 'image') {
  const parts = String(filename || 'image').split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const base = slugify(parts.join('.') || 'image').slice(0, 70) || 'image';
  return `${base}.${ext || 'bin'}`;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function storeMediaAsset(env, file, options = {}) {
  await ensureMediaTable(env);
  if (!file || typeof file === 'string') return null;

  const maxBytes = Number(options.maxBytes || 700 * 1024);
  if (file.size > maxBytes) {
    const kb = Math.round(maxBytes / 1024);
    throw new Error(`Image is too large. Maximum upload size is ${kb} KB.`);
  }

  const type = file.type || contentTypeFromName(file.name);
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new Error('Accepted formats: WebP, JPG, PNG, SVG, ICO, GIF.');
  }

  const id = crypto.randomUUID();
  const filename = safeName(file.name || `${id}.bin`);
  const folder = String(options.folder || 'uploads').replace(/^\/+|\/+$/g, '') || 'uploads';
  const objectKey = `${folder}/${id}-${filename}`;
  const publicUrl = `/api/media/${id}/${filename}`;
  const base64 = arrayBufferToBase64(await file.arrayBuffer());

  await env.DB.prepare(`INSERT INTO media_assets(id, filename, object_key, public_url, content_type, byte_size, data_base64, storage_type)
    VALUES(?,?,?,?,?,?,?,'d1')`).bind(id, filename, objectKey, publicUrl, type, file.size, base64).run();

  return { id, key: objectKey, url: publicUrl, filename, content_type: type, byte_size: file.size };
}

export async function deleteMediaAsset(env, idOrUrl) {
  await ensureMediaTable(env);
  const value = String(idOrUrl || '');
  const idMatch = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const id = idMatch ? idMatch[0] : value;
  if (!id) return;
  await env.DB.prepare('DELETE FROM media_assets WHERE id = ? OR public_url = ? OR object_key = ?').bind(id, value, value).run();
}
