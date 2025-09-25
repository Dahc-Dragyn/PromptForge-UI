// src/lib/apiClient.ts
import { auth } from '@/lib/firebase'; // CORRECT: Use the path alias for a robust import

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

/**
 * A wrapper for the standard fetch function that automatically handles
 * authentication and error handling for the PromptForge API.
 *
 * @param endpoint - The API endpoint to call (e.g., '/prompts/').
 * @param options - Standard fetch options (method, headers, body, etc.).
 * @returns The JSON response from the API.
 * @throws {Error} If the network response is not ok or if parsing fails.
 */
async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const user = auth.currentUser;
  if (!user) {
    // This should ideally redirect to login or be handled by the UI gracefully.
    throw new Error('User is not authenticated. Cannot make API calls.');
  }

  const token = await user.getIdToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'An unknown API error occurred.' }));
    const errorMessage = errorBody.detail || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// --- Public API Client Methods ---

export const apiClient = {
  get: <T>(endpoint: string): Promise<T> => authenticatedFetch(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: any): Promise<T> => authenticatedFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any): Promise<T> => authenticatedFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(endpoint: string): Promise<T> => authenticatedFetch(endpoint, { method: 'DELETE' }),
};