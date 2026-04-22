import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useCheckSession, useLogout } from '@/lib/api';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session, isLoading } = useCheckSession();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.replace('/(auth)/login');
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{session?.user?.username || 'Unknown'}</Text>
      </View>

      {session?.user?.email && (
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session.user.email}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Account Status</Text>
        <Text style={styles.value}>
          {session?.user?.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <Pressable
        style={[styles.logoutButton, logoutMutation.isPending && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={logoutMutation.isPending}
      >
        {logoutMutation.isPending ? (
          <ActivityIndicator color="#d32f2f" />
        ) : (
          <Text style={styles.logoutText}>Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#eee',
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.disabled,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  value: {
    fontSize: theme.fontSize.base,
    color: theme.colors.secondaryText,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundLight,
    paddingVertical: theme.button.padding,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.base,
    fontWeight: '600',
  },
});
