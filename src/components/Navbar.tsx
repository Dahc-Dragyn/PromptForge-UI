'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

const Navbar = () => {
  const { user, loading, logout } = useAuth(); // Use the logout function from context
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const history = localStorage.getItem('promptForgeSearchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout(); // Using the context's logout is better
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      const updatedHistory = [trimmedQuery, ...searchHistory];
      const uniqueHistory = [...new Set(updatedHistory)].slice(0, 10);
      setSearchHistory(uniqueHistory);
      localStorage.setItem('promptForgeSearchHistory', JSON.stringify(uniqueHistory));
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  if (loading) {
    // Provides a stable height during the loading state to prevent layout shift
    return <nav className="h-[72px] bg-gray-800"></nav>;
  }

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <div className="flex items-center gap-8">
        <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold">
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
            {/* --- THIS IS THE NEW LINE TO DISPLAY THE USER'S EMAIL --- */}
            <span className="text-gray-300 text-sm hidden lg:block">Hello, {user.email}</span>
            <form onSubmit={handleSearchSubmit} className="relative">
                <input
                    type="search"
                    placeholder="Search prompts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="py-1.5 pl-3 pr-8 text-sm rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    list="search-history"
                    name="q"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <MagnifyingGlassIcon className="h-4 w-4" />
                </button>
            </form>
            <datalist id="search-history">
              {searchHistory.map(item => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-600 rounded-md hover:bg-red-700 transition-colors text-sm font-semibold"
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