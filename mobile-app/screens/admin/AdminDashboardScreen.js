import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';
import LoadingState from '../../components/LoadingState';
import { colors, spacing, typography } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen({ navigation }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, pendingRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getPendingApprovals()
      ]);
      
      if (summaryRes.success) {
        setStats(summaryRes.data);
      }
      
      setData({
        pendingApprovals: pendingRes.success ? pendingRes.data : []
      });
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

  if (loading && !refreshing) return <LoadingState label="Loading admin panel..." />;

  const kpis = [
    { label: 'Total Students', value: stats.students?.total || 0, icon: 'people', color: '#4e73df' },
    { label: 'Active Teachers', value: stats.teachers?.active || 0, icon: 'school', color: '#1cc88a' },
    { label: 'Pending Approvals', value: data?.pendingApprovals?.length || 0, icon: 'time', color: '#f6c23e' },
    { label: 'Revenue (INR)', value: stats.financials?.totalPaid || 0, icon: 'cash', color: '#36b9cc' }
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Admin Portal</Text>
          <Text style={styles.name}>{auth?.name || 'System Admin'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
           <View style={[styles.avatarCircle, { backgroundColor: '#e74a3b' }]}>
             <Text style={styles.avatarInitial}>A</Text>
           </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.statsGrid}>
          {kpis.map((kpi, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: kpi.color + '20' }]}>
                <Ionicons name={kpi.icon} size={20} color={kpi.color} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{kpi.value}</Text>
                <Text style={styles.statLabel}>{kpi.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Management</Text>
        </View>
        
        <View style={styles.managementGrid}>
          <ManagementCard 
            title="User Approvals" 
            count={data?.pendingApprovals?.length || 0}
            icon="person-add"
            color="#f6c23e"
            onPress={() => {}} 
          />
          <ManagementCard 
            title="Student Directory" 
            count={stats.students?.total || 0}
            icon="list"
            color="#4e73df"
            onPress={() => {}} 
          />
          <ManagementCard 
            title="Teacher Directory" 
            count={stats.teachers?.total || 0}
            icon="briefcase"
            color="#1cc88a"
            onPress={() => {}} 
          />
          <ManagementCard 
            title="Fee Tracking" 
            count={stats.financials?.totalPending || 0}
            icon="wallet"
            color="#36b9cc"
            onPress={() => {}} 
          />
        </View>

        {data?.pendingApprovals?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Registration Requests</Text>
            {data.pendingApprovals.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.approvalItem}>
                <View style={styles.approvalInfo}>
                  <Text style={styles.approvalName}>{item.name}</Text>
                  <Text style={styles.approvalRole}>{item.role?.toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.approveBtn}>
                   <Text style={styles.approveBtnText}>Review</Text>
                </TouchableOpacity>
              </View>
            ))}
            {data.pendingApprovals.length > 3 && (
              <TouchableOpacity style={styles.viewMore}>
                <Text style={styles.viewMoreText}>View all {data.pendingApprovals.length} requests</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ManagementCard({ title, count, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.mgmtCard} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.mgmtTitle}>{title}</Text>
      <View style={[styles.mgmtBadge, { backgroundColor: color }]}>
        <Text style={styles.mgmtCount}>{count}</Text>
      </View>
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
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 10,
    color: '#6c757d',
  },
  sectionHeader: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
    marginTop: 10,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mgmtCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mgmtTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  mgmtBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mgmtCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  approvalItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#f6c23e',
  },
  approvalName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  approvalRole: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  approveBtn: {
    backgroundColor: '#4e73df15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#4e73df',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewMore: {
    alignItems: 'center',
    padding: 10,
  },
  viewMoreText: {
    color: '#4e73df',
    fontSize: 14,
    fontWeight: '600',
  }
});
