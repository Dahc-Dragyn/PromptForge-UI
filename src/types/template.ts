// src/types/template.ts
import { Prompt } from './prompt';

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    content: string;
    tags: string[];
    created_at: string;
    version: number;
    is_archived?: boolean;
}

// --- V-- THIS IS THE FIX --V ---
// Add the missing 'Create' type that matches the backend schema.
export interface PromptTemplateCreate {
    name: string;
    description: string;
    content: string;
    tags: string[];
}
// --- ^-- END OF FIX --^ ---