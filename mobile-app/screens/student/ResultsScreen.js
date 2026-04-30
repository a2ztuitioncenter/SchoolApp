import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { studentService } from '../../services/studentService';
import LoadingState from '../../components/LoadingState';

export default function ResultsScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const res = await studentService.getResults(auth.userId);
      if (res.success) {
        setResults(res.data || []);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.examName}>{item.examName}</Text>
        <Text style={styles.date}>{new Date(item.examDate).toLocaleDateString()}</Text>
      </View>
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Obtained</Text>
          <Text style={styles.scoreValue}>{item.marksObtained}</Text>
        </View>
        <View style={[styles.scoreBox, styles.totalBox]}>
          <Text style={styles.scoreLabel}>Total</Text>
          <Text style={styles.scoreValue}>{item.totalMarks}</Text>
        </View>
        <View style={styles.percentageBox}>
          <Text style={styles.percentageText}>{((item.marksObtained / item.totalMarks) * 100).toFixed(1)}%</Text>
        </View>
      </View>
      <Text style={styles.subjectText}>{item.subject}</Text>
    </View>
  );

  if (loading && !refreshing) return <LoadingState label="Loading results..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Academic Performance</Text>
      </View>

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exam results available yet.</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
    marginBottom: 12,
  },
  examName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  date: {
    fontSize: 12,
    color: '#6c757d',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  totalBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#dee2e6',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e73df',
  },
  percentageBox: {
    width: 60,
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1cc88a',
  },
  subjectText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#adb5bd',
  }
});
