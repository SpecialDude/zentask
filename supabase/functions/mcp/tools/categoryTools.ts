import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'npm:zod';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function registerCategoryTools(server: McpServer, supabase: SupabaseClient, userId: string) {

  // 1. List Categories
  server.tool(
    'list_categories',
    'Fetch all custom task categories created by the user.',
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
}
