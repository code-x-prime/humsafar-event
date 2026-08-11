/*
  Warnings:

  - You are about to drop the column `image` on the `HomeBanner` table. All the data in the column will be lost.
  - You are about to drop the column `imageR2Key` on the `HomeBanner` table. All the data in the column will be lost.
  - Added the required column `desktopImage` to the `HomeBanner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HomeBanner" DROP COLUMN "image",
DROP COLUMN "imageR2Key",
ADD COLUMN     "desktopImage" TEXT NOT NULL,
ADD COLUMN     "desktopImageR2Key" TEXT,
ADD COLUMN     "mobileImage" TEXT,
ADD COLUMN     "mobileImageR2Key" TEXT,
ALTER COLUMN "heading" DROP NOT NULL;
