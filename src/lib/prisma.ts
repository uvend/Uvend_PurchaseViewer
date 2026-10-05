import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);
  let sslMode: string | null = null;

  try {
    sslMode = new URL(databaseUrl).searchParams.get("sslmode");
  } catch {
    sslMode = /[?&]sslmode=([^&]+)/.exec(databaseUrl)?.[1] ?? null;
  }
  const useSsl =
    sslMode === "require" ||
    sslMode === "verify-ca" ||
    sslMode === "verify-full" ||
    (!isLocalhost && process.env.NODE_ENV === "production" && process.env.DATABASE_SSL !== "disable");

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    ssl: useSsl
      ? {
          rejectUnauthorized: sslMode === "verify-ca" || sslMode === "verify-full",
        }
      : undefined,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
