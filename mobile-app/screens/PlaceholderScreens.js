import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ComingSoon = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Feature coming soon to mobile!</Text>
  </View>
);

export const UserManagementScreen = () => <ComingSoon title="User Management" />;
export const StudentManagementScreen = () => <ComingSoon title="Student Management" />;
export const ApprovalsScreen = () => <ComingSoon title="Approvals" />;
export const AttendanceScreen = () => <ComingSoon title="Attendance" />;
export const HomeworkManagerScreen = () => <ComingSoon title="Homework Manager" />;
export const DPPScreen = () => <ComingSoon title="Daily Practice (DPP)" />;
export const SyllabusScreen = () => <ComingSoon title="Syllabus" />;
export const TimetableScreen = () => <ComingSoon title="Timetable" />;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#6c757d' }
});

export default ComingSoon;
