export type JustPrintErrorCode =
  | "VALIDATION"
  | "NETWORK"
  | "TIMEOUT"
  | "HTTP"
  | "INVALID_JSON"
  | "ABORT"
  | "FINALIZED"
  | "BAD_TOKEN"
  | "SERVER_UNAVAILABLE"
  | "UNKNOWN";

export class JustPrintError extends Error {
  readonly code: JustPrintErrorCode;
  readonly status: number | null;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(params: {
    code: JustPrintErrorCode;
    message: string;
    userMessage: string;
    status?: number | null;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "JustPrintError";
    this.code = params.code;
    this.status = params.status ?? null;
    this.userMessage = params.userMessage;
    this.cause = params.cause;
  }
}

export function isJustPrintError(error: unknown): error is JustPrintError {
  return error instanceof JustPrintError;
}

/** Map HTTP status / API error body to a typed JustPrintError. */
export function justPrintErrorFromHttp(params: {
  status: number;
  path: string;
  method: string;
  apiMessage?: string | null;
  apiError?: string | null;
}): JustPrintError {
  const { status, path, method, apiMessage, apiError } = params;
  const detail = apiMessage?.trim() || null;
  const label = `${method} ${path}`;

  if (status === 400) {
    return new JustPrintError({
      code: "VALIDATION",
      status,
      message: detail
        ? `JustPrint validation error for ${label}: ${detail}`
        : `JustPrint validation error for ${label}`,
      userMessage:
        detail ??
        "Certaines informations sont invalides. Vérifie ta configuration et réessaie.",
    });
  }

  if (status === 401 || status === 403) {
    return new JustPrintError({
      code: "BAD_TOKEN",
      status,
      message: detail
        ? `JustPrint auth error for ${label}: ${detail}`
        : `JustPrint auth error for ${label}`,
      userMessage:
        detail ??
        "Session de configuration expirée. Repars depuis la sélection moto + design.",
    });
  }

  if (status === 409) {
    return new JustPrintError({
      code: "FINALIZED",
      status,
      message: detail
        ? `JustPrint conflict for ${label}: ${detail}`
        : `JustPrint conflict for ${label}`,
      userMessage:
        detail ??
        "Cette configuration est déjà finalisée et ne peut plus être modifiée.",
    });
  }

  if (status >= 500) {
    return new JustPrintError({
      code: "SERVER_UNAVAILABLE",
      status,
      message: `JustPrint HTTP ${status} for ${label}`,
      userMessage:
        detail ??
        "JustPrint est temporairement indisponible. Tes choix sont conservés.",
    });
  }

  return new JustPrintError({
    code: "HTTP",
    status,
    message: `JustPrint HTTP ${status} for ${label}${apiError ? ` (${apiError})` : ""}`,
    userMessage:
      detail ?? "JustPrint a refusé la requête. Tes choix sont conservés.",
  });
}

export function toJustPrintError(error: unknown): JustPrintError {
  if (isJustPrintError(error)) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new JustPrintError({
      code: "ABORT",
      message: "Request aborted",
      userMessage: "La requête JustPrint a été annulée.",
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new JustPrintError({
      code: "UNKNOWN",
      message: error.message,
      userMessage:
        "Une erreur inattendue est survenue avec JustPrint. Tes choix sont conservés.",
      cause: error,
    });
  }

  return new JustPrintError({
    code: "UNKNOWN",
    message: "Unknown JustPrint error",
    userMessage:
      "Une erreur inattendue est survenue avec JustPrint. Tes choix sont conservés.",
    cause: error,
  });
}
