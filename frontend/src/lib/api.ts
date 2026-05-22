import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

type ExpoExtra = {
  apiBaseUrl?: string;
};

const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl;

if (!baseURL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().session?.access_token;
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
