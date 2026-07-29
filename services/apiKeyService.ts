import { supabase } from '../supabase';

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
 * Computes SHA-256 hash of a string using Web Crypto API.
 */
export async function hashApiKey(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new secure API Key for the authenticated user.
 */
export async function createApiKey(userId: string, name: string): Promise<GeneratedKeyResult> {
  // Generate random 32-byte hex string
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const rawToken = `zt_live_${randomHex}`;
  const keyPrefix = rawToken.substring(0, 15) + '...';
  const keyHash = await hashApiKey(rawToken);
  const id = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = Date.now();

  const { data, error } = await supabase
    .from('user_api_keys')
    .insert([
      {
        id,
        user_id: userId,
        name: name.trim() || 'MCP Client Key',
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_at: createdAt,
      }
    ])
    .select('id, user_id, name, key_prefix, created_at, last_used_at, expires_at')
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    throw new Error(error.message || 'Failed to create API key');
  }

  return {
    apiKey: data as UserApiKey,
    rawToken
  };
}

/**
 * Fetch all API keys for the user (without raw keys or hashes).
 */
export async function fetchUserApiKeys(userId: string): Promise<UserApiKey[]> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, name, key_prefix, created_at, last_used_at, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }

  return (data || []) as UserApiKey[];
}

/**
 * Revoke/Delete an API key.
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error revoking API key:', error);
    throw new Error(error.message || 'Failed to revoke API key');
  }

  return true;
}
