/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         ATTOMIK DESIGN SYSTEM — design-tokens.ts            ║
 * ║                         v2.0                                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Drop this file into any project at src/lib/design-tokens.ts║
 * ║  Use in inline styles — never hardcode hex values           ║
 * ║  Companion: attomik-theme.css (CSS custom properties)       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── COLORS ────────────────────────────────────────────────────

export const colors = {
  // ── Core ──────────────────────────────────────────────────
  ink:       '#000000',   // primary text, dark backgrounds
  paper:     '#ffffff',   // page background, cards
  cream:     '#f2f2f2',   // subtle background, hover states
  creamDark: '#e8e8e8',   // cream hover

  // ── Accent — neon green ───────────────────────────────────
  accent:      '#00ff97',
  accentHover: '#00e085',
  accentDark:  '#00cc78',
  accentLight: '#e6fff5',
  accentMid:   'rgba(0,255,151,0.12)',

  // ── Semantic ──────────────────────────────────────────────
  success:      '#00cc78',
  successLight: '#e6fff5',
  danger:       '#b91c1c',
  dangerLight:  '#fee2e2',
  dangerSoft:   'rgba(255,100,100,0.9)',
  warning:      '#856404',
  warningLight: '#fff3cd',
  info:         '#1d4ed8',
  infoLight:    '#dbeafe',

  // ── Text / Muted ──────────────────────────────────────────
  muted:    '#555555',
  subtle:   '#777777',
  disabled: '#bbbbbb',
  grayText: '#444444',

  // ── Borders ───────────────────────────────────────────────
  border:       '#e0e0e0',
  borderStrong: '#c4c4c4',

  // ── Sidebar ───────────────────────────────────────────────
  sidebarBg:     '#000000',
  sidebarBorder: 'rgba(255,255,255,0.07)',

  // ── Dark UI (modals, dark cards, preview) ─────────────────
  darkBg:      '#111111',
  darkCard:    '#1a1a1a',
  darkCardAlt: '#2a2a2a',
  previewCream: '#f8f7f4',

  // ── Grays ─────────────────────────────────────────────────
  gray100: '#fafafa',
  gray150: '#f8f8f8',
  gray200: '#f5f5f5',
  gray250: '#f0f0f0',
  gray300: '#eeeeee',
  gray400: '#dddddd',
  gray450: '#cccccc',
  gray500: '#bbbbbb',
  gray600: '#aaaaaa',
  gray700: '#999999',
  gray750: '#888888',
  gray800: '#666666',

  // ── Accent opacity variants ───────────────────────────────
  accentAlpha6:  'rgba(0,255,151,0.06)',
  accentAlpha8:  'rgba(0,255,151,0.08)',
  accentAlpha10: 'rgba(0,255,151,0.10)',
  accentAlpha12: 'rgba(0,255,151,0.12)',
  accentAlpha15: 'rgba(0,255,151,0.15)',
  accentAlpha20: 'rgba(0,255,151,0.20)',
  accentAlpha25: 'rgba(0,255,151,0.25)',
  accentAlpha30: 'rgba(0,255,151,0.30)',
  accentAlpha40: 'rgba(0,255,151,0.40)',

  // ── White opacity variants (text on dark) ─────────────────
  whiteAlpha5:  'rgba(255,255,255,0.05)',
  whiteAlpha8:  'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha30: 'rgba(255,255,255,0.30)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha45: 'rgba(255,255,255,0.45)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha55: 'rgba(255,255,255,0.55)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha65: 'rgba(255,255,255,0.65)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  whiteAlpha85: 'rgba(255,255,255,0.85)',
  whiteAlpha90: 'rgba(255,255,255,0.90)',

  // ── Black opacity variants (overlays, shadows) ────────────
  blackAlpha6:  'rgba(0,0,0,0.06)',
  blackAlpha8:  'rgba(0,0,0,0.08)',
  blackAlpha10: 'rgba(0,0,0,0.10)',
  blackAlpha20: 'rgba(0,0,0,0.20)',
  blackAlpha25: 'rgba(0,0,0,0.25)',
  blackAlpha45: 'rgba(0,0,0,0.45)',
  blackAlpha50: 'rgba(0,0,0,0.50)',

  // ── Brand greens (badges) ─────────────────────────────────
  brandGreen:     '#00a86b',
  brandGreenDark: '#007a48',

  // ── Specialty (templates, email) ─────────────────────────
  emailBlue: '#60a5fa',
  violet:    '#a78bfa',
  emerald:   '#34d399',
  accentLink: '#00cc7a',
} as const

