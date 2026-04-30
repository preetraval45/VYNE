// Prisma client singleton — avoids the dev-mode "Too many clients"
// issue caused by Next.js HMR creating new instances on every reload.
//
// Production (Vercel serverless) creates one per cold-start, which is
// fine because we use the pooled connection (POSTGRES_PRISMA_URL).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
