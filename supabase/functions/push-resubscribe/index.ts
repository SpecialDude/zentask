// Push Resubscribe Edge Function
// Called by the service worker when a push subscription rotates
// (the `pushsubscriptionchange` event). It replaces the old endpoint's
// keys with the new subscription and re-activates the device.
//
// Security note: the function is identified by the old endpoint, which is a
// high-entropy unguessable URL — the same trust boundary as the subscription
// itself. It must never be exposed in any way that leaks endpoints.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { oldEndpoint, subscription } = await req.json();
    const keys = subscription?.keys || {};

    if (!oldEndpoint || !subscription?.endpoint || !keys.p256dh || !keys.auth) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: oldEndpoint, subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the existing subscription row by the old endpoint.
    const { data: existing, error: findError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', oldEndpoint)
      .maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return new Response(
        JSON.stringify({ message: 'No subscription found for old endpoint', resubscribed: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Swap in the new subscription details. Preserve the existing is_active
    // state so a device the user turned off stays off after a rotation.
    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({
        endpoint: subscription.endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: 'Subscription resubscribed', resubscribed: true, userId: existing.user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in push-resubscribe function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
