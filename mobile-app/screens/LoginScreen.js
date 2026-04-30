import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import ErrorBanner from '../components/ErrorBanner';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography } from '../utils/theme';

const roles = ['student', 'teacher', 'admin'];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!identifier || !password) {
      setError('Please enter credentials.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login({ role, identifier, password });
    setLoading(false);
    if (!result.success) {
      const message = result.error || 'Login failed';
      setError(message);
      Alert.alert('Login failed', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>A2Z Tuition Mobile</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.roleRow}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.roleChip, role === item ? styles.roleChipActive : null]}
              onPress={() => setRole(item)}
            >
              <Text style={[styles.roleText, role === item ? styles.roleTextActive : null]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ErrorBanner message={error} />

        <AppInput
          label="Phone or Username"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Enter identifier"
        />
        <AppInput
          label={role === 'student' ? 'Date of Birth Password' : 'Password'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
        />
        <AppButton label={loading ? 'Signing in...' : 'Login'} onPress={submit} disabled={loading} />

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.signupLink}>
          <Text style={styles.signupLinkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg
  },
  title: {
    fontSize: typography.title,
    color: colors.textPrimary,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm
  },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  roleChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: 12
  },
  roleTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  signupLink: {
    marginTop: spacing.md,
    alignItems: 'center'
  },
  signupLinkText: {
    color: colors.primary,
    fontWeight: '600'
  }
});
