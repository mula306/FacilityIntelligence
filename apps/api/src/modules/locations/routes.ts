import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { LocationRepository } from "./repository.js";
import { LocationService } from "./service.js";

export const locationRoutes: FastifyPluginAsync = async (app) => {
  const service = new LocationService(new LocationRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (_request, reply) => {
    const data = await service.getBootstrap();
    reply.send({ data });
  });

  app.get("/facilities", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (_request, reply) => {
    reply.send({ data: await service.listFacilities() });
  });

  app.get("/facilities/:id", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    reply.send({ data: await service.getFacility((request.params as { id: string }).id) });
  });

  app.post("/facilities", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createFacility(request.body, request.user.sub) });
  });

  app.patch("/facilities/:id", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateFacility((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/facilities/:id/archive", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveFacility((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/buildings", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listBuildings(query.facilityId) });
  });

  app.get("/buildings/:id", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    reply.send({ data: await service.getBuilding((request.params as { id: string }).id) });
  });

  app.post("/buildings", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createBuilding(request.body, request.user.sub) });
  });

  app.patch("/buildings/:id", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateBuilding((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/buildings/:id/archive", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveBuilding((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/floors", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    const query = request.query as { buildingId?: string };
    reply.send({ data: await service.listFloors(query.buildingId) });
  });

  app.get("/floors/:id", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    reply.send({ data: await service.getFloor((request.params as { id: string }).id) });
  });

  app.post("/floors", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createFloor(request.body, request.user.sub) });
  });

  app.patch("/floors/:id", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateFloor((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/floors/:id/archive", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveFloor((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/zones", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.listZones(query.floorId) });
  });

  app.get("/zones/:id", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    reply.send({ data: await service.getZone((request.params as { id: string }).id) });
  });

  app.post("/zones", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createZone(request.body, request.user.sub) });
  });

  app.patch("/zones/:id", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateZone((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/zones/:id/archive", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveZone((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/rooms", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.listRooms(query.floorId) });
  });

  app.get("/rooms/:id", { preHandler: [app.authenticate, requirePermission("location:read")] }, async (request, reply) => {
    reply.send({ data: await service.getRoom((request.params as { id: string }).id) });
  });

  app.post("/rooms", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createRoom(request.body, request.user.sub) });
  });

  app.patch("/rooms/:id", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateRoom((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/rooms/:id/archive", { preHandler: [app.authenticate, requirePermission("location:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveRoom((request.params as { id: string }).id, request.user.sub) });
  });
};
