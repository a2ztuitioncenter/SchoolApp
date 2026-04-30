import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import ErrorBanner from '../components/ErrorBanner';
import { authService } from '../services/authService';
import { colors, spacing, typography } from '../utils/theme';

const roles = ['student', 'teacher'];

export default function SignupScreen({ navigation }) {
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    name: '', // for teacher
    phone: '',
    email: '',
    username: '',
    dob: '', // for student
    classLevel: '',
    section: '',
    fatherName: '',
    motherName: '',
    password: '',
    confirmPassword: ''
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (role === 'student') {
      const required = ['firstName', 'phone', 'dob', 'classLevel', 'section', 'fatherName', 'motherName'];
      for (const field of required) {
        if (!formData[field]) return `Field ${field} is required`;
      }
    } else {
      const required = ['name', 'email', 'phone', 'password', 'confirmPassword'];
      for (const field of required) {
        if (!formData[field]) return `Field ${field} is required`;
      }
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let result;
      if (role === 'student') {
        // Format DOB: YYYY-MM-DD -> DD/MM/YY
        let dobFormatted = formData.dob;
        if (formData.dob.includes('-')) {
            const parts = formData.dob.split('-');
            if (parts.length === 3) {
                const [yyyy, mm, dd] = parts;
                dobFormatted = `${dd}/${mm}/${yyyy.slice(2)}`;
            }
        }

        result = await authService.register({
          role: 'student',
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          dateOfBirth: dobFormatted,
          classLevel: formData.classLevel,
          section: formData.section,
          fatherName: formData.fatherName,
          motherName: formData.motherName,
          username: formData.username || undefined
        });
      } else {
        result = await authService.teacherRegister({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: 'teacher',
          username: formData.username || undefined
        });
      }

      if (result.success) {
        setSuccess('Registration successful! Awaiting admin approval.');
        Alert.alert('Success', 'Your account has been created and is awaiting admin approval.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (e) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Join A2Z Tuition</Text>
        <Text style={styles.subtitle}>Create your account to get started</Text>

        <View style={styles.roleRow}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.roleChip, role === item ? styles.roleChipActive : null]}
              onPress={() => setRole(item)}
            >
              <Text style={[styles.roleText, role === item ? styles.roleTextActive : null]}>
                {item === 'teacher' ? 'TEACHER/STAFF' : item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ErrorBanner message={error} />
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        {role === 'student' ? (
          <>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppInput label="First Name" value={formData.firstName} onChangeText={v => updateForm('firstName', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput label="Last Name" value={formData.lastName} onChangeText={v => updateForm('lastName', v)} />
              </View>
            </View>
            <AppInput label="Phone Number" value={formData.phone} onChangeText={v => updateForm('phone', v)} keyboardType="phone-pad" />
            <AppInput label="Date of Birth (YYYY-MM-DD)" value={formData.dob} onChangeText={v => updateForm('dob', v)} placeholder="2010-05-20" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppInput label="Class" value={formData.classLevel} onChangeText={v => updateForm('classLevel', v)} placeholder="e.g. 10th" />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput label="Section" value={formData.section} onChangeText={v => updateForm('section', v)} placeholder="e.g. A" />
              </View>
            </View>
            <AppInput label="Father's Name" value={formData.fatherName} onChangeText={v => updateForm('fatherName', v)} />
            <AppInput label="Mother's Name" value={formData.motherName} onChangeText={v => updateForm('motherName', v)} />
          </>
        ) : (
          <>
            <AppInput label="Full Name" value={formData.name} onChangeText={v => updateForm('name', v)} />
            <AppInput label="Email Address" value={formData.email} onChangeText={v => updateForm('email', v)} keyboardType="email-address" />
            <AppInput label="Phone Number" value={formData.phone} onChangeText={v => updateForm('phone', v)} keyboardType="phone-pad" />
            <AppInput label="Password" value={formData.password} onChangeText={v => updateForm('password', v)} secureTextEntry />
            <AppInput label="Confirm Password" value={formData.confirmPassword} onChangeText={v => updateForm('confirmPassword', v)} secureTextEntry />
          </>
        )}

        <AppInput label="Username (Optional)" value={formData.username} onChangeText={v => updateForm('username', v)} placeholder="Choose unique username" />

        <AppButton label={loading ? 'Registering...' : 'Sign Up'} onPress={submit} disabled={loading} />
        
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
    paddingTop: 60
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  successText: {
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600'
  },
  loginLink: {
    marginTop: spacing.md,
    alignItems: 'center'
  },
  loginLinkText: {
    color: colors.primary,
    fontWeight: '600'
  }
});
