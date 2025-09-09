// src/app/clinic/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DiagnoseResult from '@/components/DiagnoseResult';
import BreakdownResult from '@/components/BreakdownResult';
import CopyableOutput from '@/components/CopyableOutput';
import Modal from '@/components/Modal';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts`;

// Inner component to safely use search params
function ClinicContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [promptText, setPromptText] = useState('');
  const [clinicRun, setClinicRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnoseData, setDiagnoseData] = useState<any | null>(null);
  const [breakdownData, setBreakdownData] = useState<any | null>(null);

  // --- NEW: State for the Save Prompt modal ---
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);


  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      const decodedPrompt = decodeURIComponent(promptFromUrl);
      setPromptText(decodedPrompt);
    }
  }, [searchParams]);

  const handleRunClinic = async () => {
    if (!promptText) return;
    
    setLoading(true);
    setClinicRun(true);
    setError(null);
    setDiagnoseData(null);
    setBreakdownData(null);

    try {
      const [diagnoseRes, breakdownRes] = await Promise.all([
        fetch(`${API_BASE_URL}/diagnose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ prompt_text: promptText }),
        }),
        fetch(`${API_BASE_URL}/breakdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ prompt_text: promptText }),
        })
      ]);

      if (!diagnoseRes.ok || !breakdownRes.ok) {
        throw new Error('One or more API calls failed.');
      }

      const diagnoseJson = await diagnoseRes.json();
      const breakdownJson = await breakdownRes.json();

      setDiagnoseData(diagnoseJson);
      setBreakdownData(breakdownJson);

    } catch (err: any) {
      setError(err.message || 'Failed to run clinic analysis.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenSaveModal = async (promptContent: string) => {
    setPromptToSave(promptContent);
    setIsSaveModalOpen(true);
    setNewPromptName('');
    setNewPromptDescription('');
    setError(null);
    setIsGeneratingDetails(true);

    try {
      const nameMetaPrompt = `Based on the following prompt, generate a short, descriptive, 3-5 word title. Do not use quotes. The prompt is: "${promptContent}"`;
      const descMetaPrompt = `Based on the following prompt, generate a one-sentence description of the task it performs. The prompt is: "${promptContent}"`;

      const [nameRes, descRes] = await Promise.all([
        fetch(`${API_BASE_URL}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
        fetch(`${API_BASE_URL}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: descMetaPrompt }) })
      ]);

      if (!nameRes.ok || !descRes.ok) throw new Error('Failed to generate prompt details.');

      const nameData = await nameRes.json();
      const descData = await descRes.json();

      setNewPromptName(nameData.generated_text.trim().replace(/"/g, ''));
      setNewPromptDescription(descData.generated_text.trim());

    } catch (err) {
      console.error("Failed to generate details:", err);
      setNewPromptName('');
      setNewPromptDescription('');
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'prompts'), {
        name: newPromptName,
        task_description: newPromptDescription,
        userId: user.uid,
        isArchived: false,
        created_at: serverTimestamp(),
      });

      const versionsUrl = `${API_BASE_URL}/${docRef.id}/versions`;
      const versionResponse = await fetch(versionsUrl, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: promptToSave,
          commit_message: "Initial version from Clinic suggestion.",
        }),
      });

      if (!versionResponse.ok) throw new Error('Failed to save the initial prompt version.');
      
      setIsSaveModalOpen(false);
      router.push('/dashboard');

    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToSandbox = () => {
    const originalPrompt = encodeURIComponent(promptText);
    const suggestedPrompt = encodeURIComponent(diagnoseData?.suggested_prompt || '');
    
    router.push(`/sandbox?prompt=${originalPrompt}&prompt=${suggestedPrompt}`);
  };

  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <>
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">One-Click Prompt Clinic</h1>
        <p className="text-gray-400 text-center mb-8">
          Analyze, diagnose, and get actionable suggestions to improve your prompt in one go.
        </p>

        <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
          <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700 mb-1">
            Enter your prompt for analysis
          </label>
          <textarea 
            id="prompt-input"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full border rounded p-3 text-black border-gray-300 font-mono"
            rows={10}
            placeholder="Paste your prompt here..."
          />
          <button 
            onClick={handleRunClinic}
            disabled={loading || !promptText}
            className="w-full mt-4 py-3 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 font-semibold text-lg"
          >
            {loading ? 'Analyzing...' : 'Run Clinic'}
          </button>
        </div>

        {error && <p className="mt-6 text-red-400 text-center">{error}</p>}

        {clinicRun && !loading && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Clinic Results</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                {diagnoseData && <DiagnoseResult data={diagnoseData} />}
              </div>
              <div>
                {breakdownData && <BreakdownResult data={breakdownData} />}
              </div>
            </div>
            
            {diagnoseData?.suggested_prompt && (
              <div className="mt-8">
                <CopyableOutput 
                  title="Suggested Improvement"
                  content={diagnoseData.suggested_prompt}
                  onSave={() => handleOpenSaveModal(diagnoseData.suggested_prompt)}
                />
                <button 
                  onClick={handleSendToSandbox}
                  className="w-full mt-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
                >
                  A/B Test the Fix in Sandbox
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
              <input id="new-prompt-name" type="text" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required disabled={isGeneratingDetails} />
            </div>
            <div>
              <label htmlFor="new-prompt-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
              <textarea id="new-prompt-desc" value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required disabled={isGeneratingDetails} />
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
            <button type="submit" disabled={isSaving || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSaving ? 'Saving...' : 'Save Prompt'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const ClinicPage = () => (
    <Suspense fallback={<div>Loading Clinic...</div>}>
        <ClinicContent />
    </Suspense>
);

export default ClinicPage;