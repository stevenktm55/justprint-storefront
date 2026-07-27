/**
 * Public app environment helpers.
 * Uses NEXT_PUBLIC_APP_ENV when set, otherwise NODE_ENV.
 */

export type AppEnv = "development" | "production" | "test" | "preview";

export function getAppEnv(): AppEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (
    raw === "development" ||
    raw === "production" ||
    raw === "test" ||
    raw === "preview"
  ) {
    return raw;
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  if (process.env.NODE_ENV === "test") {
    return "test";
  }
  return "development";
}

/** True for local / preview-like runs where defaults and loose postMessage are allowed. */
export function isAppDevelopment(): boolean {
  const env = getAppEnv();
  return env === "development" || env === "test";
}

export function isAppProduction(): boolean {
  return getAppEnv() === "production";
}
