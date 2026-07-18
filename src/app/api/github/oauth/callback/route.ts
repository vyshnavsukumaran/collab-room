import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/backend-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const res = await fetch(
    `${getBackendApiUrl()}/github/oauth/callback?code=${encodeURIComponent(code || "")}&state=${encodeURIComponent(state || "")}`,
    { redirect: "manual" }
  );

  const location = res.headers.get("location");
  const redirectUrl = new URL("/settings?github=error&message=callback_failed", request.nextUrl.origin);

  if (location) {
    const backendRedirect = new URL(location, request.nextUrl.origin);
    redirectUrl.pathname = backendRedirect.pathname;
    redirectUrl.search = backendRedirect.search;
    redirectUrl.hash = backendRedirect.hash;
  }

  return NextResponse.redirect(redirectUrl);
}
