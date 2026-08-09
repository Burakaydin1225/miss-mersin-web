-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('VIP', 'PREMIUM', 'GOLD');

-- DropIndex
DROP INDEX "Product_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'VIP',
ALTER COLUMN "sortOrder" SET DEFAULT 1;

-- CreateIndex
CREATE INDEX "Product_category_isActive_sortOrder_idx" ON "Product"("category", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_category_sortOrder_idx" ON "Product"("category", "sortOrder");
