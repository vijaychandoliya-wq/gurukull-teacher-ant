import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'dronacharya.teacher.theme.v1';
export const colorsLight = {
  primary: '#1677ff',
  primaryTap: '#0958d9',
  success: '#087f5b',
  warning: '#a65f00',
  danger: '#cf1322',
  text: '#172033',
  textSecondary: '#526079',
  weak: '#627085',
  light: '#8793a6',
  border: '#dfe5ee',
  surface: '#ffffff',
  background: '#f5f7fb',
  wathet: '#eaf2ff',
  violet: '#722ed1',
  cyan: '#087f8c',
  magenta: '#c41d7f',
  drawerHeaderBg: '#edf3ff',
  drawerHeaderBorder: '#d7e4ff',
  dangerSoftBg: '#fff1f0',
  dangerSoftBorder: '#ffccc7',
  onPrimary: '#ffffff',
  heroSecondary: '#e6f0ff',
  heroBackground: '#1456bd',
  brandGold: '#cd9d56',
};
export type AppColors = { [K in keyof typeof colorsLight]: string };
export const colorsDark: AppColors = {
  primary: '#69a5ff',
  primaryTap: '#4090ff',
  success: '#56d6a4',
  warning: '#ffd078',
  danger: '#ff858c',
  text: '#f0f3fa',
  textSecondary: '#bec8da',
  weak: '#9baac1',
  light: '#8998ae',
  border: '#303c50',
  surface: '#192232',
  background: '#0e1522',
  wathet: '#233755',
  violet: '#b89aff',
  cyan: '#61d8e4',
  magenta: '#ff9ad0',
  drawerHeaderBg: '#1c2c46',
  drawerHeaderBorder: '#344767',
  dangerSoftBg: '#3b202c',
  dangerSoftBorder: '#714052',
  onPrimary: '#ffffff',
  heroSecondary: '#e6f0ff',
  heroBackground: '#163f80',
  brandGold: '#cd9d56',
};
// Compatibility exports for isolated consumers. Screens use the reactive hook.
export const colors = colorsLight;
export const radius = { s: 6, m: 10, l: 16 } as const;
export const font = {
  xxs: 10,
  xs: 11,
  s: 12,
  ms: 13,
  main: 14,
  m: 14,
  l: 16,
  xl: 17,
  xxl: 18,
  huge: 20,
} as const;
export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  page: 20,
} as const;
export function makeAntdTheme(palette: AppColors) {
  return {
    brand_primary: palette.primary,
    brand_primary_tap: palette.primaryTap,
    brand_success: palette.success,
    brand_warning: palette.warning,
    brand_error: palette.danger,
    primary_button_fill: '#1677ff',
    primary_button_fill_tap: '#0958d9',
    color_text_base: palette.text,
    color_text_base_inverse: palette.onPrimary,
    color_text_secondary: palette.textSecondary,
    color_text_placeholder: palette.weak,
    color_text_caption: palette.weak,
    color_text_paragraph: palette.text,
    color_text_disabled: palette.light,
    color_icon_base: palette.weak,
    color_link: palette.primary,
    border_color_base: palette.border,
    border_color_thin: palette.border,
    fill_base: palette.surface,
    fill_body: palette.background,
    fill_grey: palette.background,
    fill_tap: palette.wathet,
    fill_disabled: palette.border,
    tab_bar_fill: palette.surface,
    search_bar_fill: palette.background,
    notice_bar_fill: palette.dangerSoftBg,
    checkbox_fill_disabled: palette.border,
    checkbox_border: palette.light,
    checkbox_border_disabled: palette.border,
    radius_md: radius.m,
    radius_lg: radius.l,
    font_size_base: font.m,
    font_size_subhead: font.l,
    font_size_heading: font.xl,
    h_spacing_lg: spacing.l,
    v_spacing_lg: spacing.l,
    button_height: 48,
    button_font_size: font.l,
    button_height_sm: 36,
    button_font_size_sm: font.main,
    list_item_height: 48,
  };
}
export const antdTheme = makeAntdTheme(colorsLight);
export function statusColor(
  status?: string | null,
  palette: AppColors = colorsLight,
): string {
  const value = String(status || '').toLowerCase();
  if (/(approved|completed|present|pass|published|active|done)/.test(value))
    return palette.success;
  if (/(rejected|absent|fail|cancelled|expired|overdue)/.test(value))
    return palette.danger;
  if (/(draft|new|open)/.test(value)) return palette.primary;
  return palette.warning;
}
export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}
export function resolveTheme(
  mode: ThemeMode,
  system: string | null | undefined,
): 'light' | 'dark' {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}
type ThemeValue = {
  colors: AppColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  antdTheme: ReturnType<typeof makeAntdTheme>;
};
const fallback: ThemeValue = {
  colors: colorsLight,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  antdTheme,
};
const ThemeContext = createContext<ThemeValue>(fallback);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const userChanged = useRef(false);
  const pendingWrite = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (!cancelled && !userChanged.current && isThemeMode(stored))
          setModeState(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const setMode = useCallback((next: ThemeMode) => {
    if (!isThemeMode(next)) return;
    userChanged.current = true;
    setModeState(next);
    // Serialize rapid preference writes so an earlier tap cannot win later.
    pendingWrite.current = pendingWrite.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, next))
      .catch(() => {});
  }, []);
  const isDark = resolveTheme(mode, scheme) === 'dark';
  const palette = isDark ? colorsDark : colorsLight;
  const value = useMemo<ThemeValue>(
    () => ({
      colors: palette,
      mode,
      isDark,
      setMode,
      antdTheme: makeAntdTheme(palette),
    }),
    [palette, mode, isDark, setMode],
  );
  return React.createElement(ThemeContext.Provider, { value }, children);
}
export function useAppTheme() {
  return useContext(ThemeContext);
}
export function useThemeColors() {
  return useAppTheme().colors;
}
export function useThemedStyles<T>(factory: (palette: AppColors) => T): T {
  const palette = useThemeColors();
  return useMemo(() => factory(palette), [factory, palette]);
}
