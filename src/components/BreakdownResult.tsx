// src/components/BreakdownResult.tsx
'use client';

interface Component {
  type: string;
  content: string;
  explanation: string;
}

interface BreakdownData {
  components: Component[];
}

const getBadgeColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'instruction': return 'bg-green-500 text-white';
    case 'system_role': return 'bg-blue-500 text-white';
    case 'constraints': return 'bg-yellow-500 text-black';
    case 'examples': return 'bg-purple-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const BreakdownResult = ({ data }: { data: BreakdownData }) => {
  if (!data || !data.components) return null;

  return (
    <div className="p-6 border rounded-lg bg-gray-800 border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-center text-white">Prompt Breakdown</h3>
      <div className="space-y-4">
        {data.components.map((component, index) => (
          <div key={index} className="p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center mb-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${getBadgeColor(component.type)}`}>
                {component.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-200 mb-2">{component.content}</p>
            <p className="text-sm text-gray-400 italic border-l-2 border-gray-600 pl-2">
              {component.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakdownResult;