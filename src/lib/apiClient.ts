// src/lib/apiClient.ts
import { auth } from '@/lib/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User is not authenticated. Cannot make API calls.');
    }

    const token = await user.getIdToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = { ...options, headers };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
            // --- FIX: Check for FastAPI 422 validation error structure ---
            if (response.status === 422 && errorData.detail && Array.isArray(errorData.detail)) {
                const messages = errorData.detail.map((err: any) => 
                    `${err.loc[err.loc.length - 1]}: ${err.msg}`
                ).join('\n');
                throw new Error(messages);
            }
        } catch (e) {
            // If parsing fails or it's not a 422, use the original error or a fallback
            if (e instanceof Error) throw e;
            errorData = { detail: response.statusText || 'An API error occurred' };
        }
        throw new Error(errorData.detail);
    }

    const responseText = await response.text();
    if (!responseText) {
        return null;
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse JSON response:", responseText);
        throw new Error('Received a malformed response from the server.');
    }
}

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