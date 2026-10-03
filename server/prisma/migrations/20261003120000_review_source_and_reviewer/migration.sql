-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('CUSTOMER', 'ADMIN');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reviewerCity" TEXT,
ADD COLUMN     "reviewerName" TEXT,
ADD COLUMN     "source" "ReviewSource" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "ShopProductReview" ADD COLUMN     "reviewerCity" TEXT,
ADD COLUMN     "reviewerName" TEXT,
ADD COLUMN     "source" "ReviewSource" NOT NULL DEFAULT 'CUSTOMER';
