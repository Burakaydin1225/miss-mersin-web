/*
  Warnings:

  - A unique constraint covering the columns `[category,sortOrder]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPaymentType" AS ENUM ('INITIAL', 'RENEWAL', 'MANUAL');

-- DropIndex
DROP INDEX "Product_category_sortOrder_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lastRenewedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionFee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProductPayment" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "SubscriptionPaymentType" NOT NULL DEFAULT 'RENEWAL',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ProductPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPayment_productId_idx" ON "ProductPayment"("productId");

-- CreateIndex
CREATE INDEX "ProductPayment_paidAt_idx" ON "ProductPayment"("paidAt");

-- CreateIndex
CREATE INDEX "ProductPayment_periodEnd_idx" ON "ProductPayment"("periodEnd");

-- CreateIndex
CREATE INDEX "ProductPayment_category_paidAt_idx" ON "ProductPayment"("category", "paidAt");

-- CreateIndex
CREATE INDEX "Product_subscriptionEndsAt_idx" ON "Product"("subscriptionEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_category_sortOrder_key" ON "Product"("category", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductPayment" ADD CONSTRAINT "ProductPayment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
