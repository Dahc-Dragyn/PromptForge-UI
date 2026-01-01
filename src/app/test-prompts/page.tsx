'use client';

import { usePrompts } from '@/hooks/usePrompts';

const TestPromptsPage = () => {
  // --- FIX: Pass 'true' to fetch all prompts, including archived ones ---
  const { prompts, isLoading, isError } = usePrompts(true);

  if (isLoading) {
    return <div className="p-8 text-white">Loading prompts...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Prompts Hook Test Page</h1>
      {isError && (
        <div>
          <h2 className="text-red-500">An Error Occurred:</h2>
          <pre className="bg-gray-800 p-4 rounded mt-2">{JSON.stringify(isError, null, 2)}</pre>
        </div>
      )}
      {!isError && (
        <div>
          <h2 className="text-green-500">Success! Data Received from `usePrompts(true)`:</h2>
          <p className="text-gray-400 text-sm mt-2">If the array below is empty, it confirms the API is not returning any prompt records for your user.</p>
          <pre className="bg-gray-800 p-4 rounded mt-2">
            {JSON.stringify(prompts, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPromptsPage;