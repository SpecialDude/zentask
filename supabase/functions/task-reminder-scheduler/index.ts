// Task Reminder Scheduler (Cron Job)
// Runs every minute to check for upcoming tasks and queue reminders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    console.log('Task Reminder Scheduler: Starting...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with task_reminder enabled
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, reminder_minutes, quiet_hours_start, quiet_hours_end')
      .eq('notification_type', 'task_reminder')
      .eq('enabled', true);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), { status: 500 });
    }

    if (!preferences || preferences.length === 0) {
      console.log('No users have task reminders enabled');
      return new Response(JSON.stringify({ message: 'No enabled reminders', queued: 0 }), { status: 200 });
    }

    let totalQueued = 0;

    // Process each user
    for (const pref of preferences) {
      const userId = pref.user_id;
      const reminderMinutes = pref.reminder_minutes || 15;

      // Check if in quiet hours
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
      
      if (isInQuietHours(currentTime, pref.quiet_hours_start, pref.quiet_hours_end)) {
        console.log(`User ${userId}: In quiet hours, skipping`);
        continue;
      }

      // Calculate time window for reminders
      const startTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 1000); // 1-minute window

      const today = now.toISOString().split('T')[0];

      // Query tasks with start times in the window
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, startTime, date')
        .eq('user_id', userId)
        .eq('date', today)
        .in('status', ['TODO', 'IN_PROGRESS'])
        .not('startTime', 'is', null);

      if (tasksError) {
        console.error(`Error fetching tasks for user ${userId}:`, tasksError);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        continue;
      }

      // Filter tasks by start time
      const tasksToRemind = tasks.filter(task => {
        if (!task.startTime) return false;
        
        const [hours, minutes] = task.startTime.split(':').map(Number);
        const taskDateTime = new Date(now);
        taskDateTime.setHours(hours, minutes, 0, 0);

        return taskDateTime >= startTime && taskDateTime < endTime;
      });

      // Queue notifications for each task
      for (const task of tasksToRemind) {
        // Check if already queued
        const { data: existing } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('user_id', userId)
          .eq('notification_type', 'task_reminder')
          .eq('data->>taskId', task.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) {
          console.log(`Reminder already queued for task ${task.id}`);
          continue;
        }

        // Calculate scheduled_for time (reminder_minutes before start)
        const [hours, minutes] = task.startTime.split(':').map(Number);
        const taskDateTime = new Date(now);
        taskDateTime.setHours(hours, minutes, 0, 0);
        const scheduledFor = new Date(taskDateTime.getTime() - reminderMinutes * 60 * 1000);

        // Queue the notification
        const { error: queueError } = await supabase
          .from('notification_queue')
          .insert([{
            user_id: userId,
            notification_type: 'task_reminder',
            title: '🕐 Task Starting Soon',
            body: `${task.title} starts in ${reminderMinutes} minutes`,
            icon: '/icon-512.png',
            badge: '/icon-512.png',
            tag: `task-reminder-${task.id}`,
            data: {
              type: 'task_reminder',
              taskId: task.id,
              taskDate: task.date,
              url: `/?date=${task.date}&task=${task.id}`
            },
            scheduled_for: scheduledFor.toISOString(),
            status: 'pending'
          }]);

        if (queueError) {
          console.error(`Error queueing reminder for task ${task.id}:`, queueError);
        } else {
          console.log(`Queued reminder for task ${task.id}`);
          totalQueued++;
        }
      }
    }

    console.log(`Task Reminder Scheduler: Completed. Queued ${totalQueued} reminders`);

    return new Response(
      JSON.stringify({ 
        message: 'Task reminder scheduler completed',
        queued: totalQueued,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in task-reminder-scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Check if current time is within quiet hours
function isInQuietHours(
  currentTime: string,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) {
    return false;
  }

  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietStart);
  const end = timeToMinutes(quietEnd);

  // Handle quiet hours that cross midnight
  if (start <= end) {
    return current >= start && current < end;
  } else {
    return current >= start || current < end;
  }
}

// Convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
