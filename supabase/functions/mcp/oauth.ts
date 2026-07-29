import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

/**
 * Full OAuth 2.0 Authorization Server implementation for MCP.
 * Wraps Supabase Auth into a standards-compliant OAuth 2.0 AS
 * with DCR, PKCE (S256), authorization code flow, and token refresh.
 */
export async function handleOAuthRoute(
  req: Request,
  url: URL,
  origin: string
): Promise<Response | null> {
  const pathname = url.pathname;

  // ──────────────────────────────────────────────
  // 1. Protected Resource Metadata (RFC 9728)
  // ──────────────────────────────────────────────
  if (pathname.includes(".well-known/oauth-protected-resource")) {
    return new Response(
      JSON.stringify({
        resource: `${origin}/api/mcp`,
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
    // Forward all OAuth params to the frontend consent page
    const consentUrl = new URL(`${origin}/oauth-consent`);
    for (const [key, value] of url.searchParams.entries()) {
      consentUrl.searchParams.set(key, value);
    }
    return Response.redirect(consentUrl.toString(), 302);
  }

  // ──────────────────────────────────────────────
  // 4b. Authorization Endpoint — POST (process login form)
  // ──────────────────────────────────────────────
  if (pathname.includes("/oauth/authorize") && req.method === "POST") {
    const body = await req.json();
    const {
      email,
      password,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      client_id,
    } = body;

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
        { status: 401, headers: jsonHeaders }
      );
    }

    // Build a signed JWT as the authorization code
    const codePayload = {
      sub: authData.user.id,
      at: authData.session.access_token,
      rt: authData.session.refresh_token,
      cc: code_challenge,
      ccm: code_challenge_method,
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
      { headers: jsonHeaders }
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
      params = await req.json();
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
          { status: 400, headers: jsonHeaders }
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
            { status: 400, headers: jsonHeaders }
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
        { headers: jsonHeaders }
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
          { status: 400, headers: jsonHeaders }
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
        { headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "unsupported_grant_type" }),
      { status: 400, headers: jsonHeaders }
    );
  }

  return null; // Not an OAuth route
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
//  Consent / Login Page HTML
// ═══════════════════════════════════════════════

function buildConsentPage(opts: {
  origin: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ZenTask — Authorize</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1e293b;border-radius:20px;padding:36px 32px;max-width:400px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:20px}
.logo h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,#818cf8,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo p{font-size:13px;color:#94a3b8;margin-top:6px}
.info{background:#334155;border-radius:10px;padding:14px;margin-bottom:20px;font-size:12px;color:#94a3b8;line-height:1.5}
.info strong{color:#e2e8f0}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em}
.field input{width:100%;padding:11px 14px;background:#0f172a;border:2px solid #334155;border-radius:10px;color:#e2e8f0;font-size:14px;outline:none;transition:border .2s}
.field input:focus{border-color:#6366f1}
.btn{width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;transition:transform .1s,box-shadow .2s}
.btn:hover{box-shadow:0 8px 25px -5px rgba(99,102,241,.4)}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.err{background:#7f1d1d;color:#fca5a5;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;display:none}
.redir{text-align:center;margin-top:14px;font-size:10px;color:#475569}
</style>
</head>
<body>
<div class="card">
  <div class="logo"><h1>⚡ ZenTask</h1><p>Authorize access to your account</p></div>
  <div class="info"><strong>Claude</strong> wants to connect to your ZenTask account to manage tasks, lists, and categories on your behalf.</div>
  <div class="err" id="err"></div>
  <form id="f">
    <input type="hidden" name="redirect_uri" value="${opts.redirectUri}">
    <input type="hidden" name="state" value="${opts.state}">
    <input type="hidden" name="code_challenge" value="${opts.codeChallenge}">
    <input type="hidden" name="code_challenge_method" value="${opts.codeChallengeMethod}">
    <input type="hidden" name="client_id" value="${opts.clientId}">
    <input type="hidden" name="scope" value="${opts.scope}">
    <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input type="password" name="password" required autocomplete="current-password" placeholder="••••••••"></div>
    <button type="submit" class="btn" id="btn">Authorize &amp; Connect</button>
  </form>
  <div class="redir">Redirect: ${opts.redirectUri.split("?")[0]}</div>
</div>
<script>
const f=document.getElementById('f'),e=document.getElementById('err'),b=document.getElementById('btn');
f.addEventListener('submit',async ev=>{
  ev.preventDefault();e.style.display='none';b.disabled=true;b.textContent='Authorizing…';
  const d=new FormData(f);
  try{
    const r=await fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:d.get('email'),password:d.get('password'),redirect_uri:d.get('redirect_uri'),
        state:d.get('state'),code_challenge:d.get('code_challenge'),
        code_challenge_method:d.get('code_challenge_method'),
        client_id:d.get('client_id'),scope:d.get('scope')})});
    const j=await r.json();
    if(j.redirect){window.location.href=j.redirect}
    else{throw new Error(j.error||'Authentication failed')}
  }catch(x){e.textContent=x.message;e.style.display='block';b.disabled=false;b.textContent='Authorize & Connect'}
});
</script>
</body></html>`;
}
