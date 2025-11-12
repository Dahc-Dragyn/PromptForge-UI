'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePrompts } from '@/hooks/usePrompts';
import AutoSizingTextarea from '@/components/AutoSizingTextarea';
import BreakdownResult from '@/components/BreakdownResult';
import DiagnoseResult from '@/components/DiagnoseResult';
import { SavePromptModal } from '@/components/SavePromptModal';
import { ArrowPathIcon, BeakerIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';
import type { BreakdownResponse, DiagnoseResponse } from '@/types/prompt';

interface ClinicResults {
    diagnose: DiagnoseResponse | null;
    breakdown: BreakdownResponse | null;
}

function ClinicContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { createPrompt } = usePrompts();
    
    const [promptForClinic, setPromptForClinic] = useState(decodeURIComponent(searchParams.get('prompt') || ''));
    const [isLoading, setIsLoading] = useState(false);
    const [clinicResults, setClinicResults] = useState<ClinicResults>({
        diagnose: null,
        breakdown: null,
    });
    
    // State for the reusable SavePromptModal
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [promptToSave, setPromptToSave] = useState('');

    const handleLoadSuggestion = (suggestedPrompt: string) => {
        setPromptForClinic(suggestedPrompt);
        toast.success("✅ Suggested prompt loaded for re-evaluation!");
    };
    
    const handleOpenSaveModal = (promptContent: string) => {
        setPromptToSave(promptContent);
        setIsSaveModalOpen(true);
    };

    const handlePromptSaved = () => {
        toast.success("Prompt saved successfully!");
        setIsSaveModalOpen(false);
        router.push('/dashboard');
    };
    
    const handleSendToSandbox = (promptA: string, promptB: string) => {
        const encodedA = encodeURIComponent(promptA);
        const encodedB = encodeURIComponent(promptB);
        router.push(`/sandbox?promptA=${encodedA}&promptB=${encodedB}`);
    };

    const handleRunClinic = async () => {
        if (!promptForClinic) {
            toast.error("Please enter a prompt to run the clinic.");
            return;
        }

        setIsLoading(true);
        setClinicResults({ diagnose: null, breakdown: null });
        const toastId = toast.loading("Running clinic analysis...");

        try {
            const [diagnoseRes, breakdownRes] = await Promise.all([
                apiClient.post<DiagnoseResponse>('/prompts/diagnose', { prompt_text: promptForClinic }),
                apiClient.post<BreakdownResponse>('/prompts/breakdown', { prompt_text: promptForClinic })
            ]);

            setClinicResults({
                diagnose: diagnoseRes.data,
                breakdown: breakdownRes.data,
            });

            toast.success("Clinic analysis complete!", { id: toastId });
        } catch (error: any) {
            console.error("Clinic run failed:", error);
            toast.error(error.message || "An unexpected error occurred.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <BeakerIcon className="h-16 w-16 mx-auto text-purple-400 mb-4" />
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">Prompt Clinic</h1>
                        <p className="mt-4 text-lg text-gray-300">
                            Get a comprehensive, side-by-side diagnosis and breakdown of your prompt's quality and structure.
                        </p>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
                        <AutoSizingTextarea
                            value={promptForClinic}
                            onChange={(e) => setPromptForClinic(e.target.value)}
                            className="w-full bg-gray-900 border-gray-700 rounded-lg p-4 focus:ring-purple-500 focus:border-purple-500 text-lg"
                            rows={6}
                            placeholder="Enter the prompt you want to analyze..."
                        />
                        <div className="mt-6 text-center">
                            <button
                                onClick={handleRunClinic}
                                disabled={isLoading || !promptForClinic}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                            >
                                {isLoading ? (
                                    <>
                                        <ArrowPathIcon className="h-6 w-6 animate-spin" />
                                        Running...
                                    </>
                                ) : "Run Clinic"}
                            </button>
                        </div>
                    </div>

                    {!isLoading && (clinicResults.diagnose || clinicResults.breakdown) && (
                        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gray-800 p-6 rounded-xl">
                                <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">Diagnosis</h2>
                                {clinicResults.diagnose && (
                                    <>
                                        <DiagnoseResult 
                                            data={clinicResults.diagnose} 
                                            onTestImprovement={handleLoadSuggestion}
                                        />
                                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                            <button 
                                                onClick={() => handleOpenSaveModal(clinicResults.diagnose!.suggested_prompt)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm transition-colors"
                                            >
                                                <DocumentDuplicateIcon className="h-5 w-5" />
                                                Save Improvement...
                                            </button>
                                            <button 
                                                onClick={() => handleSendToSandbox(promptForClinic, clinicResults.diagnose!.suggested_prompt)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm transition-colors"
                                            >
                                                <BeakerIcon className="h-5 w-5" />
                                                A/B Test in Sandbox
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="bg-gray-800 p-6 rounded-xl">
                                <h2 className="text-2xl font-bold mb-4 text-center text-blue-300">Breakdown</h2>
                                {clinicResults.breakdown && <BreakdownResult data={clinicResults.breakdown} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <SavePromptModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                promptText={promptToSave}
                onPromptSaved={handlePromptSaved}
            />
        </>
    );
}

const ClinicPage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white">Loading Clinic...</div>}>
        <ClinicContent />
    </Suspense>
);

export default ClinicPage;