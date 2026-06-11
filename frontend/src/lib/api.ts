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
  let envUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl;
  if (Platform.OS === 'web' && envUrl?.includes('10.0.2.2')) {
    envUrl = envUrl.replace('10.0.2.2', 'localhost');
  }
  if (envUrl) {
    return envUrl;
  }
  return 'http://localhost:3000';
};

const baseURL = getBaseUrl();

console.log('[Gemi] API base URL:', baseURL);

const isDevelopment =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

function inferFeatureName(url?: string) {
  if (!url) return 'unknown';
  if (url.includes('/api/diet') || url.includes('/api/foods')) return 'food';
  if (url.includes('/api/workouts')) return 'workout';
  if (url.includes('/api/routines')) return 'routine';
  if (url.includes('/api/daily')) return 'daily';
  if (url.includes('/api/progress')) return 'progress';
  return 'unknown';
}

function valueShape(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return 'null';
  return typeof value;
}

function payloadShape(data: unknown) {
  if (!data) return null;

  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return { type: 'string', length: data.length };
    }
  }

  if (Array.isArray(parsed)) {
    return { type: 'array', length: parsed.length };
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        valueShape(value),
      ])
    );
  }

  return { type: typeof parsed };
}

function responseSummary(data: unknown) {
  if (typeof data === 'string') {
    return { type: 'string', length: data.length, preview: data.slice(0, 160) };
  }

  if (Array.isArray(data)) {
    return { type: 'array', length: data.length };
  }

  if (typeof data === 'object' && data !== null) {
    const body = data as Record<string, unknown>;
    return {
      keys: Object.keys(body),
      error: typeof body.error === 'string' ? body.error : undefined,
      code: typeof body.code === 'string' ? body.code : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
      detailsShape: payloadShape(body.details),
    };
  }

  return data == null ? null : { type: typeof data };
}

function hasHeader(headers: unknown, name: string) {
  if (!headers || typeof headers !== 'object') return false;

  const maybeGetter = (headers as { get?: (key: string) => unknown }).get;
  if (typeof maybeGetter === 'function') {
    return !!maybeGetter.call(headers, name);
  }

  return Object.keys(headers as Record<string, unknown>).some(
    (key) => key.toLowerCase() === name.toLowerCase()
  );
}

function logApiFailureDiagnostic(error: any) {
  if (!isDevelopment) return;

  const state = useAuthStore.getState();
  const config = error.config ?? {};
  const method = String(config.method ?? 'GET').toUpperCase();
  const endpoint = config.url ?? 'unknown';
  const tokenLength = state.session?.access_token?.length ?? 0;

  console.log('[Gemi] API sync diagnostic', {
    featureName: inferFeatureName(endpoint),
    method,
    endpoint,
    baseURL,
    httpStatus: error.response?.status ?? null,
    responseBody: responseSummary(error.response?.data),
    errorCode: error.code,
    errorMessage: error.message,
    requestPayloadShape: payloadShape(config.data),
    hasAuthorizationHeader: hasHeader(config.headers, 'Authorization'),
    hasAuthToken: tokenLength > 0,
    authTokenLength: tokenLength,
    currentUserIdExists: !!state.user?.id,
  });
}

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
    logApiFailureDiagnostic(error);

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
