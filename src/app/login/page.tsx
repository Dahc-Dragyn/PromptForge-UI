'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// This tells TypeScript that the 'google' object will be available on the window
declare global {
  interface Window {
    google: any;
  }
}

const LoginPage = () => {
  const { user, loading, signInWithGoogleCredential } = useAuth();
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // This function will be called by Google's script after a successful sign-in
  const handleGoogleSignIn = (response: any) => {
    setIsSigningIn(true); // Show a loading state immediately
    if (response.credential) {
      signInWithGoogleCredential(response.credential);
    }
  };

  // This effect redirects the user if they are already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // This effect initializes and renders the Google Sign-In button
  useEffect(() => {
    // Don't render the button if we're loading, a user exists, or the ref isn't ready
    if (loading || user || !googleButtonRef.current) {
      return;
    }

    if (typeof window.google !== 'undefined') {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
      });

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with' }
      );
    }
  }, [loading, user]); // Rerun if loading or user state changes

  // Show a loading spinner if the main auth context is loading OR if we are in the process of signing in
  if (loading || user || isSigningIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
        <div className="text-lg">Authenticating Session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center text-white">
      <div className="text-center p-8 max-w-md w-full">
        <h1 className="text-5xl font-bold mb-4">PromptForge</h1>
        <p className="text-gray-400 mb-8">Craft, Test, and Perfect Your AI Prompts.</p>
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
          {/* This div is the container where Google will render its button */}
          <div ref={googleButtonRef} className="flex justify-center"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;