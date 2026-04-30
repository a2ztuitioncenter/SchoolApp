import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import LoadingState from '../components/LoadingState';
import ErrorBanner from '../components/ErrorBanner';
import { studentService } from '../services/studentService';
import { colors, spacing, typography } from '../utils/theme';

export default function AssignmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      const result = await studentService.getAssignments();
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Unable to load assignments');
        return;
      }
      const list = Array.isArray(result.data?.assignments) ? result.data.assignments : result.data || [];
      setAssignments(Array.isArray(list) ? list : []);
    };
    loadAssignments();
  }, []);

  const uploadForAssignment = async (assignmentId) => {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled) return;
    const file = picked.assets[0];
    const formData = new FormData();
    formData.append('assignmentId', assignmentId);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream'
    });

    const result = await studentService.submitAssignment(formData);
    if (!result.success) {
      Alert.alert('Upload failed', result.error || 'Submission failed.');
      return;
    }
    Alert.alert('Success', 'Assignment submitted successfully.');
  };

  if (loading) return <LoadingState label="Loading assignments..." />;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Assignments</Text>
      <ErrorBanner message={error} />
      <FlatList
        data={assignments}
        scrollEnabled={false}
        keyExtractor={(item, idx) => String(item.id || item._id || idx)}
        ListEmptyComponent={<Text style={styles.empty}>No active assignments.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title || item.topic || 'Assignment'}</Text>
            <Text style={styles.meta}>Due: {item.dueDate || item.deadline || 'N/A'}</Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => uploadForAssignment(item.id || item._id)}
            >
              <Text style={styles.uploadText}>Upload Submission</Text>
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
  title: { color: colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.textSecondary, marginBottom: spacing.sm },
  uploadBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  uploadText: { color: '#fff', fontWeight: '600' },
  empty: { color: colors.textSecondary }
});
