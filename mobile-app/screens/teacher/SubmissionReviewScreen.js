import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { teacherService } from '../../services/teacherService';
import LoadingState from '../../components/LoadingState';
import AppButton from '../../components/AppButton';
import { colors, spacing, typography } from '../../utils/theme';

export default function SubmissionReviewScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    marks: '',
    feedback: ''
  });

  const loadData = useCallback(async () => {
    try {
      const res = await teacherService.getSubmissions(auth.userId);
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const submitReview = async () => {
    if (!selectedSub) return;
    setLoading(true);
    try {
      const res = await teacherService.reviewSubmission(selectedSub.id, {
        marks: reviewForm.marks,
        feedback: reviewForm.feedback,
        teacherId: auth.userId
      });
      if (res.success) {
        Alert.alert('Success', 'Feedback submitted');
        setSelectedSub(null);
        loadData();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit review');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => {
      setSelectedSub(item);
      setReviewForm({ marks: item.marks || '', feedback: item.feedback || '' });
    }}>
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{item.studentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'reviewed' ? '#1cc88a20' : '#f6c23e20' }]}>
           <Text style={[styles.statusText, { color: item.status === 'reviewed' ? '#1cc88a' : '#f6c23e' }]}>
             {item.status?.toUpperCase()}
           </Text>
        </View>
      </View>
      <Text style={styles.hwTitle}>{item.homeworkTitle}</Text>
      <Text style={styles.subDate}>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</Text>
      {item.marks && <Text style={styles.marksText}>Score: {item.marks}</Text>}
    </TouchableOpacity>
  );

  if (loading && !refreshing && !selectedSub) return <LoadingState label="Loading submissions..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Submissions</Text>
        <Text style={styles.headerSubtitle}>Review and grade student work</Text>
      </View>

      <FlatList
        data={submissions}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <Modal visible={!!selectedSub} animationType="slide">
        {selectedSub && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Submission</Text>
              <TouchableOpacity onPress={() => setSelectedSub(null)}>
                <Ionicons name="close" size={24} color="#212529" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Student</Text>
                <Text style={styles.infoValue}>{selectedSub.studentName}</Text>
                
                <Text style={styles.infoLabel}>Assignment</Text>
                <Text style={styles.infoValue}>{selectedSub.homeworkTitle}</Text>
                
                <Text style={styles.infoLabel}>Submitted File</Text>
                <TouchableOpacity style={styles.fileLink}>
                  <Ionicons name="document" size={16} color="#4e73df" />
                  <Text style={styles.fileLinkText}>Open Document</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Marks / Grade</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. 85 or A+"
                  value={reviewForm.marks}
                  onChangeText={v => setReviewForm({...reviewForm, marks: v})}
                />
                
                <Text style={styles.label}>Feedback</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]}
                  placeholder="Great work! Keep it up."
                  multiline
                  numberOfLines={4}
                  value={reviewForm.feedback}
                  onChangeText={v => setReviewForm({...reviewForm, feedback: v})}
                />
              </View>

              <AppButton label="Save Review" onPress={submitReview} disabled={loading} />
            </ScrollView>
          </View>
        )}
      </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  hwTitle: {
    fontSize: 14,
    color: '#495057',
  },
  subDate: {
    fontSize: 12,
    color: '#adb5bd',
    marginTop: 4,
  },
  marksText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1cc88a',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  fileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  fileLinkText: {
    color: '#4e73df',
    marginLeft: 5,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  }
});
