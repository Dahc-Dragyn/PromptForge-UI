// src/app/prompts/[promptId]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import NewVersionForm from '@/components/NewVersionForm'; // <-- Import our new form

const PromptVersionsPage = () => {
  const params = useParams();
  const { promptId } = params as { promptId: string };

  const [prompt, setPrompt] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedVersion, setCopiedVersion] = useState<number | null>(null);
  
  // --- Refactor fetchData into a useCallback so we can call it manually ---
  const fetchData = useCallback(async () => {
    // Don't show the main loading spinner on refetch, just update the data
    setError(null);
    try {
      const promptDetailsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`;
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const headers = { 'ngrok-skip-browser-warning': 'true' };

      const [promptRes, versionsRes] = await Promise.all([
        fetch(promptDetailsUrl, { headers }),
        fetch(versionsUrl, { headers }),
      ]);

      if (!promptRes.ok || !versionsRes.ok) {
        throw new Error('Failed to fetch prompt data.');
      }

      const promptData = await promptRes.json();
      const versionsData = await versionsRes.json();

      setPrompt(promptData);
      setVersions(versionsData.sort((a: any, b: any) => b.version - a.version));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [promptId]);
  
  useEffect(() => {
    if (promptId) {
      fetchData();
    }
  }, [promptId, fetchData]);

  const handleCopy = (text: string, version: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVersion(version);
      setTimeout(() => setCopiedVersion(null), 2000);
    });
  };

  if (loading) {
    return <div className="text-center p-8">Loading versions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-400">Error: {error}</div>;
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-blue-400 hover:underline mb-6 block">
          &larr; Back to Dashboard
        </Link>

        {prompt && (
          <div className="mb-8">
            <h1 className="text-4xl font-bold">{prompt.name}</h1>
            <p className="text-gray-400 mt-2">{prompt.task_description}</p>
            <p className="text-gray-500 font-mono mt-1 text-xs">ID: {promptId}</p>
          </div>
        )}

        {/* --- Add the new form to the page --- */}
        <NewVersionForm promptId={promptId} onVersionCreated={fetchData} />

        <h2 className="text-2xl font-bold mb-4">Version History</h2>
        <div className="space-y-6">
          {versions.map((version) => (
            <div key={version.version} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-green-400">Version {version.version}</h3>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => handleCopy(version.prompt_text, version.version)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    copiedVersion === version.version
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                >
                  {copiedVersion === version.version ? 'Copied!' : 'Copy Text'}
                </button>
              </div>

              {version.commit_message && (
                <div className="mb-4 p-3 bg-gray-900/50 rounded-md border-l-2 border-yellow-400">
                  <p className="text-sm italic text-gray-300">{version.commit_message}</p>
                </div>
              )}

              <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md text-sm font-sans">
                {version.prompt_text}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptVersionsPage;