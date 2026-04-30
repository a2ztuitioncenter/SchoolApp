import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { studentService } from '../../services/studentService';
import LoadingState from '../../components/LoadingState';
import { colors, spacing, typography } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function StudentHomeScreen({ navigation }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!auth?.userId) return;
    try {
      const result = await studentService.getDashboard(auth.userId);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard');
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

  if (loading) return <LoadingState label="Loading your dashboard..." />;

  const latestHomework = data?.homework?.[0];
  const latestDPP = data?.dailyPractice?.[0];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hello,</Text>
          <Text style={styles.name}>{data?.profile?.name || auth?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
           <View style={styles.avatarCircle}>
             <Text style={styles.avatarInitial}>{(data?.profile?.name || auth?.name || 'S')[0]}</Text>
           </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>Stay Ahead!</Text>
          <Text style={styles.promoDesc}>Check your latest homework and practice problems below.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#4e73df" />
            <Text style={styles.statLabel}>Attendance</Text>
            <Text style={styles.statValue}>{data?.attendance?.percentage || 0}%</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={24} color="#1cc88a" />
            <Text style={styles.statLabel}>Pending Fees</Text>
            <Text style={styles.statValue}>₹{data?.fees?.totalPending || 0}</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Latest Tasks</Text>
        <TouchableOpacity 
          style={[styles.taskCard, { borderLeftColor: '#4e73df' }]}
          onPress={() => navigation.navigate('Assignments')}
        >
          <View style={styles.taskIcon}>
            <Ionicons name="book" size={24} color="#4e73df" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskType}>HOMEWORK</Text>
            <Text style={styles.taskTitle}>{latestHomework?.title || 'No homework assigned'}</Text>
            <Text style={styles.taskMeta}>Due: {latestHomework?.dueDate ? new Date(latestHomework.dueDate).toLocaleDateString() : '--'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.taskCard, { borderLeftColor: '#1cc88a' }]}
          onPress={() => navigation.navigate('Practice')}
        >
          <View style={styles.taskIcon}>
            <Ionicons name="create" size={24} color="#1cc88a" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskType}>DPP</Text>
            <Text style={styles.taskTitle}>{latestDPP?.title || 'No practice problems'}</Text>
            <Text style={styles.taskMeta}>Posted: {latestDPP?.createdAt ? new Date(latestDPP.createdAt).toLocaleDateString() : '--'}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
           <QuickItem icon="calendar-outline" label="Timetable" onPress={() => navigation.navigate('Timetable')} />
           <QuickItem icon="list-outline" label="Syllabus" onPress={() => navigation.navigate('Syllabus')} />
           <QuickItem icon="notifications-outline" label="Alerts" onPress={() => {}} />
           <QuickItem icon="stats-chart-outline" label="Results" onPress={() => navigation.navigate('Results')} />
        </View>
      </View>
    </ScrollView>
  );
}

function QuickItem({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={24} color="#4e73df" />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcome: {
    fontSize: 16,
    color: '#6c757d',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
  },
  avatarCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4e73df',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  promoCard: {
    backgroundColor: '#4e73df',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  promoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  promoDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  taskInfo: {
    flex: 1,
  },
  taskType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6c757d',
    letterSpacing: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginVertical: 2,
  },
  taskMeta: {
    fontSize: 12,
    color: '#adb5bd',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 15,
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickLabel: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
});
