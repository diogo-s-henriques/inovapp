// Paleta de cores única da app (ver src/hooks/use-theme.ts — não há modo escuro por agora).
// Os azuis da marca são os de assets/Mockups/colors.txt; os neutros foram arrefecidos para azul
// claro — antes eram cinzentos e o resultado era branco sobre branco, sem nada onde assentar.
export const Colors = {
  primary: '#0085CA',
  primaryDark: '#204195',
  // Azul claro "cheio": é o tom dos chips e cartões que têm de se ver por cima do fundo dos ecrãs.
  primarySoft: '#D3E7F8',
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

  // Fundo dos ecrãs: azul muito claro, para os cartões e campos brancos se destacarem dele.
  background: '#EDF5FC',
  surface: '#FFFFFF',
  // Preenchimento secundário dentro de cartões brancos (caixas de estatística, ícones, barras).
  surfaceAlt: '#E1EEFA',
  border: '#CFE1F0',
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
