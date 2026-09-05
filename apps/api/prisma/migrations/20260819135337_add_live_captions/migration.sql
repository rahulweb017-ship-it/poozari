-- CreateTable
CREATE TABLE "LiveCaption" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "translations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveCaption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveCaption_liveSessionId_seq_idx" ON "LiveCaption"("liveSessionId", "seq");

-- AddForeignKey
ALTER TABLE "LiveCaption" ADD CONSTRAINT "LiveCaption_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
