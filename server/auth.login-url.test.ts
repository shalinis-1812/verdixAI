import { describe, expect, it } from "vitest";
import { buildLoginUrl } from "../client/src/const";
import { decodeOAuthState } from "../shared/const";

describe("buildLoginUrl", () => {
  const baseOptions = {
    redirectUri: "https://veridex.example/api/oauth/callback",
    nonce: "test-nonce",
  };

  it("returns null instead of throwing when OAuth variables are missing", () => {
    expect(
      buildLoginUrl({
        ...baseOptions,
        oauthPortalUrl: undefined,
        appId: undefined,
      })
    ).toBeNull();
  });

  it("returns null for an invalid portal URL", () => {
    expect(
      buildLoginUrl({
        ...baseOptions,
        oauthPortalUrl: "not a url",
        appId: "veridex-app",
      })
    ).toBeNull();
  });

  it("builds a URL with the callback and nonce state", () => {
    const loginUrl = buildLoginUrl({
      ...baseOptions,
      oauthPortalUrl: "https://oauth.manus.example",
      appId: "veridex-app",
    });

    expect(loginUrl).not.toBeNull();
    const parsedUrl = new URL(loginUrl!);
    expect(parsedUrl.pathname).toBe("/app-auth");
    expect(parsedUrl.searchParams.get("appId")).toBe("veridex-app");
    expect(parsedUrl.searchParams.get("redirectUri")).toBe(
      baseOptions.redirectUri
    );
    expect(parsedUrl.searchParams.get("type")).toBe("signIn");
    expect(decodeOAuthState(parsedUrl.searchParams.get("state")!).nonce).toBe(
      baseOptions.nonce
    );
  });
});
