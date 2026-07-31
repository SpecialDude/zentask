import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'npm:zod';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getTodayStr, syncParents } from '../utils.ts';
import { notifyTaskCreated, notifyTaskUpdated, notifyTaskDeleted } from '../notificationHelper.ts';

// Recursive shape for nested task/subtask trees (mirrors the frontend AI plan).
type SubtaskInput = {
  title: string;
  description?: string;
  date?: string;
  categoryId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  duration?: number;
  startTime?: string;
  isRecurring?: boolean;
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'WEEKDAYS';
  subtasks?: SubtaskInput[];
};

const subtaskSchema: z.ZodType<SubtaskInput> = z.lazy(() =>
  z.object({
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description or details'),
    date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to parent date)'),
    categoryId: z.string().optional().describe('Category ID'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
    duration: z.number().optional().describe('Estimated duration in minutes'),
    startTime: z.string().optional().describe('Start time in HH:mm format (e.g., 09:30)'),
    isRecurring: z.boolean().optional().describe('Whether this task repeats'),
    recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS']).optional().describe('Recurrence schedule'),
    subtasks: z.array(subtaskSchema).optional().describe('Nested subtasks of this subtask')
  })
);

export async function registerTaskTools(server: McpServer, supabase: SupabaseClient, userId: string) {

  // Fetch the user's categories so we can inject them into tool descriptions.
  // This makes the model aware of which categories exist and that it should
  // assign a categoryId when a task fits one.
  const { data: categoriesData } = await supabase
    .from('task_categories')
    .select('id, name')
    .eq('user_id', userId);

  const categoriesList = (categoriesData || []).map((c: any) => ({ id: c.id, name: c.name }));
  const categoriesHint = categoriesList.length > 0
    ? ` When a task fits one of these categories, assign its categoryId (do not invent IDs): ${JSON.stringify(categoriesList)}. If no category fits, omit categoryId.`
    : ' The user has no custom categories yet. Leave categoryId unset, or create one with create_category first.';

  // 1. List Tasks
  server.tool(
    'list_tasks',
    'Fetch tasks for a specific date or search filter. Returns task list with hierarchy, including each task\'s category name.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format or "today"'),
      status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().describe('Filter by task status'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Filter by priority'),
      categoryId: z.string().optional().describe('Filter by category ID'),
      search: z.string().optional().describe('Search query in title or description')
    },
    async ({ date, status, priority, categoryId, search }) => {
      try {
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('createdAt', { ascending: true });

        if (date) {
          const formattedDate = date.toLowerCase() === 'today' ? getTodayStr() : date;
          query = query.eq('date', formattedDate);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (priority) {
          query = query.eq('priority', priority);
        }

        if (categoryId) {
          query = query.eq('categoryId', categoryId);
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: tasks, error } = await query;

        if (error) {
          return { content: [{ type: 'text', text: `Error fetching tasks: ${error.message}` }] };
        }

        // Enrich each task with its category name so the model can reference it.
        const categoryMap = new Map(categoriesList.map(c => [c.id, c.name]));
        const enriched = (tasks || []).map((t: any) => ({
          ...t,
          category_name: t.categoryId ? categoryMap.get(t.categoryId) || null : null
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: enriched.length, categories: categoriesList, tasks: enriched }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to list tasks: ${err.message}` }] };
      }
    }
  );

  // 2. Get Single Task Details
  server.tool(
    'get_task',
    'Get detailed information about a specific task and its subtasks.',
    {
      taskId: z.string().describe('ID of the task to retrieve')
    },
    async ({ taskId }) => {
      try {
        const { data: task, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (error || !task) {
          return { content: [{ type: 'text', text: `Task with ID "${taskId}" not found.` }] };
        }

        // Fetch subtasks
        const { data: subtasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('parentId', taskId)
          .eq('user_id', userId)
          .order('createdAt', { ascending: true });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ task, subtasks: subtasks || [] }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to get task: ${err.message}` }] };
      }
    }
  );

  // 3. Create Task
  server.tool(
    'create_task',
    `Create a new task or subtask in ZenTask, optionally with a nested hierarchy of subtasks (use the 'subtasks' array for that; each subtask may itself contain subtasks).${categoriesHint}`,
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description or details'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today). Subtasks inherit the parent task date unless overridden.'),
      parentId: z.string().optional().describe('Parent task ID if creating a subtask'),
      categoryId: z.string().optional().describe('Category ID from the available categories'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
      duration: z.number().optional().describe('Estimated duration in minutes'),
      startTime: z.string().optional().describe('Start time in HH:mm format (e.g., 09:30)'),
      isRecurring: z.boolean().optional().describe('Whether this task repeats'),
      recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS']).optional().describe('Recurrence schedule'),
      subtasks: z.array(subtaskSchema).optional().describe('Optional nested subtasks. Create the full hierarchy in one call: a big goal becomes a parent task, and its steps become subtasks.')
    },
    async ({ title, description, date, parentId, categoryId, priority, duration, startTime, isRecurring, recurrencePattern, subtasks }) => {
      try {
        const targetDate = date ? (date.toLowerCase() === 'today' ? getTodayStr() : date) : getTodayStr();

        // Recursively insert a task and all of its subtasks.
        const insertTaskTree = async (input: any, parent: string | null, fallbackDate: string): Promise<any[]> => {
          const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const now = Date.now();
          const taskDate = input.date
            ? (String(input.date).toLowerCase() === 'today' ? getTodayStr() : String(input.date))
            : fallbackDate;

          const newTask = {
            id,
            user_id: userId,
            title: String(input.title).trim(),
            description: input.description || '',
            date: taskDate,
            parentId: parent,
            categoryId: input.categoryId || null,
            status: 'TODO',
            priority: input.priority || 'MEDIUM',
            completion: 0,
            duration: input.duration || null,
            startTime: input.startTime || null,
            isRecurring: !!input.isRecurring,
            recurrencePattern: input.recurrencePattern || null,
            createdAt: now,
            updatedAt: now
          };

          const { data, error } = await supabase
            .from('tasks')
            .insert([newTask])
            .select()
            .single();

          if (error) throw error;

          const allTasks = [data];
          for (const sub of input.subtasks || []) {
            allTasks.push(...await insertTaskTree(sub, data.id, taskDate));
          }
          return allTasks;
        };

        const allInserted = await insertTaskTree(
          { title, description, date, categoryId, priority, duration, startTime, isRecurring, recurrencePattern, subtasks },
          parentId || null,
          targetDate
        );

        const root = allInserted[0];

        // Recalculate parent progress if the root task is itself a subtask.
        if (parentId) {
          await syncParents(supabase, userId, parentId);
        }

        // Queue notification
        await notifyTaskCreated(supabase, userId, root.title, root.id, root.date);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Task created successfully with ${allInserted.length - 1} subtask(s)`,
                task: root,
                subtasks: allInserted.slice(1)
              }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error creating task: ${err.message}` }] };
      }
    }
  );

  // 4. Update Task Status
  server.tool(
    'update_task_status',
    'Update task status (TODO, IN_PROGRESS, COMPLETED, CANCELLED). Recalculates parent progress automatically.',
    {
      taskId: z.string().describe('ID of the task to update'),
      status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).describe('New task status'),
      cancelReason: z.string().optional().describe('Reason for cancellation if status is CANCELLED'),
      review: z.string().optional().describe('Optional user review/reflection on completion')
    },
    async ({ taskId, status, cancelReason, review }) => {
      try {
        // Fetch current task
        const { data: task, error: fetchErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !task) {
          return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
        }

        let completion = task.completion;
        if (status === 'COMPLETED') completion = 100;
        else if (status === 'TODO') completion = 0;
        else if (status === 'IN_PROGRESS' && completion === 100) completion = 50;

        const updates: any = {
          status,
          completion,
          updatedAt: Date.now()
        };

        if (status === 'CANCELLED' && cancelReason) {
          updates.cancelReason = cancelReason;
        }

        if (review) {
          updates.review = review;
        }

        const { data: updatedTask, error: updateErr } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateErr) {
          return { content: [{ type: 'text', text: `Failed to update status: ${updateErr.message}` }] };
        }

        // Trigger parent aggregation
        if (task.parentId) {
          await syncParents(supabase, userId, task.parentId);
        }

        // Queue notification
        await notifyTaskUpdated(supabase, userId, updatedTask.title, taskId, updatedTask.date);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Task status updated to ${status}`, task: updatedTask }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error updating task status: ${err.message}` }] };
      }
    }
  );

  // 5. Update Task Details
  server.tool(
    'update_task',
    `Modify task details: title, description, priority, completion, duration, start time, date, status, category, recurrence, or reparent (change parentId).${categoriesHint}`,
    {
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('New priority'),
      completion: z.number().min(0).max(100).optional().describe('Completion percentage (0-100)'),
      duration: z.number().optional().describe('Duration in minutes'),
      startTime: z.string().optional().describe('Start time in HH:mm'),
      categoryId: z.string().optional().describe('Category ID'),
      date: z.string().optional().describe('New date in YYYY-MM-DD format or "today"'),
      status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().describe('New task status'),
      isRecurring: z.boolean().optional().describe('Whether the task repeats'),
      recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS']).optional().describe('Recurrence schedule'),
      parentId: z.string().nullable().optional().describe('New parent task ID (use null to make it a root task)')
    },
    async ({ taskId, title, description, priority, completion, duration, startTime, categoryId, date, status, isRecurring, recurrencePattern, parentId }) => {
      try {
        const { data: existingTask, error: fetchErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !existingTask) {
          return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
        }

        // Guard against reparenting to one of the task's own descendants.
        if (parentId !== undefined && parentId !== existingTask.parentId && parentId) {
          const isDescendant = async (candidateId: string): Promise<boolean> => {
            let current: string | null = candidateId;
            while (current) {
              if (current === taskId) return true;
              const { data: ancestor } = await supabase
                .from('tasks')
                .select('parentId')
                .eq('id', current)
                .eq('user_id', userId)
                .single();
              if (!ancestor) break;
              current = ancestor.parentId;
            }
            return false;
          };

          if (await isDescendant(parentId)) {
            return { content: [{ type: 'text', text: `Cannot move task "${taskId}" under its own descendant.` }] };
          }
        }

        const updates: any = { updatedAt: Date.now() };

        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description;
        if (priority !== undefined) updates.priority = priority;
        if (duration !== undefined) updates.duration = duration;
        if (startTime !== undefined) updates.startTime = startTime;
        if (categoryId !== undefined) updates.categoryId = categoryId;
        if (isRecurring !== undefined) updates.isRecurring = isRecurring;
        if (recurrencePattern !== undefined) updates.recurrencePattern = recurrencePattern;
        if (parentId !== undefined) updates.parentId = parentId;

        if (date !== undefined) {
          updates.date = String(date).toLowerCase() === 'today' ? getTodayStr() : String(date);
        }

        if (status !== undefined) {
          updates.status = status;
          if (status === 'COMPLETED') updates.completion = 100;
          else if (status === 'TODO') updates.completion = 0;
          else if (status === 'IN_PROGRESS' && existingTask.completion === 100) updates.completion = 50;
        }

        if (completion !== undefined) {
          updates.completion = completion;
          if (completion === 100) updates.status = 'COMPLETED';
          else if (completion === 0) updates.status = 'TODO';
          else if (existingTask.status === 'TODO' || existingTask.status === 'COMPLETED') updates.status = 'IN_PROGRESS';
        }

        const { data: updatedTask, error: updateErr } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateErr) {
          return { content: [{ type: 'text', text: `Failed to update task: ${updateErr.message}` }] };
        }

        // Recalculate progress for the old parent, the new parent, or both.
        if (existingTask.parentId) {
          await syncParents(supabase, userId, existingTask.parentId);
        }
        if (parentId !== undefined && parentId !== existingTask.parentId && parentId) {
          await syncParents(supabase, userId, parentId);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Task updated successfully', task: updatedTask }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error updating task: ${err.message}` }] };
      }
    }
  );

  // 6. Carry Over Task
  server.tool(
    'carry_over_task',
    'Carry over an unfinished task and its subtasks to a target date.',
    {
      taskId: z.string().describe('ID of the task to carry over'),
      targetDate: z.string().describe('Target date in YYYY-MM-DD format'),
      reason: z.string().optional().describe('Reason for carrying over')
    },
    async ({ taskId, targetDate, reason }) => {
      try {
        // Fetch original task
        const { data: originalTask, error: fetchErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !originalTask) {
          return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }] };
        }

        // 1. Mark original task as carried over
        await supabase
          .from('tasks')
          .update({
            carriedOverTo: targetDate,
            carryOverReason: reason || null,
            updatedAt: Date.now()
          })
          .eq('id', taskId)
          .eq('user_id', userId);

        // 2. Clone original task for target date
        const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const clonedTask = {
          ...originalTask,
          id: newTaskId,
          date: targetDate,
          status: 'TODO',
          completion: 0,
          carriedOverFrom: originalTask.date,
          carriedOverTo: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const { data: createdClone, error: cloneErr } = await supabase
          .from('tasks')
          .insert([clonedTask])
          .select()
          .single();

        if (cloneErr) {
          return { content: [{ type: 'text', text: `Failed to carry over task: ${cloneErr.message}` }] };
        }

        // 3. Clone subtasks
        const { data: subtasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('parentId', taskId)
          .eq('user_id', userId);

        if (subtasks && subtasks.length > 0) {
          const clonedSubtasks = subtasks.map(sub => ({
            ...sub,
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            parentId: newTaskId,
            date: targetDate,
            status: 'TODO',
            completion: 0,
            carriedOverFrom: sub.date,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));

          await supabase.from('tasks').insert(clonedSubtasks);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Task carried over to ${targetDate}`,
                originalTaskId: taskId,
                newClonedTask: createdClone
              }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error carrying over task: ${err.message}` }] };
      }
    }
  );

  // 7. Delete Task
  server.tool(
    'delete_task',
    'Delete a task and all its subtasks.',
    {
      taskId: z.string().describe('ID of the task to delete')
    },
    async ({ taskId }) => {
      try {
        const { data: task } = await supabase
          .from('tasks')
          .select('parentId, title')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          return { content: [{ type: 'text', text: `Failed to delete task: ${error.message}` }] };
        }

        if (task?.parentId) {
          await syncParents(supabase, userId, task.parentId);
        }

        // Queue notification
        if (task?.title) {
          await notifyTaskDeleted(supabase, userId, task.title);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Task "${taskId}" and subtasks deleted successfully.` })
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error deleting task: ${err.message}` }] };
      }
    }
  );

  // 8. Daily Summary
  server.tool(
    'get_daily_summary',
    'Get a high-level productivity summary for a given day (defaults to today).',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format or "today"')
    },
    async ({ date }) => {
      try {
        const targetDate = date ? (date.toLowerCase() === 'today' ? getTodayStr() : date) : getTodayStr();

        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('date', targetDate);

        if (error) {
          return { content: [{ type: 'text', text: `Error fetching summary: ${error.message}` }] };
        }

        const total = tasks?.length || 0;
        const completed = tasks?.filter(t => t.status === 'COMPLETED').length || 0;
        const inProgress = tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0;
        const todo = tasks?.filter(t => t.status === 'TODO').length || 0;
        const cancelled = tasks?.filter(t => t.status === 'CANCELLED').length || 0;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                date: targetDate,
                totalTasks: total,
                completedTasks: completed,
                inProgressTasks: inProgress,
                todoTasks: todo,
                cancelledTasks: cancelled,
                completionRate: `${completionRate}%`
              }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error generating daily summary: ${err.message}` }] };
      }
    }
  );
}
