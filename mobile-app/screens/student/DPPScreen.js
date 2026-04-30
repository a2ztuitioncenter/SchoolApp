import React, { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import LoadingState from '../../components/LoadingState';
import ErrorBanner from '../../components/ErrorBanner';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../utils/theme';

export default function DPPScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dpps, setDpps] = useState([]);
  const [submissions, setSubmissions] = useState({});

  const loadData = useCallback(async () => {
    if (!auth?.userId) return;
    try {
      const [dashRes, subRes] = await Promise.all([
        studentService.getDashboard(auth.userId),
        studentService.getSubmissions(auth.userId)
      ]);

      if (dashRes.success) {
        setDpps(dashRes.data.dailyPractice || []);
      } else {
        setError(dashRes.error || 'Failed to load practice problems');
      }

      if (subRes.success) {
        const subMap = {};
        subRes.data.forEach(s => { subMap[s.homework_id] = s; });
        setSubmissions(subMap);
      }
    } catch (e) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const uploadForDPP = async (dppId) => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ 
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true 
      });
      
      if (picked.canceled) return;
      
      const file = picked.assets[0];
      const formData = new FormData();
      formData.append('homeworkId', dppId); 
      formData.append('studentId', auth.userId);
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream'
      });

      setLoading(true);
      const result = await studentService.submitAssignment(formData);
      setLoading(false);

      if (result.success) {
        Alert.alert('Success', 'Practice work submitted successfully.');
        loadData();
      } else {
        Alert.alert('Upload failed', result.error || 'Submission failed.');
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'An error occurred during upload');
    }
  };

  const renderItem = ({ item }) => {
    const submission = submissions[item.id];
    const isSubmitted = !!submission;
    const isReviewed = submission?.status === 'reviewed';

    let statusText = 'Pending';
    let statusColor = '#6c757d';
    if (isReviewed) {
      statusText = 'Reviewed';
      statusColor = '#1cc88a';
    } else if (isSubmitted) {
      statusText = 'Submitted';
      statusColor = '#f6c23e';
    }

    return (
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.subject}>{item.subject}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={14} color="#6c757d" />
            <Text style={styles.metaText}>Posted: {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          {item.attachmentUrl && (
            <TouchableOpacity style={styles.downloadBtn}>
               <Ionicons name="download-outline" size={16} color="#48bb78" />
               <Text style={[styles.downloadText, { color: '#48bb78' }]}>View DPP</Text>
            </TouchableOpacity>
          )}
        </View>

        {isReviewed && submission.remark && (
          <View style={styles.remarkBox}>
            <Text style={styles.remarkLabel}>Teacher's Remark:</Text>
            <Text style={styles.remarkText}>{submission.remark}</Text>
          </View>
        )}

        {!isSubmitted && (
          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: '#1cc88a' }]} 
            onPress={() => uploadForDPP(item.id)}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Practice</Text>
          </TouchableOpacity>
        )}
        
        {isSubmitted && !isReviewed && (
          <View style={styles.submittedInfo}>
             <Ionicons name="checkmark-circle-outline" size={16} color="#d69e2e" />
             <Text style={styles.submittedText}>Submitted for review</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) return <LoadingState label="Loading practice problems..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.headerTitle}>Daily Practice</Text>
         <Text style={styles.headerSubtitle}>Complete your daily assignments</Text>
      </View>
      <ErrorBanner message={error} />
      <FlatList
        data={dpps}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="create-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No practice problems today</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4e73df',
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 10,
    marginTop: 10,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 5,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  remarkBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f0fff4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#48bb78',
  },
  remarkLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2f855a',
    marginBottom: 2,
  },
  remarkText: {
    fontSize: 13,
    color: '#2f855a',
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 6,
  },
  submittedText: {
    fontSize: 14,
    color: '#d69e2e',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#adb5bd',
    fontSize: 16,
    marginTop: 10,
  }
});
