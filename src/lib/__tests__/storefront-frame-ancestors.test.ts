import { describe, expect, it } from "vitest";
import {
  buildStorefrontContentSecurityPolicy,
  buildStorefrontFrameAncestors,
  JUSTPRINT_FRAME_SRC_ORIGINS,
} from "@/lib/storefront-frame-ancestors";

describe("storefront-frame-ancestors", () => {
  it("includes RawMoto + Storefront ancestors", () => {
    const ancestors = buildStorefrontFrameAncestors();
    expect(ancestors).toContain("'self'");
    expect(ancestors).toContain("https://rawmoto.fr");
    expect(ancestors).toContain("https://www.rawmoto.fr");
    expect(ancestors).toContain("https://justprint-storefront.vercel.app");
    expect(ancestors).toContain("https://26578d-f2.myshopify.com");
    expect(ancestors).not.toContain("*");
  });

  it("allows JustPrint as frame-src only", () => {
    const csp = buildStorefrontContentSecurityPolicy();
    expect(csp).toContain("frame-ancestors ");
    expect(csp).toContain("frame-src ");
    for (const origin of JUSTPRINT_FRAME_SRC_ORIGINS) {
      expect(csp).toContain(origin);
    }
    // JustPrint n’est pas un faux parent frame-ancestors
    const ancestorsPart = csp.split(";")[0] ?? "";
    expect(ancestorsPart).not.toContain("https://www.justprint.app");
  });
});
