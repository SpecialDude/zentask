import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "./tools.ts";

// In-process MCP server pair, cached per user so tools/list and tools/call
// ALWAYS reflect the tools registered via registerTools (single source of truth).
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

export async function handleJsonRpcRequest(
  rpcReq: any,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const { jsonrpc, id, method, params } = rpcReq;

  const jsonHeaders = { "Content-Type": "application/json" };

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

  // 1. Handshake: initialize
  if (method === "initialize") {
    return successResponse({
      protocolVersion: "2024-11-05",
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

  // 2. Notification: notifications/initialized
  if (method === "notifications/initialized") {
    return new Response(null, { status: 204 });
  }

  // 3. Ping: ping
  if (method === "ping") {
    return successResponse({});
  }

  // 4. Discovery: tools/list — delegate to the same registered tools as SSE
  if (method === "tools/list") {
    try {
      const session = await getMcpSession(supabase, userId);
      const { tools } = await session.client.listTools();
      return successResponse({ tools });
    } catch (err: any) {
      return errorResponse(-32603, `Failed to list tools: ${err.message}`);
    }
  }

  // 5. Execution: tools/call — delegate to the same registered tools as SSE
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