import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import {
  canWriteProducts,
  getCurrentUser,
} from "@/lib/auth";
import {
  createR2PublicUrl,
  getR2BucketName,
  getR2Client,
} from "@/lib/r2";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const PRESIGNED_URL_DURATION_SECONDS =
  5 * 60;

type PresignRequest = {
  contentType?: unknown;
  fileSize?: unknown;
};

export async function POST(
  request: Request,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Görsel yüklemek için giriş yapmalısınız.",
        },
        {
          status: 401,
        },
      );
    }

    const canUpload =
      canWriteProducts(user.role);

    if (!canUpload) {
      return NextResponse.json(
        {
          error:
            "Görsel yükleme yetkiniz bulunmuyor.",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      (await request.json()) as PresignRequest;

    const contentType = String(
      body.contentType ?? "",
    );

    const fileSize = Number(
      body.fileSize,
    );

    if (contentType !== "image/webp") {
      return NextResponse.json(
        {
          error:
            "Yüklenen görsel WebP formatında olmalıdır.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "İşlenmiş görsel en fazla 8 MB olabilir.",
        },
        {
          status: 400,
        },
      );
    }

    const now = new Date();

    const year = String(
      now.getUTCFullYear(),
    );

    const month = String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0");

    const key =
      `products/${year}/${month}/${crypto.randomUUID()}.webp`;

    const command =
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
        ContentType: contentType,
        CacheControl:
          "public, max-age=31536000, immutable",
      });

    const uploadUrl =
      await getSignedUrl(
        getR2Client(),
        command,
        {
          expiresIn:
            PRESIGNED_URL_DURATION_SECONDS,
        },
      );

    return NextResponse.json({
      uploadUrl,
      publicUrl:
        createR2PublicUrl(key),
      key,
      expiresIn:
        PRESIGNED_URL_DURATION_SECONDS,
    });
  } catch (error) {
    console.error(
      "R2 presigned URL hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Görsel yükleme adresi oluşturulurken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}