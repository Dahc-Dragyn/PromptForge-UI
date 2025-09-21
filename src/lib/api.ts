// src/lib/api.ts
import { auth } from './firebase';

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not authenticated.');
  }

  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('ngrok-skip-browser-warning', 'true');
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, finalOptions);
};