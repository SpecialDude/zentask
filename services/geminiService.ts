/**
 * Gemini Service
 * Calls the gemini-proxy Supabase Edge Function so the Gemini API key
 * stays server-side and every request is authenticated with the user's JWT.
 */

import { supabase } from '../supabase';

export interface GeminiProxyRequest {
    model?: string;
    contents: any;
    systemInstruction?: any;
    generationConfig?: Record<string, any>;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

export const callGeminiProxy = async (request: GeminiProxyRequest): Promise<any> => {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { model: DEFAULT_GEMINI_MODEL, ...request },
    });

    if (error) {
        let message = error.message || 'AI request failed';
        try {
            // FunctionsHttpError contains a context with the response body
            if ((error as any).context?.body) {
                const reader = (error as any).context.body.getReader();
                const { value } = await reader.read();
                const parsed = JSON.parse(new TextDecoder().decode(value));
                message = parsed.error || message;
            }
        } catch { /* ignore parse errors */ }
        throw new Error(message);
    }

    return data;
};

export const extractGeminiText = (response: any): string => {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts.map((part: any) => part?.text || '').join('');
};
