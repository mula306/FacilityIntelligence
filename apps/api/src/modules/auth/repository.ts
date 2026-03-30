import { prisma } from "@facility/db";

const authUserInclude = {
  roles: {
    include: {
      role: true
    }
  }
} as const;

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: authUserInclude
    });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: authUserInclude
    });
  }

  updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date()
      },
      include: authUserInclude
    });
  }
}
