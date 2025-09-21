// src/app/prompts/[promptId]/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NewVersionForm from '@/components/NewVersionForm';
import { EyeIcon, PencilSquareIcon, ShareIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/api';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}`;

type Prompt = {
    id: string;
    name: string;
    task_description: string;
    isArchived: boolean;
};

type Version = {
    id: string;
    version_number: number;
    prompt_text: string;
    commit_message: string;
    created_at: string;
    ratings_summary?: {
        average_rating: number;
        count: number;
    };
};

function PromptDetailContent() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const promptId = params.promptId as string;

    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    useEffect(() => {
        if (!promptId || !user) return;

        const fetchPromptAndVersions = async () => {
            setLoading(true);
            try {
                const promptResponse = await authenticatedFetch(`${API_BASE_URL}/prompts/${promptId}`);
                if (!promptResponse.ok) throw new Error('Prompt not found.');
                const promptData = await promptResponse.json();
                setPrompt({ ...promptData, id: promptId });
                setEditedName(promptData.name);
                setEditedDescription(promptData.task_description);

                const versionsResponse = await authenticatedFetch(`${API_BASE_URL}/prompts/${promptId}/versions`);
                if (!versionsResponse.ok) throw new Error('Could not fetch versions.');
                const versionsData = await versionsResponse.json();
                
                const sortedVersions = versionsData.sort((a: Version, b: Version) => b.version_number - a.version_number);
                setVersions(sortedVersions);
                
                if (sortedVersions.length > 0) {
                    setSelectedVersion(sortedVersions[0]);
                }
            } catch (err: any) {
                setError(err.message);
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPromptAndVersions();
    }, [promptId, user]);
    
    const handleNameUpdate = async () => {
        if (!prompt) return;
        const promptRef = doc(db, 'prompts', prompt.id);
        try {
            await updateDoc(promptRef, { name: editedName });
            setPrompt({ ...prompt, name: editedName });
            setIsEditingName(false);
            toast.success("Prompt name updated.");
        } catch (err) {
            toast.error("Failed to update name.");
        }
    };

    const handleDescriptionUpdate = async () => {
        if (!prompt) return;
        const promptRef = doc(db, 'prompts', prompt.id);
        try {
            await updateDoc(promptRef, { task_description: editedDescription });
            setPrompt({ ...prompt, task_description: editedDescription });
            setIsEditingDescription(false);
            toast.success("Description updated.");
        } catch (err) {
            toast.error("Failed to update description.");
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

    const handleCompareVersions = (versionA: Version, versionB: Version) => {
        const url = `${window.location.origin}/sandbox?promptA=${encodeURIComponent(versionA.prompt_text)}&promptB=${encodeURIComponent(versionB.prompt_text)}`;
        router.push(url);
    };

    if (loading) return <div className="text-center p-8">Loading prompt details...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    if (!prompt) return <div className="text-center p-8">Prompt not found.</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-gray-800 shadow-xl rounded-lg p-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-start mb-6 border-b border-gray-700 pb-6">
                        <div className="flex-1">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md text-3xl font-bold p-2 w-full" autoFocus onBlur={handleNameUpdate} onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()} />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-bold text-white">{prompt.name}</h1>
                                    <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-white"><PencilSquareIcon className="h-6 w-6" /></button>
                                </div>
                            )}

                            {isEditingDescription ? (
                                <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md text-gray-300 mt-2 p-2 w-full" autoFocus onBlur={handleDescriptionUpdate} />
                            ) : (
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-gray-400">{prompt.task_description}</p>
                                    <button onClick={() => setIsEditingDescription(true)} className="text-gray-400 hover:text-white"><PencilSquareIcon className="h-5 w-5" /></button>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 md:mt-0 flex-shrink-0 flex gap-2">
                            <button onClick={handleShare} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors">
                                <ShareIcon className="h-5 w-5" />
                                Share
                            </button>
                            <button onClick={() => router.push(`/sandbox?prompt=${encodeURIComponent(selectedVersion?.prompt_text || '')}`)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors">
                                <ArrowDownOnSquareIcon className="h-5 w-5" />
                                Open in Sandbox
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
                                            {version.ratings_summary && version.ratings_summary.count > 0 && (
                                                <div className="text-xs mt-2">
                                                    Avg Rating: {version.ratings_summary.average_rating.toFixed(1)} ({version.ratings_summary.count})
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Selected Prompt (Version {selectedVersion?.version_number})</h2>
                            </div>
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
                                {/* --- FIX: Use correct prop name 'onVersionAdded' and typed parameter --- */}
                                <NewVersionForm promptId={promptId} onVersionAdded={(newVersion: Version) => {
                                    const updatedVersions = [newVersion, ...versions].sort((a,b) => b.version_number - a.version_number);
                                    setVersions(updatedVersions);
                                    setSelectedVersion(newVersion);
                                }}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PromptDetailPage = () => (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
        <PromptDetailContent />
    </Suspense>
);

export default PromptDetailPage;