import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import LoadingState from '../../components/LoadingState';
import { colors } from '../../utils/theme';

export default function UserManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [view, setView] = useState('pending'); // 'pending' or 'all'

  const loadData = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        adminService.getPendingApprovals(),
        adminService.getTeachers() // For now, let's show teachers and pending
      ]);
      
      if (pendingRes.success) setPending(pendingRes.data || []);
      if (allRes.success) setUsers(allRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (userId, role) => {
    Alert.alert(
      'Approve User',
      `Approve this user as ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminService.approveUser(userId, role);
              if (res.success) {
                Alert.alert('Success', 'User approved');
                loadData();
              } else {
                Alert.alert('Error', res.error || 'Approval failed');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminService.deleteUser(userId);
              if (res.success) {
                Alert.alert('Deleted', 'User removed successfully');
                loadData();
              }
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email || item.phone}</Text>
        <View style={styles.roleBadge}>
           <Text style={styles.roleText}>{item.role?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {view === 'pending' ? (
          <TouchableOpacity 
            style={styles.approveBtn} 
            onPress={() => handleApprove(item.id, item.role)}
          >
            <Ionicons name="checkmark-circle" size={28} color="#1cc88a" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash" size={24} color="#e74a3b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) return <LoadingState label="Loading users..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, view === 'pending' && styles.activeTab]}
            onPress={() => setView('pending')}
          >
            <Text style={[styles.tabText, view === 'pending' && styles.activeTabText]}>
              Pending ({pending.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, view === 'all' && styles.activeTab]}
            onPress={() => setView('all')}
          >
            <Text style={[styles.tabText, view === 'all' && styles.activeTabText]}>
              Staff/Teachers
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={view === 'pending' ? pending : users}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found in this category.</Text>
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
  tabBar: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4e73df',
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#4e73df',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  userEmail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#495057',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  approveBtn: {
    padding: 5,
  },
  deleteBtn: {
    padding: 5,
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
