// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth'; // <--- CHANGE HERE
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  idToken: string | null; // <--- ADD THIS
  loading: boolean;
  isAdmin: boolean; // <--- ADD THIS
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null); // <--- ADD THIS
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // <--- ADD THIS

  useEffect(() => {
    // Use onIdTokenChanged to get the token and listen for changes
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        setIdToken(tokenResult.token);
        setIsAdmin(!!tokenResult.claims.admin); // Check for admin custom claim
      } else {
        setIdToken(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, idToken, loading, isAdmin }}>
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