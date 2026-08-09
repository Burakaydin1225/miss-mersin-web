-- CreateTable
CREATE TABLE "CategoryDisplaySetting" (
    "id" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "slotCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryDisplaySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryDisplaySetting_category_key" ON "CategoryDisplaySetting"("category");
