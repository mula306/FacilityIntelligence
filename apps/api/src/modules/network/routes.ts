import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { NetworkRepository } from "./repository.js";
import { NetworkService } from "./service.js";

export const networkRoutes: FastifyPluginAsync = async (app) => {
  const service = new NetworkService(new NetworkRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.getBootstrap(query.facilityId) });
  });

  app.get("/circuits", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listCircuits(query.facilityId) });
  });

  app.get("/circuits/:id", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    reply.send({ data: await service.getCircuit((request.params as { id: string }).id) });
  });

  app.post("/circuits", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createCircuit(request.body, request.user.sub) });
  });

  app.patch("/circuits/:id", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateCircuit((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/circuits/:id/archive", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveCircuit((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });

  app.get("/profiles", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listProfiles(query.facilityId) });
  });

  app.get("/profiles/:id", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    reply.send({ data: await service.getProfile((request.params as { id: string }).id) });
  });

  app.post("/profiles", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createProfile(request.body, request.user.sub) });
  });

  app.patch("/profiles/:id", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateProfile((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/profiles/:id/archive", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveProfile((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });

  app.get("/access-points", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listAccessPoints(query.facilityId) });
  });

  app.get("/access-points/:id", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    reply.send({ data: await service.getAccessPoint((request.params as { id: string }).id) });
  });

  app.post("/access-points", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createAccessPoint(request.body, request.user.sub) });
  });

  app.patch("/access-points/:id", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateAccessPoint((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/access-points/:id/archive", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveAccessPoint((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });

  app.get("/measurements", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string };
    reply.send({ data: await service.listMeasurements(query.facilityId) });
  });

  app.get("/measurements/:id", { preHandler: [app.authenticate, requirePermission("network:read")] }, async (request, reply) => {
    reply.send({ data: await service.getMeasurement((request.params as { id: string }).id) });
  });

  app.post("/measurements", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createMeasurement(request.body, request.user.sub) });
  });

  app.patch("/measurements/:id", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateMeasurement((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/measurements/:id/archive", { preHandler: [app.authenticate, requirePermission("network:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveMeasurement((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });
};
