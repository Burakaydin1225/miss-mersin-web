import Link from "next/link";

import { seoRegions } from "@/lib/site-config";

type SeoRegionLinksProps = {
  regionSlugs?: readonly string[];
};

export function SeoRegionLinks({
  regionSlugs,
}: SeoRegionLinksProps) {
  const displayedRegions = regionSlugs
    ? seoRegions.filter((region) =>
        regionSlugs.includes(region.slug),
      )
    : seoRegions;

  if (displayedRegions.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Mersin bölge ilanları"
      className="mt-2 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5 sm:mt-0 sm:shrink-0 sm:justify-end"
    >
      <span
        aria-hidden="true"
        className="shrink-0 text-[9px] font-black uppercase tracking-[0.11em] text-neutral-400"
      >
        Bölgeler
      </span>

      {displayedRegions.map((region) => (
        <Link
          key={region.slug}
          href={`/bolge/${region.slug}`}
          className="shrink-0 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[10px] font-bold leading-4 text-fuchsia-700 transition hover:border-fuchsia-400 hover:bg-fuchsia-100"
        >
          {region.shortName}
        </Link>
      ))}
    </nav>
  );
}