'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PromptComposerProvider } from '@/context/PromptComposerContext';
import { apiClient } from '@/lib/apiClient';
// --- FIX: Import the new type we added ---
import { PromptTemplate, PromptTemplateCreate } from '@/types/template';
import { Prompt, PromptVersion } from '@/types/prompt';

import Modal from '@/components/Modal';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';
import TopPromptsWidget from '@/components/TopPromptsWidget';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import SendToLlm from '@/components/SendToLlm';
import StarRating from '@/components/StarRating';
import PrivateRoute from '@/components/PrivateRoute';
import {
    ArrowPathIcon,
    ArchiveBoxIcon,
    ArrowUturnLeftIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';

type SortOrder = 'newest' | 'oldest' | 'alphabetical';

const DashboardContent = () => {
    const { user } = useAuth();
    const router = useRouter();

    const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] =
        useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
    const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
    // --- FIX: Add state for the template copy button ---
    const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [ratedInSession, setRatedInSession] = useState<Set<string>>(new Set());

    const {
        prompts,
        isLoading: promptsLoading,
        isError: promptsError,
        deletePrompt,
        archivePrompt,
        ratePrompt,
    } = usePrompts(true);
    const {
        templates,
        isLoading: templatesLoading,
        isError: templatesError,
        createTemplate,
        deleteTemplate,
        archiveTemplate,
        copyTemplate, // This function will now be used for "Duplicate" if we add it
    } = usePromptTemplates(true);
    const {
        activities,
        isLoading: activityLoading,
        isError: activityError,
    } = useRecentActivity();

    const visibleTemplates = useMemo(() => {
        const sorted = (templates ?? []).sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return showArchivedTemplates
            ? sorted
            : sorted.filter((t) => !t.is_archived);
    }, [templates, showArchivedTemplates]);

    const visiblePrompts = useMemo(() => {
        const baseList = prompts ?? [];
        const sorted = [...baseList].sort((a, b) => {
            switch (sortOrder) {
                case 'oldest':
                    return (
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    );
                case 'alphabetical':
                    return a.name.localeCompare(b.name);
                case 'newest':
                default:
                    return (
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    );
            }
        });
        return showArchived ? sorted : sorted.filter((p) => !p.is_archived);
    }, [prompts, showArchived, sortOrder]);

    const handleAction = (
        actionPromise: Promise<unknown>,
        messages: { loading: string; success: string; error: string }
    ) => {
        return toast.promise(actionPromise, messages);
    };

    // This function is now correct
    const handleCopyText = async (promptId: string) => {
        setCopiedPromptId(promptId);
        const toastId = toast.loading('Copying...');
        try {
            const versions = (await apiClient.get<PromptVersion[]>(
                `/prompts/${promptId}/versions`
            )) as unknown as PromptVersion[];

            if (!versions || versions.length === 0)
                throw new Error('This prompt has no versions to copy.');
            const latestVersion = versions.sort(
                (a, b) => b.version_number - a.version_number
            )[0];
            await navigator.clipboard.writeText(latestVersion.prompt_text);
            toast.success('Copied to clipboard!', { id: toastId });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to copy.';
            toast.error(message, { id: toastId });
        } finally {
            setTimeout(() => setCopiedPromptId(null), 2000);
        }
    };

    // TEMPLATE HANDLERS
    const handleArchiveTemplate = (templateId: string, isArchived: boolean) =>
        archiveTemplate(templateId, isArchived);
    const handleDeleteTemplate = (templateId: string) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            deleteTemplate(templateId);
        }
    };

    // --- V-- THIS IS THE FIX --V ---
    // Rewrite this function to do "Copy to Clipboard" instead of "Duplicate"
    const handleCopyTemplate = async (templateId: string) => {
        setCopiedTemplateId(templateId); // Use the new state
        const toastId = toast.loading('Copying template content...');

        try {
            // Find the template from the data we already have
            const template = templates?.find((t) => t.id === templateId);
            if (!template) {
                throw new Error('Template not found.');
            }

            // Copy its content to the clipboard
            await navigator.clipboard.writeText(template.content);
            toast.success('Template copied to clipboard!', { id: toastId });
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to copy.';
            toast.error(message, { id: toastId });
        } finally {
            // Clear the "Copied!" state after 2 seconds
            setTimeout(() => setCopiedTemplateId(null), 2000);
        }
    };
    // --- ^-- END OF FIX --^ ---

    // FIXED: handleSendTemplateToLlm
    const handleSendTemplateToLlm = async (
        content: string,
        service: 'ChatGPT' | 'Gemini' | 'Grok'
    ) => {
        const LLM_URLS = {
            ChatGPT: 'https://chat.openai.com',
            Gemini: 'https://gemini.google.com/app',
            Grok: 'https://grok.x.ai/',
        };

        const toastId = toast.loading('Copying template...');

        try {
            await navigator.clipboard.writeText(content);
            toast.success('Template copied! Opening new tab...', { id: toastId });

            setTimeout(() => {
                window.open(LLM_URLS[service], '_blank');
            }, 1500);
        } catch (err) {
            toast.error('Failed to copy template content.', { id: toastId });
        }
    };

    // PROMPT HANDLERS
    const handleArchivePrompt = (promptId: string, isArchived: boolean) =>
        archivePrompt(promptId, isArchived);
    const handleDeletePrompt = (promptId: string) => {
        if (window.confirm('Are you sure you want to delete this prompt?')) {
            handleAction(deletePrompt(promptId), {
                loading: 'Deleting...',
                success: 'Prompt deleted.',
                error: 'Failed to delete.',
            });
        }
    };
    const handleRate = (
        promptId: string,
        versionNumber: number,
        rating: number
    ) => {
        handleAction(ratePrompt(promptId, versionNumber, rating), {
            loading: 'Submitting...',
            success: 'Rating submitted!',
            error: 'Failed to submit rating.',
        })
            .then(() => setRatedInSession((prev) => new Set(prev).add(promptId)))
            .catch(() => {});
    };

    return (
        <>
            <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
                <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                        Prompt Hub
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <TopPromptsWidget
                            prompts={prompts ?? []}
                            loading={promptsLoading}
                            isError={promptsError}
                            onCopy={handleCopyText}
                            onArchive={handleArchivePrompt}
                            copiedPromptId={copiedPromptId}
                        />
                        <div className="lg:col-span-2">
                            <RecentActivityWidget
                                activities={activities ?? []}
                                loading={activityLoading}
                                isError={activityError}
                                prompts={prompts ?? []}
                                onCopy={handleCopyText}
                                onArchive={handleArchivePrompt}
                                onDelete={handleDeletePrompt}
                                copiedPromptId={copiedPromptId}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                    <div className="flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-2xl font-bold">Template Library</h2>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsCreateTemplateModalOpen(true)}
                                    className="px-3 py-1 text-sm bg-green-600 rounded hover:bg-green-700"
                                >
                                    + New
                                </button>
                                <label className="flex items-center cursor-pointer">
                                    <span className="mr-3 text-sm text-gray-400">
                                        Archived
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={showArchivedTemplates}
                                            onChange={() =>
                                                setShowArchivedTemplates(!showArchivedTemplates)
                                            }
                                            className="sr-only"
                                        />
                                        <div
                                            className={`block w-14 h-8 rounded-full transition-colors ${
                                                showArchivedTemplates
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-700'
                                            }`}
                                        ></div>
                                        <div
                                            className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                                                showArchivedTemplates ? 'translate-x-full' : ''
                                            }`}
                                        ></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {templatesLoading && (
                                <div className="text-center p-4">
                                    <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                </div>
                            )}
                            {templatesError && (
                                <p className="text-red-400">Could not load templates.</p>
                            )}
                            {visibleTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`p-4 bg-gray-700/50 rounded-lg mb-4`}
                                >
                                    <Link
                                        href={`/templates/${template.id}`}
                                        className={`font-semibold mb-1 block hover:underline ${
                                            template.is_archived
                                                ? 'text-gray-500 line-through'
                                                : 'text-blue-400'
                                        }`}
                                    >
                                        {template.name}
                                    </Link>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                                        {template.description}
                                    </p>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                                        <div className="flex items-center gap-x-2">
                                            <Link
                                                href={`/templates/${template.id}`}
                                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                View
                                            </Link>
                                            {/* --- V-- THIS IS THE FIX --V --- */}
                                            <button
                                                onClick={() =>
                                                    handleCopyTemplate(template.id)
                                                }
                                                className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                                                    copiedTemplateId === template.id
                                                        ? 'bg-green-600'
                                                        : 'bg-gray-600 hover:bg-gray-500'
                                                }`}
                                            >
                                                {copiedTemplateId === template.id
                                                    ? 'Copied!'
                                                    : 'Copy'}
                                            </button>
                                            {/* --- ^-- END OF FIX --^ --- */}
                                            <button
                                                onClick={() =>
                                                    handleArchiveTemplate(
                                                        template.id,
                                                        !template.is_archived
                                                    )
                                                }
                                                className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                                title={
                                                    template.is_archived ? 'Unarchive' : 'Archive'
                                                }
                                            >
                                                {template.is_archived ? (
                                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                                ) : (
                                                    <ArchiveBoxIcon className="h-4 w-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleDeleteTemplate(template.id)
                                                }
                                                className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                title="Delete"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                Send to:
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleSendTemplateToLlm(
                                                        template.content,
                                                        'ChatGPT'
                                                    )
                                                }
                                                className="px-2 py-1 text-xs bg-[#10a37f] text-white rounded hover:bg-[#0daaa5]"
                                            >
                                                ChatGPT
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleSendTemplateToLlm(
                                                        template.content,
                                                        'Gemini'
                                                    )
                                                }
                                                className="px-2 py-1 text-xs bg-[#4e85ff] text-white rounded hover:bg-[#588dff]"
                                            >
                                                Gemini
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleSendTemplateToLlm(
                                                        template.content,
                                                        'Grok'
                                                    )
                                                }
                                                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                                            >
                                                Grok
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 gap-4">
                            <h2 className="text-2xl font-bold whitespace-nowrap">
                                Your Prompts
                            </h2>
                            <div className="flex items-center gap-4">
                                <select
                                    value={sortOrder}
                                    onChange={(e) =>
                                        setSortOrder(e.target.value as SortOrder)
                                    }
                                    className="bg-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="alphabetical">A-Z</option>
                                </select>
                                <label className="flex items-center cursor-pointer">
                                    <span className="mr-3 text-sm text-gray-400">
                                        Archived
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={showArchived}
                                            onChange={() => setShowArchived(!showArchived)}
                                            className="sr-only"
                                        />
                                        <div
                                            className={`block w-14 h-8 rounded-full transition-colors ${
                                                showArchived
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-700'
                                            }`}
                                        ></div>
                                        <div
                                            className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                                                showArchived ? 'translate-x-full' : ''
                                            }`}
                                        ></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto">
                            {promptsLoading && (
                                <div className="text-center p-4">
                                    <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                </div>
                            )}
                            {promptsError && (
                                <p className="text-red-400">Could not load prompts.</p>
                            )}
                            {visiblePrompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className={`p-4 bg-gray-700/50 rounded-lg mb-4`}
                                >
                                    <div className="flex justify-between items-start">
                                        <Link
                                            href={`/prompts/${prompt.id}`}
                                            className={`font-semibold mb-1 block hover:underline ${
                                                prompt.is_archived
                                                    ? 'text-gray-500 line-through'
                                                    : 'text-indigo-400'
                                            }`}
                                        >
                                            {prompt.name}
                                        </Link>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                                        {prompt.task_description}
                                    </p>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                                            <StarRating
                                                currentRating={Math.round(
                                                    prompt.average_rating || 0
                                                )}
                                                disabled={ratedInSession.has(prompt.id)}
                                                onRatingChange={(rating) =>
                                                    handleRate(
                                                        prompt.id,
                                                        prompt.latest_version_number ?? 1,
                                                        rating
                                                    )
                                                }
                                            />
                                            <div className="flex items-center gap-x-2">
                                                <Link
                                                    href={`/prompts/${prompt.id}`}
                                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => handleCopyText(prompt.id)}
                                                    className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                                                        copiedPromptId === prompt.id
                                                            ? 'bg-green-600'
                                                            : 'bg-gray-600 hover:bg-gray-500'
                                                    }`}
                                                >
                                                    {copiedPromptId === prompt.id
                                                        ? 'Copied!'
                                                        : 'Copy'}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleArchivePrompt(
                                                            prompt.id,
                                                            !prompt.is_archived
                                                        )
                                                    }
                                                    className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                                    title={
                                                        prompt.is_archived
                                                            ? 'Unarchive'
                                                            : 'Archive'
                                                    }
                                                >
                                                    {prompt.is_archived ? (
                                                        <ArrowUturnLeftIcon className="h-4 w-4" />
                                                    ) : (
                                                        <ArchiveBoxIcon className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDeletePrompt(prompt.id)
                                                    }
                                                    className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                    title="Delete"
                                                >
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
                        <h2 className="text-2xl font-bold mb-4">
                            Compose a Prompt
                        </h2>
                        <div className="flex-grow">
                            <PromptComposerProvider>
                                <PromptComposer templates={templates ?? []} />
                            </PromptComposerProvider>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isCreateTemplateModalOpen}
                onClose={() => setIsCreateTemplateModalOpen(false)}
                title="Create New Template"
            >
                <TemplateForm
                    onSubmit={async (data) => {
                        // --- FIX: Ensure data type compatibility ---
                        // We cast 'data' to the correct type for the hook
                        await handleAction(
                            createTemplate(data as PromptTemplateCreate),
                            {
                                loading: 'Creating template...',
                                success: 'Template created!',
                                error: 'Failed to create template.',
                            }
                        );
                        setIsCreateTemplateModalOpen(false);
                    }}
                    onCancel={() => setIsCreateTemplateModalOpen(false)}
                />
            </Modal>
        </>
    );
};

const DashboardPage = () => (
    <Suspense
        fallback={
            <div className="text-center p-8 bg-gray-900 text-white min-h-screen">
                Loading Dashboard...
            </div>
        }
    >
        <PrivateRoute>
            <DashboardContent />
        </PrivateRoute>
    </Suspense>
);

export default DashboardPage;