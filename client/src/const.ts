import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

type LoginUrlOptions = {
  oauthPortalUrl: string | undefined;
  appId: string | undefined;
  redirectUri: string;
  nonce: string;
};

/**
 * Build the Manus OAuth URL without throwing when the deployment is missing
 * its public OAuth configuration. Keeping this pure makes the failure mode
 * easy to test and prevents a click handler from taking down the app.
 */
export function buildLoginUrl({
  oauthPortalUrl,
  appId,
  redirectUri,
  nonce,
}: LoginUrlOptions): string | null {
  const portalUrl = oauthPortalUrl?.trim();
  const clientAppId = appId?.trim();

  if (!portalUrl || !clientAppId) return null;

  try {
    const baseUrl = portalUrl.endsWith("/") ? portalUrl : `${portalUrl}/`;
    const url = new URL("app-auth", baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const state = encodeOAuthState({ redirectUri, nonce });
    url.searchParams.set("appId", clientAppId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return null;
  }
}

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns false when the deployment is missing
// its required public OAuth variables instead of throwing an Invalid URL error.
export const startLogin = (): boolean => {
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  const loginUrl = buildLoginUrl({
    oauthPortalUrl: import.meta.env.VITE_OAUTH_PORTAL_URL,
    appId: import.meta.env.VITE_APP_ID,
    redirectUri,
    nonce,
  });

  if (!loginUrl) {
    console.error(
      "[Auth] Manus OAuth is not configured. Set VITE_OAUTH_PORTAL_URL and VITE_APP_ID."
    );
    return false;
  }

  // Only write the one-time cookie after the URL has been validated. This
  // avoids leaving a stale nonce behind when configuration is broken.
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  window.location.href = loginUrl;
  return true;
};
