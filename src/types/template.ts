export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  version: number;
  is_archived: boolean; // <-- ADD THIS LINE
}