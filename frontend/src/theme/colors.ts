/**
 * Gemi Design Token Colors
 * Exact values from web/src/pages/Dashboard/Dashboard.css CSS variables
 */
export const Colors = {
  // Core brand
  primary: '#006591',
  primaryContainer: '#0ea5e9',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001e2f',

  // Background / Surface
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',

  // Text
  onBackground: '#0b1c30',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#3e4850',
  outline: '#6e7881',
  outlineVariant: '#bec8d2',
  inverseOnSurface: '#eaf1ff',
  inverseSurface: '#213145',

  // Accent macros
  secondaryContainer: '#fd761a',  // fats / streak fire
  secondary: '#9d4300',
  onSecondary: '#ffffff',
  tertiaryFixedDim: '#f7be1d',    // carbs yellow
  tertiary: '#785a00',
  onTertiary: '#ffffff',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',

  // Macro-specific convenience aliases (context.md)
  proteinAccent: '#60a5fa',   // sky blue
  carbsAccent: '#f59e0b',     // tangerine
  fatsAccent: '#ec4899',      // hot pink (unused — fats uses secondaryContainer)
} as const;

export type ColorKey = keyof typeof Colors;
