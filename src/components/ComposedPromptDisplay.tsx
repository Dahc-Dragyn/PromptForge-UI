// src/components/ComposedPromptDisplay.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { AI_MODEL } from './AiAssistant';
import AutoSizingTextarea from './AutoSizingTextarea';

interface ComposedPromptDisplayProps {
    composedPrompt: string;
    onUpdateComposedPrompt: (prompt: string) => void;
    onSave: () => void;
    onQuickExecute: () => void;
}

const ComposedPromptDisplay: React.FC<ComposedPromptDisplayProps> = ({
    composedPrompt,
    onUpdateComposedPrompt,
    onSave,
    onQuickExecute,
}) => {
    const router = useRouter();
    const [isCopying, setIsCopying] = useState(false);
    const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(composedPrompt);
        setIsCopying(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setIsCopying(false), 2000);
    };

    const handleA_B_Test = async () => {
        setIsGeneratingVariation(true);
        const toastId = toast.loading('Generating prompt variation for A/B test...');
        try {
            const response = await apiClient.post<{ final_text: string }>('/prompts/execute', {
                prompt_text: `Generate one distinct but functionally similar variation of the following prompt. Do not include any preamble, introduction, or conversational text. Output ONLY the new prompt text itself.\n\nPROMPT:\n${composedPrompt}`,
                model: AI_MODEL,
            });
            const variation = response.final_text?.trim();
            if (!variation) {
                throw new Error('The AI did not return a valid variation.');
            }
            toast.success('Variation generated! Navigating to Sandbox...', { id: toastId });
            const params = new URLSearchParams({
                promptA: composedPrompt,
                promptB: variation,
            });
            router.push(`/sandbox?${params.toString()}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate variation.';
            toast.error(errorMessage, { id: toastId });
        } finally {
            setIsGeneratingVariation(false);
        }
    };

    return (
        <div className="my-6 p-4 border border-gray-600 rounded-lg bg-gray-900/50">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-200">Composed Prompt</h3>
                <div className="flex gap-2">
                    <button onClick={onQuickExecute} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-semibold">Quick Execute</button>
                    <button onClick={handleCopy} className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold w-24">
                        {isCopying ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={onSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save as Prompt...</button>
                </div>
            </div>
            <AutoSizingTextarea
                value={composedPrompt}
                onChange={(e) => onUpdateComposedPrompt(e.target.value)}
                className="w-full border rounded p-3 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500 text-base"
                rows={8} // <-- FIX: Corrected from minRows to rows
            />
            <div className="mt-4 flex justify-end items-center gap-3">
                 <h4 className="text-sm font-semibold text-gray-400 mr-2">Next Steps:</h4>
                 <button onClick={handleA_B_Test} disabled={isGeneratingVariation} className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-semibold">
                    {isGeneratingVariation ? 'Generating...' : 'A/B Test'}
                </button>
                 <button onClick={() => router.push(`/analyze?prompt=${encodeURIComponent(composedPrompt)}`)} className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 font-semibold">Analyze</button>
                 <button onClick={() => router.push(`/analyze?tool=optimize&prompt=${encodeURIComponent(composedPrompt)}`)} className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 font-semibold">Optimize</button>
                 <button onClick={() => router.push(`/clinic?prompt=${encodeURIComponent(composedPrompt)}`)} className="px-3 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 font-semibold">Run Clinic</button>
            </div>
        </div>
    );
};

export default ComposedPromptDisplay;