// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const Navbar = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <Link href="/" className="text-xl font-bold">
        PromptForge
      </Link>
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            {/* NEW: Link to the Prompt Clinic */}
            <Link href="/clinic" className="hover:underline text-rose-300 font-semibold">
              Clinic
            </Link>
            <Link href="/deep-dive" className="hover:underline">
              Deep Dive
            </Link>
            <Link href="/analyze" className="hover:underline">
              Analyze
            </Link>
            <Link href="/sandbox" className="hover:underline">
              Sandbox
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-600 transition-colors"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/signup" className="hover:underline">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;