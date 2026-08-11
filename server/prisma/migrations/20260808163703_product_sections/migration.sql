/*
  Warnings:

  - You are about to drop the `HomeSection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductHomeSection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductHomeSection" DROP CONSTRAINT "ProductHomeSection_homeSectionId_fkey";

-- DropForeignKey
ALTER TABLE "ProductHomeSection" DROP CONSTRAINT "ProductHomeSection_productId_fkey";

-- DropTable
DROP TABLE "HomeSection";

-- DropTable
DROP TABLE "ProductHomeSection";

-- CreateTable
CREATE TABLE "ProductSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSectionItem" (
    "productId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSectionItem_pkey" PRIMARY KEY ("productId","sectionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSection_slug_key" ON "ProductSection"("slug");

-- CreateIndex
CREATE INDEX "ProductSection_isActive_position_idx" ON "ProductSection"("isActive", "position");

-- CreateIndex
CREATE INDEX "ProductSectionItem_sectionId_idx" ON "ProductSectionItem"("sectionId");

-- AddForeignKey
ALTER TABLE "ProductSectionItem" ADD CONSTRAINT "ProductSectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSectionItem" ADD CONSTRAINT "ProductSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProductSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
