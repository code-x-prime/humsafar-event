import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';

// Shared by the decoration-review and shop-review services — both have an
// identical media table shape (reviewId / r2Key / url / type), so the same sync
// and cleanup logic serves either Prisma delegate.
export const MAX_REVIEW_IMAGES = 5;

async function safeDeleteObjects(items) {
  await Promise.all(
    items.map((m) =>
      deleteObject(m.r2Key).catch((err) => logger.error({ err, r2Key: m.r2Key }, 'Failed to delete R2 object for review media'))
    )
  );
}

// Makes the review's stored images match `media` exactly (add new, drop
// removed, capped at MAX_REVIEW_IMAGES) and deletes the dropped files from R2
// so the bucket doesn't accumulate orphans. `media === undefined` means the
// caller didn't touch images, so nothing happens.
export async function syncReviewMedia(mediaModel, reviewId, media) {
  if (!media) return;

  const existing = await mediaModel.findMany({ where: { reviewId } });
  const kept = media.slice(0, MAX_REVIEW_IMAGES);
  const keptKeys = new Set(kept.map((m) => m.r2Key));
  const removed = existing.filter((m) => !keptKeys.has(m.r2Key));

  await mediaModel.deleteMany({ where: { reviewId } });
  if (kept.length) {
    await mediaModel.createMany({
      data: kept.map((m) => ({ reviewId, r2Key: m.r2Key, url: m.url, type: 'IMAGE' })),
    });
  }

  await safeDeleteObjects(removed);
}

// Called after a review (and, via cascade, its media rows) is deleted.
export async function deleteReviewMediaFiles(media) {
  await safeDeleteObjects(media || []);
}

// ─────────────────────────────────────────────────────────────
// Photos uploaded by customers from the product-page review form
// ─────────────────────────────────────────────────────────────

// Customer uploads all land in this folder, so a review submission can only
// ever attach files that really came through the public upload endpoint —
// never a product or admin image someone guessed the key of.
export const CUSTOMER_REVIEW_FOLDER = 'reviews/customer';

// Decides the real image type from the file's own first bytes instead of
// trusting the browser-supplied mime type. Returns null for anything that isn't
// a JPEG, PNG or WebP.
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, i) => buffer[i] === byte)) return 'image/png';

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';

  return null;
}

// Turns the r2Keys a customer sends with their review into trusted
// { r2Key, url } pairs: each must be a file uploaded through the review upload
// endpoint, and not already attached to another review. URLs always come from
// our own MediaAsset rows, never from the request.
export async function resolveCustomerUploads(media) {
  const keys = [...new Set((media || []).map((m) => m.r2Key))].slice(0, MAX_REVIEW_IMAGES);
  if (keys.length === 0) return [];

  const invalid = () => {
    const err = new Error('One or more photos could not be used — please upload them again.');
    err.status = 422;
    err.code = ERROR_CODES.VALIDATION_ERROR;
    return err;
  };

  const assets = await prisma.mediaAsset.findMany({
    where: { r2Key: { in: keys }, folder: CUSTOMER_REVIEW_FOLDER },
    select: { r2Key: true, url: true },
  });
  if (assets.length !== keys.length) throw invalid();

  const [usedByReview, usedByShopReview] = await Promise.all([
    prisma.reviewMedia.count({ where: { r2Key: { in: keys } } }),
    prisma.shopProductReviewMedia.count({ where: { r2Key: { in: keys } } }),
  ]);
  if (usedByReview + usedByShopReview > 0) throw invalid();

  return assets;
}
