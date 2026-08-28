import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { isClerkConfigured } from './ClerkWrapper';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

// Inner provider that interacts with Clerk when configured
function ClerkAuthBridge({ children, value, setValue }) {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuth();
  const clerk = useClerk();

  useEffect(() => {
    async function syncClerkSession() {
      if (!isClerkLoaded) return;

      if (isSignedIn && clerkUser) {
        try {
          const token = await getToken();
          if (token) {
            localStorage.setItem('lifeops_token', token);
          }

          const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
          const fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'LifeOps User';

          const mappedUser = {
            id: clerkUser.id,
            email: primaryEmail,
            full_name: fullName,
            imageUrl: clerkUser.imageUrl,
            created_at: clerkUser.createdAt
          };

          const mappedProfile = {
            id: clerkUser.id,
            user_id: clerkUser.id,
            full_name: fullName,
            role: 'Member',
            avatar_url: clerkUser.imageUrl,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };

          setValue(prev => ({
            ...prev,
            user: mappedUser,
            profile: mappedProfile,
            loading: false,
            isAuthenticated: true,
            isClerk: true,
            clerkUser,
            logout: async () => {
              await clerkSignOut();
              localStorage.removeItem('lifeops_token');
              setValue(p => ({ ...p, user: null, profile: null, isAuthenticated: false }));
            }
          }));
        } catch (err) {
          console.warn('Failed to sync Clerk token:', err);
          setValue(prev => ({ ...prev, loading: false }));
        }
      } else {
        setValue(prev => ({
          ...prev,
          user: null,
          profile: null,
          loading: false,
          isAuthenticated: false,
          isClerk: true
        }));
      }
    }

    syncClerkSession();
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore fallback or Supabase session on initial load when not using Clerk
  useEffect(() => {
    if (isClerkConfigured) {
      return; // ClerkAuthBridge handles this
    }

    async function restoreSession() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session: initialSession }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            localStorage.setItem('lifeops_token', initialSession.access_token);
            await fetchUserProfile();
          } else {
            const token = localStorage.getItem('lifeops_token');
            if (token) {
              await fetchUserProfile();
            }
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession) {
              setSession(currentSession);
              setUser(currentSession.user);
              localStorage.setItem('lifeops_token', currentSession.access_token);
              await fetchUserProfile();
            } else {
              setSession(null);
              setUser(null);
              setProfile(null);
              localStorage.removeItem('lifeops_token');
            }
          });

          return () => subscription?.unsubscribe();
        } else {
          // Local fallback session
          const token = localStorage.getItem('lifeops_token');
          if (token) {
            await fetchUserProfile();
          }
        }
      } catch (err) {
        console.warn('Session restore failed or expired:', err.message);
        localStorage.removeItem('lifeops_token');
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function fetchUserProfile() {
    try {
      const response = await api.get('/auth/me');
      if (response?.data) {
        setUser(response.data.user);
        setProfile(response.data.profile);
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
    }
  }

  async function register(email, password, fullName = '', role = 'Member') {
    setAuthError(null);
    try {
      let token = null;
      let newUser = null;

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } }
        });
        if (error) throw error;
        newUser = data.user;
        token = data.session?.access_token;
      }

      const res = await api.post('/auth/register', { email, password, fullName, role });
      if (!token && res.data?.token) {
        token = res.data.token;
      }
      if (token) {
        localStorage.setItem('lifeops_token', token);
      }

      setUser(res.data.user || newUser);
      setProfile(res.data.profile);
      return { success: true, user: res.data.user || newUser };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  async function login(email, password) {
    setAuthError(null);
    try {
      let token = null;
      let loggedUser = null;

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        loggedUser = data.user;
        token = data.session?.access_token;
      }

      const res = await api.post('/auth/login', { email, password });
      if (!token && res.data?.token) {
        token = res.data.token;
      }
      if (token) {
        localStorage.setItem('lifeops_token', token);
      }

      setUser(res.data.user || loggedUser);
      setProfile(res.data.profile);
      return { success: true, user: res.data.user || loggedUser };
    } catch (err) {
      const msg = err.message || 'Invalid email or password.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }

  async function logout() {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Signout notice:', err.message);
    } finally {
      localStorage.removeItem('lifeops_token');
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  }

  async function updateProfile(updates) {
    try {
      const res = await api.patch('/auth/profile', updates);
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
      return res.data?.profile;
    } catch (err) {
      throw new Error(err.message || 'Failed to update profile');
    }
  }

  const [stateValue, setStateValue] = useState({
    user,
    profile,
    session,
    loading,
    authError,
    isAuthenticated: Boolean(user || localStorage.getItem('lifeops_token')),
    isClerk: isClerkConfigured,
    register,
    login,
    logout,
    updateProfile,
    refreshProfile: fetchUserProfile
  });

  // Keep stateValue synchronized with basic state
  useEffect(() => {
    if (!isClerkConfigured) {
      setStateValue(prev => ({
        ...prev,
        user,
        profile,
        session,
        loading,
        authError,
        isAuthenticated: Boolean(user || localStorage.getItem('lifeops_token'))
      }));
    }
  }, [user, profile, session, loading, authError]);

  if (isClerkConfigured) {
    return (
      <ClerkAuthBridge value={stateValue} setValue={setStateValue}>
        {children}
      </ClerkAuthBridge>
    );
  }

  return (
    <AuthContext.Provider value={stateValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
