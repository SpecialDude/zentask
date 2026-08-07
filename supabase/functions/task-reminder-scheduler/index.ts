// Task Reminder Scheduler (Cron Job)
// Runs every minute to check for upcoming tasks and queue reminders.
//
// Timezone-aware: tasks store their date/startTime in the user's local time,
// but the cron runs in UTC. We resolve "today" and each task's start time in
// the user's timezone (from auth.users user_metadata) so reminders fire at
// the correct local moment regardless of where the server runs.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PreferenceWithUser {
  user_id: string;
  reminder_minutes: number | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

serve(async (req) => {
  try {
    console.log('Task Reminder Scheduler: Starting...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build a userId -> timezone map via the Admin API. PostgREST cannot embed
    // auth.users on this project (the auth schema isn't in the schema cache),
    // so fetch user metadata separately.
    const timezoneMap = await buildTimezoneMap(supabase);

    // Get all users with task_reminder enabled.
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
    for (const pref of preferences as PreferenceWithUser[]) {
      const userId = pref.user_id;
      const reminderMinutes = pref.reminder_minutes || 15;
      const timezone = timezoneMap[userId] || 'UTC';

      const now = new Date();
      const localNow = getZonedParts(now, timezone);

      // Check if in quiet hours (using the user's local wall clock)
      const currentLocalTime = `${localNow.hour}:${localNow.minute}:${localNow.second}`;
      if (isInQuietHours(currentLocalTime, pref.quiet_hours_start, pref.quiet_hours_end)) {
        console.log(`User ${userId}: In quiet hours, skipping`);
        continue;
      }

      // Calculate time window for reminders (in absolute UTC instants)
      const startWindow = new Date(now.getTime() + reminderMinutes * 60 * 1000);
      const endWindow = new Date(startWindow.getTime() + 60 * 1000); // 1-minute window

      // "Today" in the user's timezone
      const today = zonedDateString(now, timezone);

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

      // Filter tasks by start time (converted to UTC in the user's timezone)
      const tasksToRemind = tasks.filter(task => {
        if (!task.startTime) return false;

        const [hours, minutes] = task.startTime.split(':').map(Number);
        const taskUtc = zonedTimeToUtc(
          Number(localNow.year),
          Number(localNow.month),
          Number(localNow.day),
          hours,
          minutes,
          timezone
        );

        return taskUtc >= startWindow && taskUtc < endWindow;
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
        const taskUtc = zonedTimeToUtc(
          Number(localNow.year),
          Number(localNow.month),
          Number(localNow.day),
          hours,
          minutes,
          timezone
        );
        const scheduledFor = new Date(taskUtc.getTime() - reminderMinutes * 60 * 1000);

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

// Build a userId -> timezone map from auth.users user_metadata via the
// Admin API (works with the service role key without exposing the auth
// schema to PostgREST).
async function buildTimezoneMap(supabase: any): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      const tz = user.user_metadata?.timezone;
      if (typeof tz === 'string' && tz) map[user.id] = tz;
    }
    hasNextPage = data.hasNextPage;
    page++;
  }
  return map;
}

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

// Break a Date into local calendar/time parts for a given IANA timezone.
function getZonedParts(date: Date, timeZone: string): Record<string, string> {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  return parts;
}

// Local date string (YYYY-MM-DD) for a Date in a given timezone.
function zonedDateString(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

// Convert a local wall-clock time in `timeZone` to the equivalent UTC Date.
function zonedTimeToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const p = getZonedParts(guess, timeZone);
  const wall = new Date(Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  ));
  // offset = how far the guess's UTC reading sits from its local reading
  const offset = wall.getTime() - guess.getTime();
  return new Date(guess.getTime() - offset);
}
