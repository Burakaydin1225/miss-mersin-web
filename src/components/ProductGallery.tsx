"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ProductGalleryProps = {
  productName: string;
  images: string[];
};

export function ProductGallery({
  productName,
  images,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [
    lightboxOpen,
    setLightboxOpen,
  ] = useState(false);
  const [mounted, setMounted] =
    useState(false);

  const imageCount = images.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  function showPreviousImage() {
    if (imageCount <= 0) {
      return;
    }

    setActiveIndex((currentIndex) =>
      currentIndex === 0
        ? imageCount - 1
        : currentIndex - 1,
    );
  }

  function showNextImage() {
    if (imageCount <= 0) {
      return;
    }

    setActiveIndex((currentIndex) =>
      currentIndex === imageCount - 1
        ? 0
        : currentIndex + 1,
    );
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [lightboxOpen, imageCount]);

  if (images.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] bg-neutral-100 text-sm text-neutral-500">
        Ürün görseli bulunmuyor.
      </div>
    );
  }

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] h-screen w-screen bg-black/98 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} tam ekran galeri`}
    >
      <button
        type="button"
        onClick={closeLightbox}
        className="fixed right-4 top-4 z-[10020] flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl font-black text-white shadow-2xl backdrop-blur-md transition hover:bg-white/20"
        aria-label="Galeriyi kapat"
      >
        ×
      </button>

      <div className="fixed left-4 top-4 z-[10020] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md">
        {activeIndex + 1} / {images.length}
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={showPreviousImage}
            className="fixed left-3 top-1/2 z-[10020] flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-3xl font-black text-white shadow-2xl backdrop-blur-md transition hover:bg-white/20 sm:left-6 sm:size-16"
            aria-label="Önceki görsel"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={showNextImage}
            className="fixed right-3 top-1/2 z-[10020] flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-3xl font-black text-white shadow-2xl backdrop-blur-md transition hover:bg-white/20 sm:right-6 sm:size-16"
            aria-label="Sonraki görsel"
          >
            ›
          </button>
        </>
      ) : null}

      <button
        type="button"
        onClick={closeLightbox}
        className="fixed inset-0 z-[10000] cursor-zoom-out"
        aria-label="Arka plana tıklayarak kapat"
      />

      <div className="fixed inset-0 z-[10010] flex items-center justify-center px-2 py-16 sm:px-8 sm:py-20">
        <div className="relative h-full w-full">
          <Image
            key={`lightbox-${images[activeIndex]}`}
            src={images[activeIndex]}
            alt={`${productName} tam ekran görsel ${activeIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {images.length > 1 ? (
        <div className="fixed bottom-4 left-1/2 z-[10020] flex max-w-[94vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/65 p-2 shadow-2xl backdrop-blur-md">
          {images.map((image, index) => {
            const isActive =
              activeIndex === index;

            return (
              <button
                key={`lightbox-thumbnail-${image}-${index}`}
                type="button"
                onClick={() =>
                  setActiveIndex(index)
                }
                aria-label={`${index + 1}. görseli tam ekranda aç`}
                className={`relative size-14 shrink-0 overflow-hidden rounded-xl border-2 bg-neutral-900 transition sm:size-16 ${
                  isActive
                    ? "border-white opacity-100"
                    : "border-transparent opacity-55 hover:opacity-100"
                }`}
              >
                <Image
                  src={image}
                  alt={`${productName} tam ekran küçük görsel ${index + 1}`}
                  fill
                  loading="lazy"
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <div
        data-nosnippet
        role="note"
        aria-label="Önemli güvenlik duyurusu"
        className="mx-auto mb-3 max-w-[760px] overflow-hidden rounded-[18px] border border-red-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff7f7_100%)] shadow-[0_8px_24px_rgba(185,28,28,0.08)]"
      >
        <div className="flex items-start gap-3 px-3.5 py-3 sm:items-center sm:px-4 sm:py-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 sm:size-10">
            <span
              aria-hidden="true"
              className="text-base font-black"
            >
              !
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700 sm:text-[11px]">
              Önemli duyuru
            </p>

            <p className="mt-0.5 text-[11px] font-semibold leading-[17px] text-neutral-700 sm:text-[12px] sm:leading-5">
              Dolandırıcı mağduru olmamak için görüşme öncesi sizden para talep edenlere itibar etmeyiniz.Dikkatli olun bu durumda{" "}
              <span className="font-black text-red-700">
                SORUMLULUK KABUL EDİLMEMEKTEDİR.
              </span>
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          openLightbox(activeIndex)
        }
        className="group relative mx-auto block h-[58svh] min-h-[280px] max-h-[520px] w-full max-w-[760px] overflow-hidden rounded-[24px] bg-neutral-950 text-left outline-none ring-0 transition hover:scale-[1.005] focus-visible:ring-4 focus-visible:ring-white/40 sm:h-[68svh] sm:min-h-[420px] sm:max-h-[680px] sm:rounded-[28px]"
        aria-label="Ürün görselini tam ekran aç"
      >
        <Image
          key={images[activeIndex]}
          src={images[activeIndex]}
          alt={`${productName} - görsel ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-contain transition duration-300 group-hover:scale-[1.015]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent opacity-80" />

        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-md transition group-hover:bg-black/75">
          Tam ekran aç
        </div>

        <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
          {activeIndex + 1} / {images.length}
        </div>
      </button>

      {images.length > 1 ? (
        <div className="mx-auto mt-3 flex max-w-[760px] gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => {
            const isActive =
              activeIndex === index;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() =>
                  setActiveIndex(index)
                }
                aria-label={`${index + 1}. görseli aç`}
                className={`relative size-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-neutral-100 transition sm:size-20 ${
                  isActive
                    ? "border-neutral-950 opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={image}
                  alt={`${productName} küçük görsel ${index + 1}`}
                  fill
                  loading="lazy"
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {mounted && lightboxOpen
        ? createPortal(
            lightboxContent,
            document.body,
          )
        : null}
    </div>
  );
}