function getConfiguredBackendUrl() {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

export function getBackendApiUrl() {
  const url = new URL(getConfiguredBackendUrl());
  const pathname = url.pathname.replace(/\/$/, "");

  url.pathname = pathname.endsWith("/api") ? pathname : `${pathname}/api`;
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}
