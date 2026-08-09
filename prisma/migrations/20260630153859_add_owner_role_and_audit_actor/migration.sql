-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorEmail" TEXT,
ADD COLUMN     "actorName" TEXT,
ADD COLUMN     "actorRole" "UserRole",
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
