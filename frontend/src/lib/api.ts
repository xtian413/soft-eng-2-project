import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

type ExpoExtra = {
  apiBaseUrl?: string;
};

const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl ?? 'http://localhost:3000';

if (!process.env.EXPO_PUBLIC_API_BASE_URL && !extra?.apiBaseUrl) {
  // Non-fatal warning — app renders; API calls will fail gracefully until backend is configured
  console.warn(
    '[Gemi] EXPO_PUBLIC_API_BASE_URL is not set. Using fallback http://localhost:3000.\n' +
    'Backend API calls will not work until the backend is running and the env var is configured.'
  );
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().session?.access_token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});
