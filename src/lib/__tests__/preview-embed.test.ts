import { describe, expect, it } from "vitest";
import {
  REMOTE_PILOT_BIKE_ID,
  REMOTE_PILOT_DESIGN_ID,
  buildStorefrontPreviewEmbedUrl,
  isRemotePilot3dSupported,
  resolveRemotePreviewKind,
} from "@/lib/justprint/preview-embed";

describe("isRemotePilot3dSupported", () => {
  it("accepts yamaha classic 3d only", () => {
    expect(
      isRemotePilot3dSupported(
        REMOTE_PILOT_BIKE_ID,
        REMOTE_PILOT_DESIGN_ID,
        "3d",
      ),
    ).toBe(true);
    expect(
      isRemotePilot3dSupported(REMOTE_PILOT_BIKE_ID, "classic", "2d"),
    ).toBe(false);
    expect(
      isRemotePilot3dSupported("other-bike", REMOTE_PILOT_DESIGN_ID, "3d"),
    ).toBe(false);
  });
});

describe("resolveRemotePreviewKind", () => {
  it("keeps mock local for mock mode", () => {
    expect(
      resolveRemotePreviewKind({
        isMockMode: true,
        bikeId: REMOTE_PILOT_BIKE_ID,
        designId: REMOTE_PILOT_DESIGN_ID,
        previewMode: "3d",
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe("mock_local");
  });

  it("uses remote iframe for pilot with savedDesignId", () => {
    expect(
      resolveRemotePreviewKind({
        isMockMode: false,
        bikeId: REMOTE_PILOT_BIKE_ID,
        designId: REMOTE_PILOT_DESIGN_ID,
        previewMode: "3d",
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe("remote_iframe");
  });

  it("prepares while waiting for create", () => {
    expect(
      resolveRemotePreviewKind({
        isMockMode: false,
        bikeId: REMOTE_PILOT_BIKE_ID,
        designId: REMOTE_PILOT_DESIGN_ID,
        previewMode: "3d",
        savedDesignId: null,
      }),
    ).toBe("preparing");
  });

  it("marks unsupported remote bikes without fake fallback", () => {
    expect(
      resolveRemotePreviewKind({
        isMockMode: false,
        bikeId: "ktm-450-sxf-2025",
        designId: "factory",
        previewMode: "3d",
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe("unsupported");
  });

  it("routes future 2d to remote_2d", () => {
    expect(
      resolveRemotePreviewKind({
        isMockMode: false,
        bikeId: "any-2d",
        designId: "flat",
        previewMode: "2d",
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      }),
    ).toBe("remote_2d");
  });
});

describe("buildStorefrontPreviewEmbedUrl", () => {
  it("builds storefront-preview URL with UUID and version", () => {
    const url = buildStorefrontPreviewEmbedUrl({
      apiUrl: "https://www.justprint.app",
      savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      editToken: "secret-token",
      version: "2026-07-28T10:00:00.000Z",
      parentOrigin: "https://storefront.example",
      view: "left",
    });

    expect(url.startsWith(
      "https://www.justprint.app/embed/storefront-preview/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee?",
    )).toBe(true);
    expect(url).toContain("token=secret-token");
    expect(url).toContain("v=2026-07-28T10%3A00%3A00.000Z");
    expect(url).toContain("parentOrigin=https%3A%2F%2Fstorefront.example");
    expect(url).toContain("view=left");
    expect(url).not.toContain("JP-RM-");
  });
});
