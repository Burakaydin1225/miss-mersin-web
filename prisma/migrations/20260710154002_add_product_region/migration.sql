-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "Product_region_isActive_sortOrder_idx" ON "Product"("region", "isActive", "sortOrder");
