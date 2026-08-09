import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getRequiredEnv } from "./env";
import { normalizeMediaUrl } from "./media-url";

const connectionString = getRequiredEnv("DATABASE_URL");

function createPrismaClient(): PrismaClient {
  const extendedClient = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  }).$extends({
    result: {
      product: {
        coverImage: {
          needs: { coverImage: true },
          compute(product) {
            return normalizeMediaUrl(product.coverImage);
          },
        },
      },
      productImage: {
        imageUrl: {
          needs: { imageUrl: true },
          compute(image) {
            return normalizeMediaUrl(image.imageUrl);
          },
        },
      },
    },
  });

  // Computed result alanları istemcinin çalışma anındaki dönüş değerlerini
  // değiştirir; mevcut transaction yardımcılarının PrismaClient tipi korunur.
  return extendedClient as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
