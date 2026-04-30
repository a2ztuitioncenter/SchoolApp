import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../utils/theme';

export default function AppButton({ label, onPress, disabled, variant = 'primary' }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'secondary' ? styles.secondary : styles.primary,
        disabled ? styles.disabled : null
      ]}
    >
      <Text style={[styles.text, variant === 'secondary' ? styles.secondaryText : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center'
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primarySoft
  },
  disabled: {
    opacity: 0.6
  },
  text: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryText: {
    color: colors.primary
  }
});
