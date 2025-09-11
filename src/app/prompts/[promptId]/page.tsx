'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import RatingModal from '@/components/RatingModal';
import NewVersionForm from '@/components/NewVersionForm';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { BeakerIcon, DocumentMagnifyingGlassIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface Version {
  version: number;
  prompt_text: string;
  commit_message: string;
  created_at: string;
}

interface PromptDetails {
  id: string;
  name: string;
  task_description: string;
  created_at: string;
}

const PromptDetailPage = () => {
  const { user } = useAuth();
  const params = useParams();
  const promptId = params.promptId as string;

  const [prompt, setPrompt] = useState<PromptDetails | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [versionToRate, setVersionToRate] = useState<Version | null>(null);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [copiedVersion, setCopiedVersion] = useState<number | null>(null);

  const [selectedVersions, setSelectedVersions] = useState<Version[]>([]);

  const fetchPromptAndVersions = async () => {
    try {
      const [promptRes, versionsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
      ]);

      if (!promptRes.ok) throw new Error('Failed to fetch prompt details.');
      if (!versionsRes.ok) throw new Error('Failed to fetch prompt versions.');

      const promptData = await promptRes.json();
      const versionsData = await versionsRes.json();
      
      setPrompt(promptData);
      setVersions(versionsData.sort((a: Version, b: Version) => b.version - a.version));
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promptId) {
      setLoading(true);
      fetchPromptAndVersions();
    }
  }, [promptId]);

  const handleCopyText = (text: string, versionNum: number) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Version ${versionNum} copied to clipboard!`);
      setCopiedVersion(versionNum);
      setTimeout(() => setCopiedVersion(null), 2000);
    });
  };

  const handleOpenRatingModal = (version: Version) => {
    setVersionToRate(version);
    setIsRatingModalOpen(true);
  };

  const handleVersionSelect = (version: Version, isChecked: boolean) => {
    let newSelection: Version[];
  
    if (isChecked) {
      newSelection = [...selectedVersions, version].slice(-2);
    } else {
      newSelection = selectedVersions.filter(v => v.version !== version.version);
    }
  
    newSelection.sort((a, b) => a.version - b.version);
    setSelectedVersions(newSelection);
  };
  
  const handleNewVersionCreated = () => {
      setIsNewVersionModalOpen(false);
      // Re-fetch data to show the new version without a full page reload
      fetchPromptAndVersions(); 
  };

  if (loading) return <div className="p-8 text-center text-white">Loading prompt history...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;
  if (!prompt) return <div className="p-8 text-center text-white">Prompt not found.</div>;

  return (
    <>
      <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
        <div className="max-w-7xl mx-auto">
          <Link href="/dashboard" className="text-blue-400 hover:underline mb-6 block">&larr; Back to Dashboard</Link>
          
          <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h1 className="text-3xl font-bold">{prompt.name}</h1>
            <p className="text-gray-400 mt-2">{prompt.task_description}</p>
            <p className="text-xs text-gray-500 mt-2">Created on: {new Date(prompt.created_at).toLocaleString()}</p>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Version History</h2>
            <button
              onClick={() => setIsNewVersionModalOpen(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              + Create New Version
            </button>
          </div>

          {selectedVersions.length === 2 && (
            <div className="mb-8 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Comparing v{selectedVersions[0].version} and v{selectedVersions[1].version}</h3>
                    <p className="text-sm text-gray-400">Showing additions in green and deletions in red.</p>
                </div>
                <ReactDiffViewer
                  oldValue={selectedVersions[0].prompt_text}
                  newValue={selectedVersions[1].prompt_text}
                  splitView={true}
                  compareMethod={DiffMethod.WORDS}
                  leftTitle={`Version ${selectedVersions[0].version}`}
                  rightTitle={`Version ${selectedVersions[1].version}`}
                  useDarkTheme={true}
                />
            </div>
          )}

          <div className="space-y-6">
            {versions.map((version) => (
              <div key={version.version} className="bg-gray-800 border border-gray-700 rounded-lg p-5 transition-shadow hover:shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">Version {version.version}</h3>
                    <p className="text-sm text-gray-500">Saved on: {new Date(version.created_at).toLocaleString()}</p>
                    <p className="text-gray-300 mt-2 italic">"{version.commit_message}"</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label htmlFor={`compare-v${version.version}`} className="text-sm text-gray-400">Compare</label>
                    <input
                      id={`compare-v${version.version}`}
                      type="checkbox"
                      checked={selectedVersions.some(v => v.version === version.version)}
                      onChange={(e) => handleVersionSelect(version, e.target.checked)}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-900 rounded-md">
                  <pre className="text-gray-200 whitespace-pre-wrap text-sm font-mono">{version.prompt_text}</pre>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap items-center gap-2">
                  <button onClick={() => handleOpenRatingModal(version)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Test & Rate</button>
                  <button onClick={() => handleCopyText(version.prompt_text, version.version)} className={`px-3 py-1 text-xs rounded transition-colors ${copiedVersion === version.version ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>
                    {copiedVersion === version.version ? 'Copied!' : 'Copy Text'}
                  </button>
                  <div className="flex-grow"></div>
                  <span className="text-xs text-gray-400 mr-2">Use this version in:</span>
                  <Link href={`/sandbox?promptA=${encodeURIComponent(version.prompt_text)}`} className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-600/80 text-gray-200 rounded hover:bg-gray-500/80" title="A/B Test this version">
                    <ScaleIcon className="h-4 w-4" /> Sandbox
                  </Link>
                  <Link href={`/clinic?prompt=${encodeURIComponent(version.prompt_text)}`} className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-600/80 text-gray-200 rounded hover:bg-gray-500/80" title="Send this version to the Clinic">
                    <BeakerIcon className="h-4 w-4" /> Clinic
                  </Link>
                  <Link href={`/analyze?prompt=${encodeURIComponent(version.prompt_text)}`} className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-600/80 text-gray-200 rounded hover:bg-gray-500/80" title="Analyze this version">
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" /> Analyze
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        promptId={promptId}
        version={versionToRate} 
        userId={user?.uid}
      />

      <Modal isOpen={isNewVersionModalOpen} onClose={() => setIsNewVersionModalOpen(false)} title="Create New Version">
        {/* --- FIX: Renamed 'onSuccess' to 'onVersionCreated' to match the component's props --- */}
        <NewVersionForm
          promptId={promptId}
          onVersionCreated={handleNewVersionCreated}
        />
      </Modal>
    </>
  );
};

export default PromptDetailPage;