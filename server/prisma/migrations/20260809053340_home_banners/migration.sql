-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageR2Key" TEXT,
    "heading" TEXT NOT NULL,
    "subtitle" TEXT,
    "buttonText" TEXT,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeBanner_isActive_position_idx" ON "HomeBanner"("isActive", "position");
