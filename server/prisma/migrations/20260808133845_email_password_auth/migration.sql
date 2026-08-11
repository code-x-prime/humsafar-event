-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Otp_email_idx" ON "Otp"("email");
