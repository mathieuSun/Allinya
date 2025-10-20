import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { type User } from '@supabase/supabase-js';
import { type RuntimeProfile } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  profile: RuntimeProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: 'guest' | 'practitioner', fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RuntimeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (retryCount = 0) => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        // Token not available yet (happens during sign-up/sign-in transitions)
        // Retry up to 10 times with 500ms delay
        if (retryCount < 10) {
          console.log(`Waiting for session token... retry ${retryCount + 1}`);
          setTimeout(() => refreshProfile(retryCount + 1), 500);
        } else {
          console.error('Failed to get session token after 10 retries');
          setProfile(null);
        }
        return;
      }

      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Profile doesn't exist yet - this is okay for new users
          setProfile(null);
        } else {
          console.error('Error fetching profile:', response.status);
        }
        return;
      }

      const data = await response.json();
      // The /api/auth/user endpoint returns { id, profile, practitioner }
      // We just need the profile part
      setProfile(data.profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // If we have a new session, immediately fetch the profile using the provided token
      if (session?.access_token && session?.user) {
        try {
          const response = await fetch('/api/auth/user', {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setProfile(data.profile);
          } else if (response.status === 404) {
            setProfile(null);
          }
        } catch (error) {
          console.error('Error fetching profile on auth change:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    // CRITICAL: Use our backend API to enforce role separation
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    // Set the session in Supabase client
    if (data.session) {
      await supabase.auth.setSession(data.session);
    }
    
    // Update profile immediately
    setProfile(data.profile);
  };

  const signUp = async (email: string, password: string, role?: 'guest' | 'practitioner', fullName?: string) => {
    // CRITICAL: Role MUST be provided for signup
    if (!role) {
      throw new Error('Role must be specified as either "guest" or "practitioner"');
    }
    
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password, 
        role,
        full_name: fullName || email.split('@')[0]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();
    
    // Set the session in Supabase client
    if (data.session) {
      await supabase.auth.setSession(data.session);
    }
    
    // Update profile immediately
    setProfile(data.profile);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
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
