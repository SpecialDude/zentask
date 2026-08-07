// Welcome Email Sender (Cron Job)
// Drains public.welcome_email_queue (populated by the
// enqueue_welcome_email() trigger when a user confirms their
// email) and sends each user a welcome email via Resend.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

const FROM_ADDRESS = 'ZenTask <noreply@zentask.space>';
const APP_URL = 'https://www.zentask.space/';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function welcomeEmailHtml(displayName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">ZenTask</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Hierarchical Productivity Tracker</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">Welcome aboard${displayName ? `, ${displayName}` : ''}! 🎉</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                Your email is confirmed. You're all set to start organizing tasks, building lists,
                and tracking your productivity with ZenTask.
              </p>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                Here are a few things you can do to get started:
              </p>
              <ul style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:2;padding-left:20px;">
                <li>Create your first task and break it down into subtasks</li>
                <li>Organize work into lists and categories</li>
                <li>Set reminders so nothing slips through</li>
              </ul>
              <a href="${APP_URL}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">
                Start Organizing
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                &copy; 2026 ZenTask. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  try {
    console.log('Welcome Email Sender: Starting...');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set' }), { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: queue, error: queryError } = await supabase
      .from('welcome_email_queue')
      .select('id, user_id, email, display_name, attempts')
      .is('sent_at', null)
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('Error querying welcome_email_queue:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to query queue' }), { status: 500 });
    }

    if (!queue || queue.length === 0) {
      console.log('No pending welcome emails');
      return new Response(
        JSON.stringify({ message: 'No pending welcome emails', sent: 0 }),
        { status: 200 }
      );
    }

    console.log(`Found ${queue.length} welcome emails to send`);

    let sentCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [item.email],
            subject: 'Welcome to ZenTask!',
            html: welcomeEmailHtml(item.display_name)
          })
        });

        if (resendResponse.ok) {
          await supabase
            .from('welcome_email_queue')
            .update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1 })
            .eq('id', item.id);
          sentCount++;
          console.log(`✅ Sent welcome email to ${item.email}`);
        } else {
          const errText = await resendResponse.text();
          throw new Error(`Resend API ${resendResponse.status}: ${errText}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to send welcome email to ${item.email}:`, error.message);
        failedCount++;

        const newAttempts = item.attempts + 1;
        const deadLetter = newAttempts >= MAX_ATTEMPTS;

        await supabase
          .from('welcome_email_queue')
          .update({
            attempts: newAttempts,
            last_error: error.message,
            sent_at: deadLetter ? new Date().toISOString() : null
          })
          .eq('id', item.id);
      }

      await delay(100);
    }

    console.log(`Welcome Email Sender: Completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        message: 'Welcome email queue processed',
        processed: queue.length,
        sent: sentCount,
        failed: failedCount,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in welcome-email-sender:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
