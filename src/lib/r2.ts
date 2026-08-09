import {
  DeleteObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { CANONICAL_R2_URL, normalizeMediaUrl } from "@/lib/media-url";

let client: S3Client | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} ortam değişkeni bulunamadı.`);
  }

  return value;
}

export function getR2Client(): S3Client {
  if (client) {
    return client;
  }

  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv(
    "R2_SECRET_ACCESS_KEY",
  );

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
}

export function getR2BucketName(): string {
  return getRequiredEnv("R2_BUCKET_NAME");
}

function getR2PublicUrl(): string {
  return CANONICAL_R2_URL;
}

export function createR2PublicUrl(key: string): string {
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${getR2PublicUrl()}/${encodedKey}`;
}

export function getR2KeyFromPublicUrl(
  fileUrl: string,
): string | null {
  try {
    const publicUrl = new URL(getR2PublicUrl());
    const candidateUrl = new URL(normalizeMediaUrl(fileUrl));

    if (candidateUrl.origin !== publicUrl.origin) {
      return null;
    }

    const basePath = publicUrl.pathname.replace(/\/+$/, "");

    let objectPath = candidateUrl.pathname;

    if (
      basePath &&
      basePath !== "/" &&
      !objectPath.startsWith(`${basePath}/`)
    ) {
      return null;
    }

    if (basePath && basePath !== "/") {
      objectPath = objectPath.slice(basePath.length);
    }

    const encodedKey = objectPath.replace(/^\/+/, "");

    if (!encodedKey) {
      return null;
    }

    return encodedKey
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch {
    return null;
  }
}

export async function deleteR2FilesByUrls(
  fileUrls: string[],
): Promise<void> {
  const keys = Array.from(
    new Set(
      fileUrls
        .map(getR2KeyFromPublicUrl)
        .filter((key): key is string => Boolean(key)),
    ),
  );

  if (keys.length === 0) {
    return;
  }

  const batchSize = 1000;

  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize);

    await getR2Client().send(
      new DeleteObjectsCommand({
        Bucket: getR2BucketName(),
        Delete: {
          Objects: batch.map((key) => ({
            Key: key,
          })),
          Quiet: true,
        },
      }),
    );
  }
}
