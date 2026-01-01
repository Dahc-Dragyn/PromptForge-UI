// src/components/PromptComposer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import AiAssistant from './AiAssistant';
import ManualComposer from './ManualComposer';
import ComposedPromptDisplay from './ComposedPromptDisplay';
import { SavePromptModal } from './SavePromptModal';
import QuickExecuteModal from './QuickExecuteModal';

// --- TYPE DEFINITIONS ---
export interface Template {
  id: string;
  name: string;
  tags: string[];
  content: string;
  description?: string;
  is_archived?: boolean;
}

interface PromptComposerProps {
  onPromptSaved?: () => void;
  initialPrompt?: string;
}

// =================================================================================
// --- MAIN PARENT COMPONENT: PromptComposer ---
// =================================================================================
const PromptComposer = ({ onPromptSaved, initialPrompt = '' }: PromptComposerProps) => {
  const [composedPrompt, setComposedPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return initialPrompt || sessionStorage.getItem('composedPrompt') || '';
    }
    return initialPrompt;
  });

  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);

  // Persist composed prompt to sessionStorage
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
    sessionStorage.removeItem('composedPrompt');
  };

  const handlePromptSaved = () => {
    onPromptSaved?.();
    setIsSavePromptModalOpen(false);
  };

  return (
    <>
      <div className="bg-gray-800 p-4 rounded-lg flex flex-col h-full overflow-y-auto">
        {/* AI Assistant */}
        <div className="flex-shrink-0">
          <AiAssistant
            onAiComponentsGenerated={handleAiComponentsGenerated}
            onReset={handleResetAi}
          />
        </div>

        {/* Composed Prompt Display */}
        {composedPrompt ? (
          <div className="flex-shrink-0 mt-4">
            <ComposedPromptDisplay
              composedPrompt={composedPrompt}
              onUpdateComposedPrompt={setComposedPrompt}
              onSave={() => setIsSavePromptModalOpen(true)}
              onQuickExecute={() => setIsExecuteModalOpen(true)}
            />
          </div>
        ) : (
          <div className="flex-shrink-0 mt-4 text-center text-gray-500">
            <p>Your composed prompt will appear here once generated.</p>
          </div>
        )}

        {/* Manual Composer — Now fetches its own live data */}
        <div className="flex-shrink-0 mt-6">
          <ManualComposer onCompose={setComposedPrompt} />
        </div>
      </div>

      {/* Save Prompt Modal */}
      <SavePromptModal
        isOpen={isSavePromptModalOpen}
        onClose={() => setIsSavePromptModalOpen(false)}
        promptText={composedPrompt}
        onPromptSaved={handlePromptSaved}
      />

      {/* Quick Execute Modal */}
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