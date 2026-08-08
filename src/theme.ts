/**
 * Ant Design Mobile design tokens.
 *
 * Values mirror Ant Design Mobile's `theme-default.less` (`--adm-color-*`)
 * rather than Ant Design desktop, so this app and the Android client render the
 * same design system. Do not hand-pick new colours in screens — add a token
 * here and use it, otherwise the two clients drift apart.
 */
export const colors = {
  // Brand
  primary: '#1677ff',
  primaryTap: '#0958d9',

  // Semantic
  success: '#00b578',
  warning: '#ff8f1f',
  danger: '#ff3141',

  // Text
  text: '#333333',
  textSecondary: '#666666',
  weak: '#999999',
  light: '#cccccc',

  // Surfaces
  border: '#eeeeee',
  surface: '#ffffff',
  background: '#f5f5f5',
  wathet: '#e7f1ff',

  // Accents used for category chips and stat tiles.
  violet: '#722ed1',
  cyan: '#13c2c2',
  magenta: '#eb2f96',
} as const;

/**
 * Ant Design Mobile ships exactly three radii. Anything else is a deviation.
 */
export const radius = {s: 4, m: 8, l: 12} as const;

/**
 * Ant Design Mobile's type scale. Main body text is `main`.
 */
export const font = {
  xxs: 9,
  xs: 10,
  s: 11,
  ms: 12,
  main: 13,
  m: 14,
  l: 15,
  xl: 16,
  xxl: 17,
  huge: 18,
} as const;

export const spacing = {xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32} as const;

/**
 * Passed to `<Provider theme>` so Ant's own components pick up the same brand.
 */
export const antdTheme = {
  brand_primary: colors.primary,
  brand_primary_tap: colors.primaryTap,
  brand_success: colors.success,
  brand_warning: colors.warning,
  brand_error: colors.danger,
  color_text_base: colors.text,
  color_text_secondary: colors.textSecondary,
  color_text_placeholder: colors.light,
  color_text_caption: colors.weak,
  border_color_base: colors.border,
  fill_base: colors.surface,
  fill_body: colors.background,
  radius_md: radius.m,
  radius_lg: radius.l,
};

/**
 * Maps a free-text status from the API onto a semantic colour.
 *
 * The teacher API is inconsistent about casing and wording across modules
 * (`Approved`, `approved`, `Pass`, `completed`, `active`), so match loosely and
 * fall back to warning — an unrecognised status is nearly always "in progress".
 */
export function statusColor(status?: string | null): string {
  const value = String(status || '').toLowerCase();
  if (/(approved|completed|present|pass|published|active|done)/.test(value)) {
    return colors.success;
  }
  if (/(rejected|absent|fail|cancelled|expired|overdue)/.test(value)) {
    return colors.danger;
  }
  if (/(draft|new|open)/.test(value)) {
    return colors.primary;
  }
  return colors.warning;
}
