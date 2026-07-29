import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "npm:@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./tools.ts";
import { handleOAuthRoute } from "./oauth.ts";

const transports = new Map<string, SSEServerTransport>();

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const jsonHeaders = { "Content-Type": "application/json" };

  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey, x-mcp-origin",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const origin = (() => {
    const customOrigin = req.headers.get("x-mcp-origin");
    if (customOrigin) return customOrigin.trim();

    const queryOrigin = url.searchParams.get("origin");
    if (queryOrigin) return queryOrigin.trim();

    const rawForwarded = req.headers.get("x-forwarded-host") || req.headers.get("x-original-host") || req.headers.get("host") || url.host;
    const firstHost = rawForwarded.split(",")[0].trim();

    // If host is Supabase internal or edge runtime, fallback to production public domain zentask.space
    if (firstHost.includes("supabase.co") || firstHost.includes("edge-runtime.supabase.com") || firstHost.includes("supabase.net")) {
      const publicDomain = Deno.env.get("PUBLIC_APP_URL") || "zentask.space";
      const cleanDomain = publicDomain.replace(/^https?:\/\//, "");
      return `https://${cleanDomain}`;
    }

    const proto = firstHost.includes("localhost") || firstHost.includes("127.0.0.1") ? "http" : "https";
    return `${proto}://${firstHost}`;
  })();

  // ── 1. OAuth & Discovery Routes (no auth required) ──
  const oauthResponse = await handleOAuthRoute(req, url, origin);
  if (oauthResponse) return oauthResponse;

  // ── 2. Extract Token / Key ──
  const apiKey = url.searchParams.get("key") || req.headers.get("authorization")?.replace("Bearer ", "");

  // If no auth provided, return 401 with RFC 9728 WWW-Authenticate header
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized: Access token or API Key is required" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
      },
    });
  }

  // Supabase Client Setup (service role key used to perform authenticated DB writes for user_id)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  let userId: string | null = null;

  // 3. Dual Authentication (API Key vs Supabase Access Token)
  if (apiKey.startsWith("zt_live_")) {
    // API Key Auth
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: userData, error } = await supabase
      .from("user_api_keys")
      .select("id, user_id")
      .eq("key_hash", keyHash)
      .single();

    if (!error && userData) {
      userId = userData.user_id;
      supabase.from("user_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", userData.id).then();
    }
  } else {
    // Supabase JWT Token Auth (for OAuth / Logged in users)
    const { data: { user }, error } = await supabase.auth.getUser(apiKey);
    if (!error && user) {
      userId = user.id;
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or revoked access token/API key" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  // 4. Handle OpenAPI REST routes (/tasks, /summary, /lists, /categories)
  const cleanPath = url.pathname.replace(/^\/functions\/v1\/mcp/, "").replace(/^\/api\/v1/, "");
  if (cleanPath.startsWith("/tasks") || cleanPath.startsWith("/summary") || cleanPath.startsWith("/lists") || cleanPath.startsWith("/categories")) {
    const { handleOpenApiRequest } = await import("./openapi.ts");
    return handleOpenApiRequest(req, url, supabase, userId);
  }

  // 5. Handle JSON-RPC 2.0 Streamable HTTP requests (POST with jsonrpc body)
  if (req.method === "POST" && !url.searchParams.has("sessionId")) {
    try {
      const bodyText = await req.clone().text();
      const rpcReq = JSON.parse(bodyText);
      if (rpcReq.jsonrpc === "2.0" && rpcReq.method) {
        const { handleJsonRpcRequest } = await import("./jsonrpc.ts");
        return handleJsonRpcRequest(rpcReq, supabase, userId);
      }
    } catch (_e) {
      // Fallthrough to SSE POST handler if not standard JSON-RPC 2.0
    }
  }

  // 6. Handle SSE Connection (GET)
  if (req.method === "GET") {
    let controller: ReadableStreamDefaultController;
    const body = new ReadableStream({
      start(c) {
        controller = c;
      },
    });

    const sessionId = crypto.randomUUID();
    const endpoint = new URL(`/api/mcp?sessionId=${sessionId}`, url.origin).toString();
    const encoder = new TextEncoder();
    
    const transport = {
        sessionId,
        onmessage: undefined,
        onclose: undefined,
        onerror: undefined,
        async start() {
            controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpoint}\n\n`));
        },
        async send(message: any) {
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`));
        },
        async close() {
            controller.close();
            transports.delete(sessionId);
        }
    };
    
    transports.set(sessionId, transport as any);
    
    req.signal.addEventListener('abort', () => {
        transport.close();
    });

    const server = new McpServer({ name: "zentask-mcp", version: "1.0.0" });
    registerTools(server, supabase, userId);
    await server.connect(transport as any);

    return new Response(body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    });
  }

  // 7. Handle SSE Incoming Messages (POST with sessionId)
  if (req.method === "POST" && url.searchParams.has("sessionId")) {
    const sessionId = url.searchParams.get("sessionId")!;
    const transport = transports.get(sessionId);
    if (!transport) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: jsonHeaders });
    }

    const message = await req.json();
    if (transport.onmessage) {
        // @ts-ignore
        transport.onmessage(message);
    }

    return new Response("Accepted", { status: 202 });
  }

  return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: jsonHeaders });
});
