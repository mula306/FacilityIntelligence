import type { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../lib/auth.js";
import { ContactsRepository } from "./repository.js";
import { ContactsService } from "./service.js";

export const contactsRoutes: FastifyPluginAsync = async (app) => {
  const service = new ContactsService(new ContactsRepository());

  app.get("/bootstrap", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (_request, reply) => {
    reply.send({ data: await service.getBootstrap() });
  });

  app.get("/contacts", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (_request, reply) => {
    reply.send({ data: await service.listContacts() });
  });

  app.get("/contacts/:id", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (request, reply) => {
    reply.send({ data: await service.getContact((request.params as { id: string }).id) });
  });

  app.post("/contacts", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createContact(request.body, request.user.sub) });
  });

  app.patch("/contacts/:id", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateContact((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/contacts/:id/archive", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveContact((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/roles", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (_request, reply) => {
    reply.send({ data: await service.listRoles() });
  });

  app.get("/roles/:id", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (request, reply) => {
    reply.send({ data: await service.getRole((request.params as { id: string }).id) });
  });

  app.post("/roles", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createRole(request.body, request.user.sub) });
  });

  app.patch("/roles/:id", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateRole((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/roles/:id/archive", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveRole((request.params as { id: string }).id, request.user.sub) });
  });

  app.get("/assignments", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (_request, reply) => {
    reply.send({ data: await service.listAssignments() });
  });

  app.get("/assignments/:id", { preHandler: [app.authenticate, requirePermission("contacts:read")] }, async (request, reply) => {
    reply.send({ data: await service.getAssignment((request.params as { id: string }).id) });
  });

  app.post("/assignments", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.status(201).send({ data: await service.createAssignment(request.body, request.user.sub) });
  });

  app.patch("/assignments/:id", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.updateAssignment((request.params as { id: string }).id, request.body, request.user.sub) });
  });

  app.post("/assignments/:id/archive", { preHandler: [app.authenticate, requirePermission("contacts:write")] }, async (request, reply) => {
    reply.send({ data: await service.archiveAssignment((request.params as { id: string }).id, request.user.sub) });
  });
};
