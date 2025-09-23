// src/app/dashboard/page.tsx
'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArchiveBoxIcon, ArrowUturnLeftIcon, PlayIcon } from '@heroicons/react/24/solid';

// Context and Hooks
import { useAuth } from '@/context/AuthContext';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PromptComposerProvider } from '@/context/PromptComposerContext';

// Components
import Modal from '@/components/Modal';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';
import TopPromptsWidget from '@/components/TopPromptsWidget';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import QuickExecuteModal from '@/components/QuickExecuteModal';
import { authenticatedFetch } from '@/lib/apiClient';

const DashboardContent = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [showArchived, setShowArchived] = useState(false);
    const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [promptForExecution, setPromptForExecution] = useState<{ id: string, text: string } | null>(null);

    const { prompts, isLoading: promptsLoading, error: promptsError, createPrompt, deletePrompt, mutate: mutatePrompts } = usePrompts();
    const { templates, isLoading: templatesLoading, error: templatesError, createTemplate, mutate: mutateTemplates } = usePromptTemplates();
    const { activity, isLoading: activityLoading, error: activityError } = useRecentActivity();
    const { topPrompts, isLoading: metricsLoading, error: metricsError } = usePromptMetrics();

    const hydratedTopPrompts = useMemo(() => topPrompts.map(p => ({ ...p, averageRating: p.averageRating ?? 0 })), [topPrompts]);
    const visiblePrompts = useMemo(() => {
        const sorted = [...prompts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return showArchived ? sorted : sorted.filter(p => !p.is_archived);
    }, [prompts, showArchived]);
    const visibleTemplates = useMemo(() => {
        const sorted = [...templates].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return showArchived ? sorted : sorted.filter(t => !t.is_archived);
    }, [templates, showArchived]);

    const handleDeletePrompt = async (promptId: string) => {
        if (window.confirm('Are you sure?')) {
            toast.promise(deletePrompt(promptId), { loading: 'Deleting...', success: 'Deleted!', error: 'Failed.' });
        }
    };

    const handleCopyPrompt = async (promptId: string) => { /* implementation */ };
    const handlePromptArchiveToggle = async (promptId: string, currentStatus: boolean) => { /* implementation */ };
    const handleQuickExecute = (prompt: any) => { /* implementation */ };

    if (authLoading) return <div className="text-center p-8 text-white">Authenticating...</div>;
    if (!user) { router.push('/login'); return null; }

    return (
        <>
            <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"/>
                        <span className="text-sm text-gray-300">Show Archived</span>
                    </label>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-300">Prompt Hub</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <TopPromptsWidget 
                            topPrompts={hydratedTopPrompts} 
                            loading={metricsLoading} 
                            error={metricsError}
                            handleCopyPrompt={handleCopyPrompt}
                            handleDeletePrompt={handleDeletePrompt}
                        />
                        <div className="lg:col-span-2">
                            {/* FIX: Apply 5-item limit before passing prop */}
                            <RecentActivityWidget recentVersions={activity.slice(0, 5)} loading={activityLoading} error={activityError} handleDeletePrompt={handleDeletePrompt} />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                    {/* FIX: Add min-h-0 to constrain flex child height */}
                    <div className="flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-2xl font-bold">Template Library</h2>
                            <button onClick={() => setIsCreateTemplateModalOpen(true)} className="px-3 py-1 text-sm bg-green-600 rounded hover:bg-green-700">+ New</button>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {templatesError && <p className="text-red-400">Could not load templates. Check API connection.</p>}
                            {/* ... rest of the template list content ... */}
                        </div>
                    </div>

                    {/* FIX: Add min-h-0 to constrain flex child height */}
                    <div className="flex flex-col min-h-0">
                        <h2 className="text-2xl font-bold mb-4 flex-shrink-0">Your Prompts</h2>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {promptsError && <p className="text-red-400">Could not load prompts. Check API connection.</p>}
                             {/* ... rest of the prompt list content ... */}
                        </div>
                    </div>
                    
                    <div className="flex flex-col lg:col-span-2 2xl:col-span-1">
                        <h2 className="text-2xl font-bold mb-4">Compose a Prompt</h2>
                        <div className="flex-grow">
                            <PromptComposerProvider>
                                <PromptComposer onPromptSaved={() => mutatePrompts()} templates={templates} />
                            </PromptComposerProvider>
                        </div>
                    </div>
                </div>
            </div>

            {/* ... Modals section ... */}
        </>
    );
};

const DashboardPage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
        <DashboardContent />
    </Suspense>
);

export default DashboardPage;