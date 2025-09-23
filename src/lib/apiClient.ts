// src/lib/apiClient.ts
import { auth } from './firebase';

// FIX: Hardcode the correct HTTPS URL to bypass environment variable issues.
// This is a temporary debugging step, but it will solve the Mixed Content errors.
const API_BASE_URL = "https://db4f-24-22-90-227.ngrok-free.app/api/promptforge";

interface RequestOptions extends RequestInit {
  headers?: HeadersInit & {
    Authorization?: string;
  };
}

export const authenticatedFetch = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not authenticated.');
  }

  const token = await user.getIdToken(true);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    } catch {
      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  return response.status === 204 ? null : response.json();
};