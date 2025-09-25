// src/types/prompt.ts
export interface Prompt {
    id: string;
    name: string;
    task_description: string;
    created_at: string; // ISO 8601 date string
    updated_at: string; // ISO 8601 date string
    average_rating?: number;
    execution_count?: number;
    // This will hold the text of the latest version for display purposes
    latest_version_text?: string;
  }
  
  export interface PromptVersion {
    id: string;
    prompt_id: string;
    prompt_text: string;
    commit_message: string | null;
    created_at: string; // ISO 8601 date string
    version_number: number;
  }