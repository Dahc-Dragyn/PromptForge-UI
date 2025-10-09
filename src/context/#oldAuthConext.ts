'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
  signInWithCredential, // <-- 1. Import signInWithCredential
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { mutate as globalMutate } from 'swr';
import { useRouter } from 'next/navigation';

interface User extends FirebaseUser {}

// 2. Update the context type for our new function
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogleCredential: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser as FirebaseUser | null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Create the new signIn function that uses the token
  const signInWithGoogleCredential = async (token: string) => {
    const credential = GoogleAuthProvider.credential(token);
    try {
      // This is a direct API call that is not blocked by browser policies
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      console.error("Firebase credential sign-in failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await globalMutate(() => true, undefined, { revalidate: false });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    // 4. Provide the new function through the context
    <AuthContext.Provider value={{ user, loading, signInWithGoogleCredential, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};