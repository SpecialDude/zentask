// Supabase Edge Function: jira-api-proxy
// Proxies requests to the Jira Cloud REST API with automatic token refresh.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ATLASSIAN_CLIENT_ID = Deno.env.get('ATLASSIAN_CLIENT_ID')!;
const ATLASSIAN_CLIENT_SECRET = Deno.env.get('ATLASSIAN_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshTokenIfNeeded(supabase: any, connection: any) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    const now = Date.now();

    // Refresh if token expires within 5 minutes
    if (expiresAt - now > 5 * 60 * 1000) {
        return connection.access_token;
    }

    console.log('Refreshing Jira token...');
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: ATLASSIAN_CLIENT_ID,
            client_secret: ATLASSIAN_CLIENT_SECRET,
            refresh_token: connection.refresh_token,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Token refresh failed:', errText);
        throw new Error('Failed to refresh Jira token');
    }

    const tokens = await response.json();

    await supabase.from('jira_connections').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq('id', connection.id);

    return tokens.access_token;
}

async function jiraFetch(accessToken: string, cloudId: string, path: string, options: RequestInit = {}) {
    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`;
    console.log(`Jira API: ${options.method || 'GET'} ${path}`);

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Jira API error (${response.status}):`, errorText);
        throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    // Handle 204 No Content (e.g. transition responses)
    if (response.status === 204) {
        return { success: true };
    }

    return response.json();
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            console.error('No authorization header');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Decode the JWT to get user_id
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('Auth failed:', authError?.message);
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`User authenticated: ${user.id}`);

        // Get user's Jira connection
        const { data: connection, error: connError } = await supabase
            .from('jira_connections')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (connError || !connection) {
            console.error('No connection:', connError?.message);
            return new Response(JSON.stringify({ error: 'No Jira connection found. Please reconnect.' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Jira connection found: cloud_id=${connection.cloud_id}, site=${connection.site_name}`);

        // Refresh token if needed
        const accessToken = await refreshTokenIfNeeded(supabase, connection);

        // Parse the action
        const body = await req.json();
        const { action, ...params } = body;
        console.log(`Action: ${action}`, params);
        let result: any;

        switch (action) {
            case 'get-sites': {
                const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                result = await response.json();
                break;
            }

            case 'get-projects': {
                result = await jiraFetch(accessToken, connection.cloud_id, '/project/search?maxResults=50');
                break;
            }

            case 'get-issues': {
                const { projectKey, startAt = 0, maxResults = 50 } = params;
                const jql = encodeURIComponent(`project = "${projectKey}" AND assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`);
                result = await jiraFetch(
                    accessToken,
                    connection.cloud_id,
                    `/search/jql?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,priority,parent,issuetype`
                );
                break;
            }

            case 'get-transitions': {
                const { issueKey } = params;
                result = await jiraFetch(accessToken, connection.cloud_id, `/issue/${issueKey}/transitions`);
                break;
            }

            case 'transition-issue': {
                const { issueKey, transitionId } = params;
                result = await jiraFetch(accessToken, connection.cloud_id, `/issue/${issueKey}/transitions`, {
                    method: 'POST',
                    body: JSON.stringify({ transition: { id: transitionId } }),
                });
                break;
            }

            case 'get-issue': {
                const { issueKey } = params;
                result = await jiraFetch(
                    accessToken,
                    connection.cloud_id,
                    `/issue/${issueKey}?fields=summary,description,status,priority,parent,issuetype`
                );
                break;
            }

            default:
                return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
        }

        console.log(`Action ${action} completed successfully`);
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Proxy error:', err.message, err.stack);
        return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
