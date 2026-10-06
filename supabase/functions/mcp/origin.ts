export const CANONICAL_ORIGIN = "https://www.zentask.space";
export const MCP_ENDPOINT_PATH = "/api/mcp";
export const LOCAL_ENDPOINT_PATH = "/functions/v1/mcp";
export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";
export const MCP_SCOPE = "authenticated";

const DEV_HOSTNAMES = new Set(["localhost", "0.0.0.0", "[::1]", "::1", "127.0.0.1"]);

export function isDevHost(host: string): boolean {
  const first = host.split(",")[0].trim().toLowerCase();
  const bare = first.replace(/:\d+$/, "");
  if (DEV_HOSTNAMES.has(first) || DEV_HOSTNAMES.has(bare)) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(bare);
  if (!ipv4) return false;
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a > 255 || b > 255) return false;
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

export type ResolvedOrigin = {
  origin: string;
  endpointPath: string;
};

function parseHttpUrl(value: string): URL | null {
  if (!/^https?:\/\/[^/\s]+$/i.test(value)) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function resolveOrigin(req: Request, url: URL): ResolvedOrigin {
  const requestHost = (req.headers.get("host") || url.host || "").toLowerCase();

  const customHeader = req.headers.get("x-mcp-origin")?.trim();
  const custom = customHeader ? parseHttpUrl(customHeader) : null;
  if (custom && (isDevHost(requestHost) || isDevHost(custom.hostname))) {
    return { origin: custom.origin, endpointPath: MCP_ENDPOINT_PATH };
  }

  if (isDevHost(requestHost)) {
    return { origin: `http://${requestHost}`, endpointPath: LOCAL_ENDPOINT_PATH };
  }

  return { origin: CANONICAL_ORIGIN, endpointPath: MCP_ENDPOINT_PATH };
}

export const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function unauthorized(
  origin: string,
  opts: { message: string; oauthError?: string; oauthErrorDescription?: string },
): Response {
  const params = [
    `resource_metadata="${origin}${PROTECTED_RESOURCE_METADATA_PATH}"`,
    `scope="${MCP_SCOPE}"`,
  ];
  if (opts.oauthError) {
    params.push(`error="${opts.oauthError}"`);
    if (opts.oauthErrorDescription) params.push(`error_description="${opts.oauthErrorDescription}"`);
  }
  return json({ error: opts.message }, 401, {
    "WWW-Authenticate": `Bearer ${params.join(", ")}`,
    "Cache-Control": "no-store",
  });
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, accept, apikey, x-client-info, x-mcp-origin, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Expose-Headers": "www-authenticate, mcp-protocol-version, mcp-session-id",
  "Access-Control-Max-Age": "86400",
};

export function withCors(res: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
