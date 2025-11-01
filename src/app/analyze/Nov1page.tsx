'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/apiClient';
import { usePrompts } from '@/hooks/usePrompts';
import AutoSizingTextarea from '@/components/AutoSizingTextarea';
import BreakdownResult from '@/components/BreakdownResult';
import DiagnoseResult from '@/components/DiagnoseResult';
import Modal from '@/components/Modal';
import { SavePromptModal } from '@/components/SavePromptModal';
import { SparklesIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { Transition } from '@headlessui/react';

// --- Type Definitions ---
interface BreakdownResponse {
    components: { type: string; content: string; explanation: string; }[];
}
interface DiagnoseResponse {
    overall_score: number | string;
    diagnosis: string;
    key_issues: string[];
    suggested_prompt: string;
    criteria: { [key: string]: boolean; };
}
interface OptimizeResponse {
    optimized_prompt: string;
    reasoning_summary: string;
}
type Example = { input: string; output: string; };

const APE_FOCUS_TYPES = [
    "General Purpose",
    "Chain-of-Thought",
    "JSON Output",
    "Code Generation (Python)",
    "Constraint-Based",
    "Few-Shot",
];

// --- Sub-component for Accordion View ---
const ExampleItem = ({ example, onRemove }: { example: Example, onRemove: () => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-100 rounded">
            <div
                className="flex items-center gap-2 p-2 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <p className="flex-1 text-sm truncate"><strong>In:</strong> {example.input}</p>
                <p className="flex-1 text-sm truncate"><strong>Out:</strong> {example.output}</p>
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="bg-red-500 text-white px-2 py-1 rounded text-xs z-10">X</button>
                <ChevronDownIcon className={`h-5 w-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            <Transition
                show={isExpanded}
                enter="transition-all ease-in-out duration-300"
                enterFrom="max-h-0 opacity-0"
                enterTo="max-h-96 opacity-100"
                leave="transition-all ease-in-out duration-200"
                leaveFrom="max-h-96 opacity-100"
                leaveTo="max-h-0 opacity-0"
            >
                <div className="p-4 border-t border-gray-200 space-y-2 overflow-hidden">
                    <div>
                        <label className="text-xs font-semibold text-gray-600">Full Input</label>
                        <pre className="text-sm bg-white p-2 rounded border whitespace-pre-wrap break-words">{example.input}</pre>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600">Full Output</label>
                        <pre className="text-sm bg-white p-2 rounded border whitespace-pre-wrap break-words">{example.output}</pre>
                    </div>
                </div>
            </Transition>
        </div>
    );
};


// --- Main Component ---
function AnalyzeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createPrompt } = usePrompts();

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isGeneratingExample, setIsGeneratingExample] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTool, setActiveTool] = useState<'simple' | 'optimize'>('simple');
    const [promptText, setPromptText] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [examples, setExamples] = useState<Example[]>([]);
    const [currentExample, setCurrentExample] = useState<Example>({ input: '', output: '' });
    const [exampleFocus, setExampleFocus] = useState(APE_FOCUS_TYPES[0]);
    const [output, setOutput] = useState<any | null>(null);
    const [outputType, setOutputType] = useState<'diagnose' | 'breakdown' | 'optimize' | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [promptToSave, setPromptToSave] = useState('');

    useEffect(() => {
        const promptFromUrl = searchParams.get('prompt') || '';
        const toolFromUrl = searchParams.get('tool');
        const decodedPrompt = decodeURIComponent(promptFromUrl);

        setPromptText(decodedPrompt);
        setTaskDescription(decodedPrompt);

        if (toolFromUrl === 'optimize') {
            setActiveTool('optimize');
        }
    }, [searchParams]);

    const handleApiCall = async (endpoint: 'diagnose' | 'breakdown' | 'optimize') => {
        let payload = {};
        const isOptimize = endpoint === 'optimize';

        if (isOptimize) {
            if (!taskDescription) return toast.error("Task description is required for optimization.");
            setIsOptimizing(true);
            payload = { task_description: taskDescription, examples };
        } else {
            if (!promptText) return toast.error("Prompt text is required.");
            setIsAnalyzing(true);
            payload = { prompt_text: promptText };
        }

        setOutput(null);
        setOutputType(endpoint);
        const toastId = toast.loading(`Running ${endpoint}...`);

        try {
            const response = await apiClient.post(`/prompts/${endpoint}`, payload);
            setOutput(response);
            toast.success('Analysis complete!', { id: toastId });
        } catch (err: any) {
            toast.error(err.message || `Failed to run ${endpoint}.`, { id: toastId });
        } finally {
            if (isOptimize) setIsOptimizing(false); else setIsAnalyzing(false);
        }
    };

    const handleGenerateExample = async () => {
        if (!taskDescription) {
            return toast.error("Please provide a task description first.");
        }

        const toastId = toast.loading(`Generating a "${exampleFocus}" example...`);
        setIsGeneratingExample(true);

        let metaPrompt = `Based on the task "${taskDescription}", generate a single, high-quality input/output example for the focus "${exampleFocus}". Return your answer as a single raw JSON object with "input" and "output" keys. The "output" key's value should be a single string.`;
        if (exampleFocus === 'JSON Output') {
            metaPrompt = `Based on the task "${taskDescription}", generate an example of transforming unstructured text into a structured JSON object. The 'output' key's value must be a single string containing valid JSON. Example: {"input": "Error at file.tsx:68", "output": "{\\"errorType\\": \\"TypeError\\", \\"file\\": \\"file.tsx\\"}"}`;
        }

        try {
            const response = await apiClient.post<{ final_text: string }>('/prompts/execute', {
                prompt_text: metaPrompt,
                model: 'gemini-2.5-flash-lite'
            });

            const cleanedText = response.final_text.replace(/```json\n|```/g, '').trim();
            const example = JSON.parse(cleanedText);

            if (!example || !example.input || !example.output) {
                throw new Error("AI returned an invalid example structure.");
            }

            let finalOutput = example.output;
            if (typeof finalOutput === 'object') {
                finalOutput = JSON.stringify(finalOutput, null, 2);
            }

            setExamples(prev => [...prev, { input: example.input, output: finalOutput }]);
            toast.success("AI Example added!", { id: toastId });

        } catch (err: any) {
            console.error("Failed to generate or parse AI example:", err);
            toast.error(err.message || "Failed to process AI example.", { id: toastId });
        } finally {
            setIsGeneratingExample(false);
        }
    };

    const handleToolSwitch = (tool: 'simple' | 'optimize') => {
        setActiveTool(tool);
        setOutput(null);
    };

    const handleAddExample = () => {
        if (currentExample.input && currentExample.output) {
            setExamples([...examples, currentExample]);
            setCurrentExample({ input: '', output: '' });
        } else {
            toast.error("Both example input and output are required.");
        }
    };

    const handleOpenSaveModal = (promptContent: string) => {
        setPromptToSave(promptContent);
        setIsSaveModalOpen(true);
    };

    const handlePromptSaved = () => {
        toast.success("Prompt saved successfully!");
        setIsSaveModalOpen(false);
    };

    const handleTestImprovement = (suggestedPrompt: string) => {
        setPromptText(suggestedPrompt);
        // --- THIS IS THE IMPLEMENTATION OF OPTION 1 ---
        toast.success("✅ Suggested prompt loaded into the analysis box!");
    };

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-4 text-center">Prompt Analysis Suite</h1>
                    <div className="flex justify-center bg-gray-800 rounded-lg p-2 gap-2 mb-8">
                        <button onClick={() => handleToolSwitch('simple')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'simple' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Diagnose & Breakdown</button>
                        <button onClick={() => handleToolSwitch('optimize')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'optimize' ? 'bg-green-600' : 'hover:bg-gray-700'}`}>Optimize (APE)</button>
                    </div>

                    <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
                        {activeTool === 'simple' ? (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Simple Analysis</h2>
                                <AutoSizingTextarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={8} />
                                <div className="flex gap-4 justify-center mt-6">
                                    <button onClick={() => handleApiCall('diagnose')} disabled={isAnalyzing || !promptText} className="px-6 py-2 bg-yellow-400 text-black rounded font-semibold disabled:opacity-50">Diagnose</button>
                                    <button onClick={() => handleApiCall('breakdown')} disabled={isAnalyzing || !promptText} className="px-6 py-2 bg-blue-500 text-white rounded font-semibold disabled:opacity-50">Breakdown</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Optimize with APE</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                                        <AutoSizingTextarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} />
                                    </div>
                                    {examples.map((ex, index) => (
                                        <ExampleItem key={index} example={ex} onRemove={() => setExamples(examples.filter((_, i) => i !== index))} />
                                    ))}
                                    <div className="flex flex-col sm:flex-row gap-4 items-end p-4 bg-gray-50 rounded border">
                                        <div className="w-full sm:w-auto">
                                            <label className="text-xs font-semibold text-gray-600">Example Focus</label>
                                            <select value={exampleFocus} onChange={e => setExampleFocus(e.target.value)} className="w-full border p-2 rounded h-11 bg-white">
                                                {APE_FOCUS_TYPES.map(focus => <option key={focus} value={focus}>{focus}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-semibold text-gray-600">Manual Example Input</label>
                                            <AutoSizingTextarea value={currentExample.input} onChange={e => setCurrentExample({ ...currentExample, input: e.target.value })} className="w-full border p-1 rounded" rows={2} />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-semibold text-gray-600">Manual Example Output</label>
                                            <AutoSizingTextarea value={currentExample.output} onChange={e => setCurrentExample({ ...currentExample, output: e.target.value })} className="w-full border p-1 rounded" rows={2} />
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button type="button" onClick={handleAddExample} className="px-4 py-2 bg-gray-600 text-white rounded w-full sm:w-auto">Add</button>
                                            <button type="button" onClick={handleGenerateExample} disabled={isGeneratingExample} className="px-4 py-2 bg-sky-600 text-white rounded flex items-center justify-center gap-2 w-full sm:w-auto">
                                                <SparklesIcon className="h-5 w-5" /> AI
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleApiCall('optimize')} disabled={isOptimizing || isGeneratingExample || !taskDescription} className="w-full mt-6 py-3 bg-green-500 text-white rounded font-semibold disabled:opacity-50">Optimize Prompt</button>
                            </div>
                        )}
                    </div>

                    {output && (
                        <div className="mt-8">
                            {outputType === 'diagnose' && <DiagnoseResult data={output as DiagnoseResponse} onTestImprovement={handleTestImprovement} />}
                            {outputType === 'breakdown' && <BreakdownResult data={output as BreakdownResponse} />}
                            {outputType === 'optimize' && (
                                <div className="p-6 bg-gray-800 rounded-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-green-400">Optimization Result</h3>
                                    <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md mb-4">{output.optimized_prompt}</pre>
                                    <button onClick={() => handleOpenSaveModal(output.optimized_prompt)} className="px-4 py-2 rounded-md font-semibold bg-blue-600">Save as Prompt...</button>
                                </div>
                            )}
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

const AnalyzePage = () => (
    <Suspense fallback={<div className="text-center p-8 bg-gray-900 text-white">Loading...</div>}>
        <AnalyzeContent />
    </Suspense>
);

export default AnalyzePage;