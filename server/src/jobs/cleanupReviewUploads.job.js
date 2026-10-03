import { prisma } from '../config/db.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';
import { CUSTOMER_REVIEW_FOLDER } from '../services/reviewMedia.helper.js';

// A visitor uploads review photos before the review itself is submitted, so
// photos from an abandoned form (or a rejected submission) would otherwise sit
// in the bucket forever. This removes customer review uploads that are over a
// day old and never got attached to a review.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;

export async function cleanupReviewUploads() {
  const cutoff = new Date(Date.now() - MAX_AGE_MS);

  const stale = await prisma.mediaAsset.findMany({
    where: { folder: CUSTOMER_REVIEW_FOLDER, createdAt: { lt: cutoff } },
    select: { id: true, r2Key: true },
    take: BATCH_SIZE,
  });
  if (stale.length === 0) return;

  const keys = stale.map((a) => a.r2Key);
  const [onReviews, onShopReviews] = await Promise.all([
    prisma.reviewMedia.findMany({ where: { r2Key: { in: keys } }, select: { r2Key: true } }),
    prisma.shopProductReviewMedia.findMany({ where: { r2Key: { in: keys } }, select: { r2Key: true } }),
  ]);
  const attached = new Set([...onReviews, ...onShopReviews].map((m) => m.r2Key));

  let removed = 0;
  for (const asset of stale.filter((a) => !attached.has(a.r2Key))) {
    try {
      await deleteObject(asset.r2Key);
    } catch (err) {
      // Leave the row in place so tomorrow's run retries this file.
      logger.error({ err, r2Key: asset.r2Key }, 'Failed to delete unused review upload from R2');
      continue;
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    removed += 1;
  }

  if (removed > 0) logger.info({ removed }, 'Removed unused review uploads');
}
