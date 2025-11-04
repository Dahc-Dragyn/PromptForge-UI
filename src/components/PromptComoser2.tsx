// src/components/PromptComposer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import AiAssistant from './AiAssistant';
import ManualComposer from './ManualComposer';
import ComposedPromptDisplay from './ComposedPromptDisplay';
import { SavePromptModal } from './SavePromptModal';
import QuickExecuteModal from'./QuickExecuteModal';

// --- TYPE DEFINITIONS ---
export interface Template {
  id: string;
  name: string;
  tags: string[];
  content: string;
}

interface PromptComposerProps {
  templates: Template[];
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

// =================================================================================
// --- MAIN PARENT COMPONENT: PromptComposer ---
// =================================================================================
const PromptComposer = ({ templates = [], onPromptSaved, initialPrompt = '' }: PromptComposerProps) => {
    const [composedPrompt, setComposedPrompt] = useState(() => {
        if (typeof window !== 'undefined') {
            return initialPrompt || sessionStorage.getItem('composedPrompt') || '';
        }
        return initialPrompt;
    });

    const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('composedPrompt', composedPrompt);
        }
    }, [composedPrompt]);

    const handleAiComponentsGenerated = (persona: string, task: string) => {
        setComposedPrompt(`${persona}\n\n${task}`);
    };

    const handleResetAi = () => {
        setComposedPrompt('');
    };

    const handlePromptSaved = () => {
        if(onPromptSaved) {
            onPromptSaved();
        }
        setIsSavePromptModalOpen(false);
    }

    return (
        <>
            <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full overflow-y-auto">
                <div className="flex-shrink-0">
                    <AiAssistant
                        onAiComponentsGenerated={handleAiComponentsGenerated}
                        onReset={handleResetAi}
                    />
                </div>

                {composedPrompt && (
                    <div className="flex-shrink-0">
                        <ComposedPromptDisplay
                            composedPrompt={composedPrompt}
                            onUpdateComposedPrompt={setComposedPrompt}
                            onSave={() => setIsSavePromptModalOpen(true)}
                            onQuickExecute={() => setIsExecuteModalOpen(true)}
                        />
                    </div>
                )}
                
                <div className="flex-shrink-0">
                    <ManualComposer
                        templates={templates}
                        onCompose={setComposedPrompt}
                    />
                </div>
            </div>
            
            <SavePromptModal
                isOpen={isSavePromptModalOpen}
                onClose={() => setIsSavePromptModalOpen(false)}
                promptText={composedPrompt} 
                onPromptSaved={handlePromptSaved}
            />

            <QuickExecuteModal
                isOpen={isExecuteModalOpen}
                onClose={() => setIsExecuteModalOpen(false)}
                promptText={composedPrompt}
                onSaveAsPrompt={() => {
                    setIsExecuteModalOpen(false);
                    setIsSavePromptModalOpen(true);
                }}
            />
        </>
    );
};

export default PromptComposer;