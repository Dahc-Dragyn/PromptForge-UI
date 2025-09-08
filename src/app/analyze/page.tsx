// src/app/analyze/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CopyableOutput from '@/components/CopyableOutput';
import DiagnoseResult from '@/components/DiagnoseResult';
import BreakdownResult from '@/components/BreakdownResult'; 

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts`;

type Example = { input: string; output: string; };

const FOCUS_TYPES = [
  "General Purpose",
  "Persona Adoption",
  "Structured Output (JSON)",
  "Tone & Style",
  "Task Decomposition (Step-by-Step)",
  "Comparative Analysis",
  "Creative Ideation",
  "Scenario Simulation",
];

function AnalyzeContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const defaultExample = { input: 'The server is online.', output: 'Is the server online?' };

  const [activeTool, setActiveTool] = useState<'simple' | 'optimize'>('simple');
  const [promptText, setPromptText] = useState('');
  const [taskDescription, setTaskDescription] = useState('Turn a statement into a question.');
  const [examples, setExamples] = useState<Example[]>([defaultExample]);
  const [currentExample, setCurrentExample] = useState<Example>({ input: '', output: '' });
  
  const [output, setOutput] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyText, setCopyText] = useState('Copy Prompt');
  const [outputType, setOutputType] = useState<'diagnose' | 'breakdown' | 'optimize' | null>(null);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [exampleFocus, setExampleFocus] = useState(FOCUS_TYPES[0]);


  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt');
    const toolFromUrl = searchParams.get('tool');

    if (promptFromUrl) {
      const decodedPrompt = decodeURIComponent(promptFromUrl);
      setPromptText(decodedPrompt);
      setTaskDescription(decodedPrompt);
    }
    
    if (toolFromUrl === 'optimize') {
      setActiveTool('optimize');
    }
  }, [searchParams]);

  const handleToolSwitch = (tool: 'simple' | 'optimize') => {
    if (activeTool === 'simple' && tool === 'optimize') {
      setTaskDescription(promptText);
    } else if (activeTool === 'optimize' && tool === 'simple') {
      setPromptText(taskDescription);
    }
    setActiveTool(tool);
    setOutput(null); 
    setError(null);
  };

  const handleAddExample = () => {
    if (currentExample.input && currentExample.output) {
      setExamples([...examples, currentExample]);
      setCurrentExample({ input: '', output: '' });
    }
  };

  const handleRemoveExample = (indexToRemove: number) => {
    setExamples(examples.filter((_, index) => index !== indexToRemove));
  };
  
  const handleGenerateExample = async () => {
    if (!taskDescription) {
      setError("Please provide a Task Description before generating an example.");
      return;
    }
    setIsGeneratingExample(true);
    setError(null);

    const metaPrompt = `You are an assistant that creates examples for a prompt engineering tool. The user's task is: "${taskDescription}". The user wants to generate an example that specifically focuses on: "${exampleFocus}". Generate a single, high-quality, and concise JSON object with two keys: "input" and "output" that clearly demonstrates this. Do not provide any explanation or text outside of the JSON object.`;

    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ prompt_text: metaPrompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to generate example.');
      
      let jsonString = data.generated_text;
      const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (match && match[1]) {
        jsonString = match[1];
      }
      
      const generatedJson = JSON.parse(jsonString);
      
      // --- FINAL FIX: Stringify BOTH input and output if they are objects ---
      const inputValue = typeof generatedJson.input === 'object' 
        ? JSON.stringify(generatedJson.input, null, 2) 
        : generatedJson.input;
        
      const outputValue = typeof generatedJson.output === 'object' 
        ? JSON.stringify(generatedJson.output, null, 2) 
        : generatedJson.output;

      if (inputValue && outputValue) {
        setCurrentExample({ input: inputValue, output: outputValue });
      } else {
        throw new Error("AI response was not in the expected format.");
      }
    } catch (err: any) {
      setError(`Failed to generate AI example: ${err.message}`);
    } finally {
      setIsGeneratingExample(false);
    }
  };


  const handleApiCall = async (endpoint: 'diagnose' | 'breakdown' | 'optimize', payload: object) => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setCopyText('Copy Prompt');
    setOutputType(endpoint);

    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `API error: ${response.status}`);
      setOutput(data);
    } catch (err: any) {
      setError(`Failed to run ${endpoint}. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptCopy = () => {
    if (output?.optimized_prompt) {
      navigator.clipboard.writeText(output.optimized_prompt).then(() => {
        setCopyText('Copied!');
        setTimeout(() => setCopyText('Copy Prompt'), 2000);
      });
    }
  };

  if (authLoading) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Prompt Analysis Suite</h1>
        <p className="text-gray-400 text-center mb-8">A collection of powerful tools to debug, deconstruct, and improve your prompts.</p>
        
        <div className="flex justify-center bg-gray-800 rounded-lg p-2 gap-2 mb-8">
          <button onClick={() => handleToolSwitch('simple')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'simple' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>Diagnose & Breakdown</button>
          <button onClick={() => handleToolSwitch('optimize')} className={`w-full py-3 rounded-md font-semibold transition-colors ${activeTool === 'optimize' ? 'bg-green-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>Optimize (APE)</button>
        </div>

        <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-2xl">
          {activeTool === 'simple' ? (
            <div>
              <h2 className="text-2xl font-bold mb-2">Diagnose & Breakdown</h2>
              <p className="text-gray-600 mb-6">Use <strong>Diagnose</strong> for a quality score and suggestions, or <strong>Breakdown</strong> to deconstruct a complex prompt.</p>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">Enter Prompt</label>
              <textarea id="prompt" value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={10} />
              <div className="flex gap-4 justify-center mt-6">
                <button onClick={() => handleApiCall('diagnose', { prompt_text: promptText })} disabled={loading || !promptText} className="px-6 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500 disabled:opacity-50 font-semibold">Diagnose</button>
                <button onClick={() => handleApiCall('breakdown', { prompt_text: promptText })} disabled={loading || !promptText} className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-semibold">Breakdown</button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-2">Optimize with APE</h2>
              <p className="text-gray-600 mb-6">
                This tool uses <strong>Automatic Prompt Engineering (APE)</strong>. Provide a clear goal, select an example focus, and let the AI generate examples for you. It will then analyze these examples to reverse-engineer an optimal prompt.
              </p>
              <div className="space-y-4">
                <div>
                    <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                    <textarea id="task_description" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="w-full border rounded p-2 text-black border-gray-300" rows={3} />
                </div>
                <div>
                    <label htmlFor="example-focus" className="block text-sm font-medium text-gray-700 mb-1">Example Focus</label>
                    <select id="example-focus" value={exampleFocus} onChange={(e) => setExampleFocus(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-100 border-gray-300">
                        {FOCUS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
              </div>
              
              <div className="flex justify-between items-center my-4">
                <h3 className="text-lg font-semibold text-gray-800">Provide Examples</h3>
                <button 
                  onClick={handleGenerateExample} 
                  disabled={isGeneratingExample || !taskDescription}
                  className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 font-semibold text-sm"
                >
                  {isGeneratingExample ? 'Generating...' : '✨ Generate AI Example'}
                </button>
              </div>
              <p className="text-xs text-gray-500 -mt-3 mb-3">Examples should be clear and directly represent the task. Provide 2-3 diverse examples for the best results.</p>
              
              {examples.map((ex, index) => (
                <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded border"><p className="flex-1 text-sm"><strong>Input:</strong> {ex.input}</p><p className="flex-1 text-sm"><strong>Output:</strong> {ex.output}</p><button onClick={() => handleRemoveExample(index)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">Remove</button></div>
              ))}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end mt-2 p-4 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Example Input</label>
                    <textarea rows={4} value={currentExample.input} onChange={e => setCurrentExample({...currentExample, input: e.target.value})} className="w-full border rounded p-2 text-black border-gray-300 resize-y" placeholder="e.g., The team exceeded its sales targets." />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Example Output</label>
                    <textarea rows={4} value={currentExample.output} onChange={e => setCurrentExample({...currentExample, output: e.target.value})} className="w-full border rounded p-2 text-black border-gray-300 resize-y" placeholder="e.g., What were the results of the team's sales performance?" />
                </div>
                <button type="button" onClick={handleAddExample} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold">Add Example</button>
              </div>
              <button onClick={() => handleApiCall('optimize', { task_description: taskDescription, examples: examples })} disabled={loading || !taskDescription || examples.length === 0} className="w-full mt-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-semibold text-lg">{loading ? 'Optimizing...' : 'Optimize Prompt'}</button>
            </div>
          )}
        </div>
        
        {error && <p className="mt-6 text-red-400 text-center">{error}</p>}
        {output && (
          <div className="mt-8">
            {outputType === 'optimize' ? (
              <div className="p-6 border rounded-lg bg-gray-800 border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-white">Optimization Result</h3>
                <div className="mb-6"><div className="flex justify-between items-center mb-2"><h4 className="font-semibold text-green-400">Optimized Prompt</h4><button onClick={handlePromptCopy} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${copyText === 'Copied!' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}>{copyText}</button></div><pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md text-sm">{output.optimized_prompt}</pre></div>
                <div><h4 className="font-semibold text-yellow-400 mb-2">Reasoning Summary</h4><p className="text-gray-300 bg-gray-900 p-4 rounded-md text-sm">{output.reasoning_summary}</p></div>
              </div>
            ) : outputType === 'diagnose' ? (
              <DiagnoseResult data={output} />
            ) : outputType === 'breakdown' ? (
              <BreakdownResult data={output} />
            ) : (
              <CopyableOutput title="Analysis Result" content={JSON.stringify(output, null, 2)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const AnalyzePage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <AnalyzeContent />
  </Suspense>
);

export default AnalyzePage;