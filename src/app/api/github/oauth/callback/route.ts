import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace("/api", "");

  const res = await fetch(
    `${backendUrl}/api/github/oauth/callback?code=${code}&state=${state}`,
    { redirect: "manual" }
  );

  const location = res.headers.get("location") || "http://localhost:3000/settings";
  return NextResponse.redirect(location);
}
