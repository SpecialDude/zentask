/**
 * Gemini Service
 * Calls the server-side Gemini proxy so the API key stays on the backend and
 * every request rides the authenticated session.
 */

import { request } from './apiClient';

export interface GeminiProxyRequest {
    model?: string;
    contents: any;
    systemInstruction?: any;
    generationConfig?: Record<string, any>;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

export const callGeminiProxy = async (requestBody: GeminiProxyRequest): Promise<any> => {
    try {
        return await request('/ai/generate', {
            method: 'POST',
            body: { model: DEFAULT_GEMINI_MODEL, ...requestBody },
        });
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'AI request failed');
    }
};

export const extractGeminiText = (response: any): string => {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts.map((part: any) => part?.text || '').join('');
};
