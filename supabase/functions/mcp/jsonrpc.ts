import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "./tools.ts";

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export function isSupportedProtocolVersion(version: string): boolean {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(version);
}

const servers = new Map<string, { client: Client; server: McpServer }>();

async function getMcpSession(supabase: SupabaseClient, userId: string) {
  let entry = servers.get(userId);
  if (entry) return entry;

  const server = new McpServer({ name: "zentask-mcp", version: "1.0.0" });
  await registerTools(server, supabase, userId);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "zentask-jsonrpc", version: "1.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  entry = { client, server };
  servers.set(userId, entry);
  return entry;
}

const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export async function handleJsonRpcRequest(
  rpcReq: any,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const { jsonrpc, id, method, params } = rpcReq;

  const successResponse = (result: any) =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null,
        result,
      }),
      { status: 200, headers: jsonHeaders }
    );

  const errorResponse = (code: number, message: string, data?: any) =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null,
        error: { code, message, data },
      }),
      { status: 200, headers: jsonHeaders }
    );

  if (jsonrpc !== "2.0") {
    return errorResponse(-32600, "Invalid Request: jsonrpc version must be 2.0");
  }

  if (
    method === undefined ||
    method === null ||
    !("id" in rpcReq) ||
    (typeof method === "string" && method.startsWith("notifications/"))
  ) {
    return new Response(null, { status: 202 });
  }

  if (method === "initialize") {
    const requested = params?.protocolVersion;
    const protocolVersion =
      typeof requested === "string" && isSupportedProtocolVersion(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
    return successResponse({
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
      serverInfo: {
        name: "zentask-mcp",
        version: "1.0.0",
      },
    });
  }

  if (method === "ping") {
    return successResponse({});
  }

  if (method === "tools/list") {
    try {
      const session = await getMcpSession(supabase, userId);
      const { tools } = await session.client.listTools();
      return successResponse({ tools });
    } catch (err: any) {
      return errorResponse(-32603, `Failed to list tools: ${err.message}`);
    }
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    try {
      const session = await getMcpSession(supabase, userId);
      const result = await session.client.callTool({ name, arguments: args });
      return successResponse(result);
    } catch (err: any) {
      return errorResponse(-32602, err.message || String(err));
    }
  }

  return errorResponse(-32601, `Method not found: ${method}`);
}
