// Notification Queue Processor (Cron Job)
// Processes pending notifications and sends them

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  try {
    console.log('Notification Queue Processor: Starting...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending notifications that are ready to send
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', MAX_ATTEMPTS)
      .order('scheduled_for', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200 }
      );
    }

    console.log(`Found ${notifications.length} notifications to process`);

    let sentCount = 0;
    let failedCount = 0;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Call send-notification function
        const sendResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            userId: notification.user_id,
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            tag: notification.tag,
            data: notification.data,
            actions: notification.data?.actions
          })
        });

        const result = await sendResponse.json();

        if (sendResponse.ok && result.sent > 0) {
          // Mark as sent
          await supabase
            .from('notification_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: notification.attempts + 1
            })
            .eq('id', notification.id);

          // Log success
          await supabase
            .from('notification_log')
            .insert([{
              user_id: notification.user_id,
              notification_type: notification.notification_type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              status: 'sent',
              response_code: sendResponse.status
            }]);

          sentCount++;
          console.log(`✅ Sent notification ${notification.id}`);

        } else {
          throw new Error(result.error || 'Failed to send notification');
        }

      } catch (error: any) {
        console.error(`❌ Failed to send notification ${notification.id}:`, error);
        failedCount++;

        const newAttempts = notification.attempts + 1;
        const isFinalAttempt = newAttempts >= MAX_ATTEMPTS;

        // Update notification status
        await supabase
          .from('notification_queue')
          .update({
            status: isFinalAttempt ? 'failed' : 'pending',
            attempts: newAttempts,
            error_message: error.message
          })
          .eq('id', notification.id);

        // Log failure
        if (isFinalAttempt) {
          await supabase
            .from('notification_log')
            .insert([{
              user_id: notification.user_id,
              notification_type: notification.notification_type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              status: 'failed',
              error_message: error.message
            }]);
        }
      }

      // Small delay between notifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Notification Queue Processor: Completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        message: 'Notification queue processed',
        processed: notifications.length,
        sent: sentCount,
        failed: failedCount,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-notification-queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
