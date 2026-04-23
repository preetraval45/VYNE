/**
 * VYNE Design Tokens
 *
 * Single source of truth for brand colors used in TypeScript code.
 * For CSS-driven values, prefer CSS custom properties from globals.css
 * (e.g. `var(--vyne-purple)`). Use these constants only when:
 *   - Passing colors to SVG fill/stroke attributes
 *   - Framer Motion dynamic values
 *   - Inline styles where CSS vars can't be used
 *
 * Keep this file in sync with :root / [data-theme="dark"] in globals.css.
 */

export const brand = {
  purple:      '#06B6D4',
  purpleLight: '#9B80FF',
  purpleDark:  '#5A3ED4',
  indigo:      '#0891B2',
  cyan:        '#06B6D4',
  magenta:     '#EC4899',
} as const;

export const status = {
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
  info:    '#0891B2',
} as const;

/** Semantic aliases */
export const color = {
  primary:   brand.purple,
  primaryFg: '#FFFFFF',
  success:   status.success,
  warning:   status.warning,
  danger:    status.danger,
  info:      status.info,
} as const;

/** Dark-first marketing palette (not theme-switched) */
export const marketing = {
  bg:           '#09071A',
  bgDeep:       '#05040F',
  bgMid:        '#0D0B20',
  text:         'var(--content-border)',
  textSub:      '#9490B8',
  textMuted:    '#5E5A7A',
  border:       'rgba(255,255,255,0.06)',
  purpleDim:    'rgba(6, 182, 212,0.08)',
  purpleBorder: 'rgba(6, 182, 212,0.3)',
} as const;

/** Generates a rgba() string from a hex color + alpha (0-1). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadow = {
  sm:    '0 1px 3px rgba(6, 182, 212,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  md:    '0 4px 12px rgba(6, 182, 212,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  lg:    '0 10px 24px rgba(6, 182, 212,0.1), 0 4px 8px rgba(0,0,0,0.04)',
  xl:    '0 20px 40px rgba(6, 182, 212,0.12), 0 8px 16px rgba(0,0,0,0.06)',
  panel: '0 0 0 1px rgba(6, 182, 212,0.1), 0 10px 30px rgba(6, 182, 212,0.08)',
} as const;

export const z = {
  dropdown:     10,
  sticky:       20,
  overlay:      40,
  modal:        50,
  toast:        60,
  tooltip:      70,
  commandPalette: 100,
} as const;
