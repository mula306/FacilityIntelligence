import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { ReadinessRepository } from "./repository.js";
import { ReadinessService } from "./service.js";

export const readinessRoutes: FastifyPluginAsync = async (app) => {
  const service = new ReadinessService(new ReadinessRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string; buildingId?: string; floorId?: string };
    reply.send({ data: await service.getBootstrap(query.facilityId, query.buildingId, query.floorId) });
  });

  app.get("/incidents", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string; buildingId?: string; floorId?: string };
    reply.send({ data: await service.listIncidents(query.facilityId, query.buildingId, query.floorId) });
  });

  app.get("/incidents/:id", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.getIncident(params.id) });
  });

  app.post("/incidents", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createIncident(request.body, request.user.sub) });
  });

  app.patch("/incidents/:id", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.updateIncident(params.id, request.body, request.user.sub) });
  });

  app.post("/incidents/:id/archive", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.archiveIncident(params.id, request.body, request.user.sub) });
  });

  app.get("/risk-items", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string; buildingId?: string; floorId?: string };
    reply.send({ data: await service.listRiskItems(query.facilityId, query.buildingId, query.floorId) });
  });

  app.get("/risk-items/:id", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.getRiskItem(params.id) });
  });

  app.post("/risk-items", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createRiskItem(request.body, request.user.sub) });
  });

  app.patch("/risk-items/:id", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.updateRiskItem(params.id, request.body, request.user.sub) });
  });

  app.post("/risk-items/:id/archive", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.archiveRiskItem(params.id, request.body, request.user.sub) });
  });

  app.get("/readiness-scores", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const query = request.query as { facilityId?: string; buildingId?: string; floorId?: string };
    reply.send({ data: await service.listReadinessScores(query.facilityId, query.buildingId, query.floorId) });
  });

  app.get("/readiness-scores/:id", { preHandler: [app.authenticate, requirePermission("readiness:read")] }, async (request, reply) => {
    const params = request.params as { id: string };
    reply.send({ data: await service.getReadinessScore(params.id) });
  });

  app.post("/recalculate", { preHandler: [app.authenticate, requirePermission("readiness:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.recalculateReadiness(request.body, request.user.sub) });
  });
};
