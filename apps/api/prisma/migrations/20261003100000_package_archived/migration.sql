-- Packages that bookings reference can no longer be deleted when a puja is
-- edited; they are archived instead.
ALTER TABLE "Package" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
