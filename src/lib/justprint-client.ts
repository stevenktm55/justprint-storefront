/**
 * Public JustPrint client entry — re-exports the centralized client.
 * React components must use these helpers instead of calling fetch directly.
 */
export {
  justPrintClient,
  getStorefrontBootstrap,
  createConfiguration,
  updateConfiguration,
  generateConfigurationPreview,
  completeConfiguration,
  getJustPrintEnvironment,
  isJustPrintMockMode,
} from "@/lib/justprint/client";

export type { JustPrintClient } from "@/lib/justprint/client";
export { JustPrintError, isJustPrintError, toJustPrintError } from "@/lib/justprint/errors";
export {
  getJustPrintOrigin,
  isJustPrintRemoteMode,
} from "@/lib/justprint/environment";
