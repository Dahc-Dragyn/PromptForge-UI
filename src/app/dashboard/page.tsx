// src/app/dashboard/page.tsx
'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Context and Hooks
import { useAuth } from '@/context/AuthContext';
import { usePrompts, usePromptMutations } from '@/hooks/usePrompts';
import { usePromptTemplates, useTemplateMutations } from '@/hooks/usePromptTemplates';
import { useTopPrompts } from '@/hooks/usePromptMetrics';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PromptComposerProvider } from '@/context/PromptComposerContext';

// Components
import Modal from '@/components/Modal';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';
import TopPromptsWidget from '@/components/TopPromptsWidget';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import QuickExecuteModal from '@/components/QuickExecuteModal';
import { Prompt } from '@/types/prompt';
import Link from 'next/link';

const DashboardContent = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
    
    // Correctly separated data and mutation hooks
    const { prompts, isLoading: promptsLoading, isError: promptsError } = usePrompts();
    const { deletePrompt } = usePromptMutations();
    
    const { templates, isLoading: templatesLoading, isError: templatesError } = usePromptTemplates();
    const { createTemplate } = useTemplateMutations();

    const { activities, isLoading: activityLoading, isError: activityError } = useRecentActivity();
    const { topPrompts, isLoading: metricsLoading, isError: metricsError } = useTopPrompts();

    // Memoized data with null-safety
    const visiblePrompts = useMemo(() => {
        return (prompts ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [prompts]);

    const visibleTemplates = useMemo(() => {
        return (templates ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [templates]);

    const handleDeletePrompt = async (promptId: string) => {
        if (window.confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
            toast.promise(
                deletePrompt(promptId),
                {
                    loading: 'Deleting prompt...',
                    success: 'Prompt successfully deleted!',
                    error: (err) => err.message || 'Failed to delete prompt.'
                }
            );
        }
    };

    if (authLoading) return <div className="text-center p-8 text-white">Authenticating...</div>;
    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <>
            <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-300">Prompt Hub</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <TopPromptsWidget
                            topPrompts={topPrompts ?? []}
                            loading={metricsLoading}
                            isError={metricsError}
                        />
                        <div className="lg:col-span-2">
                            <RecentActivityWidget
                                activities={activities ?? []}
                                loading={activityLoading}
                                isError={activityError}
                            />
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
                            {templatesLoading && <p>Loading templates...</p>}
                            {templatesError && <p className="text-red-400">Could not load templates.</p>}
                            {visibleTemplates.map(template => (
                                <div key={template.id} className="p-2 hover:bg-gray-700 rounded">
                                     <Link href={`/templates/${template.id}`} className="font-semibold text-blue-400">{template.name}</Link>
                                     <p className="text-sm text-gray-400 truncate">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col min-h-0">
                        <h2 className="text-2xl font-bold mb-4 flex-shrink-0">Your Prompts</h2>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {promptsLoading && <p>Loading prompts...</p>}
                            {promptsError && <p className="text-red-400">Could not load prompts.</p>}
                            {visiblePrompts.map(prompt => (
                                <div key={prompt.id} className="flex justify-between items-center p-2 hover:bg-gray-700 rounded">
                                    <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400">{prompt.name}</Link>
                                    <button onClick={() => handleDeletePrompt(prompt.id)} className="text-red-500 hover:text-red-400 text-xs">Delete</button>
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
                <TemplateForm
                    onSubmit={async (data) => {
                        await toast.promise(createTemplate(data), {
                            loading: 'Creating template...',
                            success: 'Template created!',
                            error: 'Failed to create template.'
                        });
                        setIsCreateTemplateModalOpen(false);
                    }}
                    onCancel={() => setIsCreateTemplateModalOpen(false)}
                />
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