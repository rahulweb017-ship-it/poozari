-- Paid extras (fruits, flowers, samagri, hawan kund) selectable at checkout,
-- plus Hindi copy on the catalogue models that sit on the booking path.

-- Hindi columns. Blank means "not translated"; the English is shown instead.
ALTER TABLE "Puja"
  ADD COLUMN "titleHi" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "summaryHi" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "descriptionHi" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Package"
  ADD COLUMN "nameHi" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "descriptionHi" TEXT NOT NULL DEFAULT '';

-- The add-on catalogue.
CREATE TABLE "Addon" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameHi" TEXT NOT NULL DEFAULT '',
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "descriptionHi" TEXT NOT NULL DEFAULT '',
  "priceInr" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Addon_slug_key" ON "Addon"("slug");
CREATE INDEX "Addon_isActive_sortOrder_idx" ON "Addon"("isActive", "sortOrder");

-- What a given booking actually bought, snapshotted.
CREATE TABLE "BookingAddon" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "addonId" TEXT,
  "name" TEXT NOT NULL,
  "nameHi" TEXT NOT NULL DEFAULT '',
  "priceInr" INTEGER NOT NULL,

  CONSTRAINT "BookingAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAddon_bookingId_addonId_key" ON "BookingAddon"("bookingId", "addonId");
CREATE INDEX "BookingAddon_bookingId_idx" ON "BookingAddon"("bookingId");

ALTER TABLE "BookingAddon"
  ADD CONSTRAINT "BookingAddon_bookingId_fkey" FOREIGN KEY ("bookingId")
  REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull, not Cascade: retiring an add-on must not delete booking history.
ALTER TABLE "BookingAddon"
  ADD CONSTRAINT "BookingAddon_addonId_fkey" FOREIGN KEY ("addonId")
  REFERENCES "Addon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- `amountInr` becomes the grand total (package + add-ons), so the package
-- share has to be stored separately. Every existing booking is package-only.
ALTER TABLE "Booking" ADD COLUMN "packageAmountInr" INTEGER NOT NULL DEFAULT 0;
UPDATE "Booking" SET "packageAmountInr" = "amountInr";
