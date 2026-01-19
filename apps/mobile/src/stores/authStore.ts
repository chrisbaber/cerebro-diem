import { create } from 'zustand';
import { supabase, signIn, signUp, signOut, signInWithGoogle, signInWithApple } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      // Add timeout to prevent app from hanging forever
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
      );

      const sessionPromise = supabase.auth.getSession();

      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isInitialized: true,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch (error) {
      // Always set isInitialized to true so the app can proceed
      // User will see the login screen if auth failed
      console.warn('Auth initialization failed:', error);
      set({ isInitialized: true, error: 'Failed to initialize auth' });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Login failed' });
      throw error;
    }
  },

  register: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await signUp(email, password, displayName);
      if (error) throw error;
      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Registration failed' });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Google login failed' });
      throw error;
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Apple login failed' });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await signOut();
      if (error) throw error;
      set({
        user: null,
        session: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Logout failed' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
