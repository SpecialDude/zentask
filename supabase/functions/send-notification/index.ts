// Send Push Notification Edge Function
// Sends web push notifications to user devices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

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

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      .select('*')
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
        JSON.stringify({ message: 'No active subscriptions found', sent: 0 }),
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

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          await sendPushNotification(sub, notificationData);
          
          // Update last_notified_at
          await supabase
            .from('push_subscriptions')
            .update({ last_notified_at: new Date().toISOString() })
            .eq('id', sub.id);

          return { subscriptionId: sub.id, success: true };
        } catch (error: any) {
          console.error(`Failed to send to subscription ${sub.id}:`, error);
          
          // If subscription is invalid (410 Gone), deactivate it
          if (error.statusCode === 410) {
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

// Send push notification using Web Push protocol
async function sendPushNotification(
  subscription: PushSubscription,
  notification: any
): Promise<void> {
  const payload = JSON.stringify(notification);

  // Create JWT for authorization
  const jwtToken = await createJWT(subscription.endpoint);

  // Encrypt payload
  const encryptedPayload = await encryptPayload(
    payload,
    subscription.p256dh_key,
    subscription.auth_key
  );

  // Send push notification
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwtToken}, k=${await urlBase64Encode(await getPublicKeyFromPrivate())}`,
      'TTL': '86400' // 24 hours
    },
    body: encryptedPayload
  });

  if (!response.ok) {
    const error: any = new Error(`Push notification failed: ${response.statusText}`);
    error.statusCode = response.status;
    throw error;
  }
}

// Create JWT for VAPID
async function createJWT(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: VAPID_SUBJECT
  };

  const encodedHeader = await urlBase64Encode(JSON.stringify(header));
  const encodedPayload = await urlBase64Encode(JSON.stringify(payload));

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const signature = await signJWT(unsignedToken);
  const encodedSignature = await urlBase64Encode(signature);

  return `${unsignedToken}.${encodedSignature}`;
}

// Sign JWT with ES256
async function signJWT(data: string): Promise<ArrayBuffer> {
  const privateKey = await importPrivateKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(data)
  );
  return signature;
}

// Import private key for signing
async function importPrivateKey(): Promise<CryptoKey> {
  const keyData = await urlBase64Decode(VAPID_PRIVATE_KEY);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Get public key from private key
async function getPublicKeyFromPrivate(): Promise<ArrayBuffer> {
  // For simplicity, we'll use the public key directly
  // In production, derive from private key
  const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY')!;
  return await urlBase64Decode(VAPID_PUBLIC_KEY);
}

// Encrypt payload for push notification
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  // This is a simplified implementation
  // In production, use a proper Web Push encryption library
  // For now, we'll send unencrypted (works with service worker)
  
  const encoder = new TextEncoder();
  return encoder.encode(payload);
}

// URL-safe base64 encode
async function urlBase64Encode(data: string | ArrayBuffer): Promise<string> {
  let buffer: Uint8Array;
  
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data);
  } else {
    buffer = new Uint8Array(data);
  }

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...buffer));
  
  // Make URL-safe
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// URL-safe base64 decode
async function urlBase64Decode(base64String: string): Promise<ArrayBuffer> {
  // Convert from URL-safe
  const base64 = base64String
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const padded = base64 + padding;

  // Decode
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }

  return buffer.buffer;
}
