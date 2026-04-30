import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography } from '../utils/theme';

export default function ProfileScreen() {
  const { auth, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    Alert.alert('Logged out', 'Session cleared successfully.');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>My Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{auth?.name || 'N/A'}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{String(auth?.role || '').toUpperCase()}</Text>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{auth?.userId || 'N/A'}</Text>
      </View>
      <AppButton label="Logout" onPress={onLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  heading: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs
  },
  value: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  }
});
