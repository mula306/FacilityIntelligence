import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { registerAuthHelpers } from "./lib/auth.js";
import { DomainError } from "./lib/domain-error.js";
import { authRoutes } from "./modules/auth/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { contactsRoutes } from "./modules/contacts/routes.js";
import { coverageRoutes } from "./modules/coverage/routes.js";
import { hoursRoutes } from "./modules/hours/routes.js";
import { inventoryRoutes } from "./modules/inventory/routes.js";
import { locationRoutes } from "./modules/locations/routes.js";
import { mappingRoutes } from "./modules/mapping/routes.js";
import { networkRoutes } from "./modules/network/routes.js";
import { readinessRoutes } from "./modules/readiness/routes.js";
import { wifiRoutes } from "./modules/wifi/routes.js";

export function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  app.register(cors, {
    origin: true
  });

  app.register(jwt, {
    secret: env.JWT_SECRET
  });

  registerAuthHelpers(app);

  app.get("/health", async () => ({
    status: "ok"
  }));

  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(adminRoutes, { prefix: "/api/admin" });
  app.register(coverageRoutes, { prefix: "/api/coverage" });
  app.register(hoursRoutes, { prefix: "/api/hours" });
  app.register(contactsRoutes, { prefix: "/api/contacts" });
  app.register(inventoryRoutes, { prefix: "/api/inventory" });
  app.register(networkRoutes, { prefix: "/api/network" });
  app.register(locationRoutes, { prefix: "/api/locations" });
  app.register(mappingRoutes, { prefix: "/api/mapping" });
  app.register(readinessRoutes, { prefix: "/api/readiness" });
  app.register(wifiRoutes, { prefix: "/api/wifi" });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        message: "Validation failed.",
        issues: error.flatten()
      });
      return;
    }

    if (error instanceof DomainError) {
      reply.status(error.statusCode).send({
        message: error.message
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      message: "An unexpected error occurred."
    });
  });

  return app;
}
