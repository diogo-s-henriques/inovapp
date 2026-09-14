// Paleta de cores única da app (ver src/hooks/use-theme.ts — não há modo escuro por agora).
export const Colors = {
  primary: '#0085CA',
  primaryDark: '#204195',
  primarySoft: '#EAF4FB',
  borderAccent: '#BFE0F2',
  onPrimary: '#FFFFFF',

  success: '#1E9E5A',
  successSoft: '#E3F6EA',

  danger: '#E5484D',
  dangerSoft: '#FBE7E8',
  warning: '#F5A623',
  warningSoft: '#FDF0DC',

  rating: '#FFB800',

  textPrimary: '#1A1A1A',
  textNav: '#4A545F',
  textMuted: '#98A2AC',

  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F6F9',
  border: '#E7ECF1',
} as const;

export type ColorToken = keyof typeof Colors;

// Escala de espaçamento em pixels, usada em toda a app em vez de valores soltos.
export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 20,
  five: 24,
  six: 32,
} as const;

export const MaxContentWidth = 480;
