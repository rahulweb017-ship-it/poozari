-- Separate Super Admin account activation from the pandit's availability.
ALTER TABLE "PanditProfile"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
