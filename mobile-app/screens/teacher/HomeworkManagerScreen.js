import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { teacherService } from '../../services/teacherService';
import LoadingState from '../../components/LoadingState';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { colors, spacing, typography } from '../../utils/theme';

export default function HomeworkManagerScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // New Homework Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    classLevel: '',
    section: '',
    dueDate: new Date().toISOString().split('T')[0],
    isDPP: false
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const loadData = useCallback(async () => {
    if (!auth?.userId) return;
    try {
      const [dashRes, classRes] = await Promise.all([
        teacherService.getDashboard(auth.userId),
        teacherService.getAttendanceClasses(auth.userId)
      ]);
      if (dashRes.success) {
        setHomework(dashRes.homework || []);
      }
      if (classRes.success) {
        setClasses(classRes.data || []);
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

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const createHomework = async () => {
    if (!form.title || !form.subject || !form.classLevel) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('subject', form.subject);
    formData.append('classLevel', form.classLevel);
    formData.append('section', form.section || '');
    formData.append('dueDate', form.dueDate);
    formData.append('type', form.isDPP ? 'dpp' : 'homework');
    formData.append('teacherId', auth.userId);

    if (selectedFile) {
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf'
      });
    }

    setLoading(true);
    try {
      const res = await teacherService.createHomework(formData);
      if (res.success) {
        Alert.alert('Success', 'Homework created successfully');
        setShowModal(false);
        loadData();
      } else {
        Alert.alert('Error', res.error || 'Failed to create');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardSubject}>{item.subject}</Text>
        <Text style={styles.cardClass}>Class {item.classLevel}{item.section ? ` (${item.section})` : ''}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      <View style={styles.cardFooter}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'dpp' ? '#1cc88a20' : '#4e73df20' }]}>
           <Text style={[styles.typeBadgeText, { color: item.type === 'dpp' ? '#1cc88a' : '#4e73df' }]}>
             {item.type?.toUpperCase() || 'HOMEWORK'}
           </Text>
        </View>
        <TouchableOpacity style={styles.viewSubmissions}>
           <Text style={styles.viewText}>View Submissions</Text>
           <Ionicons name="chevron-forward" size={14} color="#4e73df" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing && !showModal) return <LoadingState label="Loading..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Homework Manager</Text>
          <Text style={styles.headerSubtitle}>Assign work to your students</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={homework}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <Modal visible={showModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Assignment</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#212529" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <AppInput label="Title" value={form.title} onChangeText={v => setForm({...form, title: v})} />
            <AppInput label="Subject" value={form.subject} onChangeText={v => setForm({...form, subject: v})} />
            
            <Text style={styles.label}>Class Level</Text>
            <View style={styles.chipRow}>
              {classes.map((c, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chip, form.classLevel === c ? styles.chipActive : null]}
                  onPress={() => setForm({...form, classLevel: c})}
                >
                  <Text style={[styles.chipText, form.classLevel === c ? styles.chipTextActive : null]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput label="Section (Optional)" value={form.section} onChangeText={v => setForm({...form, section: v})} />
            <AppInput label="Due Date (YYYY-MM-DD)" value={form.dueDate} onChangeText={v => setForm({...form, dueDate: v})} />
            
            <View style={styles.switchRow}>
              <Text style={styles.label}>Is this a Daily Practice Problem (DPP)?</Text>
              <TouchableOpacity 
                style={[styles.toggle, form.isDPP ? styles.toggleOn : null]}
                onPress={() => setForm({...form, isDPP: !form.isDPP})}
              >
                <View style={[styles.toggleCircle, form.isDPP ? styles.toggleCircleOn : null]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
               <Ionicons name="attach" size={20} color="#6c757d" />
               <Text style={styles.filePickerText}>{selectedFile ? selectedFile.name : 'Attach PDF File'}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
            <AppButton label="Create Assignment" onPress={createHomework} disabled={loading} />
          </ScrollView>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4e73df',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardSubject: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4e73df',
  },
  cardClass: {
    fontSize: 11,
    color: '#6c757d',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  cardMeta: {
    fontSize: 12,
    color: '#adb5bd',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewSubmissions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 12,
    color: '#4e73df',
    fontWeight: '600',
    marginRight: 4,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
    marginTop: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  chipActive: {
    backgroundColor: '#4e73df20',
    borderColor: '#4e73df',
  },
  chipTextActive: {
    color: '#4e73df',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  toggle: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dee2e6',
    padding: 2,
  },
  toggleOn: {
    backgroundColor: '#4e73df',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleCircleOn: {
    transform: [{ translateX: 24 }],
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#adb5bd',
    marginTop: 20,
  },
  filePickerText: {
    color: '#6c757d',
    marginLeft: 8,
    fontSize: 14,
  }
});
