import { Pressable, type PressableProps } from 'react-native';

import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Pill, type PillSize } from '@/components/ui/Pill';
import { ThemedText } from '@/components/ui/ThemedText';

/** Chip clicável (baseado no Pill) usado para sugestões rápidas de escolha. */
export type SuggestionChipTone = 'default' | 'muted';

const TONE_COLORS: Record<SuggestionChipTone, { background: ColorToken; text: ColorToken }> = {
  default: { background: 'primarySoft', text: 'primary' },
  muted: { background: 'surfaceAlt', text: 'textMuted' },
};

export interface SuggestionChipProps extends Omit<PressableProps, 'style'> {
  label: string;
  tone?: SuggestionChipTone;
  size?: PillSize;
}

export function SuggestionChip({ label, tone = 'default', size = 'md', ...rest }: SuggestionChipProps) {
  const theme = useTheme();
  const colors = TONE_COLORS[tone];

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} {...rest}>
      <Pill size={size} style={{ backgroundColor: theme[colors.background] }}>
        <ThemedText type="smallBold" themeColor={colors.text}>
          {label}
        </ThemedText>
      </Pill>
    </Pressable>
  );
}
