import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { HoursRepository } from "./repository.js";
import { HoursService } from "./service.js";

export const hoursRoutes: FastifyPluginAsync = async (app) => {
  const service = new HoursService(new HoursRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("hours:read")] }, async (_request, reply) => {
    reply.send({ data: await service.getBootstrap() });
  });

  app.get("/service-areas", { preHandler: [app.authenticate, requirePermission("hours:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listServiceAreas(query.facilityId) });
  });

  app.get("/service-areas/:id", { preHandler: [app.authenticate, requirePermission("hours:read")] }, async (request, reply) => {
    reply.send({ data: await service.getServiceArea((request.params as { id: string }).id) });
  });

  app.post("/service-areas", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createServiceArea(request.body, request.user.sub) });
  });

  app.patch("/service-areas/:id", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateServiceArea((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/service-areas/:id/archive", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveServiceArea((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/hours", { preHandler: [app.authenticate, requirePermission("hours:read")] }, async (request, reply) => {
    const query = request.query as { serviceAreaId?: string; facilityId?: string };
    reply.send({ data: await service.listHours(query.serviceAreaId, query.facilityId) });
  });

  app.get("/hours/:id", { preHandler: [app.authenticate, requirePermission("hours:read")] }, async (request, reply) => {
    reply.send({ data: await service.getHours((request.params as { id: string }).id) });
  });

  app.post("/hours", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createHours(request.body, request.user.sub) });
  });

  app.patch("/hours/:id", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateHours((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/hours/:id/archive", { preHandler: [app.authenticate, requirePermission("hours:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveHours((request.params as { id: string }).id, request.user.sub) });
  });
};
