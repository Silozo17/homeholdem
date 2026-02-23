import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getAppUrl } from '@/lib/app-url';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Optimistic: try to read cached session from localStorage synchronously
  const getCachedSession = (): { user: User; session: Session } | null => {
    try {
      const key = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Check expires_at (unix timestamp in seconds)
      if (parsed.expires_at && parsed.expires_at > Date.now() / 1000) {
        return { user: parsed.user, session: parsed as Session };
      }
    } catch {}
    return null;
  };

  const cached = getCachedSession();
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [session, setSession] = useState<Session | null>(cached?.session ?? null);
  const [loading, setLoading] = useState(!cached); // skip loading if cached session found

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Token refresh - just update session silently, don't trigger loading state
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }
        
        // Sign out - clear everything
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // All other events (SIGNED_IN, INITIAL_SESSION, USER_UPDATED)
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session (validates/refreshes token in background)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppUrl(),
        data: {
          display_name: displayName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
