// src/components/QuickExecuteModal.tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient'; // CORRECT: Import the apiClient
import Modal from './Modal';
import AutoSizingTextarea from './AutoSizingTextarea';

interface QuickExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onSaveAsPrompt: (promptContent: string) => void;
}

const QuickExecuteModal = ({ isOpen, onClose, promptText, onSaveAsPrompt }: QuickExecuteModalProps) => {
  const [variables, setVariables] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('gemini-1.5-flash');

  const handleExecute = async () => {
    setIsLoading(true);
    setResult('');
    try {
      let parsedVariables = {};
      if (variables.trim()) {
        parsedVariables = JSON.parse(variables);
      }
      const response = await apiClient.post<{ final_text: string }>('/prompts/execute', {
        prompt_text: promptText,
        variables: parsedVariables,
        model: model,
      });
      setResult(response.final_text);
    } catch (err: any) {
      toast.error(err.message || 'Execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Execute Prompt">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Text (Read-only)</label>
          <div className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-gray-400 max-h-40 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{promptText}</pre>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Variables (JSON format)</label>
          <AutoSizingTextarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            placeholder='{ "name": "John", "topic": "AI" }'
            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white"
          />
        </div>
        {result && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Result</label>
            <div className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-gray-300 max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={() => onSaveAsPrompt(promptText)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
          >
            Save as New Prompt...
          </button>
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700 font-semibold"
          >
            {isLoading ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QuickExecuteModal;