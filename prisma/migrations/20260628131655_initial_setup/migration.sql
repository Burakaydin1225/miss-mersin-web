-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'WHATSAPP_CLICK', 'HEARTBEAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "source" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "metadata" JSONB,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveSession" (
    "sessionId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "currentPath" TEXT NOT NULL,
    "productId" TEXT,
    "deviceType" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'Firma Kataloğu',
    "logoUrl" TEXT,
    "headline" TEXT NOT NULL DEFAULT 'Ürünlerimiz',
    "description" TEXT NOT NULL DEFAULT 'Detaylarını incelemek istediğiniz ürüne dokunun.',
    "whatsappNumber" TEXT NOT NULL DEFAULT '905555555555',
    "whatsappMessage" TEXT NOT NULL DEFAULT 'Merhaba, ürün hakkında bilgi almak istiyorum.',
    "primaryColor" TEXT NOT NULL DEFAULT '#171717',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "changes" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_isActive_sortOrder_idx" ON "Product"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_eventType_createdAt_idx" ON "AnalyticsEvent"("productId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorHash_createdAt_idx" ON "AnalyticsEvent"("visitorHash", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ActiveSession_lastSeenAt_idx" ON "ActiveSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "ActiveSession_productId_idx" ON "ActiveSession"("productId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
