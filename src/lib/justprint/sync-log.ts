/**
 * Dev-only diagnostics for the saved_designs sync pipeline.
 * Never logs editToken or other secrets.
 */
export function logSavedDesignSync(details: {
  step: "create" | "patch" | "finalize" | "bootstrap";
  endpoint: string;
  status?: number | null;
  bikeId?: string | null;
  designId?: string | null;
  raceNumberPresent?: boolean;
  savedDesignIdPresent?: boolean;
  ok?: boolean;
  message?: string;
}): void {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") return;

  console.info("[justprint/saved-designs]", {
    step: details.step,
    endpoint: details.endpoint,
    status: details.status ?? null,
    bikeId: details.bikeId ?? null,
    designId: details.designId ?? null,
    raceNumberPresent: details.raceNumberPresent ?? null,
    savedDesignIdPresent: details.savedDesignIdPresent ?? null,
    ok: details.ok ?? null,
    message: details.message ?? null,
  });
}
