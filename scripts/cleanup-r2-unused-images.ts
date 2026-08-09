import "dotenv/config";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

import prisma from "../src/lib/prisma";
import {
  getR2BucketName,
  getR2Client,
  getR2KeyFromPublicUrl,
} from "../src/lib/r2";

const PRODUCT_PREFIX = "products/";
const DELETE_BATCH_SIZE = 1000;

type R2Object = {
  key: string;
  size: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function isProductVisible(
  product: {
    isActive: boolean;
    subscriptionEndsAt: Date | null;
  },
  now: Date,
): boolean {
  if (!product.isActive) {
    return false;
  }

  if (!product.subscriptionEndsAt) {
    return true;
  }

  return product.subscriptionEndsAt.getTime() > now.getTime();
}

function addUrlKey(
  keys: Set<string>,
  fileUrl: string | null | undefined,
): void {
  if (!fileUrl) {
    return;
  }

  const key = getR2KeyFromPublicUrl(fileUrl);

  if (key?.startsWith(PRODUCT_PREFIX)) {
    keys.add(key);
  }
}

async function listR2ProductObjects(): Promise<R2Object[]> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PRODUCT_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith("/")) {
        continue;
      }

      objects.push({
        key: object.Key,
        size: object.Size ?? 0,
      });
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

function printObjects(
  title: string,
  objects: R2Object[],
): void {
  const totalSize = objects.reduce(
    (sum, object) => sum + object.size,
    0,
  );

  console.log(
    `\n${title}: ${objects.length} dosya / ${formatBytes(totalSize)}`,
  );

  for (const object of objects) {
    console.log(
      `  ${object.key} (${formatBytes(object.size)})`,
    );
  }
}

async function deleteObjects(
  objects: R2Object[],
): Promise<void> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  for (
    let index = 0;
    index < objects.length;
    index += DELETE_BATCH_SIZE
  ) {
    const batch = objects.slice(
      index,
      index + DELETE_BATCH_SIZE,
    );

    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((object) => ({
            Key: object.key,
          })),
          Quiet: true,
        },
      }),
    );
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const includeInactive = process.argv.includes(
    "--include-inactive",
  );

  const now = new Date();

  const products = await prisma.product.findMany({
    select: {
      isActive: true,
      subscriptionEndsAt: true,
      coverImage: true,
      images: {
        select: {
          imageUrl: true,
        },
      },
    },
  });

  const allReferencedKeys = new Set<string>();
  const activeReferencedKeys = new Set<string>();

  for (const product of products) {
    const productKeys = new Set<string>();

    addUrlKey(productKeys, product.coverImage);

    for (const image of product.images) {
      addUrlKey(productKeys, image.imageUrl);
    }

    for (const key of productKeys) {
      allReferencedKeys.add(key);
    }

    if (isProductVisible(product, now)) {
      for (const key of productKeys) {
        activeReferencedKeys.add(key);
      }
    }
  }

  const r2Objects = await listR2ProductObjects();

  const activeObjects = r2Objects.filter((object) =>
    activeReferencedKeys.has(object.key),
  );

  const inactiveObjects = r2Objects.filter(
    (object) =>
      allReferencedKeys.has(object.key) &&
      !activeReferencedKeys.has(object.key),
  );

  const unreferencedObjects = r2Objects.filter(
    (object) => !allReferencedKeys.has(object.key),
  );

  console.log(
    apply
      ? "APPLY modu seçildi."
      : "DRY-RUN modu: hiçbir dosya silinmeyecek.",
  );

  console.log(`Veritabanındaki ilan: ${products.length}`);
  console.log(`R2 products/ dosyası: ${r2Objects.length}`);

  printObjects(
    "Aktif ilanlar tarafından kullanılan",
    activeObjects,
  );

  printObjects(
    "Pasif veya süresi dolmuş ilanlara bağlı",
    inactiveObjects,
  );

  printObjects(
    "Veritabanında hiçbir ilana bağlı olmayan gerçek yetimler",
    unreferencedObjects,
  );

  const deleteCandidates = includeInactive
    ? [...unreferencedObjects, ...inactiveObjects]
    : unreferencedObjects;

  const deleteSize = deleteCandidates.reduce(
    (sum, object) => sum + object.size,
    0,
  );

  console.log("\nSilme özeti");
  console.log(
    `  Seçilen dosya: ${deleteCandidates.length}`,
  );
  console.log(`  Boşalacak alan: ${formatBytes(deleteSize)}`);
  console.log(
    `  Pasif ilanlar dahil: ${includeInactive ? "Evet" : "Hayır"}`,
  );

  if (!apply) {
    console.log(
      "\nBu yalnızca rapordur; R2 üzerinde değişiklik yapılmadı.",
    );

    console.log(
      includeInactive
        ? "Gerçek silme için aynı komuta --apply ekleyin."
        : "Yalnızca gerçek yetimleri silmek için --apply kullanın.",
    );

    return;
  }

  if (deleteCandidates.length === 0) {
    console.log("\nSilinecek dosya bulunamadı.");
    return;
  }

  await deleteObjects(deleteCandidates);

  console.log(
    `\n${deleteCandidates.length} dosya R2 üzerinden kalıcı olarak silindi.`,
  );
}

main()
  .catch((error) => {
    console.error("Temizlik scripti durduruldu:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });