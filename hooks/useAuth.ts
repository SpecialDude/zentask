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

export function useAuth() {
    const [session, setSession] = useState<any>(null);
    const [userName, setUserName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const [isAdmin, setIsAdmin] = useState(false);

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
            }
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user?.user_metadata?.display_name) {
                setUserName(session.user.user_metadata.display_name);
            }
            if (session?.user?.id) {
                checkAdminStatus(session.user.id);
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
        setUserName,
        isLoading,
        isAuthenticated: !!session,
        signOut
    };
}
