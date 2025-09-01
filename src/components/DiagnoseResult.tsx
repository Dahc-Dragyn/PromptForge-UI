// src/components/DiagnoseResult.tsx
'use client';

interface DiagnoseData {
  overall_score: number;
  criteria?: { [key: string]: number };
  suggested_prompt?: string;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-500';
  if (score >= 5) return 'text-yellow-500';
  return 'text-red-500';
};

const DiagnoseResult = ({ data }: { data: DiagnoseData }) => {
  const score = data.overall_score.toFixed(1);

  return (
    <div className="p-6 border rounded-lg bg-gray-800 border-gray-700">
      <h3 className="text-xl font-semibold mb-6 text-center text-white">Diagnosis Report</h3>
      
      <div className="text-center mb-6">
        <p className="text-gray-400 text-sm font-medium">Overall Quality Score</p>
        <p className={`text-6xl font-bold ${getScoreColor(data.overall_score)}`}>
          {score}
          <span className="text-3xl text-gray-400">/10</span>
        </p>
      </div>

      {data.criteria && (
        <div className="mb-6">
          <h4 className="font-semibold text-yellow-400 mb-2">Score Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(data.criteria).map(([criterion, critScore]) => (
              <div key={criterion} className="p-3 bg-gray-900 rounded-md">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-white capitalize">{criterion}</p>
                  <p className={`font-bold text-lg ${getScoreColor(critScore)}`}>
                    {critScore.toFixed(1)}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-green-400 mb-2">Suggested Improvement</h4>
        <div className="text-gray-200 bg-gray-900 p-4 rounded-md text-sm">
          {data.suggested_prompt ? (
            <pre className="whitespace-pre-wrap font-sans">{data.suggested_prompt}</pre>
          ) : (
            <p className="text-gray-400 italic">No specific improvement suggested for this prompt.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnoseResult;