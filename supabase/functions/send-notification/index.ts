// Send Push Notification Edge Function
// Sends web push notifications to a user's devices.
//
// Security: this function is deliberately callable only by the service role.
// The `verify_jwt = false` config means the gateway does not gate it, so we
// validate the caller here (x-supabase-role header or JWT role claim).
// A regular user (or the anon key) must never be able to push to arbitrary
// userId values.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Only the service role may send notifications on behalf of a user.
function isServiceRoleRequest(req: Request): boolean {
  if (req.headers.get('x-supabase-role') === 'service_role') return true;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

// Derive web-push-ready VAPID keys from the PKCS8 private key.
// web-push expects the public key as the 65-byte uncompressed EC point and the
// private key as the raw 32-byte scalar (both URL-safe base64). Exporting the
// PKCS8 key as JWK yields x/y/d (d is already the base64url 32-byte scalar),
// so we rebuild the 65-byte point from x/y instead of exporting it via spki
// (which fails for private keys on some WebCrypto runtimes).
let cachedVapidKeys: { publicKey: string; privateKey: string } | null = null;
async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (cachedVapidKeys) return cachedVapidKeys;
  const keyData = urlDecode(VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
  const jwk = await crypto.subtle.exportKey('jwk', key);
  const x = urlDecode(jwk.x);
  const y = urlDecode(jwk.y);
  const rawPublicKey = new Uint8Array(1 + x.byteLength + y.byteLength);
  rawPublicKey.set([4], 0); // uncompressed EC point prefix
  rawPublicKey.set(new Uint8Array(x), 1);
  rawPublicKey.set(new Uint8Array(y), 1 + x.byteLength);
  cachedVapidKeys = {
    publicKey: urlEncode(rawPublicKey),
    privateKey: jwk.d // 32-byte scalar, base64-url encoded
  };
  return cachedVapidKeys;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authorize the caller before doing anything else.
    if (!isServiceRoleRequest(req)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: service role required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const payload: NotificationPayload = await req.json();
    const { userId, title, body, icon, badge, tag, data, actions } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active subscriptions for user
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found', sent: 0, failed: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const notificationData = {
      title,
      body,
      icon: icon || '/icon-512.png',
      badge: badge || '/icon-512.png',
      tag: tag || `notification-${Date.now()}`,
      data: data || {},
      actions: actions || []
    };

    // Configure VAPID once per invocation. web-push handles both the JWT
    // authorization and RFC 8291 payload encryption.
    const vapidKeys = await getVapidKeys();
    webpush.setVapidDetails(VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey);

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            JSON.stringify(notificationData),
            { TTL: 86400 } // 24 hours
          );

          // Update last_notified_at
          await supabase
            .from('push_subscriptions')
            .update({ last_notified_at: new Date().toISOString() })
            .eq('id', sub.id);

          return { subscriptionId: sub.id, success: true };
        } catch (error: any) {
          console.error(`Failed to send to subscription ${sub.id}:`, error);

          // If subscription is invalid (410 Gone / 404 Not Found), deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          return { subscriptionId: sub.id, success: false, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        sent: successful,
        failed,
        total: results.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// URL-safe base64 encode (Uint8Array -> base64url string)
function urlEncode(data: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// URL-safe base64 decode (base64url string -> ArrayBuffer)
function urlDecode(base64String: string): ArrayBuffer {
  const base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}
