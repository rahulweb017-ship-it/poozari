-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "PanditProfile" ADD COLUMN     "commissionPercent" INTEGER;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PanditEarning" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "panditId" TEXT NOT NULL,
    "bookingAmountInr" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "earningInr" INTEGER NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "settlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanditEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "panditId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalInr" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanditEarning_bookingId_key" ON "PanditEarning"("bookingId");

-- CreateIndex
CREATE INDEX "PanditEarning_panditId_createdAt_idx" ON "PanditEarning"("panditId", "createdAt");

-- CreateIndex
CREATE INDEX "PanditEarning_status_idx" ON "PanditEarning"("status");

-- CreateIndex
CREATE INDEX "PanditEarning_settlementId_idx" ON "PanditEarning"("settlementId");

-- CreateIndex
CREATE INDEX "Settlement_panditId_periodStart_idx" ON "Settlement"("panditId", "periodStart");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- AddForeignKey
ALTER TABLE "PanditEarning" ADD CONSTRAINT "PanditEarning_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanditEarning" ADD CONSTRAINT "PanditEarning_panditId_fkey" FOREIGN KEY ("panditId") REFERENCES "PanditProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanditEarning" ADD CONSTRAINT "PanditEarning_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_panditId_fkey" FOREIGN KEY ("panditId") REFERENCES "PanditProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
