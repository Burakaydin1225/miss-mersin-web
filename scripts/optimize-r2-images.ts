import "dotenv/config";

import {
  CopyObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const PRODUCT_PREFIX = "products/";
const TARGET_SIZE = 350 * 1024;
const MAX_LONGEST_SIDE = 1600;
const MIN_LONGEST_SIDE = 720;
const RESIZE_STEP = 0.82;
const WEBP_QUALITIES = [72, 64, 56, 48] as const;
const CACHE_CONTROL =
  "public, max-age=31536000, immutable";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} ortam değişkeni bulunamadı.`);
  }

  return value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function parseLimit(): number | undefined {
  const argument = process.argv.find((value) =>
    value.startsWith("--limit="),
  );

  if (!argument) {
    return undefined;
  }

  const value = Number(argument.slice("--limit=".length));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--limit pozitif bir tam sayı olmalıdır.");
  }

  return value;
}

function createClient(): S3Client {
  const accountId = requiredEnv("R2_ACCOUNT_ID");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

async function listProductKeys(
  client: S3Client,
  bucket: string,
  limit?: number,
): Promise<string[]> {
  const keys: string[] = [];
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
      const key = object.Key;

      if (!key || !key.toLowerCase().endsWith(".webp")) {
        continue;
      }

      keys.push(key);

      if (limit && keys.length >= limit) {
        return keys;
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function downloadObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Buffer> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("R2 nesnesinin gövdesi boş döndü.");
  }

  return Buffer.from(
    await response.Body.transformToByteArray(),
  );
}

type OptimizedImage = {
  buffer: Buffer;
  width?: number;
  height?: number;
  changed: boolean;
};

async function optimizeImage(
  input: Buffer,
): Promise<OptimizedImage> {
  const sourceMetadata = await sharp(input).metadata();

  const sourceWidth = sourceMetadata.width ?? 0;
  const sourceHeight = sourceMetadata.height ?? 0;
  const sourceLongestSide = Math.max(
    sourceWidth,
    sourceHeight,
  );

  if (
    input.length <= TARGET_SIZE &&
    sourceLongestSide <= MAX_LONGEST_SIDE
  ) {
    return {
      buffer: input,
      width: sourceWidth || undefined,
      height: sourceHeight || undefined,
      changed: false,
    };
  }

  let longestSide = Math.min(
    MAX_LONGEST_SIDE,
    sourceLongestSide || MAX_LONGEST_SIDE,
  );

  let bestBuffer: Buffer | undefined;
  let bestWidth: number | undefined;
  let bestHeight: number | undefined;

  while (true) {
    for (const quality of WEBP_QUALITIES) {
      const candidate = await sharp(input)
        .rotate()
        .resize({
          width: longestSide,
          height: longestSide,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 5,
        })
        .toBuffer();

      const candidateMetadata = await sharp(
        candidate,
      ).metadata();

      bestBuffer = candidate;
      bestWidth = candidateMetadata.width;
      bestHeight = candidateMetadata.height;

      if (candidate.length <= TARGET_SIZE) {
        return {
          buffer: candidate,
          width: bestWidth,
          height: bestHeight,
          changed: !candidate.equals(input),
        };
      }
    }

    if (longestSide <= MIN_LONGEST_SIDE) {
      break;
    }

    longestSide = Math.max(
      MIN_LONGEST_SIDE,
      Math.round(longestSide * RESIZE_STEP),
    );
  }

  if (!bestBuffer) {
    throw new Error("Optimize edilmiş görsel üretilemedi.");
  }

  return {
    buffer: bestBuffer,
    width: bestWidth,
    height: bestHeight,
    changed: !bestBuffer.equals(input),
  };
}

function createCopySource(
  bucket: string,
  key: string,
): string {
  return encodeURIComponent(`${bucket}/${key}`).replace(
    /%2F/g,
    "/",
  );
}

async function backupAndReplace(
  client: S3Client,
  bucket: string,
  key: string,
  backupPrefix: string,
  optimizedBuffer: Buffer,
): Promise<void> {
  const backupKey = `${backupPrefix}/${key}`;

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: backupKey,
      CopySource: createCopySource(bucket, key),
      ContentType: "image/webp",
      MetadataDirective: "COPY",
    }),
  );

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimizedBuffer,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL,
    }),
  );
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const limit = parseLimit();
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const client = createClient();

  const runId = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPrefix =
    `backups/products-before-optimization/${runId}`;

  console.log(
    apply
      ? "APPLY modu: dosyalar yedeklenip güncellenecek."
      : "DRY-RUN modu: R2 üzerinde değişiklik yapılmayacak.",
  );

  const keys = await listProductKeys(
    client,
    bucket,
    limit,
  );

  console.log(`${keys.length} WebP dosyası bulundu.\n`);

  let originalTotal = 0;
  let optimizedTotal = 0;
  let succeeded = 0;
  let failed = 0;

  for (const [index, key] of keys.entries()) {
    try {
      const input = await downloadObject(
        client,
        bucket,
        key,
      );

      const sourceMetadata = await sharp(input).metadata();
      const optimized = await optimizeImage(input);

      originalTotal += input.length;
      optimizedTotal += optimized.buffer.length;

      const saving =
        input.length > 0
          ? ((input.length - optimized.buffer.length) /
              input.length) *
            100
          : 0;

      console.log(`[${index + 1}/${keys.length}] ${key}`);
      console.log(
        `  Önce: ${formatBytes(input.length)} ` +
          `${sourceMetadata.width ?? "?"}x${sourceMetadata.height ?? "?"}`,
      );
      console.log(
        `  Sonra: ${formatBytes(optimized.buffer.length)} ` +
          `${optimized.width ?? "?"}x${optimized.height ?? "?"}`,
      );
      console.log(`  Kazanç: %${saving.toFixed(1)}`);

      if (apply) {
        await backupAndReplace(
          client,
          bucket,
          key,
          backupPrefix,
          optimized.buffer,
        );

        console.log("  Durum: yedeklendi ve güncellendi");
      } else {
        console.log("  Durum: yalnızca analiz edildi");
      }

      console.log();
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error(`[HATA] ${key}`);
      console.error(
        error instanceof Error ? error.message : error,
      );
      console.error();
    }
  }

  const totalSaving =
    originalTotal > 0
      ? ((originalTotal - optimizedTotal) /
          originalTotal) *
        100
      : 0;

  console.log("Özet");
  console.log(`  Başarılı: ${succeeded}`);
  console.log(`  Hatalı: ${failed}`);
  console.log(`  Önce: ${formatBytes(originalTotal)}`);
  console.log(`  Sonra: ${formatBytes(optimizedTotal)}`);
  console.log(`  Toplam kazanç: %${totalSaving.toFixed(1)}`);

  if (!apply) {
    console.log(
      "\nSonuçlar uygunsa gerçek işlem için --apply kullanın.",
    );
  } else {
    console.log(`\nYedek klasörü: ${backupPrefix}`);
  }
}

main().catch((error) => {
  console.error("Script durduruldu:", error);
  process.exitCode = 1;
});