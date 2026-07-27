import { JustPrintError, justPrintErrorFromHttp } from "@/lib/justprint/errors";
import { getJustPrintEnvironment } from "@/lib/justprint/environment";

const DEFAULT_TIMEOUT_MS = 12_000;
const EDIT_TOKEN_HEADER = "X-JustPrint-Edit-Token";

export interface JustPrintFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  searchParams?: Record<string, string | undefined>;
  /** Sent as X-JustPrint-Edit-Token — never logged. */
  editToken?: string;
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

function readApiErrorMessage(parsed: unknown): {
  message: string | null;
  error: string | null;
} {
  if (!parsed || typeof parsed !== "object") {
    return { message: null, error: null };
  }
  const record = parsed as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : null,
    error: typeof record.error === "string" ? record.error : null,
  };
}

/**
 * Browser-safe fetch wrapper for JustPrint public storefront endpoints.
 * No secret tokens — only public Next env vars + per-configuration editToken.
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
    editToken,
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
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (editToken) {
      headers[EDIT_TOKEN_HEADER] = editToken;
    }

    const response = await fetch(buildUrl(path, searchParams), {
      method,
      signal: controller.signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    let parsed: unknown = undefined;

    if (contentType.includes("application/json")) {
      try {
        const text = await response.text();
        if (text) {
          parsed = JSON.parse(text) as unknown;
        }
      } catch (cause) {
        if (response.ok) {
          throw new JustPrintError({
            code: "INVALID_JSON",
            status: response.status,
            message: `Invalid JSON from JustPrint for ${method} ${path}`,
            userMessage:
              "Réponse JustPrint invalide. Tes choix sont conservés localement.",
            cause,
          });
        }
      }
    } else if (response.ok && response.status !== 204) {
      // Non-JSON success with body is unexpected for this API.
    }

    if (!response.ok) {
      const { message, error } = readApiErrorMessage(parsed);
      throw justPrintErrorFromHttp({
        status: response.status,
        path,
        method,
        apiMessage: message,
        apiError: error,
      });
    }

    if (parsed === undefined && response.status === 204) {
      return undefined as T;
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
