// Supabase Edge Function: gemini-proxy
// Auth-gated proxy for the Google Gemini API.
// Keeps GEMINI_API_KEY server-side so it never ships to the browser.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only gemini-* models, no path traversal / URL injection
const MODEL_PATTERN = /^gemini-[a-z0-9.\-]{1,60}$/;
const MAX_BODY_BYTES = 256 * 1024;

// Only these generationConfig fields are forwarded to Gemini
const ALLOWED_GENERATION_CONFIG_FIELDS = [
    'temperature',
    'topP',
    'topK',
    'maxOutputTokens',
    'responseMimeType',
    'responseSchema',
];

function json(payload: unknown, status: number): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    try {
        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return json({ error: 'Unauthorized' }, 401);
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('Auth failed:', authError?.message);
            return json({ error: 'Invalid token' }, 401);
        }

        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not configured');
            return json({ error: 'AI service is not configured' }, 500);
        }

        const rawBody = await req.text();
        if (rawBody.length > MAX_BODY_BYTES) {
            return json({ error: 'Request too large' }, 413);
        }

        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return json({ error: 'Invalid JSON body' }, 400);
        }

        const model = typeof body.model === 'string' ? body.model : '';
        if (!MODEL_PATTERN.test(model)) {
            return json({ error: 'Invalid or missing model' }, 400);
        }

        // Forward only whitelisted request fields
        const payload: Record<string, unknown> = {};
        if (body.contents !== undefined) payload.contents = body.contents;
        if (body.systemInstruction !== undefined) payload.systemInstruction = body.systemInstruction;
        if (body.generationConfig !== undefined && body.generationConfig !== null) {
            const filtered: Record<string, unknown> = {};
            for (const field of ALLOWED_GENERATION_CONFIG_FIELDS) {
                if (body.generationConfig[field] !== undefined) {
                    filtered[field] = body.generationConfig[field];
                }
            }
            payload.generationConfig = filtered;
        }

        if (payload.contents === undefined) {
            return json({ error: 'Missing contents' }, 400);
        }

        // API key goes in a header, never in the URL (avoids log leakage)
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY,
                },
                body: JSON.stringify(payload),
            }
        );

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error(`Gemini API error (${geminiResponse.status}):`, errText);
            return json({ error: `AI request failed (${geminiResponse.status})` }, 502);
        }

        const result = await geminiResponse.json();
        return json(result, 200);

    } catch (err: any) {
        console.error('Gemini proxy error:', err.message, err.stack);
        return json({ error: 'Internal server error' }, 500);
    }
});
