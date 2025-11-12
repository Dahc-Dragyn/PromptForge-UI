// src/components/AiAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SaveTemplatesModal from './SaveTemplatesModal';
import { apiClient } from '@/lib/apiClient';
import AutoSizingTextarea from './AutoSizingTextarea';

export const AI_MODEL = 'gemini-2.5-flash-lite';

// --- THIS IS THE FINAL FIX (Part 1): A hyper-aggressive meta-prompt ---
export const META_PROMPT_BASE = `
<SYSTEM_TASK>
You are a raw text generator. Your only task is to generate the raw text for a prompt component based on the user's goal.
Your response MUST NOT contain any conversational text, introductions, or preambles.
Your response MUST NOT include "Sure", "Certainly", "Here is", "I can help", "Please provide", "persona", or "task".
Your response MUST begin with the first word of the generated text itself.
Do not use markdown or quotes.
</SYSTEM_TASK>
<USER_GOAL>
`;
// --- END OF FIX (Part 1) ---

interface AiAssistantProps {
    onAiComponentsGenerated: (persona: string, task: string) => void;
    onReset: () => void;
}

// --- THIS IS THE FINAL FIX (Part 2): A much stricter cleaning function ---
/**
 * Cleans the raw text output from the LLM.
 * Strips common prefixes, markdown, and conversational fluff.
 */
const cleanAiOutput = (text: string | undefined | null): string => {
    if (!text) return '';

    let cleanedText = text;

    // Remove common conversational preambles (case-insensitive, multiline)
    const preambles = [
        /^sure, i can help with that!/ims,
        /^sure, here is the component:/ims,
        /^here is the component:/ims,
        /^here's the persona:/ims,
        /^here's the task:/ims,
        /^certainly, here is.../ims,
        /^persona\s*=\s*/ims,
        /^task\s*=\s*/ims,
        /^Sure, I can help with that! Please provide the CMOS sentence[\s\S]*/i
    ];
    
    preambles.forEach(preamble => {
        cleanedText = cleanedText.replace(preamble, '');
    });

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```(json|text)?/g, '');
    cleanedText = cleanedText.replace(/```/g, '');

    // Final trim to remove whitespace and newlines from the start/end
    return cleanedText.trim();
};
// --- END OF FIX (Part 2) ---


