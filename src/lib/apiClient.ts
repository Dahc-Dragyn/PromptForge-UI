// src/lib/apiClient.ts
import axios from 'axios';
import { auth } from './firebase';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * This is the crucial fix. This function returns a promise that resolves
 * only when Firebase has a confirmed user, ensuring we always have a valid token.
 * This solves the race condition on initial page load.
 */
const getFreshToken = (): Promise<string | null> => {
  return new Promise((resolve) => {
    // If the user is already available, get the token immediately.
    if (auth.currentUser) {
      return auth.currentUser.getIdToken().then(resolve);
    }
    // Otherwise, wait for the authentication state to change.
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Unsubscribe to prevent memory leaks
      if (user) {
        user.getIdToken().then(resolve);
      } else {
        resolve(null);
      }
    });
  });
};

// Axios interceptor to add the token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getFreshToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for unified error handling
apiClient.interceptors.response.use(
  // This is the key: we return response.data directly
  (response) => response.data,
  (error) => {
    // Handle specific errors like 401 Unauthorized, 403 Forbidden, etc.
    const errorMessage = error.response?.data?.detail || error.message;
    console.error('API Error:', errorMessage);
    return Promise.reject(error);
  }
);

export { apiClient };