import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'npm:zod';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { notifyCategoryCreated, notifyCategoryUpdated, notifyCategoryDeleted } from '../notificationHelper.ts';

export function registerCategoryTools(server: McpServer, supabase: SupabaseClient, userId: string) {

  // 1. List Categories
  server.tool(
    'list_categories',
    'Fetch all custom task categories created by the user. The returned IDs can be passed as categoryId to create_task / update_task to categorize tasks.',
    {},
    async () => {
      try {
        const { data: categories, error } = await supabase
          .from('task_categories')
          .select('*')
          .eq('user_id', userId)
          .order('createdAt', { ascending: true });

        if (error) {
          return { content: [{ type: 'text', text: `Error fetching categories: ${error.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: categories?.length || 0, categories }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to list categories: ${err.message}` }] };
      }
    }
  );

  // 2. Create Category
  server.tool(
    'create_category',
    'Create a new task category with a name and hex color.',
    {
      name: z.string().describe('Category name (e.g., Work, Personal, Fitness)'),
      color: z.string().optional().describe('Hex color code (e.g., #3b82f6)')
    },
    async ({ name, color }) => {
      try {
        const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newCategory = {
          id,
          user_id: userId,
          name: name.trim(),
          color: color || '#3b82f6',
          createdAt: Date.now()
        };

        const { data, error } = await supabase
          .from('task_categories')
          .insert([newCategory])
          .select()
          .single();

        if (error) {
          return { content: [{ type: 'text', text: `Failed to create category: ${error.message}` }] };
        }

        // Queue notification
        await notifyCategoryCreated(supabase, userId, data.name, data.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Category created successfully', category: data }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error creating category: ${err.message}` }] };
      }
    }
  );

  // 3. Update Category
  server.tool(
    'update_category',
    'Rename or recolor an existing task category.',
    {
      categoryId: z.string().describe('ID of the category to update'),
      name: z.string().optional().describe('New category name'),
      color: z.string().optional().describe('New hex color code (e.g., #3b82f6)')
    },
    async ({ categoryId, name, color }) => {
      try {
        const updates: any = { updatedAt: Date.now() };
        if (name !== undefined) updates.name = name.trim();
        if (color !== undefined) updates.color = color;

        const { data, error } = await supabase
          .from('task_categories')
          .update(updates)
          .eq('id', categoryId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error || !data) {
          return { content: [{ type: 'text', text: `Category "${categoryId}" not found or failed to update: ${error?.message || 'unknown error'}` }] };
        }

        await notifyCategoryUpdated(supabase, userId, data.name, data.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Category updated successfully', category: data }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error updating category: ${err.message}` }] };
      }
    }
  );

  // 4. Delete Category
  server.tool(
    'delete_category',
    'Delete a task category. Tasks that use this category will have their categoryId cleared.',
    {
      categoryId: z.string().describe('ID of the category to delete')
    },
    async ({ categoryId }) => {
      try {
        const { data: category, error: fetchErr } = await supabase
          .from('task_categories')
          .select('name')
          .eq('id', categoryId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !category) {
          return { content: [{ type: 'text', text: `Category "${categoryId}" not found.` }] };
        }

        const { error: deleteErr } = await supabase
          .from('task_categories')
          .delete()
          .eq('id', categoryId)
          .eq('user_id', userId);

        if (deleteErr) {
          return { content: [{ type: 'text', text: `Failed to delete category: ${deleteErr.message}` }] };
        }

        // Clear categoryId on tasks referencing the deleted category.
        await supabase
          .from('tasks')
          .update({ categoryId: null, updatedAt: Date.now() })
          .eq('categoryId', categoryId)
          .eq('user_id', userId);

        await notifyCategoryDeleted(supabase, userId, category.name);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Category "${categoryId}" deleted successfully.` })
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error deleting category: ${err.message}` }] };
      }
    }
  );
}
