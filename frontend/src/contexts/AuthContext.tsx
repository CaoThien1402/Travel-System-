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
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // ==========================================
  // LOAD USER VÀ SESSION KHI APP KHỞI ĐỘNG
  // ==========================================
  useEffect(() => {
    let isSubscribed = true;
    let profileLoadingTimeout: NodeJS.Timeout | null = null;

    const loadProfile = async (userId: string) => {
      // Tránh load profile nhiều lần đồng thời
      if (isLoadingProfile) {
        console.log('⏳ Profile already loading, skipping...');
        return;
      }

      setIsLoadingProfile(true);
      try {
        const { data: profileData } = await profileAPI.getProfile(userId);
        if (isSubscribed) {
          setProfile(profileData);
          console.log('✅ Profile loaded');
        }
      } catch (error) {
        console.error('❌ Error loading profile:', error);
      } finally {
        if (isSubscribed) {
          setIsLoadingProfile(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        const { session: currentSession } = await authAPI.getSession();
        
        if (currentSession && isSubscribed) {
          console.log('✅ Session found:', currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
          await loadProfile(currentSession.user.id);
        } else {
          console.log('ℹ️ No session found');
        }
      } catch (error) {
        console.error('❌ Error loading auth:', error);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Lắng nghe thay đổi auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 Auth state changed:', event);
        console.log('👤 User:', currentSession?.user?.email || 'None');
        
        if (!isSubscribed) return;

        // Debounce profile loading để tránh load nhiều lần
        if (profileLoadingTimeout) {
          clearTimeout(profileLoadingTimeout);
        }

        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Delay một chút để tránh load profile quá nhiều lần
          profileLoadingTimeout = setTimeout(() => {
            if (isSubscribed) {
              loadProfile(currentSession.user.id);
            }
          }, 300);
        } else {
          setProfile(null);
          setIsLoadingProfile(false);
          console.log('ℹ️ User logged out or no session');
        }

        if (isSubscribed) {
          setLoading(false);
        }
      }
    );

    return () => {
      isSubscribed = false;
      if (profileLoadingTimeout) {
        clearTimeout(profileLoadingTimeout);
      }
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
    try {
      console.log('🔄 Signing out...');
      setLoading(true);
      
      // Clear state immediately để UI phản hồi nhanh
      setUser(null);
      setSession(null);
      setProfile(null);
      
      const { error } = await authAPI.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error);
        throw error;
      }
      
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
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