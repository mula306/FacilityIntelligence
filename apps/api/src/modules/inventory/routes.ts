import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { InventoryRepository } from "./repository.js";
import { InventoryService } from "./service.js";

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  const service = new InventoryService(new InventoryRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("inventory:read")] }, async (_request, reply) => {
    reply.send({ data: await service.getBootstrap() });
  });

  app.get("/device-types", { preHandler: [app.authenticate, requirePermission("inventory:read")] }, async (_request, reply) => {
    reply.send({ data: await service.listDeviceTypes() });
  });

  app.get("/device-types/:id", { preHandler: [app.authenticate, requirePermission("inventory:read")] }, async (request, reply) => {
    reply.send({ data: await service.getDeviceType((request.params as { id: string }).id) });
  });

  app.post("/device-types", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createDeviceType(request.body, request.user.sub) });
  });

  app.patch("/device-types/:id", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateDeviceType((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/device-types/:id/archive", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveDeviceType((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/devices", { preHandler: [app.authenticate, requirePermission("inventory:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listDevices(query.facilityId) });
  });

  app.get("/devices/:id", { preHandler: [app.authenticate, requirePermission("inventory:read")] }, async (request, reply) => {
    reply.send({ data: await service.getDevice((request.params as { id: string }).id) });
  });

  app.post("/devices", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createDevice(request.body, request.user.sub) });
  });

  app.patch("/devices/:id", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateDevice((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/devices/:id/archive", { preHandler: [app.authenticate, requirePermission("inventory:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveDevice((request.params as { id: string }).id, request.user.sub) });
  });
};
