// MCP Notification Helper
// Shared helper for queueing notifications from MCP tools

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type NotificationType =
  | 'task_reminder'
  | 'mcp_task_created'
  | 'mcp_task_updated'
  | 'mcp_task_deleted'
  | 'mcp_list_created'
  | 'mcp_list_updated'
  | 'mcp_list_deleted'
  | 'mcp_category_created'
  | 'mcp_category_updated'
  | 'mcp_category_deleted';

export interface McpNotification {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Queue an MCP notification for a user
 * Checks preferences before queueing
 */
export async function queueMcpNotification(
  supabase: SupabaseClient,
  userId: string,
  notification: McpNotification
): Promise<void> {
  try {
    // Check if user has this notification type enabled
    const { data: pref, error: prefError } = await supabase
      .from('notification_preferences')
      .select('enabled')
      .eq('user_id', userId)
      .eq('notification_type', notification.type)
      .maybeSingle();

    if (prefError) {
      console.error('Error checking notification preference:', prefError);
      return;
    }

    // Skip if not enabled
    if (!pref || !pref.enabled) {
      console.log(`Notification type ${notification.type} not enabled for user ${userId}`);
      return;
    }

    // Queue the notification (send immediately for MCP operations)
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert([{
        user_id: userId,
        notification_type: notification.type,
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-512.png',
        badge: notification.badge || '/icon-512.png',
        tag: notification.tag || `mcp-${Date.now()}`,
        data: notification.data || {},
        scheduled_for: new Date().toISOString(), // Send immediately
        status: 'pending'
      }]);

    if (queueError) {
      console.error('Error queueing MCP notification:', queueError);
    } else {
      console.log(`Queued ${notification.type} notification for user ${userId}`);
    }

  } catch (error) {
    console.error('Error in queueMcpNotification:', error);
  }
}

/**
 * Helper to create task notification
 */
export async function notifyTaskCreated(
  supabase: SupabaseClient,
  userId: string,
  taskTitle: string,
  taskId: string,
  taskDate: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_task_created',
    title: '✅ Task Created via MCP',
    body: `New task: ${taskTitle}`,
    tag: `mcp-task-created-${taskId}`,
    data: {
      type: 'mcp_task_created',
      taskId,
      taskDate,
      url: `/?date=${taskDate}&task=${taskId}`
    }
  });
}

/**
 * Helper to create task update notification
 */
export async function notifyTaskUpdated(
  supabase: SupabaseClient,
  userId: string,
  taskTitle: string,
  taskId: string,
  taskDate: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_task_updated',
    title: '📝 Task Updated via MCP',
    body: `Updated: ${taskTitle}`,
    tag: `mcp-task-updated-${taskId}`,
    data: {
      type: 'mcp_task_updated',
      taskId,
      taskDate,
      url: `/?date=${taskDate}&task=${taskId}`
    }
  });
}

/**
 * Helper to create task deletion notification
 */
export async function notifyTaskDeleted(
  supabase: SupabaseClient,
  userId: string,
  taskTitle: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_task_deleted',
    title: '🗑️ Task Deleted via MCP',
    body: `Deleted: ${taskTitle}`,
    tag: `mcp-task-deleted-${Date.now()}`,
    data: {
      type: 'mcp_task_deleted',
      url: '/'
    }
  });
}

/**
 * Helper to create quick list notification
 */
export async function notifyListCreated(
  supabase: SupabaseClient,
  userId: string,
  listTitle: string,
  listId: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_list_created',
    title: '📝 Quick List Created via MCP',
    body: `New list: ${listTitle}`,
    tag: `mcp-list-created-${listId}`,
    data: {
      type: 'mcp_list_created',
      listId,
      url: `/lists?id=${listId}`
    }
  });
}

/**
 * Helper to create list update notification
 */
export async function notifyListUpdated(
  supabase: SupabaseClient,
  userId: string,
  listTitle: string,
  listId: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_list_updated',
    title: '📝 Quick List Updated via MCP',
    body: `Updated: ${listTitle}`,
    tag: `mcp-list-updated-${listId}`,
    data: {
      type: 'mcp_list_updated',
      listId,
      url: `/lists?id=${listId}`
    }
  });
}

/**
 * Helper to create list deletion notification
 */
export async function notifyListDeleted(
  supabase: SupabaseClient,
  userId: string,
  listTitle: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_list_deleted',
    title: '🗑️ Quick List Deleted via MCP',
    body: `Deleted: ${listTitle}`,
    tag: `mcp-list-deleted-${Date.now()}`,
    data: {
      type: 'mcp_list_deleted',
      url: '/lists'
    }
  });
}

/**
 * Helper to create category notification
 */
export async function notifyCategoryCreated(
  supabase: SupabaseClient,
  userId: string,
  categoryName: string,
  categoryId: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_category_created',
    title: '🏷️ Category Created via MCP',
    body: `New category: ${categoryName}`,
    tag: `mcp-category-created-${categoryId}`,
    data: {
      type: 'mcp_category_created',
      categoryId,
      url: '/'
    }
  });
}

/**
 * Helper to create category update notification
 */
export async function notifyCategoryUpdated(
  supabase: SupabaseClient,
  userId: string,
  categoryName: string,
  categoryId: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_category_updated',
    title: '🏷️ Category Updated via MCP',
    body: `Updated: ${categoryName}`,
    tag: `mcp-category-updated-${categoryId}`,
    data: {
      type: 'mcp_category_updated',
      categoryId,
      url: '/'
    }
  });
}

/**
 * Helper to create category deletion notification
 */
export async function notifyCategoryDeleted(
  supabase: SupabaseClient,
  userId: string,
  categoryName: string
): Promise<void> {
  await queueMcpNotification(supabase, userId, {
    type: 'mcp_category_deleted',
    title: '🗑️ Category Deleted via MCP',
    body: `Deleted: ${categoryName}`,
    tag: `mcp-category-deleted-${Date.now()}`,
    data: {
      type: 'mcp_category_deleted',
      url: '/'
    }
  });
}
