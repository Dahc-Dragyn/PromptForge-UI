// src/lib/apiClient.ts
import axios, { AxiosInstance } from 'axios';
import { auth } from './firebase';

// --- AXIOS INSTANCE 1: PRIVATE (Used for all authenticated requests) ---
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- AXIOS INSTANCE 2: PUBLIC (Bypasses auth interceptor for unauthenticated data) ---
const publicClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


/**
 * This function returns a promise that resolves
 * only when Firebase has a confirmed user, ensuring we always have a valid token.
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

// --- PRIVATE CLIENT INTERCEPTORS (Applies to apiClient only) ---
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

// --- RESPONSE INTERCEPTORS (Applied to BOTH clients for unified handling) ---

// This interceptor handles data return and is applied to both private and public clients.
const responseInterceptor = (response: any) => response.data;

// This interceptor handles error messages and is applied to both.
const errorInterceptor = (error: any) => {
    const errorMessage = error.response?.data?.detail || error.message;
    console.error('API Error:', errorMessage);
    return Promise.reject(error);
};

// Apply unified response interceptors to both private and public clients
apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
publicClient.interceptors.response.use(responseInterceptor, errorInterceptor);


/**
 * Public helper function for fast, unauthenticated GET requests.
 * Use this for pages that should be indexed by search engines and AI crawlers.
 * @param url The API endpoint (e.g., /public-prompts).
 */
const publicApiGet = <T>(url: string): Promise<T> => {
    return publicClient.get<T>(url);
};

export { apiClient, publicApiGet };