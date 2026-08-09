export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} ortam değişkeni bulunamadı.`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

export function getRequiredEnvUrl(name: string): URL {
  const value = getRequiredEnv(name);

  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} geçerli bir URL olmalıdır.`);
  }
}