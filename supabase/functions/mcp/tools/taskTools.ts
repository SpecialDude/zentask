import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'npm:zod';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getTodayStr, syncParents } from '../utils.ts';

export function registerTaskTools(server: McpServer, supabase: SupabaseClient, userId: string) {

  // 1. List Tasks
  server.tool(
    'list_tasks',
    'Fetch tasks for a specific date or search filter. Returns task list with hierarchy.',
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: tasks?.length || 0, tasks }, null, 2)
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
    'Create a new task or subtask in ZenTask.',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description or details'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      parentId: z.string().optional().describe('Parent task ID if creating a subtask'),
      categoryId: z.string().optional().describe('Category ID'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('Task priority'),
      duration: z.number().optional().describe('Estimated duration in minutes'),
      startTime: z.string().optional().describe('Start time in HH:mm format (e.g., 09:30)'),
      isRecurring: z.boolean().optional().describe('Whether this task repeats'),
      recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS']).optional().describe('Recurrence schedule')
    },
    async ({ title, description, date, parentId, categoryId, priority, duration, startTime, isRecurring, recurrencePattern }) => {
      try {
        const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const targetDate = date ? (date.toLowerCase() === 'today' ? getTodayStr() : date) : getTodayStr();
        const now = Date.now();

        const newTask = {
          id,
          user_id: userId,
          title: title.trim(),
          description: description || '',
          date: targetDate,
          parentId: parentId || null,
          categoryId: categoryId || null,
          status: 'TODO',
          priority: priority || 'MEDIUM',
          completion: 0,
          duration: duration || null,
          startTime: startTime || null,
          isRecurring: !!isRecurring,
          recurrencePattern: recurrencePattern || null,
          createdAt: now,
          updatedAt: now
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert([newTask])
          .select()
          .single();

        if (error) {
          return { content: [{ type: 'text', text: `Failed to create task: ${error.message}` }] };
        }

        // Recalculate parent progress if subtask
        if (parentId) {
          await syncParents(supabase, userId, parentId);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Task created successfully', task: data }, null, 2)
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
    'Modify task details such as title, description, priority, duration, start time, category, or completion percentage.',
    {
      taskId: z.string().describe('ID of the task to update'),
      title: z.string().optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().describe('New priority'),
      completion: z.number().min(0).max(100).optional().describe('Completion percentage (0-100)'),
      duration: z.number().optional().describe('Duration in minutes'),
      startTime: z.string().optional().describe('Start time in HH:mm'),
      categoryId: z.string().optional().describe('Category ID')
    },
    async ({ taskId, title, description, priority, completion, duration, startTime, categoryId }) => {
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

        const updates: any = { updatedAt: Date.now() };

        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description;
        if (priority !== undefined) updates.priority = priority;
        if (duration !== undefined) updates.duration = duration;
        if (startTime !== undefined) updates.startTime = startTime;
        if (categoryId !== undefined) updates.categoryId = categoryId;

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

        if (existingTask.parentId) {
          await syncParents(supabase, userId, existingTask.parentId);
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
          .select('parentId')
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
