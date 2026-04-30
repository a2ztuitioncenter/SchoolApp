import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    alignItems: 'center'
  },
  text: {
    marginTop: 8,
    color: colors.textSecondary
  }
});
