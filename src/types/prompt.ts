// src/types/prompt.ts
export interface Prompt {
  id: string;
  name: string;
  task_description: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  latest_version_number?: number; 
  // Aggregate fields from the API
  average_rating?: number;
  rating_count?: number;
  execution_count?: number;
}

// FIX 1: Add PromptVersion back to fix dashboard/page.tsx
export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  prompt_text: string;
  created_at: string;
  commit_message?: string; 
}

// FIX 2: Correctly define ActivityItem to match the properties
// your WORKING RecentActivityWidget.tsx is using.
export interface ActivityItem {
  id: string;
  promptId: string;     // Use camelCase
  promptName: string;   // Use camelCase
  action: string; 
  created_at: string;   // Use snake_case (as seen in your component)
  commit_message?: string;
  version?: number;
}

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