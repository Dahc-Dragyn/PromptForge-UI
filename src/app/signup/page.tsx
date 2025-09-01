// src/app/signup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const provider = new GoogleAuthProvider();

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Do not render anything while authentication state is loading
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="p-8 border rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleEmailSignup}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="w-full border rounded p-2 text-black"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="w-full border rounded p-2 text-black"
            />
          </div>
          <button type="submit" className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors">
            Sign Up
          </button>
        </form>
        <div className="my-4 text-center">
          <span className="text-sm text-gray-400">or</span>
        </div>
        <button 
          onClick={handleGoogleSignup} 
          className="w-full flex items-center justify-center bg-gray-600 text-white p-2 rounded hover:bg-gray-700 transition-colors"
        >
          <img src="/google-logo.svg" alt="Google logo" className="w-5 h-5 mr-2"/>
          Sign up with Google
        </button>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;