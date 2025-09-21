// src/lib/apiClient.ts
import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface RequestOptions extends RequestInit {
  headers?: HeadersInit & {
    Authorization?: string;
  };
}

const apiClient = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> => {
  // FIX: Get the current user *inside* the function, not at the module level.
  const user = auth.currentUser;
  let token: string | null = null;

  if (user) {
    try {
      // Force refresh the token to ensure it's not expired.
      token = await user.getIdToken(true);
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle cases where the response is not JSON, like a simple text error
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error JSON.' }));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    } else {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
    }
  }

  // Handle 204 No Content response
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export default apiClient;