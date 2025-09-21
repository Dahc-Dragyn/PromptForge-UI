// src/components/DiagnoseResult.tsx
import React from 'react';
import { CheckCircleIcon, XCircleIcon, BeakerIcon } from '@heroicons/react/24/solid';

type DiagnoseData = {
  overall_score: number | string;
  diagnosis: string;
  key_issues: string[];
  suggested_prompt: string;
  criteria: {
    [key: string]: boolean;
  };
};

interface DiagnoseResultProps {
  data: DiagnoseData;
  // --- ACTION: Add a callback prop for the new "Test Improvement" button ---
  onTestImprovement: (suggestedPrompt: string) => void;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-400';
  if (score >= 5) return 'text-yellow-400';
  return 'text-red-400';
};

const DiagnoseResult: React.FC<DiagnoseResultProps> = ({ data, onTestImprovement }) => {
  if (!data || !data.criteria) {
    return <div className="p-6 text-center text-gray-400">Invalid diagnosis data received.</div>;
  }

  const criteriaEntries = Object.entries(data.criteria);
  const overallScoreNum = parseFloat(data.overall_score as any) || 0;

  return (
    <div className="p-6 border rounded-lg bg-gray-800 border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-white">Diagnosis Report</h3>
      
      <div className="mb-6 text-center bg-gray-900 p-4 rounded-lg">
        <p className="text-gray-400 text-sm font-semibold">OVERALL SCORE</p>
        <p className={`text-5xl font-bold ${getScoreColor(overallScoreNum)}`}>
          {overallScoreNum.toFixed(1)}<span className="text-2xl text-gray-500">/10</span>
        </p>
        <p className="text-gray-300 mt-2">{data.diagnosis}</p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-yellow-400">Criteria Checklist</h4>
        {criteriaEntries.map(([criterion, passed]) => (
          <div key={criterion} className="flex items-center p-3 bg-gray-900/50 rounded-lg">
            {passed ? (
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
            )}
            <span className="font-medium text-white capitalize">{criterion.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      {data.suggested_prompt && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-green-400">Suggested Improvement</h4>
            {/* --- ACTION: Add the "Test Improvement" button --- */}
            <button
              onClick={() => onTestImprovement(data.suggested_prompt)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold text-sm transition-colors"
            >
              <BeakerIcon className="h-5 w-5" />
              Test Improvement
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-gray-200 bg-gray-900 p-4 rounded-md text-sm font-sans">
            {data.suggested_prompt}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DiagnoseResult;