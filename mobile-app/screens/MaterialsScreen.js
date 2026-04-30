import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingState from '../components/LoadingState';
import ErrorBanner from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { studentService } from '../services/studentService';
import { teacherService } from '../services/teacherService';
import { colors, spacing, typography } from '../utils/theme';

export default function MaterialsScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    const loadMaterials = async () => {
      setLoading(true);
      const service = auth?.role === 'teacher' ? teacherService.getMaterials : studentService.getMaterials;
      const result = await service();
      setLoading(false);

      if (!result.success) {
        setError(result.error || 'Failed to load materials');
        return;
      }
      const list = Array.isArray(result.data?.materials) ? result.data.materials : result.data || [];
      setMaterials(Array.isArray(list) ? list : []);
    };
    loadMaterials();
  }, [auth?.role]);

  if (loading) return <LoadingState label="Loading materials..." />;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Study Materials</Text>
      <ErrorBanner message={error} />
      <FlatList
        data={materials}
        keyExtractor={(item, idx) => String(item.id || item._id || idx)}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>No materials found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title || 'Untitled Material'}</Text>
            <Text style={styles.meta}>{item.subject || 'General'} · {item.classLevel || '--'}</Text>
            <TouchableOpacity style={styles.btn}>
              <Text style={styles.btnText}>Available in backend download API</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  heading: { fontSize: typography.subtitle, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  title: { color: colors.textPrimary, fontWeight: '600', marginBottom: 4 },
  meta: { color: colors.textSecondary, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.primarySoft, borderRadius: 8, padding: spacing.sm },
  btnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textSecondary }
});
