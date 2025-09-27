// src/types/prompt.ts
export interface PromptVersion {
  id: string;
  version: number;
  text: string;
  model: string;
  temperature: number;
  created_at: string; 
}

export interface Prompt {
  id: string;
  name: string;
  description?: string; // ADDED: This field is now part of the Prompt type
  text: string;
  created_at: string;
  updated_at: string;
  versions?: PromptVersion[];
  tags: string[];
}

export interface ActivityItem {
  id: string;
  name: string;
  type: 'prompt' | 'template';
  timestamp: string; 
}