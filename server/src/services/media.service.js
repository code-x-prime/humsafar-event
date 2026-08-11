import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { getPresignedUploadUrl, uploadObject, deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, per master spec's image upload limit

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function sanitizeFilename(filename) {
  return filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
}

function assertValidUpload(contentType, size) {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `Unsupported file type: ${contentType}`);
  }
  if (size && size > MAX_UPLOAD_BYTES) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'File exceeds the 5MB upload limit');
  }
}

function buildKey(folder, filename) {
  const safeName = sanitizeFilename(filename);
  return `${folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['r2Key', 'url'], filterFields: ['folder'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy, skip, take }),
    prisma.mediaAsset.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const media = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!media) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Media asset not found');
  return media;
}

export async function create(data, uploadedById) {
  return prisma.mediaAsset.create({ data: { ...data, uploadedById: uploadedById || null } });
}

export async function update(id, data) {
  await getById(id);
  return prisma.mediaAsset.update({ where: { id }, data });
}

// Deletes both the MediaAsset row and the underlying R2 object — media must
// never be orphaned in the bucket after its DB record is gone. If the R2
// delete fails (e.g. already gone, or storage briefly unreachable), the DB
// row is still removed and the failure is logged rather than blocking the
// admin's delete action entirely.
export async function remove(id) {
  const media = await getById(id);

  try {
    await deleteObject(media.r2Key);
  } catch (err) {
    logger.error({ err, r2Key: media.r2Key }, 'Failed to delete R2 object during media removal');
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return media;
}

// Server-proxy upload: the file arrives in the request body (multer, in-memory),
// we PUT it to R2 ourselves and write the MediaAsset row in one step. Used instead
// of the presigned-direct-upload flow below because the R2 bucket has no CORS
// policy configured for browser-direct PUTs.
export async function uploadFile({ folder, filename, contentType, size, buffer }, uploadedById) {
  assertValidUpload(contentType, size);
  const key = buildKey(folder, filename);

  const { publicUrl } = await uploadObject({ key, contentType, body: buffer });

  return create({ r2Key: key, url: publicUrl, folder, mime: contentType, size }, uploadedById);
}

// Step 1 of direct-to-R2 upload: validate + hand back a presigned PUT URL.
// Does not touch the DB — a MediaAsset row is only written once the browser's
// upload actually succeeds (confirmUpload), so a dropped upload never leaves
// an orphaned record behind. Currently unused by the admin UI (see uploadFile
// above) since this bucket has no CORS policy for direct browser PUTs — kept
// for when that's configured, since presigned direct-upload is the better
// path for large files.
export async function presignUpload({ folder, filename, contentType, size }) {
  assertValidUpload(contentType, size);
  const key = buildKey(folder, filename);

  const { uploadUrl, publicUrl } = await getPresignedUploadUrl({ key, contentType });
  return { uploadUrl, r2Key: key, publicUrl };
}

// Step 2: called by the client after the direct R2 PUT succeeds. Writes the
// real MediaAsset row.
export async function confirmUpload(data, uploadedById) {
  return create(
    {
      r2Key: data.r2Key,
      url: data.url,
      folder: data.folder,
      mime: data.mime,
      size: data.size,
      width: data.width,
      height: data.height,
    },
    uploadedById
  );
}
