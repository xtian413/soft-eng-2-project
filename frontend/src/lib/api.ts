import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';

type ExpoExtra = {
  apiBaseUrl?: string;
};

const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;

// --- Android Network Fix ---
// On Android, 'localhost' resolves to the phone itself, NOT the development machine.
// - On the Android Emulator, the host machine is always reachable at 10.0.2.2.
// - On a real Android device, I need to use my machine's LAN IP (e.g. 192.168.1.x).
//   Set EXPO_PUBLIC_API_BASE_URL in .env to override this for real device testing.
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl;
  if (envUrl) {
    return envUrl;
  }
  return 'http://localhost:3000';
};

const baseURL = getBaseUrl();

console.log('[Gemi] API base URL:', baseURL);

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

// Attach the Supabase auth token to every backend request automatically.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().session?.access_token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Surface real error details instead of a generic 'Network Error'.
// Any caller that does not catch will see the full message in the console.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The server responded with a non-2xx status code.
      console.error(
        `[Gemi] API error ${error.response.status} on ${error.config?.url}:`,
        error.response.data
      );
    } else if (error.request) {
      // The request was made but no response arrived — this is the 'Network Error'.
      console.error(
        '[Gemi] Network error — no response received. Check that your backend is running and that ' +
        `EXPO_PUBLIC_API_BASE_URL points to the correct host. Current baseURL: ${baseURL}`,
        error.message
      );
    } else {
      console.error('[Gemi] Axios configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);
