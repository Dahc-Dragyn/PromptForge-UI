// src/app/clinic/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DiagnoseResult from '@/components/DiagnoseResult';
import BreakdownResult from '@/components/BreakdownResult';
import CopyableOutput from '@/components/CopyableOutput';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts`;

// Inner component to safely use search params
function ClinicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [promptText, setPromptText] = useState('');
  const [clinicRun, setClinicRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnoseData, setDiagnoseData] = useState<any | null>(null);
  const [breakdownData, setBreakdownData] = useState<any | null>(null);

  // This useEffect now correctly reads the prompt from the URL on page load
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

  const handleSendToSandbox = () => {
    const originalPrompt = encodeURIComponent(promptText);
    const suggestedPrompt = encodeURIComponent(diagnoseData?.suggested_prompt || '');
    
    router.push(`/sandbox?prompt=${originalPrompt}&prompt=${suggestedPrompt}`);
  };

  return (
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
  );
}

// Wrap the component in Suspense to handle search params correctly
const ClinicPage = () => (
    <Suspense fallback={<div>Loading Clinic...</div>}>
        <ClinicContent />
    </Suspense>
);

export default ClinicPage;