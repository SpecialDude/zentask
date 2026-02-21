// Supabase Edge Function: jira-auth-callback
// Handles the OAuth 2.0 callback from Atlassian, exchanges code for tokens,
// and stores the connection in the jira_connections table.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ATLASSIAN_CLIENT_ID = Deno.env.get('ATLASSIAN_CLIENT_ID')!;
const ATLASSIAN_CLIENT_SECRET = Deno.env.get('ATLASSIAN_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const userId = url.searchParams.get('state'); // We pass user ID as state

        if (!code || !userId) {
            return Response.redirect(`${APP_URL}/#integrations?error=missing_params`);
        }

        // 1. Exchange authorization code for tokens
        const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: ATLASSIAN_CLIENT_ID,
                client_secret: ATLASSIAN_CLIENT_SECRET,
                code,
                redirect_uri: `${SUPABASE_URL}/functions/v1/jira-auth-callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            console.error('Token exchange failed:', err);
            return Response.redirect(`${APP_URL}/#integrations?error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json();

        // 2. Get accessible Jira Cloud sites
        const sitesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const sites = await sitesResponse.json();
        if (!sites.length) {
            return Response.redirect(`${APP_URL}/#integrations?error=no_sites`);
        }

        // Use the first site (most common case)
        const site = sites[0];

        // 3. Get user profile for email
        const profileResponse = await fetch('https://api.atlassian.com/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await profileResponse.json();

        // 4. Store connection in Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { error: upsertError } = await supabase.from('jira_connections').upsert({
            user_id: userId,
            cloud_id: site.id,
            site_name: site.name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            atlassian_email: profile.email || '',
        }, { onConflict: 'user_id' });

        if (upsertError) {
            console.error('DB upsert failed:', upsertError);
            return Response.redirect(`${APP_URL}/#integrations?error=db_error`);
        }

        // 5. Redirect back to app with success
        return Response.redirect(`${APP_URL}/#integrations?connected=true`);

    } catch (err) {
        console.error('Unexpected error:', err);
        return Response.redirect(`${APP_URL}/#integrations?error=unexpected`);
    }
});
