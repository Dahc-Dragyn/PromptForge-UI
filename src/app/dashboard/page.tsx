'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Context and Hooks
import { useAuth } from '@/context/AuthContext';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { useTopPrompts } from '@/hooks/usePromptMetrics';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PromptComposerProvider } from '@/context/PromptComposerContext';

// Components
import Modal from '@/components/Modal';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm, { TemplateFormData } from '@/components/TemplateForm';
import TopPromptsWidget from '@/components/TopPromptsWidget';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import InteractiveRating from '@/components/InteractiveRating';

const DashboardContent = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
    
    const { prompts, isLoading: promptsLoading, isError: promptsError, deletePrompt } = usePrompts();
    const { templates, isLoading: templatesLoading, isError: templatesError, createTemplate } = usePromptTemplates();
    const { activities, isLoading: activityLoading, isError: activityError } = useRecentActivity();
    const { topPrompts, isLoading: metricsLoading, isError: metricsError } = useTopPrompts();

    const visiblePrompts = useMemo(() => (prompts ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [prompts]);
    const visibleTemplates = useMemo(() => (templates ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [templates]);

    const handleDeletePrompt = async (promptId: string) => {
        if (window.confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
            toast.promise(deletePrompt(promptId), {
                loading: 'Deleting prompt...',
                success: 'Prompt successfully deleted!',
                error: (err) => err.message || 'Failed to delete prompt.'
            });
        }
    };

    const handleCreateTemplate = async (data: TemplateFormData) => {
        const promise = createTemplate(data);
        await toast.promise(promise, {
            loading: 'Creating template...',
            success: 'Template created!',
            error: 'Failed to create template.'
        });
        setIsCreateTemplateModalOpen(false);
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
                            {templatesLoading && <p>Loading templates...</p>}
                            {templatesError && <p className="text-red-400">Could not load templates.</p>}
                            {visibleTemplates.map((template, index) => (
                                <div key={`template-${template.id}-${index}`} className="p-2 hover:bg-gray-700 rounded">
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
                            {visiblePrompts.map((prompt, index) => (
                                <div key={`prompt-${prompt.id}-${index}`} className="p-3 hover:bg-gray-700 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <Link href={`/prompts/${prompt.id}`} className="font-semibold text-indigo-400 mb-1 block">{prompt.name}</Link>
                                        <button onClick={() => handleDeletePrompt(prompt.id)} className="text-red-600 hover:text-red-500 text-xs font-semibold">DELETE</button>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{prompt.description}</p>
                                    {/* CORRECTED: Pass rating data down as props */}
                                    <InteractiveRating 
                                        promptId={prompt.id} 
                                        averageRating={prompt.average_rating ?? 0}
                                        ratingCount={prompt.rating_count ?? 0}
                                    />
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
                <TemplateForm onSubmit={handleCreateTemplate} onCancel={() => setIsCreateTemplateModalOpen(false)} />
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