// ── FONTS ─────────────────────────────────────────────────────

export const font = {
  heading: 'var(--font-barlow), Barlow, sans-serif',   // 900 weight, uppercase — all headings
  mono:    'var(--font-dm-mono), DM Mono, monospace',   // code, labels, data
} as const

// ── FONT WEIGHTS ──────────────────────────────────────────────

export const fontWeight = {
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
  heading:   900,   // Barlow Black — all display headings
} as const

// ── FONT SIZES ────────────────────────────────────────────────
// Use as fontSize.body, fontSize.lg, etc.

export const fontSize = {
  '2xs':  9,
  xs:     10,
  sm:     11,
  caption: 12,   // labels, captions
  body:   13,    // default body
  md:     14,    // nav items, inputs
  base:   15,    // comfortable reading
  lg:     16,    // subtext, help
  xl:     17,
  '2xl':  18,
  '3xl':  20,
  '4xl':  22,
  '5xl':  24,
  '6xl':  26,
  '7xl':  28,
  '8xl':  32,
  '9xl':  36,
  '10xl': 42,
  '11xl': 56,
  display: 96,   // hero / splash
} as const

// ── SPACING ───────────────────────────────────────────────────
// Based on 4px grid

export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const

// ── BORDER RADIUS ─────────────────────────────────────────────

export const radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   10,
  xl:   12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  '5xl': 24,
  pill: 999,
} as const

// ── Z-INDEX ───────────────────────────────────────────────────

export const zIndex = {
  thumb:       1,
  reel:        10,
  topbar:      50,
  sidebar:     100,
  dropdown:    100,
  reelOverlay: 150,
  modal:       200,
  toast:       300,
} as const

// ── SHADOWS ───────────────────────────────────────────────────

export const shadow = {
  xs:       '0 1px 3px rgba(0,0,0,0.06)',
  sm:       '0 2px 8px rgba(0,0,0,0.08)',
  md:       '0 4px 16px rgba(0,0,0,0.10)',
  lg:       '0 8px 32px rgba(0,0,0,0.12)',
  xl:       '0 4px 32px rgba(0,0,0,0.08)',
  heavy:    '0 8px 40px rgba(0,0,0,0.12)',
  dark:     '0 4px 16px rgba(0,0,0,0.30)',
  modal:    '0 20px 60px rgba(0,0,0,0.20)',
  card:     '0 2px 16px rgba(0,0,0,0.05)',
  cardHover:'0 4px 20px rgba(0,0,0,0.08)',
  accent:   '0 4px 20px rgba(0,255,151,0.25)',
  accentBtn:'0 2px 12px rgba(0,255,151,0.30)',
  dropdown: '0 8px 24px rgba(0,0,0,0.10)',
  picker:   '0 8px 32px rgba(0,0,0,0.25)',
} as const

// ── TRANSITIONS ───────────────────────────────────────────────

export const transition = {
  fast:    '0.1s ease',
  base:    '0.15s ease',
  normal:  '0.2s ease',
  slow:    '0.25s ease',
  modal:   '0.3s ease',
  overlay: '0.4s ease',
} as const

// ── LETTER SPACING ────────────────────────────────────────────

export const letterSpacing = {
  tight:  '-0.03em',
  snug:   '-0.02em',
  slight: '-0.01em',
  normal: '0',
  label:  '0.04em',
  wide:   '0.06em',
  wider:  '0.08em',
  caps:   '0.10em',
  widest: '0.12em',
  xwide:  '0.14em',
} as const

