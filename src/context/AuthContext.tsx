'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { onIdTokenChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  signInWithGoogleCredential: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (!user) {
      return null;
    }
    return await user.getIdToken(true);
  };

  const logout = async (): Promise<void> => {
    return firebaseSignOut(auth);
  };

  const signInWithGoogleCredential = async (token: string) => {
    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
    const credential = GoogleAuthProvider.credential(token);
    try {
        await signInWithCredential(auth, credential);
    } catch (error: any) {
        console.error("Firebase credential sign-in failed:", error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    getToken,
    logout,
    signInWithGoogleCredential,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; // <-- FIX IS HERE
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};