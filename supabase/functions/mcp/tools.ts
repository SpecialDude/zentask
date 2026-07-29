import { registerTaskTools } from './tools/taskTools.ts';
import { registerListTools } from './tools/listTools.ts';
import { registerCategoryTools } from './tools/categoryTools.ts';
import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";

export function registerTools(server: McpServer, supabase: SupabaseClient, userId: string) {
    registerTaskTools(server, supabase, userId);
    registerListTools(server, supabase, userId);
    registerCategoryTools(server, supabase, userId);
}
