import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  useAppTheme,
  useThemedStyles,
  type AppColors,
  type ThemeMode,
} from '../theme';

const options = [
  { key: 'light', label: 'Light', icon: '☀' },
  { key: 'dark', label: 'Dark', icon: '☾' },
  { key: 'system', label: 'System', icon: '◐' },
] as const;
export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      accessibilityLabel="Appearance"
      style={[styles.group, compact && styles.compact]}
    >
      {options.map(option => (
        <TouchableOpacity
          key={option.key}
          accessibilityRole="radio"
          accessibilityLabel={`${option.label} theme`}
          accessibilityState={{ selected: mode === option.key }}
          onPress={() => setMode(option.key as ThemeMode)}
          style={[
            styles.option,
            compact && styles.compactOption,
            mode === option.key && styles.selected,
          ]}
        >
          <Text
            style={[
              styles.glyph,
              {
                color:
                  mode === option.key ? colors.primary : colors.textSecondary,
              },
            ]}
          >
            {option.icon}
          </Text>
          {!compact && (
            <Text
              style={[
                styles.label,
                mode === option.key && styles.selectedLabel,
              ]}
            >
              {option.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    group: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 4,
    },
    compact: { width: 156 },
    option: {
      flex: 1,
      minHeight: 56,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    compactOption: { minHeight: 44, flexDirection: 'row' },
    selected: { backgroundColor: colors.surface },
    glyph: { fontSize: 20, lineHeight: 24 },
    label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    selectedLabel: { color: colors.primary, fontWeight: '700' },
  });
