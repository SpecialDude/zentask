/**
 * useAuth - Custom hook for authentication state
 * 
 * Manages Supabase auth session and user metadata.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export interface AuthUser {
    id: string;
    email?: string;
    displayName?: string;
}

// Persist the user's IANA timezone in auth metadata so backend schedulers
// (task reminders, quiet hours) can fire at the correct local time.
async function ensureTimezone(user: any) {
    if (!user) return;
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!timezone) return;
        if (user.user_metadata?.timezone === timezone) return;
        await supabase.auth.updateUser({ data: { timezone } });
    } catch (error) {
        console.error('Failed to save timezone:', error);
    }
}

export function useAuth() {
    const [session, setSession] = useState<any>(null);
    const [userName, setUserName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const [isAdmin, setIsAdmin] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async (userId: string) => {
            const { data } = await supabase
                .from('admins')
                .select('id')
                .eq('id', userId)
                .single();
            setIsAdmin(!!data);
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.user_metadata?.display_name) {
                setUserName(session.user.user_metadata.display_name);
            }
            if (session?.user?.id) {
                checkAdminStatus(session.user.id);
                ensureTimezone(session.user);
            }
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
                setIsRecovery(false);
            }
            setSession(session);
            if (session?.user?.user_metadata?.display_name) {
                setUserName(session.user.user_metadata.display_name);
            }
            if (session?.user?.id) {
                checkAdminStatus(session.user.id);
                ensureTimezone(session.user);
            } else {
                setIsAdmin(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const user: AuthUser | null = session?.user ? {
        id: session.user.id,
        email: session.user.email,
        displayName: userName || session.user.email
    } : null;

    return {
        session,
        user,
        userName,
        isAdmin,
        isRecovery,
        setUserName,
        isLoading,
        isAuthenticated: !!session,
        signOut
    };
}
