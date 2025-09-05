// src/components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

const Navbar = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  // --- NEW: State to hold the user's search history ---
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // --- NEW: useEffect to load search history from localStorage on mount ---
  useEffect(() => {
    const history = localStorage.getItem('promptForgeSearchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // --- NEW: Logic to save the new search term to history ---
      const updatedHistory = [trimmedQuery, ...searchHistory];
      // Remove duplicates and limit to the last 10 searches
      const uniqueHistory = [...new Set(updatedHistory)].slice(0, 10);
      setSearchHistory(uniqueHistory);
      localStorage.setItem('promptForgeSearchHistory', JSON.stringify(uniqueHistory));

      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  if (loading) {
    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white h-[60px]"></nav>
    );
  }

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold">
            PromptForge
        </Link>
        {user && (
            <div className="hidden md:flex items-center gap-4">
                 <Link href="/dashboard" className="text-sm hover:underline">Dashboard</Link>
                 <Link href="/clinic" className="text-sm hover:underline text-rose-300 font-semibold">Clinic</Link>
                 <Link href="/analyze" className="text-sm hover:underline">Analyze</Link>
                 <Link href="/sandbox" className="text-sm hover:underline">Sandbox</Link>
            </div>
        )}
      </div>
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearchSubmit} className="relative">
                <input
                    type="search"
                    placeholder="Search prompts & templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="py-1.5 pl-3 pr-8 text-sm rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    // --- NEW: Connect the input to our datalist ---
                    list="search-history"
                    name="q" // Add a name attribute to help the browser
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <MagnifyingGlassIcon className="h-4 w-4" />
                </button>
            </form>
            {/* --- NEW: The datalist element that provides search suggestions --- */}
            <datalist id="search-history">
              {searchHistory.map(item => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/login" className="hover:underline">Login</Link>
            <Link href="/signup" className="hover:underline">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;