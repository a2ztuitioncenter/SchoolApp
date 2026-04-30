import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import LoadingState from '../../components/LoadingState';

export default function StudentManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await adminService.getStudents();
      if (res.success) {
        setStudents(res.data || []);
      }
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

  const handleDelete = (id) => {
    Alert.alert('Delete Student', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          const res = await adminService.deleteUser(id);
          if (res.success) {
            Alert.alert('Success', 'Student removed');
            loadData();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }}
    ]);
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>Class {item.classLevel} • {item.phone}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#e74a3b" />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) return <LoadingState label="Loading directory..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Directory</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#adb5bd" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search name or phone..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
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
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4e73df20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4e73df',
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  meta: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  }
});
