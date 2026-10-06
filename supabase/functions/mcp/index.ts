import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools.ts";
import { handleOAuthRoute } from "./oauth.ts";
import { json, resolveOrigin, unauthorized, withCors, type ResolvedOrigin } from "./origin.ts";

type LegacyTransport = {
  sessionId: string;
  onmessage?: (message: unknown) => void;
  onclose?: () => void;
  onerror?: (error: unknown) => void;
  start(): Promise<void>;
  send(message: unknown): Promise<void>;
  close(): Promise<void>;
};

type LegacySession = {
  userId: string;
  transport: LegacyTransport;
};

const sessions = new Map<string, LegacySession>();

const REST_ROUTES = ["/tasks", "/summary", "/lists", "/categories"];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const resolved = resolveOrigin(req, url);
  return withCors(await route(req, url, resolved));
});

function createSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "",
  );
}

function readBearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

async function verifyCredential(credential: string, supabase: SupabaseClient): Promise<string | null> {
  const value = credential.trim();

  if (value.startsWith("zt_live_")) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    const keyHash = [...new Uint8Array(hashBuffer)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("id, user_id")
      .eq("key_hash", keyHash)
      .single();
    if (error || !data) return null;
    supabase
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => null, () => null);
    return data.user_id;
  }

  const { data, error } = await supabase.auth.getUser(value);
  if (error || !data?.user) return null;
  return data.user.id;
}

async function route(req: Request, url: URL, resolved: ResolvedOrigin): Promise<Response> {
  const { origin, endpointPath } = resolved;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const oauthResponse = await handleOAuthRoute(req, url, origin, endpointPath);
  if (oauthResponse) return oauthResponse;

  const cleanPath = url.pathname.replace(/^\/functions\/v1\/mcp/, "").replace(/^\/api\/v1/, "");
  const isRestRoute = REST_ROUTES.some((routePath) => cleanPath === routePath || cleanPath.startsWith(`${routePath}/`));

  if (!isRestRoute && req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405, { Allow: "GET, POST, OPTIONS" });
  }

  const credential = readBearer(req) ?? url.searchParams.get("key");
  const legacySessionId = req.method === "POST" ? url.searchParams.get("sessionId") : null;

  if (!credential && !legacySessionId) {
    return unauthorized(origin, { message: "Unauthorized: Access token or API key is required" });
  }

  if (!credential && legacySessionId) {
    return handleLegacyMessage(req, legacySessionId, null);
  }

  const supabase = createSupabase();

  let userId: string | null = null;
  if (credential) {
    userId = await verifyCredential(credential, supabase);
    if (!userId) {
      return unauthorized(origin, {
        message: "Unauthorized: Invalid or revoked access token/API key",
        oauthError: "invalid_token",
        oauthErrorDescription: "Invalid or revoked access token or API key",
      });
    }
  }

  if (isRestRoute) {
    if (!userId) {
      return unauthorized(origin, { message: "Unauthorized: Access token or API key is required" });
    }
    const { handleOpenApiRequest } = await import("./openapi.ts");
    return handleOpenApiRequest(req, url, supabase, userId);
  }

  if (legacySessionId) return handleLegacyMessage(req, legacySessionId, userId);

  if (!userId) {
    return unauthorized(origin, { message: "Unauthorized: Access token or API key is required" });
  }

  if (req.method === "GET") return handleStream(req, origin, endpointPath, userId, supabase);
  if (req.method === "POST") return handleStreamablePost(req, supabase, userId);

  return json({ error: "Method Not Allowed" }, 405, { Allow: "GET, POST, OPTIONS" });
}

async function handleLegacyMessage(req: Request, sessionId: string, userId: string | null): Promise<Response> {
  const session = sessions.get(sessionId);
  if (!session || (userId && userId !== session.userId)) {
    return json({ error: "Session not found" }, 404, { "Cache-Control": "no-store" });
  }

  let message: unknown;
  try {
    message = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, { "Cache-Control": "no-store" });
  }

  session.transport.onmessage?.(message);
  return new Response(null, { status: 202 });
}

async function handleStreamablePost(req: Request, supabase: SupabaseClient, userId: string): Promise<Response> {
  if (req.headers.has("mcp-session-id")) {
    return json({ error: "Session not found" }, 404, { "Cache-Control": "no-store" });
  }

  let message: Record<string, unknown>;
  try {
    message = JSON.parse(await req.text());
  } catch {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      400,
      { "Cache-Control": "no-store" },
    );
  }

  if (
    !message ||
    typeof message !== "object" ||
    Array.isArray(message) ||
    message.jsonrpc !== "2.0" ||
    (typeof message.method !== "string" && !("result" in message) && !("error" in message))
  ) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
      400,
      { "Cache-Control": "no-store" },
    );
  }

  const { handleJsonRpcRequest, isSupportedProtocolVersion } = await import("./jsonrpc.ts");

  const protocolVersion = req.headers.get("mcp-protocol-version")?.trim();
  if (protocolVersion && message.method !== "initialize" && !isSupportedProtocolVersion(protocolVersion)) {
    return json({ error: `Unsupported MCP-Protocol-Version: ${protocolVersion}` }, 400, {
      "Cache-Control": "no-store",
    });
  }

  return handleJsonRpcRequest(message, supabase, userId);
}

async function handleStream(
  req: Request,
  origin: string,
  endpointPath: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  if (req.headers.has("mcp-session-id")) {
    return json({ error: "Session not found" }, 404, { "Cache-Control": "no-store" });
  }

  const { isSupportedProtocolVersion } = await import("./jsonrpc.ts");
  const protocolVersion = req.headers.get("mcp-protocol-version")?.trim();
  if (protocolVersion && !isSupportedProtocolVersion(protocolVersion)) {
    return json({ error: `Unsupported MCP-Protocol-Version: ${protocolVersion}` }, 400, {
      "Cache-Control": "no-store",
    });
  }

  if (protocolVersion) return openEventStream(req);
  return openLegacySse(req, origin, endpointPath, userId, supabase);
}

function openEventStream(req: Request): Response {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);
    },
    cancel() {
      clearInterval(heartbeat);
    },
  });

  req.signal.addEventListener("abort", () => clearInterval(heartbeat));

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

async function openLegacySse(
  req: Request,
  origin: string,
  endpointPath: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;

  const body = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
    cancel() {
      closed = true;
      sessions.delete(sessionId);
    },
  });

  const sessionId = crypto.randomUUID();
  const endpoint = new URL(`${endpointPath}?sessionId=${sessionId}`, origin).toString();

  const transport: LegacyTransport = {
    sessionId,
    async start() {
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpoint}\n\n`));
    },
    async send(message: unknown) {
      controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`));
    },
    async close() {
      sessions.delete(sessionId);
      if (closed) return;
      closed = true;
      controller.close();
    },
  };

  sessions.set(sessionId, { userId, transport });

  req.signal.addEventListener("abort", () => {
    transport.close().catch(() => null);
  });

  const server = new McpServer({ name: "zentask-mcp", version: "1.0.0" });
  await registerTools(server, supabase, userId);
  await server.connect(transport as any);

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
