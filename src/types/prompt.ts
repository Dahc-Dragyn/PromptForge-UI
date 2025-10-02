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

// --- FIX: Add and export the missing type definitions ---
export interface BreakdownResponse {
  components: {
      type: string;
      content: string;
      explanation: string;
  }[];
}

export interface DiagnoseResponse {
  overall_score: number | string;
  diagnosis: string;
  key_issues: string[];
  suggested_prompt: string;
  criteria: {
      [key: string]: boolean;
  };
}

export interface Prompt {
  id: string;
  name: string;
  task_description: string;
  initial_prompt_text: string;
  created_at: string;
  updated_at: string;
  latest_version: number;
  // Add these fields as they are returned by the API
  average_rating?: number;
  rating_count?: number;
  is_archived: boolean; // This is the new field we need for the archive functionality
}