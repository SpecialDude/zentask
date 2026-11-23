/**
 * Auth store for the Django API.
 *
 * The API keeps the session in HttpOnly cookies, so the SPA never touches the
 * tokens. This module mirrors the session in memory for React, survives page
 * loads by asking GET /auth/session, and notifies subscribers on every change
 * (login, profile edit, sign out, or a failed refresh).
 */

import { request, refreshSession, setUnauthenticatedHandler, apiUrl } from './apiClient';

export interface ApiUser {
  id: string;
  email?: string;
  display_name?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
  is_admin?: boolean;
}

export interface AuthSession {
  user: {
    id: string;
    email?: string;
    user_metadata: Record<string, unknown>;
  };
}

type Listener = (session: AuthSession | null) => void;

let rawUser: ApiUser | null = null;
let currentSession: AuthSession | null = null;
const listeners = new Set<Listener>();

function toSession(user: ApiUser | null): AuthSession | null {
  if (!user) return null;
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        ...(user.user_metadata || {}),
        display_name: user.display_name || (user.user_metadata?.display_name as string) || '',
        is_admin: !!user.is_admin,
      },
    },
  };
}

function emit(user: ApiUser | null): void {
  rawUser = user;
  currentSession = toSession(user);
  for (const listener of listeners) listener(currentSession);
}

setUnauthenticatedHandler(() => emit(null));

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession(): AuthSession | null {
  return currentSession;
}

export function getUser(): ApiUser | null {
  return rawUser;
}

/** Restore the session from the cookies on page load. */
export async function loadSession(): Promise<AuthSession | null> {
  try {
    const body = await request<{ user: ApiUser }>('/auth/session');
    emit(body.user);
  } catch {
    emit(null);
  }
  return currentSession;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const body = await request<{ user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true,
  });
  emit(body.user);
  return currentSession as AuthSession;
}

/** Creates an unconfirmed account; the API emails a confirmation link. */
export async function signup(email: string, password: string): Promise<string> {
  const body = await request<{ detail?: string }>('/auth/signup', {
    method: 'POST',
    body: { email, password },
    skipAuthRefresh: true,
  });
  return body?.detail || 'Check your inbox to confirm your email address.';
}

export async function resendConfirmation(email: string): Promise<void> {
  await request('/auth/resend-confirmation', {
    method: 'POST',
    body: { email },
    skipAuthRefresh: true,
  });
}

export async function requestPasswordReset(email: string): Promise<string> {
  const body = await request<{ detail?: string }>('/auth/recover', {
    method: 'POST',
    body: { email },
    skipAuthRefresh: true,
  });
  return body?.detail || 'If this email belongs to an account, a message is on its way.';
}

export interface UserUpdate {
  display_name?: string;
  timezone?: string;
  password?: string;
}

export async function updateUser(update: UserUpdate): Promise<ApiUser> {
  const body = await request<{ user: ApiUser }>('/auth/user', {
    method: 'PATCH',
    body: update,
  });
  emit(body.user);
  return body.user;
}

export async function signOut(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST', skipAuthRefresh: true });
  } catch {
    // A dead session is still a signed-out one.
  }
  emit(null);
}

export function signInWithGoogle(): void {
  window.location.assign(apiUrl('/auth/google'));
}

export interface AuthProviders {
  google: boolean;
}

/** Which third-party providers the API has credentials for. */
export async function fetchAuthProviders(): Promise<AuthProviders> {
  try {
    return await request<AuthProviders>('/auth/providers', { skipAuthRefresh: true });
  } catch {
    return { google: false };
  }
}

/** Rotate the cookies early (e.g. before a long-running session). */
export { refreshSession };
