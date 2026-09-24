-- Product gallery and video. Existing products start with their cover image
-- as the only gallery image.
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "videoUrl" TEXT;

UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';
