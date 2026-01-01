// src/app/prompts/starred/page.tsx
'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { usePrompts } from '@/hooks/usePrompts';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';

import SendToLlm from '@/components/SendToLlm';
import StarRating from '@/components/StarRating';
import { ArrowPathIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, ArrowLeftIcon, StarIcon } from '@heroicons/react/24/outline';

type SortOrder = 'highest_rated' | 'newest' | 'oldest' | 'alphabetical';

const StarredPromptsContent = () => {
    const [sortOrder, setSortOrder] = useState<SortOrder>('highest_rated');
    const [showArchived, setShowArchived] = useState(false);
    const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
    
    // We fetch all prompts and then filter client-side
    const { prompts, isLoading, isError, deletePrompt, archivePrompt, ratePrompt } = usePrompts(true);

    const starredPrompts = useMemo(() => {
        const baseList = prompts?.filter(p => (p.rating_count ?? 0) > 0) ?? [];
        
        const filtered = showArchived ? baseList : baseList.filter(p => !p.is_archived);

        return [...filtered].sort((a, b) => {
            switch (sortOrder) {
                case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'alphabetical': return a.name.localeCompare(b.name);
                case 'highest_rated': default: return (b.average_rating ?? 0) - (a.average_rating ?? 0);
            }
        });
    }, [prompts, showArchived, sortOrder]);

    const handleAction = (actionPromise: Promise<any>, messages: { loading: string; success: string; error: string; }) => {
        return toast.promise(actionPromise, messages);
    };
    
    const handleCopyText = async (promptId: string) => {
        setCopiedPromptId(promptId);
        const toastId = toast.loading('Copying...');
        try {
            // FIX 1: Access the .data property of the Axios response
            const versionsResponse = await apiClient.get<PromptVersion[]>(`/prompts/${promptId}/versions`);
            const versions = versionsResponse.data;
            
            if (!versions || versions.length === 0) throw new Error("This prompt has no versions to copy.");
            
            // ... and use the .data property here
            await navigator.clipboard.writeText(versions[0].prompt_text);
            toast.success('Copied to clipboard!', { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Failed to copy.', { id: toastId });
        } finally {
            setTimeout(() => setCopiedPromptId(null), 2000);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center p-8"><ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-gray-400" /></div>;
        }
        if (isError) {
            return <p className="text-center text-red-400">Could not load starred prompts.</p>;
        }
        if (starredPrompts.length === 0) {
            return (
                <div className="text-center py-16 bg-gray-800 rounded-lg">
                    <StarIcon className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold">No Starred Prompts Found</h3>
                    <p className="text-gray-400 mt-2">Rate prompts on the dashboard to add them to this list.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {starredPrompts.map((prompt) => (
                    <div key={prompt.id} className={`p-4 bg-gray-800 rounded-lg transition-opacity ${prompt.is_archived && showArchived ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start">
                            <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400 mb-1 block hover:underline text-lg">{prompt.name}</Link>
                            {prompt.is_archived && showArchived && <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">Archived</span>}
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{prompt.task_description}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                                <StarRating 
                                    currentRating={Math.round(prompt.average_rating || 0)}
                                    // FIX 2: Use prompt.latest_version_number (which is a number)
                                    onRatingChange={(rating) => {
                                        if (prompt.latest_version_number) {
                                            handleAction(ratePrompt(prompt.id, prompt.latest_version_number, rating), {loading: 'Updating...', success: 'Rating updated!', error: 'Failed to update.'})
                                        } else {
                                            toast.error("Cannot rate: latest version number is missing.");
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-x-2">
                                    <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">View</Link>
                                    <button onClick={() => handleCopyText(prompt.id)} className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${copiedPromptId === prompt.id ? 'bg-green-600' : 'bg-gray-500'}`}>
                                        {copiedPromptId === prompt.id ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button onClick={() => handleAction(archivePrompt(prompt.id, !prompt.is_archived), {loading: 'Updating...', success: `Prompt ${prompt.is_archived ? 'restored' : 'archived'}.`, error: 'Failed to update.'})} className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700" title={prompt.is_archived ? 'Unarchive' : 'Archive'}>
                                        {prompt.is_archived ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <ArchiveBoxIcon className="h-4 w-4" />}
                                    </button>
                                    <button onClick={() => window.confirm('Are you sure?') && handleAction(deletePrompt(prompt.id), {loading: 'Deleting...', success: 'Prompt deleted.', error: 'Failed to delete.'})} className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Delete">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <SendToLlm promptId={prompt.id} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm text-indigo-400 hover:underline mb-6">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold">Your Starred Prompts</h1>
                    <div className="flex items-center gap-4">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className="bg-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                            <option value="highest_rated">Highest Rated</option>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="alphabetical">A-Z</option>
                        </select>
                        <label className="flex items-center cursor-pointer">
                            <span className="mr-3 text-sm text-gray-400">Archived</span>
                            <div className="relative">
                                <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="sr-only" />
                                <div className={`block w-14 h-8 rounded-full transition-colors ${showArchived ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${showArchived ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

const StarredPromptsPage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading Starred Prompts...</div>}>
        <StarredPromptsContent />
    </Suspense>
);

export default StarredPromptsPage;