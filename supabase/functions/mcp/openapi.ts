import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getTodayStr, syncParents } from "./utils.ts";
import {
  notifyTaskCreated,
  notifyTaskUpdated,
  notifyTaskDeleted,
  notifyListCreated,
  notifyListDeleted,
  notifyCategoryUpdated,
  notifyCategoryDeleted
} from "./notificationHelper.ts";

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

    // 2. POST /tasks - Create Task (with optional nested subtasks)
    if (pathname === "/tasks" && method === "POST") {
      const body = await req.json();
      if (!body.title) {
        return new Response(JSON.stringify({ error: "title is required" }), { status: 400, headers: jsonHeaders });
      }

      const targetDate = body.date
        ? (String(body.date).toLowerCase() === "today" ? getTodayStr() : String(body.date))
        : getTodayStr();

      // Recursively insert a task and all of its subtasks.
      const insertTaskTree = async (input: any, parent: string | null, fallbackDate: string): Promise<any[]> => {
        const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = Date.now();
        const taskDate = input.date
          ? (String(input.date).toLowerCase() === "today" ? getTodayStr() : String(input.date))
          : fallbackDate;

        const newTask = {
          id,
          user_id: userId,
          title: String(input.title).trim(),
          description: input.description || "",
          date: taskDate,
          status: (input.status || "TODO").toUpperCase(),
          priority: (input.priority || "MEDIUM").toUpperCase(),
          duration: input.duration || null,
          startTime: input.startTime || null,
          completion: 0,
          categoryId: input.categoryId || input.category_id || null,
          parentId: parent,
          isRecurring: !!input.isRecurring,
          recurrencePattern: input.recurrencePattern || null,
          createdAt: now,
          updatedAt: now
        };

        const { data, error } = await supabase.from("tasks").insert(newTask).select().single();
        if (error) throw error;

        const allTasks = [data];
        for (const sub of input.subtasks || []) {
          allTasks.push(...await insertTaskTree(sub, data.id, taskDate));
        }
        return allTasks;
      };

      let allInserted: any[];
      try {
        allInserted = await insertTaskTree(body, body.parentId || body.parent_id || null, targetDate);
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      }

      const root = allInserted[0];

      if (root.parentId) {
        await syncParents(supabase, userId, root.parentId);
      }

      await notifyTaskCreated(supabase, userId, root.title, root.id, root.date);

      return new Response(
        JSON.stringify({ task: root, subtasks: allInserted.slice(1) }),
        { status: 201, headers: jsonHeaders }
      );
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

    // 4. PATCH /tasks/:id - Update Task Details
    const taskUpdateMatch = pathname.match(/^\/tasks\/([^\/]+)$/);
    if (taskUpdateMatch && method === "PATCH") {
      const taskId = taskUpdateMatch[1];
      const body = await req.json();

      const { data: existingTask, error: fetchErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("user_id", userId)
        .single();

      if (fetchErr || !existingTask) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: jsonHeaders });

      const parentId = body.parentId !== undefined ? body.parentId : body.parent_id;

      // Guard against reparenting to one of the task's own descendants.
      if (parentId !== undefined && parentId !== existingTask.parentId && parentId) {
        const isDescendant = async (candidateId: string): Promise<boolean> => {
          let current: string | null = candidateId;
          while (current) {
            if (current === taskId) return true;
            const { data: ancestor } = await supabase
              .from("tasks")
              .select("parentId")
              .eq("id", current)
              .eq("user_id", userId)
              .single();
            if (!ancestor) break;
            current = ancestor.parentId;
          }
          return false;
        };

        if (await isDescendant(parentId)) {
          return new Response(JSON.stringify({ error: "Cannot move task under its own descendant" }), { status: 400, headers: jsonHeaders });
        }
      }

      const updates: any = { updatedAt: Date.now() };

      if (body.title !== undefined) updates.title = String(body.title).trim();
      if (body.description !== undefined) updates.description = body.description;
      if (body.priority !== undefined) updates.priority = String(body.priority).toUpperCase();
      if (body.duration !== undefined) updates.duration = body.duration;
      if (body.startTime !== undefined) updates.startTime = body.startTime;
      if (body.categoryId !== undefined || body.category_id !== undefined) updates.categoryId = body.categoryId ?? body.category_id;
      if (body.isRecurring !== undefined) updates.isRecurring = !!body.isRecurring;
      if (body.recurrencePattern !== undefined) updates.recurrencePattern = body.recurrencePattern;
      if (parentId !== undefined) updates.parentId = parentId;

      if (body.date !== undefined) {
        updates.date = String(body.date).toLowerCase() === "today" ? getTodayStr() : String(body.date);
      }

      if (body.status !== undefined) {
        const newStatus = String(body.status).toUpperCase();
        updates.status = newStatus;
        if (newStatus === "COMPLETED") updates.completion = 100;
        else if (newStatus === "TODO") updates.completion = 0;
        else if (newStatus === "IN_PROGRESS" && existingTask.completion === 100) updates.completion = 50;
      }

      if (body.completion !== undefined) {
        updates.completion = body.completion;
        if (body.completion === 100) updates.status = "COMPLETED";
        else if (body.completion === 0) updates.status = "TODO";
        else if (existingTask.status === "TODO" || existingTask.status === "COMPLETED") updates.status = "IN_PROGRESS";
      }

      const { data: updatedTask, error: updateErr } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: jsonHeaders });

      if (existingTask.parentId) {
        await syncParents(supabase, userId, existingTask.parentId);
      }
      if (parentId !== undefined && parentId !== existingTask.parentId && parentId) {
        await syncParents(supabase, userId, parentId);
      }

      await notifyTaskUpdated(supabase, userId, updatedTask.title, taskId, updatedTask.date);

      return new Response(JSON.stringify({ task: updatedTask }), { status: 200, headers: jsonHeaders });
    }

    // 5. DELETE /tasks/:id - Delete Task
    const taskDeleteMatch = pathname.match(/^\/tasks\/([^\/]+)$/);
    if (taskDeleteMatch && method === "DELETE") {
      const taskId = taskDeleteMatch[1];
      const { data: task, error: fetchErr } = await supabase
        .from("tasks")
        .select("title, parentId")
        .eq("id", taskId)
        .eq("user_id", userId)
        .single();

      if (fetchErr || !task) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: jsonHeaders });

      const { error: deleteErr } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
      if (deleteErr) return new Response(JSON.stringify({ error: deleteErr.message }), { status: 400, headers: jsonHeaders });

      if (task.parentId) {
        await syncParents(supabase, userId, task.parentId);
      }

      await notifyTaskDeleted(supabase, userId, task.title);

      return new Response(JSON.stringify({ message: "Task deleted" }), { status: 200, headers: jsonHeaders });
    }

    // 6. PATCH /tasks/:id/status - Update Status
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

    // 7. GET /summary - Productivity Summary
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

    // 8. GET /lists - List Quick Lists
    if (pathname === "/lists" && method === "GET") {
      const { data, error } = await supabase.from("quick_lists").select("*").eq("user_id", userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ lists: data || [] }), { status: 200, headers: jsonHeaders });
    }

    // 9. POST /lists - Create Quick List
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
      await notifyListCreated(supabase, userId, data.title, data.id);
      return new Response(JSON.stringify({ list: data }), { status: 201, headers: jsonHeaders });
    }

    // 10. GET /lists/:id - Get Quick List Details
    const listGetMatch = pathname.match(/^\/lists\/([^\/]+)$/);
    if (listGetMatch && method === "GET") {
      const { data, error } = await supabase
        .from("quick_lists")
        .select("*")
        .eq("id", listGetMatch[1])
        .eq("user_id", userId)
        .single();
      if (error || !data) return new Response(JSON.stringify({ error: "List not found" }), { status: 404, headers: jsonHeaders });
      return new Response(JSON.stringify({ list: data }), { status: 200, headers: jsonHeaders });
    }

    // 11. DELETE /lists/:id - Delete Quick List
    const listDeleteMatch = pathname.match(/^\/lists\/([^\/]+)$/);
    if (listDeleteMatch && method === "DELETE") {
      const { data: list, error: fetchErr } = await supabase
        .from("quick_lists")
        .select("title")
        .eq("id", listDeleteMatch[1])
        .eq("user_id", userId)
        .single();
      if (fetchErr || !list) return new Response(JSON.stringify({ error: "List not found" }), { status: 404, headers: jsonHeaders });

      const { error } = await supabase.from("quick_lists").delete().eq("id", listDeleteMatch[1]).eq("user_id", userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });

      await notifyListDeleted(supabase, userId, list.title);
      return new Response(JSON.stringify({ message: "List deleted" }), { status: 200, headers: jsonHeaders });
    }

    // 12. POST /lists/:id/items - Add Items to Quick List
    const listItemsMatch = pathname.match(/^\/lists\/([^\/]+)\/items$/);
    if (listItemsMatch && method === "POST") {
      const listId = listItemsMatch[1];
      const body = await req.json();
      const { data: list, error: fetchErr } = await supabase
        .from("quick_lists")
        .select("*")
        .eq("id", listId)
        .eq("user_id", userId)
        .single();
      if (fetchErr || !list) return new Response(JSON.stringify({ error: "List not found" }), { status: 404, headers: jsonHeaders });

      const newItems = (body.items || []).map((text: string) => ({ id: crypto.randomUUID(), text, checked: false }));
      const { data, error } = await supabase
        .from("quick_lists")
        .update({ items: [...(list.items || []), ...newItems], updatedAt: Date.now() })
        .eq("id", listId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ list: data }), { status: 200, headers: jsonHeaders });
    }

    // 13. GET /categories - List Task Categories
    if (pathname === "/categories" && method === "GET") {
      const { data, error } = await supabase.from("task_categories").select("*").eq("user_id", userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ categories: data || [] }), { status: 200, headers: jsonHeaders });
    }

    // 14. POST /categories - Create Category
    if (pathname === "/categories" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("task_categories")
        .insert({ user_id: userId, name: body.name, color: body.color || "#3b82f6", createdAt: Date.now(), updatedAt: Date.now() })
        .select()
        .single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonHeaders });
      return new Response(JSON.stringify({ category: data }), { status: 201, headers: jsonHeaders });
    }

    // 15. PATCH /categories/:id - Update Category
    const categoryUpdateMatch = pathname.match(/^\/categories\/([^\/]+)$/);
    if (categoryUpdateMatch && method === "PATCH") {
      const body = await req.json();
      const updates: any = { updatedAt: Date.now() };
      if (body.name !== undefined) updates.name = String(body.name).trim();
      if (body.color !== undefined) updates.color = body.color;

      const { data, error } = await supabase
        .from("task_categories")
        .update(updates)
        .eq("id", categoryUpdateMatch[1])
        .eq("user_id", userId)
        .select()
        .single();

      if (error || !data) return new Response(JSON.stringify({ error: "Category not found or failed to update" }), { status: 404, headers: jsonHeaders });

      await notifyCategoryUpdated(supabase, userId, data.name, data.id);
      return new Response(JSON.stringify({ category: data }), { status: 200, headers: jsonHeaders });
    }

    // 16. DELETE /categories/:id - Delete Category
    const categoryDeleteMatch = pathname.match(/^\/categories\/([^\/]+)$/);
    if (categoryDeleteMatch && method === "DELETE") {
      const categoryId = categoryDeleteMatch[1];
      const { data: category, error: fetchErr } = await supabase
        .from("task_categories")
        .select("name")
        .eq("id", categoryId)
        .eq("user_id", userId)
        .single();

      if (fetchErr || !category) return new Response(JSON.stringify({ error: "Category not found" }), { status: 404, headers: jsonHeaders });

      const { error: deleteErr } = await supabase
        .from("task_categories")
        .delete()
        .eq("id", categoryId)
        .eq("user_id", userId);
      if (deleteErr) return new Response(JSON.stringify({ error: deleteErr.message }), { status: 400, headers: jsonHeaders });

      await supabase
        .from("tasks")
        .update({ categoryId: null, updatedAt: Date.now() })
        .eq("categoryId", categoryId)
        .eq("user_id", userId);

      await notifyCategoryDeleted(supabase, userId, category.name);
      return new Response(JSON.stringify({ message: "Category deleted" }), { status: 200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: jsonHeaders });
  }
}
