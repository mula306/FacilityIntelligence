import type { FastifyPluginAsync } from "fastify";
import { AuthRepository } from "./repository.js";
import { AuthService } from "./service.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService(new AuthRepository(), app);

  app.post("/login", async (request, reply) => {
    const response = await service.login(request.body);

    if (!response) {
      reply.status(401).send({
        message: "Invalid credentials."
      });
      return;
    }

    reply.send(response);
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const response = await service.getAuthenticatedUser(request.user.sub);

    if (!response) {
      reply.status(404).send({
        message: "User not found."
      });
      return;
    }

    reply.send({
      data: response
    });
  });
};
