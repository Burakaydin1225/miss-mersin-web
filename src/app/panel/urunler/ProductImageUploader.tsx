"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  useEffect,
  useState,
} from "react";

type ProductImageUploaderProps = {
  defaultCoverImage?: string;
  defaultExtraImages?: string[];
  onUploadingChange?: (uploading: boolean) => void;
};

type PresignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

const MAX_SOURCE_FILE_SIZE = 25 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 8 * 1024 * 1024;
const TARGET_OUTPUT_SIZE = 450 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const MIN_IMAGE_DIMENSION = 720;
const MAX_EXTRA_IMAGES = 15;

const WEBP_QUALITY_LEVELS = [
  0.72,
  0.64,
  0.56,
  0.48,
] as const;

const RESIZE_STEP = 0.82;
const IMMUTABLE_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

const SUPPORTED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = document.createElement("img");

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(`"${file.name}" görseli okunamadı.`),
      );
    };

    image.src = objectUrl;
  });
}

async function optimizeImage(file: File): Promise<File> {
  if (!SUPPORTED_SOURCE_TYPES.has(file.type)) {
    throw new Error(
      `"${file.name}" desteklenmeyen bir görsel formatında.`,
    );
  }

  if (file.size <= 0) {
    throw new Error(`"${file.name}" dosyası boş.`);
  }

  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error(
      `"${file.name}" 25 MB kaynak dosya sınırını aşıyor.`,
    );
  }

  const image = await loadImage(file);

  const longestSide = Math.max(
    image.naturalWidth,
    image.naturalHeight,
  );

  const scale =
    longestSide > MAX_IMAGE_DIMENSION
      ? MAX_IMAGE_DIMENSION / longestSide
      : 1;

  const width = Math.max(
    1,
    Math.round(image.naturalWidth * scale),
  );

  const height = Math.max(
    1,
    Math.round(image.naturalHeight * scale),
  );

  async function createWebpBlob(
    outputWidth: number,
    outputHeight: number,
    quality: number,
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Görsel işleme alanı oluşturulamadı.",
      );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(
              new Error(
                "Görsel WebP formatına çevrilemedi.",
              ),
            );
            return;
          }

          resolve(result);
        },
        "image/webp",
        quality,
      );
    });
  }

  let outputWidth = width;
  let outputHeight = height;
  let blob: Blob | undefined;

  while (true) {
    for (const quality of WEBP_QUALITY_LEVELS) {
      blob = await createWebpBlob(
        outputWidth,
        outputHeight,
        quality,
      );

      if (blob.size <= TARGET_OUTPUT_SIZE) {
        break;
      }
    }

    if (!blob) {
      throw new Error(
        "Görsel WebP formatına çevrilemedi.",
      );
    }

    if (
      blob.size <= TARGET_OUTPUT_SIZE ||
      Math.max(outputWidth, outputHeight) <=
        MIN_IMAGE_DIMENSION
    ) {
      break;
    }

    const currentLongestSide = Math.max(
      outputWidth,
      outputHeight,
    );

    const nextLongestSide = Math.max(
      MIN_IMAGE_DIMENSION,
      Math.round(currentLongestSide * RESIZE_STEP),
    );

    const resizeScale =
      nextLongestSide / currentLongestSide;

    outputWidth = Math.max(
      1,
      Math.round(outputWidth * resizeScale),
    );

    outputHeight = Math.max(
      1,
      Math.round(outputHeight * resizeScale),
    );
  }

  if (!blob) {
    throw new Error("Görsel WebP formatına çevrilemedi.");
  }

  if (blob.size > MAX_OUTPUT_SIZE) {
    throw new Error(
      `"${file.name}" sıkıştırıldıktan sonra hâlâ 8 MB sınırını aşıyor.`,
    );
  }

  const originalName =
    file.name.replace(/\.[^.]+$/, "") || "urun-gorseli";

  return new File([blob], `${originalName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function uploadImage(file: File): Promise<string> {
  const optimizedFile = await optimizeImage(file);

  const presignResponse = await fetch(
    "/api/uploads/presign",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: optimizedFile.type,
        fileSize: optimizedFile.size,
      }),
    },
  );

  const presignResult =
    (await presignResponse.json()) as PresignResponse;

  if (
    !presignResponse.ok ||
    !presignResult.uploadUrl ||
    !presignResult.publicUrl
  ) {
    throw new Error(
      presignResult.error ??
        "Görsel yükleme adresi alınamadı.",
    );
  }

  const uploadResponse = await fetch(
    presignResult.uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": optimizedFile.type,
        "Cache-Control": IMMUTABLE_CACHE_CONTROL,
      },
      body: optimizedFile,
    },
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `R2 yüklemesi başarısız oldu (${uploadResponse.status}).`,
    );
  }

  return presignResult.publicUrl;
}

export function ProductImageUploader({
  defaultCoverImage = "",
  defaultExtraImages = [],
  onUploadingChange,
}: ProductImageUploaderProps) {
  const [coverImage, setCoverImage] = useState(
    defaultCoverImage,
  );

  const [extraImages, setExtraImages] = useState(
    defaultExtraImages,
  );

  const [coverUploading, setCoverUploading] =
    useState(false);

  const [extraUploading, setExtraUploading] =
    useState(false);

  const [error, setError] = useState<string>();

  const isUploading = coverUploading || extraUploading;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  async function handleCoverImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setError(undefined);
    setCoverUploading(true);

    try {
      const uploadedUrl = await uploadImage(file);
      setCoverImage(uploadedUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Kapak görseli yüklenemedi.",
      );
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleExtraImages(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      event.currentTarget.files ?? [],
    );

    event.currentTarget.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    if (
      extraImages.length + selectedFiles.length >
      MAX_EXTRA_IMAGES
    ) {
      setError(
        `Bir üründe en fazla ${MAX_EXTRA_IMAGES} ek görsel olabilir.`,
      );
      return;
    }

    setError(undefined);
    setExtraUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const uploadedUrl = await uploadImage(file);
        uploadedUrls.push(uploadedUrl);
      }

      setExtraImages((currentImages) => [
        ...currentImages,
        ...uploadedUrls.filter(
          (url) => !currentImages.includes(url),
        ),
      ]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Ek görseller yüklenemedi.",
      );
    } finally {
      setExtraUploading(false);
    }
  }

  function removeExtraImage(imageUrl: string) {
    setExtraImages((currentImages) =>
      currentImages.filter(
        (image) => image !== imageUrl,
      ),
    );
  }

  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
      <input
        type="hidden"
        name="coverImage"
        value={coverImage}
      />

      <input
        type="hidden"
        name="extraImages"
        value={extraImages.join("\n")}
      />

      <div>
        <h2 className="text-base font-semibold text-neutral-950">
          Ürün görselleri
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Fotoğraflar otomatik olarak küçültülür, WebP
          formatına çevrilir ve Cloudflare R2 üzerine
          yüklenir.
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">
              Kapak görseli
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Ana sayfadaki ürün kartında görünür.
            </p>
          </div>

          {coverImage ? (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setCoverImage("")}
              className="text-xs font-medium text-red-600 disabled:opacity-50"
            >
              Kaldır
            </button>
          ) : null}
        </div>

        {coverImage ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
            <div className="relative aspect-[16/9] bg-neutral-100">
              <Image
                src={coverImage}
                alt="Kapak görseli"
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
              />
            </div>

            <label className="flex h-12 cursor-pointer items-center justify-center border-t border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleCoverImage}
                disabled={isUploading}
                className="hidden"
              />

              {coverUploading
                ? "Görsel işleniyor ve yükleniyor..."
                : "Kapak görselini değiştir"}
            </label>
          </div>
        ) : (
          <label
            className={`mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-5 text-center hover:border-neutral-400 ${
              isUploading
                ? "pointer-events-none opacity-60"
                : ""
            }`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleCoverImage}
              disabled={isUploading}
              className="hidden"
            />

            <span className="flex size-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">
              +
            </span>

            <span className="mt-3 text-sm font-semibold text-neutral-800">
              {coverUploading
                ? "Görsel yükleniyor..."
                : "Kapak görseli seç"}
            </span>

            <span className="mt-1 text-xs text-neutral-500">
              Bilgisayardan veya telefondan yükleyin
            </span>
          </label>
        )}
      </div>

      <div className="mt-8 border-t border-neutral-100 pt-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-700">
              Ek ürün görselleri
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Ürün detay galerisinde gösterilir.
            </p>
          </div>

          <span className="text-xs text-neutral-400">
            {extraImages.length}/{MAX_EXTRA_IMAGES}
          </span>
        </div>

        {extraImages.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {extraImages.map((imageUrl, index) => (
              <article
                key={imageUrl}
                className="overflow-hidden rounded-2xl border border-neutral-200"
              >
                <div className="relative aspect-square bg-neutral-100">
                  <Image
                    src={imageUrl}
                    alt={`Ek ürün görseli ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 250px"
                    className="object-cover"
                  />

                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">
                    {index + 1}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() =>
                    removeExtraImage(imageUrl)
                  }
                  className="h-10 w-full border-t border-neutral-100 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Görseli kaldır
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-6 text-center text-xs text-neutral-500">
            Henüz ek ürün görseli yüklenmedi.
          </div>
        )}

        <label
          className={`mt-4 flex h-12 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 ${
            isUploading ||
            extraImages.length >= MAX_EXTRA_IMAGES
              ? "pointer-events-none opacity-50"
              : ""
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleExtraImages}
            disabled={
              isUploading ||
              extraImages.length >= MAX_EXTRA_IMAGES
            }
            className="hidden"
          />

          {extraUploading
            ? "Görseller işleniyor ve yükleniyor..."
            : "Ek görselleri seç"}
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}