// src/components/PrivateRoute.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline'; // Need a loading icon

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Crucial check: only redirect if loading is FALSE (state resolved) AND there is NO user.
    if (!loading && !user) {
      // Use replace() to avoid stacking the login page in history, preventing the loop
      router.replace('/login');
    }
  }, [user, loading, router]);

  // 1. While state is resolving, block rendering and show a global loader.
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
        <div className="text-lg">Authenticating Session...</div>
      </div>
    );
  }

  // 2. If loading is false and user exists, render the protected content.
  if (user) {
    return <>{children}</>;
  }
  
  // 3. If loading is false and user is null, the useEffect redirect has fired, return null briefly.
  return null;
};

export default PrivateRoute;