const AiAssistant: React.FC<AiAssistantProps> = ({ onAiComponentsGenerated, onReset }) => {
    const [recommendationGoal, setRecommendationGoal] = useState('');
    const [isRecommending, setIsRecommending] = useState(false);
    const [aiSuggestedPersona, setAiSuggestedPersona] = useState('');
    const [aiSuggestedTask, setAiSuggestedTask] = useState('');
    const [showSuggestionUI, setShowSuggestionUI] = useState(false);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [isSaveTemplatesModalOpen, setIsSaveTemplatesModalOpen] = useState(false);

    useEffect(() => {
        if (showSuggestionUI) {
            onAiComponentsGenerated(aiSuggestedPersona, aiSuggestedTask);
        }
    }, [aiSuggestedPersona, aiSuggestedTask, showSuggestionUI, onAiComponentsGenerated]);

    const handleAiGeneration = async () => {
        setIsRecommending(true);
        setShowSuggestionUI(false);
        const toastId = toast.loading('Generating AI components...');
        try {
            // Construct the full prompts with the new, stricter base
            const goalPrompt = `${META_PROMPT_BASE}"${recommendationGoal}"</USER_GOAL>`;
            
            // Add specific instructions for each component
            const personaMetaPrompt = `${goalPrompt}\n[INSTRUCTION]Generate the "persona" text based on the user goal.[/INSTRUCTION]`;
            const taskMetaPrompt = `${goalPrompt}\n[INSTRUCTION]Generate the "task" text based on the user goal. This should be a human-readable paragraph.[/INSTRUCTION]`;
            const nameMetaPrompt = `Based on the goal "${recommendationGoal}", generate a short 3-5 word title. Do not use quotes or conversational text.`;

            const executePayload = (prompt_text: string) => ({ prompt_text, model: AI_MODEL });
            
            // --- Define the expected response type ---
            type AiExecuteResponse = { final_text: string };

            // --- FIX: Tell TypeScript the apiClient unwraps the response. ---
            // The return type `R` is the data itself, not the full AxiosResponse.
            const personaPromise = apiClient.post<AiExecuteResponse, AiExecuteResponse>('/prompts/execute', executePayload(personaMetaPrompt));
            const taskPromise = apiClient.post<AiExecuteResponse, AiExecuteResponse>('/prompts/execute', executePayload(taskMetaPrompt));
            const namePromise = apiClient.post<AiExecuteResponse, AiExecuteResponse>('/prompts/execute', executePayload(nameMetaPrompt));
            
            // --- The results are the data objects, not AxiosResponse ---
            const [personaRes, taskRes, nameRes] = await Promise.all([
                personaPromise, 
                taskPromise, 
                namePromise
            ]);
    
            // --- THIS IS THE FIX: Access final_text directly (no .data) ---
            // --- and run it through our new, aggressive cleaning function ---
            const generatedPersona = cleanAiOutput(personaRes.final_text);
            const generatedTask = cleanAiOutput(taskRes.final_text);
            const generatedName = cleanAiOutput(nameRes.final_text).replace(/"/g, '') || 'AI Generated';
            // --- END OF FIX ---
    
            // This check catches the conversational AI *after* cleaning
            if (!generatedPersona || !generatedTask) {
                console.error("AI returned empty response after cleaning. Persona:", generatedPersona, "Task:", generatedTask);
                throw new Error("AI returned a conversational or empty response. Please try again.");
            }
    
            setAiSuggestedPersona(generatedPersona);
            setAiSuggestedTask(generatedTask);
            setNewPersonaName(`${generatedName} - Persona`);
            setNewTaskName(`${generatedName} - Task`);
            setShowSuggestionUI(true);
            toast.success('AI components generated!', { id: toastId });
        } catch (err: unknown) {
            console.error("AI Generation Failed:", err);
            
            let errorMessage = 'An unknown error occurred.';
            if (err instanceof Error) {
                errorMessage = err.message;
            }

            // Check if this is an Axios error with a response from our backend
            if (err && (err as any).response?.data?.detail) {
                errorMessage = (err as any).response.data.detail;
            } else if (err && (err as any).message) {
                 // Handle runtime errors
                errorMessage = (err as any).message;
            }

            toast.error(errorMessage, { id: toastId, duration: 5000 });

        } finally {
            setIsRecommending(false);
        }
    };
    
    const handleTryAgain = () => {
        setShowSuggestionUI(false);
        setAiSuggestedPersona('');
        setAiSuggestedTask('');
        setRecommendationGoal('');
        onReset();
    };

    return (
        <>
            <div className="p-4 border border-dashed border-sky-400/50 rounded-lg mb-6">
                <h3 className="font-semibold text-lg mb-2 text-sky-300">AI Assistant</h3>
                <p className="text-sm text-gray-400 mb-2">Describe your goal and let the AI generate a prompt for you.</p>
                <AutoSizingTextarea
                    value={recommendationGoal}
                    onChange={(e) => setRecommendationGoal(e.target.value)}
                    className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-sky-500 focus:border-sky-500"
                    rows={2}
                    placeholder="e.g., write a professional email to my boss about a project delay"
                />
                {showSuggestionUI ? (
                    <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                        <p className="text-white font-medium mb-4">AI Generated the following (editable):</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Generated Persona</label>
                                <AutoSizingTextarea 
                                    value={aiSuggestedPersona} 
                                    onChange={(e) => setAiSuggestedPersona(e.target.value)} 
                                    className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white text-sm" 
                                    rows={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Generated Task</label>
                                <AutoSizingTextarea 
                                    value={aiSuggestedTask} 
                                    onChange={(e) => setAiSuggestedTask(e.target.value)} 
                                    className="w-full border rounded p-2 bg-gray-700 border-gray-600 text-white text-sm" 
                                    rows={6}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsSaveTemplatesModalOpen(true)} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save to Library...</button>
                            <button onClick={handleTryAgain} className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold">Try Again</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={handleAiGeneration} disabled={isRecommending || !recommendationGoal} className="w-full mt-2 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 font-semibold">
                        {isRecommending ? 'Generating...' : 'Generate with AI'}
                    </button>
                )}
            </div>
            <SaveTemplatesModal 
                isOpen={isSaveTemplatesModalOpen}
                onClose={() => setIsSaveTemplatesModalOpen(false)}
                newPersonaName={newPersonaName}
                setNewPersonaName={setNewPersonaName}
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
                recommendationGoal={recommendationGoal}
                aiSuggestedPersona={aiSuggestedPersona}
                aiSuggestedTask={aiSuggestedTask}
            />
        </>
    );
}

export default AiAssistant;