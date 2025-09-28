// src/types/prompt.ts
export interface PromptVersion {
  id: string;
  version_number: number;
  prompt_text: string;
  commit_message?: string;
  created_at: string;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  // ADDED: Include rating data directly in the prompt object
  average_rating?: number;
  rating_count?: number;
}

// This type is used by the recent activity widget
export interface ActivityItem {
  id: string;
  prompt_id: string;
  prompt_name: string;
  version_number: number;
  user_name: string;
  event_type: 'creation' | 'update' | 'execution';
  timestamp: string;
}