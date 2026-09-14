-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- AlterTable
-- Renamed rather than dropped/re-added: every existing row is a phone code and
-- stays valid under the new name, with the SMS default describing it correctly.
ALTER TABLE "OtpCode" RENAME COLUMN "phone" TO "identifier";
ALTER TABLE "OtpCode" ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'SMS';

-- DropIndex
DROP INDEX "OtpCode_phone_idx";
DROP INDEX "OtpCode_phone_createdAt_idx";

-- CreateIndex
CREATE INDEX "OtpCode_identifier_channel_idx" ON "OtpCode"("identifier", "channel");
CREATE INDEX "OtpCode_identifier_channel_createdAt_idx" ON "OtpCode"("identifier", "channel", "createdAt");
