import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useCheckSession } from '@/lib/api';

export default function AuthenticatedLayout() {
  const router = useRouter();
  const { data: session, isLoading } = useCheckSession();

  useEffect(() => {
    if (!isLoading) {
      if (session?.authenticated) {
        router.replace('/(app)/todos');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [session?.authenticated, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
