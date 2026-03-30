import { PrismaClient } from "@prisma/client";

declare global {
  var facilityPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.facilityPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.facilityPrisma = prisma;
}

export { Prisma, PrismaClient } from "@prisma/client";
