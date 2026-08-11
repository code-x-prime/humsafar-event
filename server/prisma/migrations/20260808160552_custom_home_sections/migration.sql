-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductHomeSection" (
    "productId" TEXT NOT NULL,
    "homeSectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductHomeSection_pkey" PRIMARY KEY ("productId","homeSectionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeSection_slug_key" ON "HomeSection"("slug");

-- CreateIndex
CREATE INDEX "HomeSection_isActive_position_idx" ON "HomeSection"("isActive", "position");

-- CreateIndex
CREATE INDEX "ProductHomeSection_homeSectionId_idx" ON "ProductHomeSection"("homeSectionId");

-- AddForeignKey
ALTER TABLE "ProductHomeSection" ADD CONSTRAINT "ProductHomeSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHomeSection" ADD CONSTRAINT "ProductHomeSection_homeSectionId_fkey" FOREIGN KEY ("homeSectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
