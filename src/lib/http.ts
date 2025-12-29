/**
 * LEARNING NOTE (Next.js):
 *
 * - Calling https://api.binance.com directly from the browser can hit CORS issues.
 *   Many exchange REST APIs are designed primarily for server-to-server use.
 *
 * - Clean solution in Next.js:
 *   - Create a route handler (proxy) under:
 *       src/app/api/binance/[...path]/route.ts
 *   - The frontend calls a SAME-ORIGIN URL:
 *       /api/binance/...
 *   - The route handler forwards the request to Binance:
 *       https://api.binance.com/...
 *
 * - Bonus: keeping requests same-origin avoids browser CORS preflights entirely and
 *   keeps you flexible if you later need server-only secrets (signed endpoints).
 *
 * - Header note:
 *   Avoid sending unnecessary headers on GET (like "Content-Type") because it can
 *   trigger a preflight in some cases. For GETs with no body, don’t set it.
 */

export type HttpMethod = "GET" | "POST" | "DELETE";

export type QueryParams =
  | Record<string, string | number | boolean | undefined>
  | undefined;

export type HttpRequestOptions = {
  params?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
};

export class HttpError extends Error {
  status: number;
  body: unknown;
  retryAfterSeconds?: number;
  kind?: string;

  constructor(
    message: string,
    opts: { status: number; body: unknown; retryAfterSeconds?: number }
  ) {
    super(message);
    this.name = "HttpError";
    this.status = opts.status;
    this.body = opts.body;
    this.retryAfterSeconds = opts.retryAfterSeconds;
  }
}

/**
 * Very small fetch wrapper.
 *
 * - baseUrl: e.g. "/api/binance" (recommended) or "https://api.binance.com" (direct)
 * - get<T> returns a parsed + typed JSON body
 */
export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // strip trailing slash to avoid double "//"
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async get<T>(
    path: string,
    options?: Omit<HttpRequestOptions, "body">
  ): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  // You can add post/delete later if you need them.
  // async post<T>(path: string, body?: unknown): Promise<T> { ... }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    console.log("method: ", method);
    console.log("path: ", path);
    console.log("options: ", options);

    console.log("baseUrl:", this.baseUrl);

    const url = this.buildUrl(path, options.params);

    // Only set headers when needed. For GETs with no body, keep it simple.
    const headers: HeadersInit = {};

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      signal: options.signal
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, init);

    const text = await res.text();
    let json: unknown = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // leave json as undefined if not valid JSON
    }

    if (!res.ok) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : undefined;

      // Binance-style error shape is often { code: -1121, msg: "Invalid symbol." }
      const msgFromBody =
        typeof json === "object" &&
        json !== null &&
        "msg" in json &&
        typeof (json as any).msg === "string"
          ? (json as any).msg
          : undefined;

      const message =
        msgFromBody ??
        `HTTP ${res.status} ${res.statusText || "Request failed"} at ${url}`;

      throw new HttpError(message, {
        status: res.status,
        body: json ?? text,
        retryAfterSeconds
      });
    }

    return json as T;
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const hasProtocol = /^https?:\/\//i.test(path);

    // If "path" is absolute, trust it.
    // Otherwise, join baseUrl + path as a relative URL against an origin.
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";

    const raw = hasProtocol
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const url = new URL(raw, origin);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}

/**
 * Public exchange REST client (recommended: same-origin proxy).
 *
 * Preferred base URL:
 *   "/api/binance"
 *
 * That assumes you implement the Next.js route handler:
 *   src/app/api/binance/[...path]/route.ts
 *
 * If you haven’t added the proxy yet, you can temporarily set:
 *   NEXT_PUBLIC_BINANCE_REST_URL=https://api.binance.com
 */
import { BINANCE } from "@/lib/exchanges/binance/config";

export const binanceHttp = new HttpClient(BINANCE.restUrl);
