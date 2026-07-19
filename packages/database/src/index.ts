import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "./generated/prisma";

function engineFileName(): string {
  if (process.platform === "win32") {
    return "query_engine-windows.dll.node";
  }
  return "libquery_engine-rhel-openssl-3.0.x.so.node";
}

function prismaEngineSearchDirs(): string[] {
  return [
    join(__dirname, "generated", "prisma"),
    join(process.cwd(), "src/generated/prisma"),
    join(process.cwd(), "apps/web/src/generated/prisma"),
    join(process.cwd(), "packages/database/src/generated/prisma"),
    join(process.cwd(), "../../packages/database/src/generated/prisma"),
  ];
}

function resolvePrismaEnginePath(): string | undefined {
  if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    return process.env.PRISMA_QUERY_ENGINE_LIBRARY;
  }

  const engineFile = engineFileName();

  for (const dir of prismaEngineSearchDirs()) {
    const candidate = join(dir, engineFile);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

const enginePath = resolvePrismaEnginePath();
if (enginePath) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

/** Bump when Prisma schema fields change so HMR/dev doesn't keep a stale client. */
const PRISMA_SCHEMA_VERSION = 2;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}

export * from "./generated/prisma";
