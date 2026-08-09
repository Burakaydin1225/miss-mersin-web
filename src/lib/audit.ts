import {
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

type AuditActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type WriteAuditLogInput = {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  changes?: Prisma.InputJsonValue;
  client?: Prisma.TransactionClient;
};

export async function writeAuditLog({
  actor,
  action,
  entityType,
  entityId,
  description,
  changes,
  client,
}: WriteAuditLogInput): Promise<void> {
  const database = client ?? prisma;

  await database.auditLog.create({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      description,

      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,

      userId: actor.id,

      ...(changes !== undefined
        ? {
            changes,
          }
        : {}),
    },
  });
}