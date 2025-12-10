import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, authAPI, profileAPI } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOAD USER VÀ SESSION KHI APP KHỞI ĐỘNG
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Lấy session hiện tại
        const { session: currentSession } = await authAPI.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Load profile
          const { data: profileData } = await profileAPI.getProfile(currentSession.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Lắng nghe thay đổi auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Load profile khi user đăng nhập
          const { data: profileData } = await profileAPI.getProfile(currentSession.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // ĐĂNG KÝ
  // ==========================================
  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await authAPI.signUp(email, password, fullName);
    
    if (error) throw error;
    return data;
  };

  // ==========================================
  // ĐĂNG NHẬP
  // ==========================================
  const signIn = async (email: string, password: string) => {
    const { data, error } = await authAPI.signIn(email, password);
    
    if (error) throw error;
    
    // Session và user sẽ được update tự động qua onAuthStateChange
    return data;
  };

  // ==========================================
  // ĐĂNG XUẤT
  // ==========================================
  const signOut = async () => {
    const { error } = await authAPI.signOut();
    
    if (error) throw error;
    
    // Clear state
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // ==========================================
  // CẬP NHẬT PROFILE
  // ==========================================
  const updateProfile = async (updates: any) => {
    if (!user) throw new Error('No user logged in');
    
    const { data, error } = await profileAPI.updateProfile(user.id, updates);
    
    if (error) throw error;
    
    setProfile(data);
    return data;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ==========================================
// CUSTOM HOOK
// ==========================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};