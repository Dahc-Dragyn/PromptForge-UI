// src/app/search/page.tsx
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import SearchResultCard from '@/components/SearchResultCard';
import Link from 'next/link';
import QuickExecuteModal from '@/components/QuickExecuteModal'; // <-- Import the modal
import toast from 'react-hot-toast';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';

  // --- NOTE: The 'usePrompts' hook from your file doesn't return a refetch function. ---
  // --- I am proceeding based on the code provided in `usePrompts.ts`. ---
  const { prompts, loading: promptsLoading, error: promptsError } = usePrompts(true); // showArchived = true to search all
  const { templates, loading: templatesLoading, error: templatesError } = usePromptTemplates(true); // showArchived = true
  
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // --- NEW: State for the Quick Execute Modal ---
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [promptForExecution, setPromptForExecution] = useState('');

  const handleCopyPrompt = async (promptId: string) => {
    setActiveItemId(promptId);
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt versions.');
      const versions = await response.json();
      if (versions.length > 0) {
        const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
        await navigator.clipboard.writeText(latestVersion.prompt_text);
        toast.success('Latest prompt version copied!');
        setCopiedPromptId(promptId);
        setTimeout(() => setCopiedPromptId(null), 2000);
      } else { toast.error('This prompt has no versions to copy.'); }
    } catch (err: any) { toast.error(err.message || 'Error copying prompt.'); console.error(err); } 
    finally { setActiveItemId(null); }
  };

  const handleDeletePrompt = async (promptId: string) => {
    // Note: Deleting will cause a re-render from the usePrompts hook automatically.
    if (window.confirm('Are you sure you want to delete this prompt and all its versions?')) {
      setActiveItemId(promptId);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`, { method: 'DELETE', headers: { 'ngrok-skip-browser-warning': 'true' }});
        if (!response.ok) throw new Error('Failed to delete prompt.');
        toast.success('Prompt deleted.');
      } catch (err: any) { toast.error(err.message || 'Error deleting prompt.'); console.error(err); } 
      finally { setActiveItemId(null); }
    }
  };

  // --- NEW: Handler for the Quick Execute feature ---
  const handleQuickExecute = async (promptId: string) => {
    setActiveItemId(promptId);
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt to execute.');
      const versions = await response.json();
      if (versions.length > 0) {
        const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
        setPromptForExecution(latestVersion.prompt_text);
        setIsExecuteModalOpen(true);
      } else {
        toast.error('This prompt has no versions to execute.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
      console.error(err);
    } finally {
      setActiveItemId(null);
    }
  };

  const filteredPrompts = useMemo(() => {
    if (!query || !prompts) return [];
    return prompts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.task_description.toLowerCase().includes(query)
    );
  }, [query, prompts]);

  const filteredTemplates = useMemo(() => {
    if (!query || !templates) return [];
    return templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.content.toLowerCase().includes(query) ||
      (t.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    );
  }, [query, templates]);

  const isLoading = promptsLoading || templatesLoading;
  const totalResults = filteredPrompts.length + filteredTemplates.length;

  return (
    <>
      <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="text-blue-400 hover:underline mb-6 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Search Results</h1>
          {query ? (
            <p className="text-gray-400">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for <span className="text-white font-semibold">"{query}"</span>
            </p>
          ) : (
            <p className="text-gray-400">Please enter a search term in the navigation bar.</p>
          )}

          {isLoading && <div className="mt-8">Loading results...</div>}
          {(promptsError || templatesError) && <div className="mt-8 text-red-400">Error loading data.</div>}

          {!isLoading && totalResults === 0 && query && (
            <div className="mt-8 text-center py-16 bg-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold">No Results Found</h2>
              <p className="text-gray-500 mt-2">Try a different search term.</p>
            </div>
          )}

          {!isLoading && totalResults > 0 && (
            <div className="mt-8 space-y-8">
              {filteredPrompts.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Prompts</h2>
                  <div className="space-y-4 mt-4">
                    {filteredPrompts.map(p => (
                      <SearchResultCard
                        key={p.id}
                        id={p.id}
                        name={p.name}
                        description={p.task_description}
                        type="Prompt"
                        onCopy={handleCopyPrompt}
                        onDelete={handleDeletePrompt}
                        onQuickExecute={handleQuickExecute} // <-- Pass the new handler
                        isDeleting={activeItemId === p.id && !copiedPromptId}
                        isCopying={activeItemId === p.id && !copiedPromptId}
                        isCopied={copiedPromptId === p.id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredTemplates.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">Templates</h2>
                  <div className="space-y-4 mt-4">
                    {filteredTemplates.map(t => (
                      <SearchResultCard
                        key={t.id}
                        id={t.id}
                        name={t.name}
                        description={t.description}
                        type="Template"
                        tags={t.tags}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* --- NEW: Render the modal --- */}
      <QuickExecuteModal 
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        promptText={promptForExecution}
        // For now, saving from search results is out of scope to keep the flow simple.
        // We can discuss adding this later if needed.
        onSaveAsPrompt={() => {
            setIsExecuteModalOpen(false);
            toast.error("Saving from search is not enabled. Please use the Composer.");
        }}
      />
    </>
  );
}

const SearchPage = () => (
  <Suspense fallback={<div className="p-8 text-center text-white bg-gray-900 min-h-screen">Loading Search...</div>}>
    <SearchResults />
  </Suspense>
);

export default SearchPage;