import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import InfoCard from '../components/InfoCard';
import LoadingState from '../components/LoadingState';
import ErrorBanner from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { studentService } from '../services/studentService';
import { teacherService } from '../services/teacherService';
import { adminService } from '../services/adminService';
import { colors, spacing, typography } from '../utils/theme';

export default function DashboardScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const loadDashboard = useCallback(async () => {
    if (!auth?.role) return;
    setLoading(true);
    setError('');

    const serviceByRole = {
      student: studentService.getDashboard,
      teacher: teacherService.getDashboard,
      admin: adminService.getDashboardSummary
    };

    const result = await serviceByRole[auth.role]();
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to load dashboard.');
      return;
    }
    setSummary(result.data || {});
  }, [auth?.role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <LoadingState label="Loading dashboard..." />;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome, {auth?.name || auth?.role}</Text>
      <Text style={styles.subheading}>Role: {String(auth?.role || '').toUpperCase()}</Text>
      <ErrorBanner message={error} />

      <InfoCard title="Primary KPI" value={summary?.total || summary?.count || 'N/A'} />
      <InfoCard title="Active Session" value={auth?.userId || 'Unknown'} caption="Persisted using AsyncStorage" />
      <InfoCard title="Backend" value="Render Connected" caption="All data via hosted API" />
      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.md
  },
  heading: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.textPrimary
  },
  subheading: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    color: colors.textSecondary
  },
  footerSpace: {
    height: spacing.xl
  }
});
