import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { studentService } from '../../services/studentService';
import LoadingState from '../../components/LoadingState';
import { colors } from '../../utils/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-IN', { weekday: 'long' }));

  const loadData = useCallback(async () => {
    try {
      const res = await studentService.getTimetable(auth.userId);
      if (res.success) {
        setTimetable(res.data || []);
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

  const filteredItems = timetable.filter(item => item.dayOfWeek === selectedDay);

  if (loading && !refreshing) return <LoadingState label="Loading timetable..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Class Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
          {DAYS.map((day, i) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => setSelectedDay(day)}
              style={[styles.dayChip, selectedDay === day && styles.activeDayChip]}
            >
              <Text style={[styles.dayText, selectedDay === day && styles.activeDayText]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.timeSection}>
                <Text style={styles.startTime}>{item.startTime}</Text>
                <Text style={styles.endTime}>{item.endTime}</Text>
              </View>
              <View style={styles.infoSection}>
                <Text style={styles.subject}>{item.subject}</Text>
                <Text style={styles.teacher}>{item.teacherName || 'TBA'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No classes scheduled for {selectedDay}.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Separate TouchableOpacity component because it's used inside the map
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  daySelector: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  dayChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    marginRight: 10,
  },
  activeDayChip: {
    backgroundColor: '#4e73df',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeDayText: {
    color: '#fff',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4e73df',
  },
  timeSection: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    marginRight: 15,
  },
  startTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
  },
  endTime: {
    fontSize: 11,
    color: '#adb5bd',
    marginTop: 2,
  },
  infoSection: {
    flex: 1,
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  teacher: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#adb5bd',
    fontSize: 14,
  }
});
