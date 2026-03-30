import { prisma } from "@facility/db";

export async function writeAuditEntry(input: {
  actorUserId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null | undefined;
  summary: string;
  beforeState?: Record<string, unknown> | null | undefined;
  afterState?: Record<string, unknown> | null | undefined;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      beforeStateJson: input.beforeState ? JSON.stringify(input.beforeState) : null,
      afterStateJson: input.afterState ? JSON.stringify(input.afterState) : null
    }
  });
}
