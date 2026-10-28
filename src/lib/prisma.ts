import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as {
  prismaPool?: Pool;
  prismaClient?: PrismaClient;
};

function normalizeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      allowExitOnIdle: true,
    });

  pool.on("error", (error) => {
    console.error("Database pool error", error);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
  }

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

export const prisma = globalForPrisma.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = prisma;
}
