-- CreateTable
CREATE TABLE "ProductWhatsappButton" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'WhatsApp ile bilgi al',
    "phoneNumber" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWhatsappButton_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductWhatsappButton_productId_sortOrder_idx" ON "ProductWhatsappButton"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductWhatsappButton_isActive_idx" ON "ProductWhatsappButton"("isActive");

-- AddForeignKey
ALTER TABLE "ProductWhatsappButton" ADD CONSTRAINT "ProductWhatsappButton_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
