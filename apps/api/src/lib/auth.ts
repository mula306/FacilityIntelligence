import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { hasPermission } from "./permissions.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  displayName: string;
  roleIds: string[];
  permissions: string[];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
  }
}

export function registerAuthHelpers(app: FastifyInstance) {
  app.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        await request.jwtVerify<AuthTokenPayload>();
      } catch {
        reply.status(401).send({ message: "Authentication is required." });
      }
    }
  );
}

export function requirePermission(permission: string): preHandlerHookHandler {
  return async function authorize(request, reply): Promise<void> {
    const authUser = request.user as AuthTokenPayload | undefined;

    if (!authUser) {
      reply.status(401).send({ message: "Authentication is required." });
      return;
    }

    if (!hasPermission(authUser.permissions, permission)) {
      reply.status(403).send({ message: `Missing permission: ${permission}` });
    }
  };
}
