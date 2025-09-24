// src/app/prompts/[promptId]/page.tsx
'use client';

// FIX: Import 'useEffect' from React
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePromptVersions } from '@/hooks/usePromptVersions';
import NewVersionForm from '@/components/NewVersionForm';
import { PencilSquareIcon, ShareIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/apiClient';

function PromptDetailContent() {
    const router = useRouter();
    const params = useParams();
    const promptId = params.promptId as string;

    // FIX: Destructure 'mutatePrompt' instead of the generic 'mutate'
    const { prompt, versions, isLoading, error, createVersion, mutatePrompt } = usePromptVersions(promptId);

    const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    
    useEffect(() => {
        if (versions && versions.length > 0) {
            if (!selectedVersion || !versions.find(v => v.id === selectedVersion.id)) {
                 setSelectedVersion(versions[0]);
            }
        }
    }, [versions, selectedVersion]);

    const handleUpdatePrompt = async (updateData: { name?: string; description?: string }) => {
        if (!prompt) return;

        // Optimistically update the local SWR cache for a faster UI response.
        mutatePrompt( (currentData: any) => ({ ...currentData, ...updateData }), false );

        try {
            await authenticatedFetch(`/prompts/${prompt.id}`, {
                method: 'PATCH',
                body: JSON.stringify(updateData),
            });
            toast.success("Prompt updated successfully.");
        } catch (err) {
            toast.error("Failed to update prompt.");
            // Revert optimistic update on failure by passing back the original prompt data
            mutatePrompt(prompt, false);
        } finally {
            setIsEditingName(false);
            setIsEditingDescription(false);
        }
    };

    const handleShare = () => {
        if (!selectedVersion) {
            toast.error("No version selected to share.");
            return;
        }
        const url = `${window.location.origin}/sandbox?prompt=${encodeURIComponent(selectedVersion.prompt_text)}`;
        navigator.clipboard.writeText(url);
        toast.success("Sandbox URL copied to clipboard!");
    };

    if (isLoading) return <div className="text-center p-8 text-white">Loading prompt details...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;
    if (!prompt) return <div className="text-center p-8 text-white">Prompt not found.</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-gray-800 shadow-xl rounded-lg p-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-start mb-6 border-b border-gray-700 pb-6">
                        <div className="flex-1">
                            {isEditingName ? (
                                <input
                                    type="text"
                                    defaultValue={prompt.name}
                                    className="bg-gray-900 border border-gray-600 rounded-md text-3xl font-bold p-2 w-full"
                                    autoFocus
                                    onBlur={(e) => handleUpdatePrompt({ name: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrompt({ name: (e.target as HTMLInputElement).value })}
                                />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold text-white">{prompt.name}</h1>
                                    <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-white"><PencilSquareIcon className="h-6 w-6" /></button>
                                </div>
                            )}

                            {isEditingDescription ? (
                                <textarea
                                    defaultValue={prompt.description}
                                    className="bg-gray-900 border border-gray-600 rounded-md text-gray-300 mt-2 p-2 w-full"
                                    autoFocus
                                    onBlur={(e) => handleUpdatePrompt({ description: e.target.value })}
                                />
                            ) : (
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-gray-400">{prompt.description}</p>
                                    <button onClick={() => setIsEditingDescription(true)} className="text-gray-400 hover:text-white"><PencilSquareIcon className="h-5 w-5" /></button>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 md:mt-0 flex-shrink-0 flex gap-2">
                            <button onClick={handleShare} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2">
                                <ShareIcon className="h-5 w-5" /> Share
                            </button>
                            <button onClick={() => router.push(`/sandbox?prompt=${encodeURIComponent(selectedVersion?.prompt_text || '')}`)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2">
                                <ArrowDownOnSquareIcon className="h-5 w-5" /> Open in Sandbox
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <h2 className="text-xl font-semibold mb-4">Versions</h2>
                            <div className="bg-gray-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                                <ul className="divide-y divide-gray-700">
                                    {versions.map(version => (
                                        <li key={version.id} onClick={() => setSelectedVersion(version)} className={`p-4 cursor-pointer hover:bg-gray-700 ${selectedVersion?.id === version.id ? 'bg-blue-900/50' : ''}`}>
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold">Version {version.version_number}</p>
                                                <span className="text-xs text-gray-400">{new Date(version.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1 italic">"{version.commit_message}"</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-semibold mb-4">Selected Prompt (Version {selectedVersion?.version_number})</h2>
                            {selectedVersion ? (
                                <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap min-h-[300px]">
                                    {selectedVersion.prompt_text}
                                </div>
                            ) : (
                                <div className="bg-gray-900/50 rounded-lg p-4 text-center text-gray-500 min-h-[300px] flex items-center justify-center">
                                    <p>Select a version to view its content.</p>
                                </div>
                            )}
                            <div className="mt-6">
                                {/* The 'createVersion' function is now passed directly from our hook */}
                                <NewVersionForm promptId={promptId} onVersionAdded={createVersion} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PromptDetailPage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white min-h-screen">Loading...</div>}>
        <PromptDetailContent />
    </Suspense>
);

export default PromptDetailPage;