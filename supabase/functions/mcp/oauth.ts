import { createClient } from "jsr:@supabase/supabase-js@2";
import { isDevHost } from "./origin.ts";

const jsonHeaders = { "Content-Type": "application/json" };
const noStoreHeaders = { ...jsonHeaders, "Cache-Control": "no-store" };

/**
 * Full OAuth 2.0 Authorization Server implementation for MCP.
 * Wraps Supabase Auth into a standards-compliant OAuth 2.0 AS
 * with DCR, PKCE (S256), authorization code flow, and token refresh.
 */
export async function handleOAuthRoute(
  req: Request,
  url: URL,
  origin: string,
  endpointPath: string
): Promise<Response | null> {
  const pathname = url.pathname;

  // ──────────────────────────────────────────────
  // 1. Protected Resource Metadata (RFC 9728)
  // ──────────────────────────────────────────────
  if (pathname.includes(".well-known/oauth-protected-resource")) {
    return new Response(
      JSON.stringify({
        resource: `${origin}${endpointPath}`,
        authorization_servers: [origin],
        scopes_supported: ["authenticated"],
        bearer_methods_supported: ["header"],
      }),
      { headers: jsonHeaders }
    );
  }

  // ──────────────────────────────────────────────
  // 2. Authorization Server Metadata (RFC 8414)
  // ──────────────────────────────────────────────
  if (pathname.includes(".well-known/oauth-authorization-server")) {
    return new Response(
      JSON.stringify({
        issuer: origin,
        authorization_endpoint: `${origin}/oauth/authorize`,
        token_endpoint: `${origin}/oauth/token`,
        registration_endpoint: `${origin}/oauth/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: [
          "none",
          "client_secret_basic",
          "client_secret_post",
        ],
        scopes_supported: ["authenticated", "offline_access"],
        client_id_metadata_document_supported: true,
      }),
      { headers: jsonHeaders }
    );
  }

  // ──────────────────────────────────────────────
  // 3. Dynamic Client Registration (RFC 7591)
  // ──────────────────────────────────────────────
  if (pathname.includes("/oauth/register") && req.method === "POST") {
    const body = await req.json();
    const clientId = crypto.randomUUID();
    return new Response(
      JSON.stringify({
        client_id: clientId,
        client_name: body.client_name || "MCP Client",
        redirect_uris: body.redirect_uris || [],
        grant_types: body.grant_types || ["authorization_code"],
        response_types: body.response_types || ["code"],
        token_endpoint_auth_method:
          body.token_endpoint_auth_method || "none",
      }),
      { status: 201, headers: jsonHeaders }
    );
  }

  // ──────────────────────────────────────────────
  // 4a. Authorization Endpoint — GET (redirect to frontend consent page)
  // ──────────────────────────────────────────────
  if (pathname.includes("/oauth/authorize") && req.method === "GET") {
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const responseType = url.searchParams.get("response_type") || "code";

    if (responseType !== "code") {
      return oauthError("unsupported_response_type", "Only response_type=code is supported");
    }
    if (!isSafeRedirectUri(redirectUri)) {
      return oauthError(
        "invalid_request",
        "A valid redirect_uri (HTTPS or localhost) is required"
      );
    }

    // Forward all OAuth params to the frontend consent page (the SPA serves
    // it with a proper text/html content type; the edge gateway otherwise
    // serves raw HTML responses as text/plain)
    const consentUrl = new URL(`${origin}/oauth-consent`);
    for (const [key, value] of url.searchParams.entries()) {
      consentUrl.searchParams.set(key, value);
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: consentUrl.toString(),
        "Cache-Control": "no-store",
      },
    });
  }

  // ──────────────────────────────────────────────
  // 4b. Authorization Endpoint — POST (process login form)
  // ──────────────────────────────────────────────
  if (pathname.includes("/oauth/authorize") && req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return oauthError("invalid_request", "Request body must be JSON");
    }

    const {
      email,
      password,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      client_id,
    } = body;

    if (!isSafeRedirectUri(redirect_uri)) {
      return oauthError(
        "invalid_request",
        "A valid redirect_uri (HTTPS or localhost) is required"
      );
    }
    if (code_challenge_method && code_challenge_method !== "S256") {
      return oauthError(
        "invalid_request",
        "Only the S256 code_challenge_method is supported"
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      return new Response(
        JSON.stringify({
          error: authError?.message || "Invalid credentials",
        }),
        { status: 401, headers: noStoreHeaders }
      );
    }

    // Build a signed JWT as the authorization code
    const codePayload = {
      sub: authData.user.id,
      at: authData.session.access_token,
      rt: authData.session.refresh_token,
      cc: code_challenge,
      ccm: code_challenge_method || "S256",
      ru: redirect_uri,
      cid: client_id,
      exp: Math.floor(Date.now() / 1000) + 300, // 5 min
    };

    const signingSecret = Deno.env.get("SUPABASE_ANON_KEY") || "secret";
    const code = await signJwt(codePayload, signingSecret);

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ redirect: redirectUrl.toString() }),
      { headers: noStoreHeaders }
    );
  }

  // ──────────────────────────────────────────────
  // 5. Token Endpoint (RFC 6749 §4.1.3 + refresh)
  // ──────────────────────────────────────────────
  if (pathname.includes("/oauth/token") && req.method === "POST") {
    // Accept both form-urlencoded (required by RFC 6749) and JSON
    let params: Record<string, string> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      new URLSearchParams(text).forEach((v, k) => (params[k] = v));
    } else {
      try {
        params = await req.json();
      } catch {
        return oauthError("invalid_request", "Request body must be form-urlencoded or JSON");
      }
    }

    const signingSecret = Deno.env.get("SUPABASE_ANON_KEY") || "secret";

    // --- authorization_code grant ---
    if (params.grant_type === "authorization_code") {
      const payload = await verifyJwt(params.code, signingSecret);
      if (!payload) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description:
              "Invalid or expired authorization code",
          }),
          { status: 400, headers: noStoreHeaders }
        );
      }

      if (payload.ru && params.redirect_uri && payload.ru !== params.redirect_uri) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "redirect_uri does not match the authorization request",
          }),
          { status: 400, headers: noStoreHeaders }
        );
      }

      // PKCE verification (S256)
      if (payload.cc && params.code_verifier) {
        const encoder = new TextEncoder();
        const digest = await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(params.code_verifier)
        );
        const computed = base64url(new Uint8Array(digest));
        if (computed !== payload.cc) {
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "PKCE verification failed",
            }),
            { status: 400, headers: noStoreHeaders }
          );
        }
      }

      return new Response(
        JSON.stringify({
          access_token: payload.at,
          refresh_token: payload.rt,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "authenticated",
        }),
        { headers: noStoreHeaders }
      );
    }

    // --- refresh_token grant ---
    if (params.grant_type === "refresh_token") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: params.refresh_token,
      });
      if (error || !data.session) {
        return new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description:
              error?.message || "Refresh failed",
          }),
          { status: 400, headers: noStoreHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "authenticated",
        }),
        { headers: noStoreHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "unsupported_grant_type" }),
      { status: 400, headers: noStoreHeaders }
    );
  }

  return null; // Not an OAuth route
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════

function oauthError(error: string, description: string): Response {
  return new Response(
    JSON.stringify({ error, error_description: description }),
    { status: 400, headers: noStoreHeaders }
  );
}

function isSafeRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const scheme = parsed.protocol.toLowerCase();
  if (["javascript:", "data:", "vbscript:", "file:", "blob:"].includes(scheme)) {
    return false;
  }
  if (scheme === "http:" && !isDevHost(parsed.hostname)) {
    return false;
  }
  return true;
}

function base64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signJwt(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64url(
    enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  );
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(data))
  );
  return `${data}.${base64url(sig)}`;
}

async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, any> | null> {
  try {
    const [hB64, pB64, sB64] = token.split(".");
    if (!hB64 || !pB64 || !sB64) return null;
    const enc = new TextEncoder();
    const data = `${hB64}.${pB64}`;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sig = Uint8Array.from(
      atob(sB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    if (!(await crypto.subtle.verify("HMAC", key, sig, enc.encode(data))))
      return null;
    const payload = JSON.parse(
      atob(pB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch {
    return null;
  }
}
