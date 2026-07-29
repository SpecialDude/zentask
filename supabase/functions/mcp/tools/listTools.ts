import { McpServer } from 'npm:@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'npm:zod';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function registerListTools(server: McpServer, supabase: SupabaseClient, userId: string) {

  // 1. List QuickLists & Documents
  server.tool(
    'list_quick_lists',
    'Fetch all QuickLists and Document checklists for the user.',
    {
      pinnedOnly: z.boolean().optional().describe('Filter only pinned lists')
    },
    async ({ pinnedOnly }) => {
      try {
        let query = supabase
          .from('quick_lists')
          .select('*')
          .eq('user_id', userId)
          .order('pinned', { ascending: false })
          .order('updatedAt', { ascending: false });

        if (pinnedOnly) {
          query = query.eq('pinned', true);
        }

        const { data: lists, error } = await query;

        if (error) {
          return { content: [{ type: 'text', text: `Error fetching lists: ${error.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: lists?.length || 0, quickLists: lists }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to list quicklists: ${err.message}` }] };
      }
    }
  );

  // 2. Get Single QuickList
  server.tool(
    'get_quick_list',
    'Get details of a specific QuickList or Document checklist.',
    {
      listId: z.string().describe('ID of the list/document')
    },
    async ({ listId }) => {
      try {
        const { data: list, error } = await supabase
          .from('quick_lists')
          .select('*')
          .eq('id', listId)
          .eq('user_id', userId)
          .single();

        if (error || !list) {
          return { content: [{ type: 'text', text: `QuickList "${listId}" not found.` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(list, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error getting list: ${err.message}` }] };
      }
    }
  );

  // 3. Create QuickList / Document
  server.tool(
    'create_quick_list',
    'Create a new QuickList (bullet, checkbox, numbered) or Document.',
    {
      title: z.string().describe('List or Document title'),
      type: z.enum(['bullet', 'checkbox', 'numbered', 'document']).describe('Type of list/document'),
      color: z.string().optional().describe('Card color hex code (e.g. #3b82f6)'),
      pinned: z.boolean().optional().describe('Whether to pin the list'),
      items: z.array(
        z.object({
          content: z.string(),
          checked: z.boolean().optional()
        })
      ).optional().describe('Initial list items for bullet/checkbox/numbered mode'),
      blocks: z.array(
        z.object({
          type: z.enum(['paragraph', 'heading', 'bullet', 'checkbox', 'numbered', 'blockquote', 'divider']),
          content: z.string(),
          checked: z.boolean().optional(),
          level: z.enum([1, 2, 3] as any).optional(),
          indent: z.number().optional()
        })
      ).optional().describe('Initial document blocks for document mode')
    },
    async ({ title, type, color, pinned, items, blocks }) => {
      try {
        const id = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = Date.now();

        const formattedItems = (items || []).map((item, index) => ({
          id: `item_${Date.now()}_${index}`,
          content: item.content,
          checked: !!item.checked,
          order: index
        }));

        const formattedBlocks = (blocks || []).map((block, index) => ({
          id: `block_${Date.now()}_${index}`,
          type: block.type,
          content: block.content,
          checked: block.type === 'checkbox' ? !!block.checked : undefined,
          level: block.level,
          indent: block.indent || 0,
          order: index
        }));

        const newList = {
          id,
          user_id: userId,
          title: title.trim(),
          type,
          color: color || '#3b82f6',
          pinned: !!pinned,
          items: formattedItems,
          blocks: type === 'document' ? formattedBlocks : undefined,
          createdAt: now,
          updatedAt: now
        };

        const { data, error } = await supabase
          .from('quick_lists')
          .insert([newList])
          .select()
          .single();

        if (error) {
          return { content: [{ type: 'text', text: `Failed to create list: ${error.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'QuickList created successfully', quickList: data }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error creating list: ${err.message}` }] };
      }
    }
  );

  // 4. Add Items / Document Blocks
  server.tool(
    'add_list_items',
    'Append new items to an existing checklist or add document blocks to a document.',
    {
      listId: z.string().describe('ID of the target QuickList or Document'),
      items: z.array(
        z.object({
          content: z.string(),
          checked: z.boolean().optional()
        })
      ).optional().describe('Items to add for standard lists'),
      blocks: z.array(
        z.object({
          type: z.enum(['paragraph', 'heading', 'bullet', 'checkbox', 'numbered', 'blockquote', 'divider']),
          content: z.string(),
          checked: z.boolean().optional()
        })
      ).optional().describe('Document blocks to add for document lists')
    },
    async ({ listId, items, blocks }) => {
      try {
        const { data: list, error: fetchErr } = await supabase
          .from('quick_lists')
          .select('*')
          .eq('id', listId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !list) {
          return { content: [{ type: 'text', text: `List "${listId}" not found.` }] };
        }

        let updatedItems = list.items || [];
        let updatedBlocks = list.blocks || [];

        if (items && items.length > 0) {
          const newItems = items.map((item, idx) => ({
            id: `item_${Date.now()}_${idx}`,
            content: item.content,
            checked: !!item.checked,
            order: updatedItems.length + idx
          }));
          updatedItems = [...updatedItems, ...newItems];
        }

        if (blocks && blocks.length > 0) {
          const newBlocks = blocks.map((block, idx) => ({
            id: `block_${Date.now()}_${idx}`,
            type: block.type,
            content: block.content,
            checked: block.type === 'checkbox' ? !!block.checked : undefined,
            indent: 0,
            order: updatedBlocks.length + idx
          }));
          updatedBlocks = [...updatedBlocks, ...newBlocks];
        }

        const { data: updatedList, error: updateErr } = await supabase
          .from('quick_lists')
          .update({
            items: updatedItems,
            blocks: list.type === 'document' ? updatedBlocks : undefined,
            updatedAt: Date.now()
          })
          .eq('id', listId)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateErr) {
          return { content: [{ type: 'text', text: `Failed to append items: ${updateErr.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Items added successfully', quickList: updatedList }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error adding items: ${err.message}` }] };
      }
    }
  );

  // 5. Toggle List Item / Document Checkbox Block
  server.tool(
    'toggle_list_item',
    'Check or uncheck an item in a checklist or a document block.',
    {
      listId: z.string().describe('ID of the list or document'),
      itemId: z.string().describe('ID of the item or block to toggle'),
      checked: z.boolean().optional().describe('Target checked state. If omitted, toggles current value.')
    },
    async ({ listId, itemId, checked }) => {
      try {
        const { data: list, error: fetchErr } = await supabase
          .from('quick_lists')
          .select('*')
          .eq('id', listId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !list) {
          return { content: [{ type: 'text', text: `List "${listId}" not found.` }] };
        }

        let modified = false;

        // Try toggling in list items
        const updatedItems = (list.items || []).map((item: any) => {
          if (item.id === itemId) {
            modified = true;
            return {
              ...item,
              checked: checked !== undefined ? checked : !item.checked
            };
          }
          return item;
        });

        // Try toggling in document blocks
        const updatedBlocks = (list.blocks || []).map((block: any) => {
          if (block.id === itemId) {
            modified = true;
            return {
              ...block,
              checked: checked !== undefined ? checked : !block.checked
            };
          }
          return block;
        });

        if (!modified) {
          return { content: [{ type: 'text', text: `Item or block "${itemId}" not found in list "${listId}".` }] };
        }

        const { data: updatedList, error: updateErr } = await supabase
          .from('quick_lists')
          .update({
            items: updatedItems,
            blocks: list.type === 'document' ? updatedBlocks : undefined,
            updatedAt: Date.now()
          })
          .eq('id', listId)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateErr) {
          return { content: [{ type: 'text', text: `Failed to toggle item: ${updateErr.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Item toggled successfully', quickList: updatedList }, null, 2)
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error toggling item: ${err.message}` }] };
      }
    }
  );

  // 6. Delete QuickList
  server.tool(
    'delete_quick_list',
    'Delete a QuickList or Document.',
    {
      listId: z.string().describe('ID of the list to delete')
    },
    async ({ listId }) => {
      try {
        const { error } = await supabase
          .from('quick_lists')
          .delete()
          .eq('id', listId)
          .eq('user_id', userId);

        if (error) {
          return { content: [{ type: 'text', text: `Failed to delete list: ${error.message}` }] };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `QuickList "${listId}" deleted successfully.` })
            }
          ]
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error deleting quicklist: ${err.message}` }] };
      }
    }
  );
}
