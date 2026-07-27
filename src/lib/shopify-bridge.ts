import { isAppDevelopment } from "@/lib/app-env";
import type {
  JustPrintAddToCartMessage,
  JustPrintCartErrorMessage,
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
 * Whether an incoming parent message may be handled.
 * Production: strict allow-list only.
 * Development: also accept http(s) parent origins (local Shopify theme embeds).
 */
export function canAcceptParentMessage(
  origin: string,
  allowedParentOrigins: readonly string[],
): boolean {
  if (isAllowedParentOrigin(origin, allowedParentOrigins)) {
    return true;
  }

  if (!isAppDevelopment()) {
    return false;
  }

  return /^https?:\/\//.test(origin);
}

function resolveParentOriginFromAncestors(
  allowedParentOrigins: readonly string[],
): string | null {
  if (typeof window === "undefined") return null;

  const ancestors = window.location.ancestorOrigins;
  if (!ancestors || ancestors.length === 0) return null;

  for (let i = 0; i < ancestors.length; i += 1) {
    const origin = ancestors.item(i);
    if (origin && isAllowedParentOrigin(origin, allowedParentOrigins)) {
      return origin;
    }
  }

  return null;
}

function resolveParentOriginFromReferrer(
  allowedParentOrigins: readonly string[],
): string | null {
  if (typeof window === "undefined" || !document.referrer) return null;

  try {
    const referrerOrigin = new URL(document.referrer).origin;
    if (isAllowedParentOrigin(referrerOrigin, allowedParentOrigins)) {
      return referrerOrigin;
    }
  } catch {
    // Ignore malformed referrer URLs.
  }

  return null;
}

/**
 * Target origin for outgoing postMessage to the parent frame.
 *
 * - Prefer a known allowed parent origin (ancestorOrigins, then referrer).
 * - Development only: fall back to "*" so local iframe embeds still work
 *   without a real parent shop domain.
 * - Production: never use "*"; use a matched allowed origin or the first
 *   configured parent origin when the referrer is unavailable.
 */
export function resolveOutgoingPostMessageTarget(
  allowedParentOrigins: readonly string[],
): string {
  const fromAncestors = resolveParentOriginFromAncestors(allowedParentOrigins);
  if (fromAncestors) return fromAncestors;

  const fromReferrer = resolveParentOriginFromReferrer(allowedParentOrigins);
  if (fromReferrer) return fromReferrer;

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

/**
 * Asks the parent Shopify page to add the configured kit to the cart.
 * The Storefront never calls Shopify Cart APIs itself.
 */
export function notifyParentAddToCart(
  message: JustPrintAddToCartMessage,
  allowedParentOrigins: readonly string[] = [],
): void {
  if (typeof window === "undefined") return;

  const targetOrigin = resolveOutgoingPostMessageTarget(allowedParentOrigins);
  window.parent.postMessage(message, targetOrigin);
}

export function isJustPrintCartErrorMessage(
  data: unknown,
): data is JustPrintCartErrorMessage {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    record.type === "JUSTPRINT_CART_ERROR" &&
    typeof record.message === "string"
  );
}
