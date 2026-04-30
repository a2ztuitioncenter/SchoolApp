import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import StudentManagementScreen from '../screens/admin/StudentManagementScreen';

// Teacher Screens
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import HomeworkManagerScreen from '../screens/teacher/HomeworkManagerScreen';
import SubmissionReviewScreen from '../screens/teacher/SubmissionReviewScreen';

// Student Screens
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import DPPScreen from '../screens/student/DPPScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import TimetableScreen from '../screens/student/TimetableScreen';
import ResultsScreen from '../screens/student/ResultsScreen';
import SyllabusScreen from '../screens/student/SyllabusScreen';

// Common
import ProfileScreen from '../screens/ProfileScreen';
import LoadingState from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = ({ route }) => ({
  tabBarIcon: ({ focused, color, size }) => {
    let iconName;
    if (route.name === 'Home' || route.name === 'Dashboard') {
      iconName = focused ? 'home' : 'home-outline';
    } else if (route.name === 'Users' || route.name === 'Students') {
      iconName = focused ? 'people' : 'people-outline';
    } else if (route.name === 'Attendance') {
      iconName = focused ? 'calendar' : 'calendar-outline';
    } else if (route.name === 'Homework' || route.name === 'Assignments') {
      iconName = focused ? 'book' : 'book-outline';
    } else if (route.name === 'Practice') {
      iconName = focused ? 'create' : 'create-outline';
    } else if (route.name === 'Profile') {
      iconName = focused ? 'person' : 'person-outline';
    } else if (route.name === 'Review') {
      iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
    }
    return <Ionicons name={iconName} size={size} color={color} />;
  },
  tabBarActiveTintColor: '#4e73df',
  tabBarInactiveTintColor: 'gray',
  headerShown: true,
});

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Users" component={UserManagementScreen} />
      <Tab.Screen name="Students" component={StudentManagementScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function TeacherTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={TeacherDashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Homework" component={HomeworkManagerScreen} />
      <Tab.Screen name="Review" component={SubmissionReviewScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={StudentHomeScreen} />
      <Tab.Screen name="Practice" component={DPPScreen} />
      <Tab.Screen name="Assignments" component={AssignmentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { auth, isLoggedIn, ready } = useAuth();

  if (!ready) return <LoadingState label="Restoring session..." />;

  const getRoleTabs = () => {
    switch (auth?.role) {
      case 'admin': return AdminTabs;
      case 'teacher': return TeacherTabs;
      case 'student': return StudentTabs;
      default: return StudentTabs; // Fallback
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={getRoleTabs()} />
            {/* Sub-screens that are not in tabs */}
            <Stack.Screen name="Timetable" component={TimetableScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="Syllabus" component={SyllabusScreen} />
            <Stack.Screen name="Review" component={SubmissionReviewScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

