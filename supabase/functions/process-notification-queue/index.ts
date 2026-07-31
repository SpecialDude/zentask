// Notification Queue Processor (Cron Job)
// Processes pending notifications and sends them.
//
// - Claims notifications atomically via claim_notifications() so overlapping
//   cron runs can never double-send.
// - Defers notifications that land inside a user's quiet hours (next_allowed_time).
// - Distinguishes "no active subscriptions" (cancelled) from real failures (retry).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 100;
const DELAY_BETWEEN_SENDS_MS = 100;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  try {
    console.log('Notification Queue Processor: Starting...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Atomically claim up to BATCH_SIZE notifications that are due.
    const { data: notifications, error: claimError } = await supabase
      .rpc('claim_notifications', { batch_size: BATCH_SIZE });

    if (claimError) {
      console.error('Error claiming notifications:', claimError);
      return new Response(JSON.stringify({ error: 'Failed to claim notifications' }), { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200 }
      );
    }

    console.log(`Claimed ${notifications.length} notifications to process`);

    let sentCount = 0;
    let deferredCount = 0;
    let failedCount = 0;

    // Process each notification
    for (const notification of notifications) {
      try {
        // Respect quiet hours: defer instead of sending during do-not-disturb.
        const { data: nextAllowed, error: quietError } = await supabase
          .rpc('next_allowed_time', {
            p_user_id: notification.user_id,
            p_notification_type: notification.notification_type
          });

        if (quietError) throw quietError;

        if (nextAllowed && new Date(nextAllowed).getTime() > Date.now()) {
          await supabase
            .from('notification_queue')
            .update({
              status: 'pending',
              scheduled_for: nextAllowed,
              claimed_at: null
            })
            .eq('id', notification.id);
          deferredCount++;
          console.log(`⏰ Deferred notification ${notification.id} until ${nextAllowed}`);
          continue;
        }

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
              attempts: notification.attempts + 1,
              claimed_at: null
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

        } else if (sendResponse.ok && result.total === 0) {
          // No active subscriptions - nothing to deliver. Cancel rather than
          // retry pointlessly and pollute the log with fake failures.
          await supabase
            .from('notification_queue')
            .update({
              status: 'cancelled',
              attempts: notification.attempts + 1,
              error_message: 'No active subscriptions',
              claimed_at: null
            })
            .eq('id', notification.id);

          failedCount++;
          console.log(`🚫 Cancelled notification ${notification.id} (no active subscriptions)`);

        } else {
          throw new Error(result.error || 'Failed to send notification');
        }

      } catch (error: any) {
        console.error(`❌ Failed to send notification ${notification.id}:`, error);
        failedCount++;

        const newAttempts = notification.attempts + 1;
        const isFinalAttempt = newAttempts >= MAX_ATTEMPTS;

        // Update notification status (release the claim so it can be retried)
        await supabase
          .from('notification_queue')
          .update({
            status: isFinalAttempt ? 'failed' : 'pending',
            attempts: newAttempts,
            error_message: error.message,
            claimed_at: null
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
      await delay(DELAY_BETWEEN_SENDS_MS);
    }

    console.log(`Notification Queue Processor: Completed. Sent: ${sentCount}, Deferred: ${deferredCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        message: 'Notification queue processed',
        processed: notifications.length,
        sent: sentCount,
        deferred: deferredCount,
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
