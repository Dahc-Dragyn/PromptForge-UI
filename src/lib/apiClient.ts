// src/lib/apiClient.ts
import { auth } from '@/lib/firebase'; // CORRECT: Import the auth object directly

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * A wrapper for the standard fetch function that automatically handles
 * authentication and error handling for the PromptForge API.
 *
 * @param endpoint - The API endpoint to call (e.g., '/prompts').
 * @param options - Standard fetch options (method, headers, body, etc.).
 * @returns The JSON response from the API.
 * @throws {Error} If the network response is not ok, if the user is not authenticated, or if parsing fails.
 */
async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const user = auth.currentUser;
    if (!user) {
        // This will be caught by the calling component's try/catch block
        throw new Error('User is not authenticated. Cannot make API calls.');
    }

    const token = await user.getIdToken();

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    // Set Content-Type only if it's not already set and the body is not FormData
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: response.statusText || 'An API error occurred' };
        }
        throw new Error(errorData.detail);
    }

    // Handle empty response bodies (like 204 No Content) to prevent JSON parsing errors
    const responseText = await response.text();
    if (!responseText) {
        return null;
    }

    // If we have text, try to parse it
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error('Received a malformed response from the server.');
    }
}

// --- Public API Client Methods ---

export const apiClient = {
    get: <T,>(endpoint: string): Promise<T> => authenticatedFetch(endpoint, { method: 'GET' }),
    
    post: <T,>(endpoint: string, body: any): Promise<T> => {
        const isFormData = body instanceof FormData;
        return authenticatedFetch(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body),
        });
    },

    patch: <T,>(endpoint: string, body: any): Promise<T> => {
        const isFormData = body instanceof FormData;
        return authenticatedFetch(endpoint, {
            method: 'PATCH',
            body: isFormData ? body : JSON.stringify(body),
        });
    },

    del: <T,>(endpoint:string): Promise<T> => authenticatedFetch(endpoint, { method: 'DELETE' }),
};