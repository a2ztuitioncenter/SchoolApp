import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { teacherService } from '../../services/teacherService';
import LoadingState from '../../components/LoadingState';
import AppButton from '../../components/AppButton';
import { colors, spacing, typography } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AttendanceScreen() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: 'present' | 'absent' | 'late' }
  const [sheetLoaded, setSheetLoaded] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await teacherService.getAttendanceClasses(auth.userId);
        if (res.success) {
          setClasses(res.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, [auth.userId]);

  const onClassSelect = async (classLevel) => {
    setSelectedClass(classLevel);
    setSelectedSection('');
    setSheetLoaded(false);
    try {
      const res = await teacherService.getSectionsByClass(classLevel);
      if (res.success) {
        setSections(res.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSheet = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await teacherService.getAttendanceSheet(auth.userId, selectedClass, date, selectedSection);
      if (res.success) {
        setStudents(res.students || []);
        const initialAtt = { ...res.existing };
        res.students.forEach(s => {
          if (!initialAtt[s.id]) initialAtt[s.id] = null;
        });
        setAttendance(initialAtt);
        setSheetLoaded(true);
      } else {
        Alert.alert('Error', res.error || 'Failed to load sheet');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status) => {
    const newAtt = { ...attendance };
    students.forEach(s => {
      newAtt[s.id] = status;
    });
    setAttendance(newAtt);
  };

  const saveAttendance = async () => {
    const pending = students.filter(s => !attendance[s.id]);
    if (pending.length > 0) {
      Alert.alert('Pending', `Please mark attendance for all students (${pending.length} remaining)`);
      return;
    }

    const records = students.map(s => ({
      studentId: s.id,
      classLevel: selectedClass,
      section: selectedSection || null,
      date,
      status: attendance[s.id]
    }));

    setLoading(true);
    try {
      const res = await teacherService.markBulkAttendance(auth.userId, records);
      if (res.success) {
        Alert.alert('Success', 'Attendance saved successfully');
      } else {
        Alert.alert('Error', res.error || 'Failed to save');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !sheetLoaded) return <LoadingState label="Loading..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Text style={styles.headerSubtitle}>{date}</Text>
      </View>

      {!sheetLoaded ? (
        <ScrollView style={styles.setupContainer}>
          <Text style={styles.label}>Select Class</Text>
          <View style={styles.chipRow}>
            {classes.map((c, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.chip, selectedClass === c ? styles.chipActive : null]}
                onPress={() => onClassSelect(c)}
              >
                <Text style={[styles.chipText, selectedClass === c ? styles.chipTextActive : null]}>Class {c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedClass && sections.length > 0 && (
            <>
              <Text style={styles.label}>Select Section</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity 
                  style={[styles.chip, selectedSection === '' ? styles.chipActive : null]}
                  onPress={() => setSelectedSection('')}
                >
                  <Text style={[styles.chipText, selectedSection === '' ? styles.chipTextActive : null]}>All</Text>
                </TouchableOpacity>
                {sections.map((s, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.chip, selectedSection === s ? styles.chipActive : null]}
                    onPress={() => setSelectedSection(s)}
                  >
                    <Text style={[styles.chipText, selectedSection === s ? styles.chipTextActive : null]}>Section {s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.actionBox}>
            <AppButton label="Load Attendance Sheet" onPress={loadSheet} disabled={!selectedClass} />
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => setSheetLoaded(false)} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#4e73df" />
              <Text style={styles.backBtnText}>Change Class</Text>
            </TouchableOpacity>
            <View style={styles.bulkActions}>
               <TouchableOpacity onPress={() => markAll('present')} style={styles.bulkBtn}>
                 <Text style={styles.bulkBtnText}>All P</Text>
               </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={students}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.studentList}
            renderItem={({ item }) => (
              <View style={styles.studentCard}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentRoll}>ID: #{item.id}</Text>
                </View>
                <View style={styles.toggleRow}>
                  <StatusToggle 
                    label="P" 
                    active={attendance[item.id] === 'present'} 
                    color="#1cc88a" 
                    onPress={() => setAttendance(prev => ({ ...prev, [item.id]: 'present' }))} 
                  />
                  <StatusToggle 
                    label="A" 
                    active={attendance[item.id] === 'absent'} 
                    color="#e74a3b" 
                    onPress={() => setAttendance(prev => ({ ...prev, [item.id]: 'absent' }))} 
                  />
                  <StatusToggle 
                    label="L" 
                    active={attendance[item.id] === 'late'} 
                    color="#f6c23e" 
                    onPress={() => setAttendance(prev => ({ ...prev, [item.id]: 'late' }))} 
                  />
                </View>
              </View>
            )}
          />

          <View style={styles.footer}>
             <AppButton label="Save Attendance" onPress={saveAttendance} />
          </View>
        </>
      )}
    </View>
  );
}

function StatusToggle({ label, active, color, onPress }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.statusToggle, 
        active ? { backgroundColor: color, borderColor: color } : null
      ]}
    >
      <Text style={[styles.statusLabel, active ? { color: '#fff' } : null]}>{label}</Text>
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
    paddingTop: 50,
    backgroundColor: '#fff',
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
  setupContainer: {
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
    gap: 10,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#4e73df20',
    borderColor: '#4e73df',
  },
  chipText: {
    fontSize: 14,
    color: '#6c757d',
  },
  chipTextActive: {
    color: '#4e73df',
    fontWeight: 'bold',
  },
  actionBox: {
    marginTop: 40,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#4e73df',
    fontWeight: '600',
    fontSize: 14,
  },
  bulkBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
  },
  studentList: {
    padding: 15,
  },
  studentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  studentRoll: {
    fontSize: 11,
    color: '#adb5bd',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  }
});
