// src/components/QuickExecuteModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { authenticatedFetch } from '@/lib/api';
import { toast } from 'react-hot-toast';

const API_EXECUTE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/execute`;

interface QuickExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onSaveAsPrompt: (promptContent: string) => void;
}

const findVariables = (text: string): string[] => {
  const regex = /{(\w+)}/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map(v => v.substring(1, v.length - 1)))];
};

const QuickExecuteModal = ({ isOpen, onClose, promptText, onSaveAsPrompt }: QuickExecuteModalProps) => {
  const [editablePrompt, setEditablePrompt] = useState(promptText);
  const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variables = useMemo(() => findVariables(editablePrompt), [editablePrompt]);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      setEditablePrompt(promptText);
      const initialValues: { [key: string]: string } = {};
      findVariables(promptText).forEach(v => {
        initialValues[v] = '';
      });
      setVariableValues(initialValues);
    }
  }, [isOpen, promptText]);

  const handleInputChange = (variableName: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [variableName]: value }));
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    // --- FIX: Construct the complete and correct payload ---
    const payload = {
      prompt_text: editablePrompt,
      model: 'gemini-2.5-flash-lite', // Use a consistent, cost-effective model
      variables: variableValues,
    };

    try {
      // --- FIX: Use the authenticatedFetch helper ---
      const response = await authenticatedFetch(API_EXECUTE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorDetail = data.detail?.[0]?.msg || data.detail || 'Failed to execute prompt.';
        throw new Error(errorDetail);
      }
      setResult(data.final_text);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const allVariablesFilled = variables.every(v => variableValues[v]?.trim() !== '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Execute Prompt">
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt-template-editor" className="block text-sm font-medium text-gray-300 mb-1">Prompt Template (Editable)</label>
          <textarea
            id="prompt-template-editor"
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            className="w-full h-32 p-2 border rounded text-sm bg-gray-900 text-gray-200 border-gray-600"
          />
        </div>

        {variables.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-300 mb-2">Fill in Variables</h4>
            <div className="space-y-3">
              {variables.map(variable => (
                <div key={variable}>
                  <label htmlFor={`var-${variable}`} className="block text-sm font-medium text-gray-400 mb-1">{`{${variable}}`}</label>
                  <input
                    id={`var-${variable}`}
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => handleInputChange(variable, e.target.value)}
                    className="w-full border rounded p-2 text-black bg-gray-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
            <button 
              onClick={handleExecute} 
              disabled={isLoading || (variables.length > 0 && !allVariablesFilled)}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {isLoading ? 'Executing...' : 'Run'}
            </button>
            <button 
              onClick={() => onSaveAsPrompt(editablePrompt)}
              disabled={isLoading}
              className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              Save as Prompt...
            </button>
        </div>

        {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        
        {result && (
          <div className="mt-4">
            <h4 className="font-semibold text-green-400 mb-2">Result</h4>
            <div className="text-sm bg-gray-900 text-gray-200 p-3 rounded-md whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuickExecuteModal;