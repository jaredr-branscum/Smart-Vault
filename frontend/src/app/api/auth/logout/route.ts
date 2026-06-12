import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idToken = searchParams.get("id_token");

  const issuer = process.env.KEYCLOAK_ISSUER || "http://localhost:8080/realms/smart-vault";
  const postLogoutRedirectUri = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Prevent Open Redirect: validate redirect target host
  const isSafeRedirect = postLogoutRedirectUri.startsWith("http://localhost") || postLogoutRedirectUri.startsWith("https://");
  const safePostLogoutRedirectUri = isSafeRedirect ? postLogoutRedirectUri : "http://localhost:3000";

  if (idToken) {
    // Sanitize to prevent URL injection
    const cleanIdToken = encodeURIComponent(idToken);
    const logoutUrl = `${issuer}/protocol/openid-connect/logout?id_token_hint=${cleanIdToken}&post_logout_redirect_uri=${encodeURIComponent(safePostLogoutRedirectUri + "/login")}`;
    return NextResponse.redirect(logoutUrl);
  }

  return NextResponse.redirect(safePostLogoutRedirectUri + "/login");
}
