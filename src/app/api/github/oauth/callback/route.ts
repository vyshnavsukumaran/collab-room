import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace("/api", "");

  if (!code || !state) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return NextResponse.redirect(`${frontendUrl}/settings?github=error&message=missing_params`);
  }

  const res = await fetch(
    `${backendUrl}/api/github/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { redirect: "manual" }
  );

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const location = res.headers.get("location") || `${frontendUrl}/settings`;
  return NextResponse.redirect(location);
}
