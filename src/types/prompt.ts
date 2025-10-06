// src/types/prompt.ts
export interface Prompt {
  id: string;
  name: string;
  task_description: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  latest_version_number?: number; // Renamed from latest_version to match API response
  // Aggregate fields from the API
  average_rating?: number;
  rating_count?: number;
  execution_count?: number;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  prompt_text: string;
  created_at: string;
  commit_message?: string; // Added to fix error on prompt detail page
}

// This type is used by the recent activity widget.
export interface ActivityItem {
  id: string;
  prompt_id: string;
  prompt_name: string;
  action: string; 
  timestamp: string;
}

// Type for the /prompts/{id}/breakdown endpoint
export interface BreakdownResponse {
  components: {
    type: string;
    content: string;
    explanation: string;
  }[];
}

// Type for the /prompts/{id}/diagnose endpoint
export interface DiagnoseResponse {
  overall_score: number | string;
  diagnosis: string;
  key_issues: string[];
  suggested_prompt: string;
  criteria: {
    [key: string]: boolean;
  };
}