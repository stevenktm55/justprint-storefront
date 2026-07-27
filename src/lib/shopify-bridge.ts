import { isAppDevelopment } from "@/lib/app-env";
import type {
  JustPrintCompletionMessage,
  ShopifyQueryParams,
} from "@/types/configurator";

export function readShopifyQueryParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): ShopifyQueryParams {
  const read = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }

    const value = searchParams[key];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return value ?? null;
  };

  return {
    shop: read("shop"),
    product: read("product"),
    variant: read("variant"),
    design: read("design"),
    bike: read("bike"),
  };
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Returns true when the message event origin is an allowed parent shop origin.
 * Never treats "*" as a valid incoming origin.
 */
export function isAllowedParentOrigin(
  origin: string,
  allowedParentOrigins: readonly string[],
): boolean {
  if (!origin || origin === "null" || origin === "*") {
    return false;
  }
  return allowedParentOrigins.includes(origin);
}

/**
 * Target origin for outgoing postMessage to the parent frame.
 *
 * - Prefer a known allowed parent origin (from referrer when it matches).
 * - Development only: fall back to "*" so local iframe embeds still work
 *   without a real parent shop domain.
 * - Production: never use "*"; use a matched allowed origin or the first
 *   configured parent origin when the referrer is unavailable.
 */
export function resolveOutgoingPostMessageTarget(
  allowedParentOrigins: readonly string[],
): string {
  if (typeof window !== "undefined" && document.referrer) {
    try {
      const referrerOrigin = new URL(document.referrer).origin;
      if (isAllowedParentOrigin(referrerOrigin, allowedParentOrigins)) {
        return referrerOrigin;
      }
    } catch {
      // Ignore malformed referrer URLs.
    }
  }

  // DEV ONLY: "*" is allowed so local demos / iframe sandboxes can receive
  // completion events without a real Shopify parent. Production must always
  // target an explicit allowed parent origin — never "*".
  if (isAppDevelopment()) {
    return "*";
  }

  return allowedParentOrigins[0] ?? "https://rawmoto.fr";
}

/**
 * Notifies the parent frame that a configuration was completed.
 * Incoming listeners on the parent should also verify this app's origin.
 */
export function notifyParentConfigurationCompleted(
  message: JustPrintCompletionMessage,
  allowedParentOrigins: readonly string[] = [],
): void {
  if (typeof window === "undefined") return;

  const targetOrigin = resolveOutgoingPostMessageTarget(allowedParentOrigins);
  window.parent.postMessage(message, targetOrigin);
}
