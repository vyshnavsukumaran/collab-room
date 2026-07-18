import { getBackendApiUrl } from "@/lib/backend-url";

const unsupportedRequestHeaders = [
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
];

const unsupportedResponseHeaders = [
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
];

async function proxyRequest(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${getBackendApiUrl()}/${path.join("/")}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  unsupportedRequestHeaders.forEach((header) => headers.delete(header));

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer();

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    unsupportedResponseHeaders.forEach((header) => responseHeaders.delete(header));

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { error: "Backend service is unavailable. Check its deployment and environment variables." },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
