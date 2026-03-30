import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { WifiRepository } from "./repository.js";
import { WifiService } from "./service.js";

export const wifiRoutes: FastifyPluginAsync = async (app) => {
  const service = new WifiService(new WifiRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("wifi:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.getBootstrap(query.floorId) });
  });

  app.get("/sessions", { preHandler: [app.authenticate, requirePermission("wifi:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string };
    reply.send({ data: await service.listSessions(query.floorId) });
  });

  app.get("/sessions/:id", { preHandler: [app.authenticate, requirePermission("wifi:read")] }, async (request, reply) => {
    reply.send({ data: await service.getSession((request.params as { id: string }).id) });
  });

  app.post("/sessions", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createSession(request.body, request.user.sub) });
  });

  app.patch("/sessions/:id", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateSession((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/sessions/:id/archive", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveSession((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });

  app.get("/samples", { preHandler: [app.authenticate, requirePermission("wifi:read")] }, async (request, reply) => {
    const query = request.query as { floorId?: string; wifiScanSessionId?: string };
    reply.send({ data: await service.listSamples(query.floorId, query.wifiScanSessionId) });
  });

  app.get("/samples/:id", { preHandler: [app.authenticate, requirePermission("wifi:read")] }, async (request, reply) => {
    reply.send({ data: await service.getSample((request.params as { id: string }).id) });
  });

  app.post("/samples", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createSample(request.body, request.user.sub) });
  });

  app.patch("/samples/:id", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateSample((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/samples/:id/archive", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveSample((request.params as { id: string }).id, request.body ?? {}, request.user.sub) });
  });

  app.post("/samples/import", { preHandler: [app.authenticate, requirePermission("wifi:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.importSamples(request.body, request.user.sub) });
  });
};
