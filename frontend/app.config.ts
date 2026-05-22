import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const baseConfig = appJson.expo as ExpoConfig;

export default (): ExpoConfig => ({
  ...baseConfig,
  extra: {
    ...baseConfig.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
