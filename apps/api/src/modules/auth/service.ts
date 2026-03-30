import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { loginInputSchema } from "@facility/contracts";
import { writeAuditEntry } from "../../lib/audit.js";
import { mapAuthUser, mapRole } from "../../lib/mappers.js";
import type { AuthTokenPayload } from "../../lib/auth.js";
import { AuthRepository } from "./repository.js";

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly app: FastifyInstance
  ) {}

  async login(payload: unknown) {
    const input = loginInputSchema.parse(payload);
    const user = await this.repository.findUserByEmail(input.email);

    if (!user || !user.isEnabled || user.status === "archived") {
      return null;
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      return null;
    }

    const updatedUser = await this.repository.updateLastLogin(user.id);
    const roles = updatedUser.roles.map((assignment: (typeof updatedUser.roles)[number]) => mapRole(assignment.role));
    const permissions = Array.from(new Set(roles.flatMap((role: { permissions: string[] }) => role.permissions))) as string[];

    const tokenPayload: AuthTokenPayload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      roleIds: roles.map((role: { id: string }) => role.id),
      permissions
    };

    const token = await this.app.jwt.sign(tokenPayload);

    await writeAuditEntry({
      actorUserId: updatedUser.id,
      action: "auth.login",
      entityType: "user",
      entityId: updatedUser.id,
      summary: `User ${updatedUser.email} signed in.`
    });

    return {
      token,
      user: mapAuthUser(updatedUser)
    };
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      return null;
    }

    return mapAuthUser(user);
  }
}
