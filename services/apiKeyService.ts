import { request } from './apiClient';

export interface UserApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  created_at: number;
  last_used_at: number | null;
  expires_at: number | null;
}

export interface GeneratedKeyResult {
  apiKey: UserApiKey;
  rawToken: string; // Only returned once upon creation!
}

/**
 * Generate a new API key for the authenticated user. The raw token is minted
 * and hashed server-side and returned exactly once.
 */
export async function createApiKey(_userId: string, name: string): Promise<GeneratedKeyResult> {
  const body = await request<UserApiKey & { raw_token: string }>('/api-keys', {
    method: 'POST',
    body: { name: name.trim() || 'MCP Client Key' },
  });

  const { raw_token: rawToken, ...apiKey } = body;
  return { apiKey, rawToken };
}

/**
 * Fetch all API keys for the user (without raw keys or hashes).
 */
export async function fetchUserApiKeys(_userId: string): Promise<UserApiKey[]> {
  try {
    return await request<UserApiKey[]>('/api-keys');
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
}

/**
 * Revoke/Delete an API key.
 */
export async function revokeApiKey(keyId: string, _userId: string): Promise<boolean> {
  try {
    await request(`/api-keys/${encodeURIComponent(keyId)}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error revoking API key:', error);
    throw error;
  }
}