// ── LAYOUT ────────────────────────────────────────────────────

export const layout = {
  sidebarWidth:    260,
  topbarHeight:    64,
  navHeight:       72,
  maxContentWidth: 1200,
} as const

// ── LOGO SIZE TOKENS ──────────────────────────────────────────

export const logoSize = {
  sidebar:  38,   // full wordmark on dark sidebar
  topbar:   26,   // full wordmark on light topbar
  markSm:   20,   // icon mark — mobile / favicon badge
  markMd:   32,   // icon mark — loading, cards
  markLg:   56,   // icon mark — auth, onboarding
} as const

// ── COMPOSITE STYLE HELPERS ───────────────────────────────────
// Pre-composed style objects for common patterns.
// Usage: <div style={{ ...styles.headingDisplay }}>

export const styles = {
  // Headings
  headingDisplay: {
    fontFamily: font.heading,
    fontWeight: fontWeight.heading,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.tight,
    lineHeight: 1.05,
    color: colors.ink,
  },
  headingPage: {
    fontFamily: font.heading,
    fontWeight: fontWeight.extrabold,
    fontSize: fontSize['8xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: 1.1,
    color: colors.ink,
  },
  headingSection: {
    fontFamily: font.heading,
    fontWeight: fontWeight.extrabold,
    fontSize: fontSize['5xl'],
    letterSpacing: letterSpacing.tight,
    color: colors.ink,
  },
  headingCard: {
    fontFamily: font.heading,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.slight,
    color: colors.ink,
  },

  // Labels
  label: {
    fontFamily: font.heading,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.caps,
    color: colors.muted,
  },
  labelAccent: {
    fontFamily: font.heading,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.caps,
    color: colors.accent,
  },

  // Buttons
  btnPrimary: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[2],
    padding: `10px ${spacing[5]}px`,
    background: colors.accent,
    color: colors.ink,
    fontFamily: font.heading,
    fontWeight: fontWeight.heading,
    fontSize: fontSize.base,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.wide,
    border: 'none',
    borderRadius: radius.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
  },
  btnDark: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[2],
    padding: `10px ${spacing[5]}px`,
    background: colors.ink,
    color: colors.accent,
    fontFamily: font.heading,
    fontWeight: fontWeight.heading,
    fontSize: fontSize.base,
    textTransform: 'uppercase' as const,
    letterSpacing: letterSpacing.wide,
    border: 'none',
    borderRadius: radius.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
  },
  btnGhost: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[2],
    padding: `8px ${spacing[4]}px`,
    background: 'transparent',
    color: colors.muted,
    fontFamily: font.heading,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.body,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    cursor: 'pointer',
  },

  // Cards
  card: {
    background: colors.paper,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.xl,
    padding: spacing[6],
  },
  cardDark: {
    background: colors.ink,
    border: `1px solid ${colors.ink}`,
    borderRadius: radius.xl,
    padding: spacing[6],
    color: colors.paper,
  },
  cardAccent: {
    background: colors.darkCard,
    border: `1px solid ${colors.accentAlpha20}`,
    borderRadius: radius.xl,
    padding: spacing[6],
  },

  // Inputs
  input: {
    fontFamily: font.heading,
    fontSize: fontSize.base,
    color: colors.ink,
    background: colors.paper,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `10px ${spacing[3]}px`,
    width: '100%',
    outline: 'none',
  },

  // Page layout
  pageContent: {
    padding: `${spacing[8]}px ${spacing[10]}px`,
    flex: 1,
  },
  sectionHeader: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    margin: `${spacing[10]}px 0 ${spacing[5]}px`,
  },
} as const

// ── TYPE EXPORTS ──────────────────────────────────────────────

export type ColorKey        = keyof typeof colors
export type FontWeightKey   = keyof typeof fontWeight
export type FontSizeKey     = keyof typeof fontSize
export type SpacingKey      = keyof typeof spacing
export type RadiusKey       = keyof typeof radius
export type ShadowKey       = keyof typeof shadow
export type TransitionKey   = keyof typeof transition
