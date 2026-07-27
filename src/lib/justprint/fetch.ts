import { JustPrintError } from "@/lib/justprint/errors";
import { getJustPrintEnvironment } from "@/lib/justprint/environment";

const DEFAULT_TIMEOUT_MS = 12_000;

export interface JustPrintFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  searchParams?: Record<string, string | undefined>;
}

function buildUrl(path: string, searchParams?: Record<string, string | undefined>): string {
  const { apiUrl } = getJustPrintEnvironment();
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${apiUrl}/`,
  );

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

/**
 * Browser-safe fetch wrapper for JustPrint public storefront endpoints.
 * No secret tokens — only public Next env vars.
 */
export async function justPrintFetch<T>(
  path: string,
  options: JustPrintFetchOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    signal: externalSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    searchParams,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new JustPrintError({
        code: "ABORT",
        message: "Request aborted before start",
        userMessage: "La requête JustPrint a été annulée.",
      });
    }
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(buildUrl(path, searchParams), {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new JustPrintError({
        code: "HTTP",
        status: response.status,
        message: `JustPrint HTTP ${response.status} for ${method} ${path}`,
        userMessage:
          response.status >= 500
            ? "JustPrint est temporairement indisponible. Tes choix sont conservés."
            : "JustPrint a refusé la requête. Tes choix sont conservés.",
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Allow empty 204-style bodies
      if (response.status === 204) {
        return undefined as T;
      }
    }

    let parsed: unknown;
    try {
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      parsed = JSON.parse(text) as unknown;
    } catch (cause) {
      throw new JustPrintError({
        code: "INVALID_JSON",
        status: response.status,
        message: `Invalid JSON from JustPrint for ${method} ${path}`,
        userMessage:
          "Réponse JustPrint invalide. Tes choix sont conservés localement.",
        cause,
      });
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof JustPrintError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      const timedOut = !externalSignal?.aborted;
      throw new JustPrintError({
        code: timedOut ? "TIMEOUT" : "ABORT",
        message: timedOut
          ? `JustPrint request timed out after ${timeoutMs}ms`
          : "JustPrint request aborted",
        userMessage: timedOut
          ? "JustPrint ne répond pas assez vite. Tes choix sont conservés."
          : "La requête JustPrint a été annulée.",
        cause: error,
      });
    }

    throw new JustPrintError({
      code: "NETWORK",
      message:
        error instanceof Error ? error.message : "Network error contacting JustPrint",
      userMessage:
        "Impossible de joindre JustPrint. Vérifie ta connexion — tes choix sont conservés.",
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}
