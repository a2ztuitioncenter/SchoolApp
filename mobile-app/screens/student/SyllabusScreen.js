import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { studentService } from '../../services/studentService';
import LoadingState from '../../components/LoadingState';

export default function SyllabusScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syllabus, setSyllabus] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await studentService.getSyllabus(auth.userId);
      if (res.success) {
        setSyllabus(res.data || []);
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

  const renderSubject = ({ item }) => {
    const isExpanded = expandedSubject === item.subject;
    const completedChapters = item.chapters.filter(c => c.status === 'completed').length;
    const progress = (completedChapters / item.chapters.length) * 100;

    return (
      <View style={styles.subjectCard}>
        <TouchableOpacity 
          style={styles.subjectHeader} 
          onPress={() => setExpandedSubject(isExpanded ? null : item.subject)}
        >
          <View style={styles.headerInfo}>
            <Text style={styles.subjectName}>{item.subject}</Text>
            <Text style={styles.chapterCount}>{item.chapters.length} Chapters • {completedChapters} Completed</Text>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#6c757d" />
        </TouchableOpacity>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        {isExpanded && (
          <View style={styles.chapterList}>
            {item.chapters.map((chapter, idx) => (
              <View key={idx} style={styles.chapterItem}>
                <Ionicons 
                  name={chapter.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={18} 
                  color={chapter.status === 'completed' ? '#1cc88a' : '#dee2e6'} 
                />
                <Text style={[styles.chapterTitle, chapter.status === 'completed' && styles.completedText]}>
                  {chapter.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) return <LoadingState label="Loading syllabus..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Syllabus Tracking</Text>
      </View>

      <FlatList
        data={syllabus}
        renderItem={renderSubject}
        keyExtractor={item => item.subject}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  chapterCount: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#f1f3f5',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4e73df',
  },
  chapterList: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chapterTitle: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 10,
  },
  completedText: {
    color: '#adb5bd',
    textDecorationLine: 'line-through',
  }
});
