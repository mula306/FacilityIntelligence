import { prisma } from "@facility/db";

const userInclude = {
  roles: {
    include: {
      role: true
    }
  }
} as const;

export class AdminRepository {
  listUsers() {
    return prisma.user.findMany({
      include: userInclude,
      orderBy: {
        displayName: "asc"
      }
    });
  }

  listRoles() {
    return prisma.role.findMany({
      orderBy: {
        name: "asc"
      }
    });
  }

  async listAuditLogs(page: number, pageSize: number) {
    const [total, data] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return { total, data };
  }
}
