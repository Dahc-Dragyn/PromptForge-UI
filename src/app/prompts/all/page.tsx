// src/app/prompts/all/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { usePrompts } from '@/hooks/usePrompts';
import { Prompt } from '@/types/prompt';
import SearchResultCard from '@/components/SearchResultCard';
import { useAuth } from '@/context/AuthContext';

type TabState = 'active' | 'archived';

export default function AllPromptsPage() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabState>('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch both active and all prompts
  const { 
    prompts: activePrompts, 
    isLoading: isLoadingActive 
  } = usePrompts(false);
  
  const { 
    prompts: allPrompts, 
    isLoading: isLoadingAll 
  } = usePrompts(true);

  // Derive archived prompts and counts
  const { archivedPrompts, activeCount, archivedCount } = useMemo(() => {
    const all = allPrompts || [];
    const active = activePrompts || [];
    
    // Create a Set of active prompt IDs for quick lookup
    const activeIdSet = new Set(active.map(p => p.id));
    
    // Archived prompts are those in 'allPrompts' but not in 'activePrompts'
    const archived = all.filter(p => !activeIdSet.has(p.id));
    
    return {
      archivedPrompts: archived,
      activeCount: active.length,
      archivedCount: archived.length,
    };
  }, [activePrompts, allPrompts]);

  // Determine which list to display based on the current tab
  const promptsToDisplay = useMemo(() => {
    return currentTab === 'active' ? activePrompts : archivedPrompts;
  }, [currentTab, activePrompts, archivedPrompts]);

  // Filter the displayed list based on the search term
  const filteredPrompts = useMemo(() => {
    if (!promptsToDisplay) return [];
    if (!searchTerm) return promptsToDisplay;

    return promptsToDisplay.filter(prompt =>
      prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.task_description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [promptsToDisplay, searchTerm]);

  const isLoading = isLoadingActive || isLoadingAll;

  // Helper to render the list of prompts
  const renderPromptList = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400 mt-8">Loading prompts...</div>;
    }

    if (filteredPrompts.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-8">
          {searchTerm
            ? 'No prompts match your search.'
            : `You have no ${currentTab} prompts.`}
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-6">
        {filteredPrompts.map(prompt => (
          <SearchResultCard key={prompt.id} item={prompt} type="prompt" />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* 1. Return to Dashboard Link */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 2. Header */}
        <h1 className="text-3xl font-bold text-white mb-6">Your Prompts</h1>

        {/* 3. Tab and Search UI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex-shrink-0">
            <nav className="flex space-x-2" aria-label="Tabs">
              <button
                onClick={() => setCurrentTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setCurrentTab('archived')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'archived'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Archived ({archivedCount})
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="w-full md:max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search your prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Filtered List */}
        <div className="bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize">{currentTab} Prompts</h2>
          {renderPromptList()}
        </div>
      </div>
    </div>
  );
}