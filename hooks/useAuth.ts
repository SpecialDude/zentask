/**
 * useAuth - Authentication state backed by the Django API.
 *
 * The session lives in HttpOnly cookies; this hook mirrors it in React via
 * services/authClient and restores it with GET /auth/session on mount.
 */

import { useState, useEffect, useRef } from 'react';
import {
    AuthSession,
    getUser,
    loadSession,
    signOut as apiSignOut,
    subscribe,
    updateUser,
} from '../services/authClient';
import { reconcilePushSubscription } from '../services/notificationService';

export interface AuthUser {
    id: string;
    email?: string;
    displayName?: string;
}

// Persist the user's IANA timezone in account metadata so backend schedulers
// (task reminders, quiet hours) can fire at the correct local time.
async function ensureTimezone(current?: string) {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timezone || current === timezone) return;
        await updateUser({ timezone });
    } catch (error) {
        console.error('Failed to save timezone:', error);
    }
}

// After a session is established, ask the browser to repair any push
// subscription that FCM rotated or invalidated (410 Gone) while the app was
// closed. Runs after an initial delay so it never blocks first paint, and only
// ever auto-re-enables rows the server marked 'gone' (never a user 'user' turn-off).
async function reconcilePushForUser(userId: string) {
    try {
        setTimeout(() => reconcilePushSubscription(userId), 3000);
    } catch (error) {
        console.error('Failed to schedule push reconcile:', error);
    }
}

export function useAuth() {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const reconciledUserRef = useRef<string | null>(null);

    useEffect(() => {
        let disposed = false;

        const unsubscribe = subscribe((next) => {
            if (disposed) return;
            setSession(next);
            const metadata = next?.user.user_metadata || {};
            setUserName((metadata.display_name as string) || next?.user.email || '');
            setIsAdmin(!!metadata.is_admin);
            setIsLoading(false);

            if (next) {
                ensureTimezone(metadata.timezone as string | undefined);
                if (reconciledUserRef.current !== next.user.id) {
                    reconciledUserRef.current = next.user.id;
                    reconcilePushForUser(next.user.id);
                }
            } else {
                reconciledUserRef.current = null;
            }
        });

        loadSession().finally(() => {
            if (!disposed) setIsLoading(false);
        });

        return () => {
            disposed = true;
            unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await apiSignOut();
        reconciledUserRef.current = null;
    };

    const user: AuthUser | null = session?.user
        ? {
              id: session.user.id,
              email: session.user.email,
              displayName: userName || session.user.email,
          }
        : null;

    return {
        session,
        user,
        userName,
        isAdmin,
        isRecovery: false,
        setUserName,
        isLoading,
        isAuthenticated: !!session,
        signOut,
        // Exposed for screens that need the full account record (admin flag,
        // email_confirmed_at) without another round trip.
        account: getUser(),
    };
}
