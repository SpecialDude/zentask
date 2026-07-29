import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getTodayStr, syncParents } from "./utils.ts";

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

  // 4. Discovery: tools/list
  if (method === "tools/list") {
    return successResponse({
      tools: [
        {
          name: "list_tasks",
          description: "Query tasks by date, status, priority, category, or search string.",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD or 'today'" },
              status: { type: "string", description: "TODO, IN_PROGRESS, COMPLETED, CANCELLED" },
              priority: { type: "string", description: "LOW, MEDIUM, HIGH, URGENT" },
              categoryId: { type: "string" },
              query: { type: "string", description: "Search query string" },
              search: { type: "string", description: "Search query string" }
            }
          }
        },
        {
          name: "get_task",
          description: "Get task details including subtasks",
          inputSchema: {
            type: "object",
            required: ["taskId"],
            properties: {
              taskId: { type: "string" }
            }
          }
        },
        {
          name: "create_task",
          description: "Create a new task or subtask",
          inputSchema: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD or 'today'" },
              priority: { type: "string", description: "LOW, MEDIUM, HIGH, URGENT" },
              duration: { type: "number", description: "Duration in minutes" },
              startTime: { type: "string", description: "HH:mm" },
              categoryId: { type: "string" },
              parentId: { type: "string", description: "Parent task ID for subtasks" }
            }
          }
        },
        {
          name: "update_task_status",
          description: "Update task status",
          inputSchema: {
            type: "object",
            required: ["taskId", "status"],
            properties: {
              taskId: { type: "string" },
              status: { type: "string", description: "TODO, IN_PROGRESS, COMPLETED, CANCELLED" }
            }
          }
        },
        {
          name: "get_daily_summary",
          description: "Get daily productivity metrics summary",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD or 'today'" }
            }
          }
        },
        {
          name: "list_quick_lists",
          description: "Fetch user quick lists and documents",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "create_quick_list",
          description: "Create a new checklist or document",
          inputSchema: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" },
              type: { type: "string", enum: ["bullet", "checkbox", "numbered", "document"] },
              items: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "list_categories",
          description: "Retrieve task categories",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    });
  }

  // 5. Execution: tools/call
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    try {
      if (name === "list_tasks") {
        let dbQuery = supabase.from("tasks").select("*").eq("user_id", userId);
        if (args.date) {
          const targetDate = args.date.toLowerCase() === "today" ? getTodayStr() : args.date;
          dbQuery = dbQuery.eq("date", targetDate);
        }
        if (args.status) {
          dbQuery = dbQuery.ilike("status", args.status);
        }
        if (args.priority) {
          dbQuery = dbQuery.ilike("priority", args.priority);
        }
        if (args.categoryId) {
          dbQuery = dbQuery.eq("categoryId", args.categoryId);
        }

        const { data, error } = await dbQuery.order("createdAt", { ascending: true });
        if (error) return errorResponse(-32603, error.message);

        let tasks = data || [];
        const searchQuery = args.query || args.search;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          tasks = tasks.filter((t: any) =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.description && t.description.toLowerCase().includes(q))
          );
        }

        return successResponse({
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }]
        });
      }

      if (name === "get_task") {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", args.taskId)
          .eq("user_id", userId)
          .single();

        if (error || !task) return errorResponse(-32602, "Task not found");

        const { data: subtasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("parentId", args.taskId)
          .eq("user_id", userId);

        return successResponse({
          content: [{ type: "text", text: JSON.stringify({ task, subtasks: subtasks || [] }, null, 2) }]
        });
      }

      if (name === "create_task") {
        const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = Date.now();
        const targetDate = args.date ? (args.date.toLowerCase() === "today" ? getTodayStr() : args.date) : getTodayStr();

        const newTask = {
          id,
          user_id: userId,
          title: args.title?.trim() || "",
          description: args.description || "",
          date: targetDate,
          status: (args.status || "TODO").toUpperCase(),
          priority: (args.priority || "MEDIUM").toUpperCase(),
          duration: args.duration || null,
          startTime: args.startTime || null,
          completion: 0,
          categoryId: args.categoryId || null,
          parentId: args.parentId || null,
          isRecurring: false,
          createdAt: now,
          updatedAt: now
        };

        const { data, error } = await supabase.from("tasks").insert(newTask).select().single();
        if (error) return errorResponse(-32603, error.message);
        if (args.parentId) await syncParents(supabase, userId, args.parentId);

        return successResponse({
          content: [{ type: "text", text: `Task created successfully: ${JSON.stringify(data, null, 2)}` }]
        });
      }

      if (name === "update_task_status") {
        const newStatus = args.status.toUpperCase();
        let completion = 0;
        if (newStatus === "COMPLETED") completion = 100;
        else if (newStatus === "IN_PROGRESS") completion = 50;

        const updates: any = { status: newStatus, completion, updatedAt: Date.now() };

        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", args.taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) return errorResponse(-32603, error.message);
        if (data?.parentId) await syncParents(supabase, userId, data.parentId);

        return successResponse({
          content: [{ type: "text", text: `Status updated to ${newStatus}` }]
        });
      }

      if (name === "get_daily_summary") {
        const targetDate = args.date ? (args.date.toLowerCase() === "today" ? getTodayStr() : args.date) : getTodayStr();
        const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", userId).eq("date", targetDate);
        const allTasks = tasks || [];
        const total = allTasks.length;
        const completed = allTasks.filter((t: any) => t.status === "COMPLETED").length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return successResponse({
          content: [{
            type: "text",
            text: JSON.stringify({ date: targetDate, total_tasks: total, completed_tasks: completed, completion_rate: `${rate}%` }, null, 2)
          }]
        });
      }

      if (name === "list_quick_lists") {
        const { data, error } = await supabase.from("quick_lists").select("*").eq("user_id", userId);
        if (error) return errorResponse(-32603, error.message);
        return successResponse({
          content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }]
        });
      }

      if (name === "create_quick_list") {
        const items = (args.items || []).map((text: string) => ({ id: crypto.randomUUID(), text, checked: false }));
        const { data, error } = await supabase.from("quick_lists").insert({
          user_id: userId,
          title: args.title,
          type: args.type || "checkbox",
          items
        }).select().single();

        if (error) return errorResponse(-32603, error.message);
        return successResponse({
          content: [{ type: "text", text: `Quick list created: ${JSON.stringify(data, null, 2)}` }]
        });
      }

      if (name === "list_categories") {
        const { data, error } = await supabase.from("categories").select("*").eq("user_id", userId);
        if (error) return errorResponse(-32603, error.message);
        return successResponse({
          content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }]
        });
      }

      return errorResponse(-32601, `Unknown tool: ${name}`);
    } catch (err: any) {
      return errorResponse(-32603, err.message);
    }
  }

  return errorResponse(-32601, `Method not found: ${method}`);
}
