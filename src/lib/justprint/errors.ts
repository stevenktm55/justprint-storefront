export type JustPrintErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "HTTP"
  | "INVALID_JSON"
  | "ABORT"
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
