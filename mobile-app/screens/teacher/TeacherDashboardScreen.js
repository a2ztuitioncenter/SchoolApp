import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { teacherService } from '../../services/teacherService';
import LoadingState from '../../components/LoadingState';
import { colors, spacing, typography } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherDashboardScreen({ navigation }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!auth?.userId) return;
    try {
      const result = await teacherService.getDashboard(auth.userId);
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

  if (loading && !refreshing) return <LoadingState label="Loading teacher dashboard..." />;

  const stats = [
    { label: 'Students', value: data?.stats?.totalStudents || 0, icon: 'people', color: '#4e73df' },
    { label: 'Classes', value: data?.classes?.length || 0, icon: 'school', color: '#1cc88a' },
    { label: 'Homework', value: data?.homework?.length || 0, icon: 'book', color: '#36b9cc' },
    { label: 'Materials', value: 0, icon: 'folder', color: '#f6c23e' } // Materials count might come from separate API
  ];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long' });
  const todayClasses = (data?.timetable || []).filter(item => item.dayOfWeek === today);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.name}>{data?.teacher?.name || auth?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
           <View style={styles.avatarCircle}>
             <Text style={styles.avatarInitial}>{(data?.teacher?.name || auth?.name || 'T')[0]}</Text>
           </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.todayDate}>{today}</Text>
        </View>

        {todayClasses.length > 0 ? (
          todayClasses.map((item, index) => (
            <View key={index} style={styles.scheduleCard}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{item.startTime}</Text>
                <View style={styles.timeDivider} />
                <Text style={styles.timeText}>{item.endTime}</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.classLevel}>Class {item.classLevel}</Text>
                <Text style={styles.subjectText}>{item.subject}</Text>
              </View>
              <View style={styles.statusDot} />
            </View>
          ))
        ) : (
          <View style={styles.emptySchedule}>
            <Text style={styles.emptyText}>No classes scheduled for today.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <ActionItem 
            icon="calendar" 
            label="Attendance" 
            onPress={() => navigation.navigate('Attendance')} 
            color="#4e73df"
          />
          <ActionItem 
            icon="create" 
            label="Homework" 
            onPress={() => navigation.navigate('Homework')} 
            color="#1cc88a"
          />
          <ActionItem 
            icon="document-text" 
            label="Review" 
            onPress={() => navigation.navigate('Review')} 
            color="#f6c23e"
          />
          <ActionItem 
            icon="chatbubbles" 
            label="Notices" 
            onPress={() => {}} 
            color="#e74a3b"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function ActionItem({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
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
    fontSize: 14,
    color: '#6c757d',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4e73df',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginVertical: 10,
  },
  todayDate: {
    fontSize: 12,
    color: '#4e73df',
    fontWeight: '600',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  timeBox: {
    paddingRight: 15,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    alignItems: 'center',
    minWidth: 70,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4e73df',
  },
  timeDivider: {
    height: 10,
    width: 1,
    backgroundColor: '#ddd',
    marginVertical: 2,
  },
  scheduleInfo: {
    flex: 1,
    paddingLeft: 15,
  },
  classLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  subjectText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1cc88a',
  },
  emptySchedule: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyText: {
    color: '#adb5bd',
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionItem: {
    width: '23%',
    alignItems: 'center',
  },
  actionIcon: {
    width: 55,
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: '#212529',
    fontWeight: '600',
  },
});
