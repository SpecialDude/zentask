import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getTodayStr, syncParents } from "./utils.ts";

export async function handleOpenApiRequest(
  req: Request,
  url: URL,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const pathname = url.pathname.replace(/^\/functions\/v1\/mcp/, "").replace(/^\/api\/v1/, "");
  const method = req.method.toUpperCase();

  const jsonHeaders = { "Content-Type": "application/json" };

  try {
    // 1. GET /tasks - List Tasks
    if (pathname === "/tasks" && method === "GET") {
      const date = url.searchParams.get("date");
      const status = url.searchParams.get("status");
      const priority = url.searchParams.get("priority");
      const categoryId = url.searchParams.get("categoryId") || url.searchParams.get("category_id");
      const query = url.searchParams.get("query") || url.searchParams.get("search");

      let dbQuery = supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId);

      if (date) {
        const formattedDate = date.toLowerCase() === "today" ? getTodayStr() : date;
        dbQuery = dbQuery.eq("date", formattedDate);
      }
      if (status) dbQuery = dbQuery.ilike("status", status);
      if (priority) dbQuery = dbQuery.ilike("priority", priority);
      if (categoryId) dbQuery = dbQuery.eq("categoryId", categoryId);

      const { data, error } = await dbQuery.order("createdAt", { ascending: true });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });

      let tasks = data || [];
      if (query) {
        const q = query.toLowerCase();
        tasks = tasks.filter(
          (t: any) => (t.title && t.title.toLowerCase().includes(q)) || (t.description && t.description.toLowerCase().includes(q))
        );
      }
      return new Response(JSON.stringify({ tasks }), { status: 200, headers: jsonHeaders });
    }

    // 2. POST /tasks - Create Task
    if (pathname === "/tasks" && method === "POST") {
      const body = await req.json();
      if (!body.title) {
        return new Response(JSON.stringify({ error: "title is required" }), { status: 400, headers: jsonHeaders });
      }

      const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      const newTask = {
        id,
        user_id: userId,
        title: body.title.trim(),
        description: body.description || "",
        date: body.date ? (body.date.toLowerCase() === "today" ? getTodayStr() : body.date) : getTodayStr(),
        status: (body.status || "TODO").toUpperCase(),
        priority: (body.priority || "MEDIUM").toUpperCase(),
        duration: body.duration || null,
        startTime: body.startTime || null,
        completion: 0,
        categoryId: body.categoryId || body.category_id || null,
        parentId: body.parentId || body.parent_id || null,
        isRecurring: false,
        createdAt: now,
        updatedAt: now
      };

      const { data, error } = await supabase.from("tasks").insert(newTask).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });

      if (newTask.parentId) {
        await syncParents(supabase, userId, newTask.parentId);
      }

      return new Response(JSON.stringify({ task: data }), { status: 201, headers: jsonHeaders });
    }

    // 3. GET /tasks/:id - Get Task Details
    const taskIdMatch = pathname.match(/^\/tasks\/([^\/]+)$/);
    if (taskIdMatch && method === "GET") {
      const taskId = taskIdMatch[1];
      const { data: task, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("user_id", userId)
        .single();

      if (error || !task) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: jsonHeaders });

      const { data: subtasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("parentId", taskId)
        .eq("user_id", userId);

      return new Response(JSON.stringify({ task: { ...task, subtasks: subtasks || [] } }), { status: 200, headers: jsonHeaders });
    }

    // 4. PATCH /tasks/:id/status - Update Status
    const statusMatch = pathname.match(/^\/tasks\/([^\/]+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const taskId = statusMatch[1];
      const body = await req.json();
      const newStatus = (body.status || "").toUpperCase();

      const { data: existing } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("user_id", userId)
        .single();

      if (!existing) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: jsonHeaders });

      let completion = existing.completion;
      if (newStatus === "COMPLETED") completion = 100;
      else if (newStatus === "TODO") completion = 0;
      else if (newStatus === "IN_PROGRESS") completion = 50;

      const updates: any = { status: newStatus, completion, updatedAt: Date.now() };

      const { data: updated, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      if (existing.parentId) await syncParents(supabase, userId, existing.parentId);

      return new Response(JSON.stringify({ task: updated }), { status: 200, headers: jsonHeaders });
    }

    // 5. GET /summary - Productivity Summary
    if (pathname === "/summary" && method === "GET") {
      const date = url.searchParams.get("date");
      const targetDate = date ? (date.toLowerCase() === "today" ? getTodayStr() : date) : getTodayStr();

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("date", targetDate);

      const allTasks = tasks || [];
      const total = allTasks.length;
      const completed = allTasks.filter((t: any) => t.status === "COMPLETED").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return new Response(
        JSON.stringify({
          date: targetDate,
          total_tasks: total,
          completed_tasks: completed,
          completion_rate: `${rate}%`,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 6. GET /lists - List Quick Lists
    if (pathname === "/lists" && method === "GET") {
      const { data, error } = await supabase.from("quick_lists").select("*").eq("user_id", userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ lists: data || [] }), { status: 200, headers: jsonHeaders });
    }

    // 7. POST /lists - Create Quick List
    if (pathname === "/lists" && method === "POST") {
      const body = await req.json();
      const items = (body.items || []).map((text: string) => ({
        id: crypto.randomUUID(),
        text,
        checked: false,
      }));

      const { data, error } = await supabase
        .from("quick_lists")
        .insert({
          user_id: userId,
          title: body.title,
          type: body.type || "checkbox",
          items,
        })
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ list: data }), { status: 201, headers: jsonHeaders });
    }

    // 8. GET /categories - List Categories
    if (pathname === "/categories" && method === "GET") {
      const { data, error } = await supabase.from("categories").select("*").eq("user_id", userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ categories: data || [] }), { status: 200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: jsonHeaders });
  }
}
