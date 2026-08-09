-- CreateTable
CREATE TABLE "DailyAnalytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyAnalytics_date_eventType_idx" ON "DailyAnalytics"("date", "eventType");

-- CreateIndex
CREATE INDEX "DailyAnalytics_productId_date_idx" ON "DailyAnalytics"("productId", "date");

-- CreateIndex
CREATE INDEX "DailyAnalytics_scopeKey_date_idx" ON "DailyAnalytics"("scopeKey", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnalytics_date_eventType_scopeKey_key" ON "DailyAnalytics"("date", "eventType", "scopeKey");
