'use client';

import Link from 'next/link';
import { ActivityItem } from '@/types/prompt';

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  loading: boolean;
  isError: any;
}

const RecentActivityWidget = ({ activities, loading, isError }: RecentActivityWidgetProps) => {

  const getEventStyles = (eventType: string) => {
    switch (eventType) {
      case 'creation':
        return 'bg-green-500/20 text-green-300';
      case 'update':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'execution':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) return <div className="bg-gray-800 p-4 rounded-lg">Loading Activity...</div>;
  if (isError) return <div className="bg-gray-800 p-4 rounded-lg text-red-400">Could not load activity.</div>;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
      <ul className="space-y-3">
        {(activities || []).map((activity, index) => (
          // FINAL FIX: Make the key more robust by including the index
          <li key={`${activity.id}-${index}`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-700/50">
            <div>
              <Link href={`/prompts/${activity.prompt_id}`} className="font-semibold text-indigo-400 hover:underline">
                {activity.prompt_name}
              </Link>
              <span className="text-gray-400 ml-2">v{activity.version_number}</span>
              <p className="text-xs text-gray-500">by {activity.user_name}</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventStyles(activity.event_type)}`}>
                {activity.event_type}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivityWidget;