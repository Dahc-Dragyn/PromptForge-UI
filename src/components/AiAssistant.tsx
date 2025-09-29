// src/components/AiAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SaveTemplatesModal from './SaveTemplatesModal';
import { apiClient } from '@/lib/apiClient';
import AutoSizingTextarea from './AutoSizingTextarea';

export const AI_MODEL = 'gemini-2.5-flash-lite';
export const META_PROMPT_BASE = `Based on the user's goal, generate a concise component. Crucially, do not include any preamble, introduction, or conversational text like "Certainly, here is...". Output ONLY the text for the component itself.`;

interface AiAssistantProps {
    onAiComponentsGenerated: (persona: string, task: string) => void;
    onReset: () => void;
}

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
          const goalMetaPrompt = `${META_PROMPT_BASE} The user's goal is: "${recommendationGoal}"`;
          const executePayload = (prompt_text: string) => ({ prompt_text, model: AI_MODEL });
          
          const personaPromise = apiClient.post<{ final_text: string }>('/prompts/execute', executePayload(`${goalMetaPrompt} The component is a "persona" for an AI assistant.`));
          const taskPromise = apiClient.post<{ final_text: string }>('/prompts/execute', executePayload(`${goalMetaPrompt} The component is a "task" for an AI assistant. This should be a human-readable paragraph describing what the AI should do. Do not use JSON or any other structured format.`));
          const namePromise = apiClient.post<{ final_text: string }>('/prompts/execute', executePayload(`Based on the goal "${recommendationGoal}", generate a short 3-5 word title. No quotes.`));
          
          // --- FIX: Corrected the typo in the array below ---
          const [personaRes, taskRes, nameRes] = await Promise.all([personaPromise, taskPromise, namePromise]);
    
          const generatedPersona = personaRes.final_text?.trim();
          const generatedTask = taskRes.final_text?.trim();
          const generatedName = nameRes.final_text?.trim().replace(/"/g, '') || 'AI Generated';
    
          if (!generatedPersona || !generatedTask) {
              throw new Error("AI returned an empty response.");
          }
    
          setAiSuggestedPersona(generatedPersona);
          setAiSuggestedTask(generatedTask);
          setNewPersonaName(`${generatedName} - Persona`);
          setNewTaskName(`${generatedName} - Task`);
          setShowSuggestionUI(true);
          toast.success('AI components generated!', { id: toastId });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'AI Generation Failed';
          toast.error(errorMessage, { id: toastId });
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