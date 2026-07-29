import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Recovers parent task progress when a child task is updated or added.
 * Calculates average completion of all siblings and updates parent recursively.
 */
export async function syncParents(
  supabase: SupabaseClient,
  userId: string,
  parentId: string
): Promise<void> {
  let currentParentId: string | null = parentId;

  while (currentParentId) {
    // 1. Fetch current parent task
    const res = await supabase
      .from('tasks')
      .select('id, parentId')
      .eq('id', currentParentId)
      .eq('user_id', userId)
      .single();

    if (res.error || !res.data) break;
    const parentTask = res.data as { id: string; parentId: string | null };



    // 2. Fetch all siblings of current parent
    const { data: siblings, error: siblingsError } = await supabase
      .from('tasks')
      .select('id, completion, status')
      .eq('parentId', currentParentId)
      .eq('user_id', userId);

    if (siblingsError || !siblings || siblings.length === 0) break;

    // 3. Calculate average completion %
    const totalCompletion = siblings.reduce((acc, sib) => acc + (sib.completion || 0), 0);
    const avgCompletion = Math.round(totalCompletion / siblings.length);

    // Determine status
    let status = 'IN_PROGRESS';
    if (avgCompletion === 100) {
      status = 'COMPLETED';
    } else if (avgCompletion === 0) {
      const hasInProgress = siblings.some(s => s.status === 'IN_PROGRESS');
      status = hasInProgress ? 'IN_PROGRESS' : 'TODO';
    }

    // 4. Update parent task
    await supabase
      .from('tasks')
      .update({
        completion: avgCompletion,
        status,
        updatedAt: Date.now()
      })
      .eq('id', currentParentId)
      .eq('user_id', userId);

    // Move up to grand-parent
    currentParentId = parentTask.parentId;
  }
}
