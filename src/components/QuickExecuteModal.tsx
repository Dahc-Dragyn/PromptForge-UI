'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import Modal from './Modal';
// Removed: AutoSizingTextarea import, as the variables input is no longer used.

interface QuickExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onSaveAsPrompt: (promptContent: string) => void;
}

const QuickExecuteModal = ({ isOpen, onClose, promptText, onSaveAsPrompt }: QuickExecuteModalProps) => {
  // Removed: const [variables, setVariables] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Using the cheapest model, Gemini 2.5 Flash-Lite, as requested.
  const [model, setModel] = useState('gemini-2.5-flash-lite');

  const handleExecute = async () => {
    setIsLoading(true);
    setResult('');
    try {
      // Sending a simplified payload with prompt_text, model, and an empty variables object.
      const response = await apiClient.post<{ final_text: string }>('/prompts/execute', {
        prompt_text: promptText,
        // Empty variables object sent to satisfy backend structure if required
        variables: {},
        model: model,
      });
      setResult(response.final_text);
    } catch (err: any) {
      // Robust error display
      const errorDetail = err.response?.data?.detail || err.message || 'Execution failed.';
      toast.error(errorDetail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Execute Prompt">
      <div className="space-y-4">
        {/* 1. Prompt Text Section (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Text (Read-only)</label>
          <div className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-gray-400 max-h-40 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{promptText}</pre>
          </div>
        </div>
        
        {/* NOTE: Variables input section has been intentionally removed for simplification. */}
        
        {/* 2. Result Section */}
        {result && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Result</label>
            <div className="w-full bg-gray-800 border-gray-700 rounded-md p-2 text-gray-300 max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          </div>
        )}
        
        {/* 3. Action Buttons */}
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