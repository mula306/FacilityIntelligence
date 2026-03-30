import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { MappingRepository } from "./repository.js";
import { MappingService } from "./service.js";

export const mappingRoutes: FastifyPluginAsync = async (app) => {
  const service = new MappingService(new MappingRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("mapping:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.getBootstrap(query.floorId) });
  });

  app.patch("/floors/:id/canvas", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({
      data: await service.updateFloorCanvas((request.params as { id: string }).id, request.body, request.user.sub)
    });
  });

  app.get("/floor-plan-versions", { preHandler: [app.authenticate, requirePermission("mapping:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.listFloorPlanVersions(query.floorId) });
  });

  app.get("/floor-plan-versions/:id", { preHandler: [app.authenticate, requirePermission("mapping:read")] }, async (request, reply) => {
    reply.send({ data: await service.getFloorPlanVersion((request.params as { id: string }).id) });
  });

  app.post("/floor-plan-versions", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createFloorPlanVersion(request.body, request.user.sub) });
  });

  app.patch("/floor-plan-versions/:id", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({
      data: await service.updateFloorPlanVersion((request.params as { id: string }).id, request.body, request.user.sub)
    });
  });

  app.post("/floor-plan-versions/:id/archive", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({
      data: await service.archiveFloorPlanVersion((request.params as { id: string }).id, request.body ?? {}, request.user.sub)
    });
  });

  app.get("/annotations", { preHandler: [app.authenticate, requirePermission("mapping:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.listAnnotations(query.floorId) });
  });

  app.get("/annotations/:id", { preHandler: [app.authenticate, requirePermission("mapping:read")] }, async (request, reply) => {
    reply.send({ data: await service.getAnnotation((request.params as { id: string }).id) });
  });

  app.post("/annotations", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createAnnotation(request.body, request.user.sub) });
  });

  app.patch("/annotations/:id", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateAnnotation((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/annotations/:id/archive", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({
      data: await service.archiveAnnotation((request.params as { id: string }).id, request.body ?? {}, request.user.sub)
    });
  });

  app.patch("/zones/:id/geometry", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateZoneGeometry((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.patch("/rooms/:id/geometry", { preHandler: [app.authenticate, requirePermission("mapping:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateRoomGeometry((request.params as { id: string }).id, request.body, request.user.sub) });
  });
};
