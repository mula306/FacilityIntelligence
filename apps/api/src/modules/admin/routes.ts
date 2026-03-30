import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { AdminRepository } from "./repository.js";
import { AdminService } from "./service.js";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const service = new AdminService(new AdminRepository());

  app.get("/users", { preHandler: [app.authenticate, requirePermission("platform:*")] }, async (_request, reply) => {
    const data = await service.getUsers();
    reply.send({ data });
  });

  app.get("/roles", { preHandler: [app.authenticate, requirePermission("platform:*")] }, async (_request, reply) => {
    const data = await service.getRoles();
    reply.send({ data });
  });

  app.get("/audit-logs", { preHandler: [app.authenticate, requirePermission("audit:read")] }, async (request, reply) => {
    const data = await service.getAuditLogs(request.query);
    reply.send(data);
  });
};
