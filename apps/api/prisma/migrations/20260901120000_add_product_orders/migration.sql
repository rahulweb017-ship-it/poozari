CREATE TYPE "ProductOrderStatus" AS ENUM (
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TABLE "ProductOrder" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "ProductOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "productName" TEXT NOT NULL,
  "productImageUrl" TEXT,
  "unitPriceInr" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "totalAmountInr" INTEGER NOT NULL,
  "customerName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "contactEmail" TEXT,
  "addressLine" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOrder_reference_key" ON "ProductOrder"("reference");
CREATE INDEX "ProductOrder_customerId_idx" ON "ProductOrder"("customerId");
CREATE INDEX "ProductOrder_productId_idx" ON "ProductOrder"("productId");
CREATE INDEX "ProductOrder_status_idx" ON "ProductOrder"("status");

ALTER TABLE "ProductOrder"
  ADD CONSTRAINT "ProductOrder_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductOrder"
  ADD CONSTRAINT "ProductOrder_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
