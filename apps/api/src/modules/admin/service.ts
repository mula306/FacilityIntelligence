import { paginationQuerySchema } from "@facility/contracts";
import { mapAuditLog, mapAuthUser, mapRole } from "../../lib/mappers.js";
import { AdminRepository } from "./repository.js";

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  async getUsers() {
    const users = await this.repository.listUsers();
    return users.map((user: (typeof users)[number]) => mapAuthUser(user));
  }

  async getRoles() {
    const roles = await this.repository.listRoles();
    return roles.map((role: (typeof roles)[number]) => mapRole(role));
  }

  async getAuditLogs(query: unknown) {
    const pagination = paginationQuerySchema.parse(query);
    const { total, data } = await this.repository.listAuditLogs(pagination.page, pagination.pageSize);

    return {
      data: data.map((entry: (typeof data)[number]) => mapAuditLog(entry)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize))
      }
    };
  }
}
