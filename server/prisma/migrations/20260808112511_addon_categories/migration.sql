-- AlterTable
ALTER TABLE "AddOn" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "imageR2Key" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AddOnCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AddOnCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddOnCategory_name_key" ON "AddOnCategory"("name");

-- CreateIndex
CREATE INDEX "AddOn_categoryId_idx" ON "AddOn"("categoryId");

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AddOnCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
