// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const HomePage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is determined
    if (!loading) {
      if (user) {
        // If the user is logged in, redirect to the dashboard
        router.push('/dashboard');
      } else {
        // If the user is not logged in, redirect to the login page
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Display a simple loading state while we determine the user's status
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <p>Loading...</p>
    </div>
  );
};

export default HomePage;