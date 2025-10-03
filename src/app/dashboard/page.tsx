'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { useTopPrompts } from '@/hooks/usePromptMetrics';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PromptComposerProvider } from '@/context/PromptComposerContext';
import { apiClient } from '@/lib/apiClient';
import { PromptVersion } from '@/types/prompt';

import Modal from '@/components/Modal';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';
import TopPromptsWidget from '@/components/TopPromptsWidget';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import SendToLlm from '@/components/SendToLlm';
import StarRating from '@/components/StarRating';
import { ArrowPathIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

type SortOrder = 'newest' | 'oldest' | 'alphabetical';

const DashboardContent = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    // --- NEW STATE: Track prompts rated in this session ---
    const [ratedInSession, setRatedInSession] = useState<Set<string>>(new Set());
    
    const { prompts, isLoading: promptsLoading, isError: promptsError, deletePrompt, archivePrompt, ratePrompt } = usePrompts(true);
    
    const { templates, isLoading: templatesLoading, isError: templatesError, createTemplate } = usePromptTemplates();
    const { activities, isLoading: activityLoading, isError: activityError } = useRecentActivity();
    const { topPrompts, isLoading: metricsLoading, isError: metricsError } = useTopPrompts();

    const visibleTemplates = useMemo(() => (templates ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [templates]);

    const visiblePrompts = useMemo(() => {
        const baseList = prompts ?? [];
        const sorted = [...baseList].sort((a, b) => {
            switch (sortOrder) {
                case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'alphabetical': return a.name.localeCompare(b.name);
                case 'newest': default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });
        if (showArchived) return sorted;
        return sorted.filter(p => !p.is_archived);
    }, [prompts, showArchived, sortOrder]);


    const handleAction = (actionPromise: Promise<any>, messages: { loading: string; success: string; error: string; }) => {
        // Return the promise for chaining
        return toast.promise(actionPromise, {
            loading: messages.loading,
            success: messages.success,
            error: (err: any) => err.message || messages.error,
        });
    };
    
    const handleCopyText = async (promptId: string) => {
        setCopiedPromptId(promptId);
        const toastId = toast.loading('Copying...');
        try {
            const versions = await apiClient.get<PromptVersion[]>(`/prompts/${promptId}/versions`);
            if (!versions || versions.length === 0) throw new Error("This prompt has no versions to copy.");
            await navigator.clipboard.writeText(versions[0].prompt_text);
            toast.success('Copied to clipboard!', { id: toastId });
        } catch (err: any) {
            toast.error(err.message || 'Failed to copy.', { id: toastId });
        } finally {
            setTimeout(() => setCopiedPromptId(null), 2000);
        }
    };

    // --- NEW HANDLER: To manage the rated state ---
    const handleRate = (promptId: string, versionNumber: number, rating: number) => {
        handleAction(ratePrompt(promptId, versionNumber, rating), {
            loading: 'Submitting rating...',
            success: 'Rating submitted!',
            error: 'Failed to submit rating.'
        }).then(() => {
            // On success, add the promptId to our session set
            setRatedInSession(prev => new Set(prev).add(promptId));
        }).catch(() => {
            // Optional: handle error case if needed, though toast already does
        });
    };

    if (authLoading) return <div className="text-center p-8 text-white">Authenticating...</div>;
    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <>
            <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
                <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-300">Prompt Hub</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <TopPromptsWidget topPrompts={topPrompts ?? []} loading={metricsLoading} isError={metricsError} />
                        <div className="lg:col-span-2">
                            <RecentActivityWidget activities={activities ?? []} loading={activityLoading} isError={activityError} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                    <div className="flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-2xl font-bold">Template Library</h2>
                            <button onClick={() => setIsCreateTemplateModalOpen(true)} className="px-3 py-1 text-sm bg-green-600 rounded hover:bg-green-700">+ New</button>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {templatesLoading && <div className="text-center p-4"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>}
                            {templatesError && <p className="text-red-400">Could not load templates.</p>}
                            {visibleTemplates.map((template) => (
                                <div key={template.id} className="p-2 hover:bg-gray-700 rounded-lg mb-2">
                                    <Link href={`/templates/${template.id}`} className="font-semibold text-blue-400">{template.name}</Link>
                                    <p className="text-sm text-gray-400 truncate">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 gap-4">
                            <h2 className="text-2xl font-bold whitespace-nowrap">Your Prompts</h2>
                            <div className="flex items-center gap-4">
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className="bg-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
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
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {promptsLoading && <div className="text-center p-4"><ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>}
                            {promptsError && <p className="text-red-400">Could not load prompts.</p>}
                            {visiblePrompts.map((prompt) => (
                                <div key={prompt.id} className={`p-4 bg-gray-700/50 rounded-lg mb-4 transition-opacity ${prompt.is_archived && showArchived ? 'opacity-50' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400 mb-1 block hover:underline">{prompt.name}</Link>
                                        {prompt.is_archived && showArchived && <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">Archived</span>}
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{prompt.task_description}</p>
                                    
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                                            <StarRating 
                                                currentRating={Math.round(prompt.average_rating || 0)}
                                                disabled={ratedInSession.has(prompt.id)}
                                                onRatingChange={(rating) => handleRate(prompt.id, prompt.latest_version, rating)}
                                            />
                                            <div className="flex items-center gap-x-2">
                                                <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">View</Link>
                                                <button onClick={() => handleCopyText(prompt.id)} className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${copiedPromptId === prompt.id ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
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
                    </div>
                    
                    <div className="flex flex-col lg:col-span-2 2xl:col-span-1">
                        <h2 className="text-2xl font-bold mb-4">Compose a Prompt</h2>
                        <div className="flex-grow">
                            <PromptComposerProvider>
                                <PromptComposer templates={templates ?? []} />
                            </PromptComposerProvider>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isCreateTemplateModalOpen} onClose={() => setIsCreateTemplateModalOpen(false)} title="Create New Template">
                <TemplateForm onSubmit={async (data) => {
                    await handleAction(createTemplate(data), { loading: 'Creating template...', success: 'Template created!', error: 'Failed to create template.' });
                    setIsCreateTemplateModalOpen(false);
                }} onCancel={() => setIsCreateTemplateModalOpen(false)} />
            </Modal>
        </>
    );
};

const DashboardPage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading Dashboard...</div>}>
        <DashboardContent />
    </Suspense>
);

export default DashboardPage;