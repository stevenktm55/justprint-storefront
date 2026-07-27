/**
 * Validates and returns JustPrint public env vars.
 * Shop identity comes from the URL `?shop=` param (see StorefrontTenantProvider),
 * not from a forced env shop id.
 */

export type JustPrintMode = "mock" | "remote";

export interface JustPrintEnvironment {
  mode: JustPrintMode;
  apiUrl: string;
}

function isJustPrintMode(value: string): value is JustPrintMode {
  return value === "mock" || value === "remote";
}

function readRequiredEnv(name: string, value: string | undefined): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  throw new Error(
    `Missing or empty environment variable ${name}. Copy .env.example to .env.local.`,
  );
}

export function getJustPrintEnvironment(): JustPrintEnvironment {
  const rawMode = process.env.NEXT_PUBLIC_JUSTPRINT_MODE ?? "mock";
  if (!isJustPrintMode(rawMode)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_JUSTPRINT_MODE="${rawMode}". Allowed values: mock, remote.`,
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_JUSTPRINT_API_URL?.trim() || "";

  if (rawMode === "remote") {
    readRequiredEnv("NEXT_PUBLIC_JUSTPRINT_API_URL", apiUrl);
  }

  return {
    mode: rawMode,
    apiUrl: apiUrl.replace(/\/$/, "") || "http://localhost:3001",
  };
}

export function isJustPrintMockMode(): boolean {
  return getJustPrintEnvironment().mode === "mock";
}

export function isJustPrintRemoteMode(): boolean {
  return getJustPrintEnvironment().mode === "remote";
}

/** Origin string for postMessage origin checks (no trailing slash). */
export function getJustPrintOrigin(): string {
  const { apiUrl } = getJustPrintEnvironment();
  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl;
  }
}
