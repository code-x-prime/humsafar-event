-- Guest reviews: a review can now be submitted without logging in, so the
-- owning user is optional. Only the NOT NULL is dropped — existing rows and
-- the foreign keys are untouched.

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
-- The Shop With Us tables were created outside the migration history, so guard
-- this in case the table is not present in the target database.
DO $$
BEGIN
  IF to_regclass('"ShopProductReview"') IS NOT NULL THEN
    ALTER TABLE "ShopProductReview" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END
$$;
