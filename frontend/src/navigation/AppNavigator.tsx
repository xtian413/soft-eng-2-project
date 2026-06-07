import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthNavigator from '@/navigation/AuthNavigator';
import TabNavigator from '@/navigation/TabNavigator';
import { useAuthStore } from '@/store/authStore';

/** Switches between auth and app stacks based on session state. */
export default function AppNavigator() {
  const { session, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
