// src/components/CopyableOutput.tsx
'use client';

import { useState } from 'react';

type CopyableOutputProps = {
  title: string;
  content: string;
  subtitle?: string;
};

const CopyableOutput = ({ title, content, subtitle }: CopyableOutputProps) => {
  const [copyText, setCopyText] = useState('Copy');

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setCopyText('Failed!');
      setTimeout(() => setCopyText('Copy'), 2000);
    });
  };

  return (
    <div className="mt-8 p-6 border rounded-lg bg-gray-800 border-gray-700 relative">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
            copyText === 'Copied!' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          {copyText}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md text-sm">
        {content}
      </pre>
    </div>
  );
};

export default CopyableOutput;