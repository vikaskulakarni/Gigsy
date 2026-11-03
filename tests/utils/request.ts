export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  cookies?: Record<string, string>;
  headers?: HeadersInit;
  baseUrl?: string;
};

export function createRequest({
  method = "GET",
  query = {},
  body,
  cookies = {},
  headers,
  baseUrl = "http://localhost",
}: RequestOptions = {}): Request {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const requestHeaders = new Headers(headers);
  if (body !== undefined) {
    requestHeaders.set("content-type", "application/json");
  }
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("; ");
  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function createJsonRequest(
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
  options: Omit<RequestOptions, "method" | "body"> = {},
): Request {
  return createRequest({ ...options, method, body });
}

export function createGetRequest(
  options: Omit<RequestOptions, "method" | "body"> = {},
): Request {
  return createRequest({ ...options, method: "GET" });
}
