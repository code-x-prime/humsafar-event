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
