import { getRequiredEnv } from "./env";

export const CANONICAL_R2_URL = getRequiredEnv("R2_PUBLIC_URL");

const LEGACY_R2_URL = getRequiredEnv("R2_LEGACY_URL");

export function normalizeMediaUrl(value: string): string {
  if (value === LEGACY_R2_URL || value.startsWith(`${LEGACY_R2_URL}/`)) {
    return `${CANONICAL_R2_URL}${value.slice(LEGACY_R2_URL.length)}`;
  }

  return value;
}
