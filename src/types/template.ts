// src/types/template.ts
export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    content: string;
    tags: string[];
    created_at: string; // ISO 8601 date string
    updated_at: string; // ISO 8601 date string
  }