import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Espera entre fechar a vista em grande e abrir o seletor da galeria. Tem de cobrir a animação de
 * fecho do Modal - a razão está no `handleChange`.
 */
const PICKER_OPEN_DELAY_MS = 350;

export interface PhotoPickerProps extends Omit<PressableProps, 'style' | 'onPress'> {
  uri?: string;
  initials?: string;
  /**
   * Trocar a fotografia: abre o seletor do sistema. Chamado pelo botão dentro da fotografia vista
   * de perto - o toque no avatar não é isto, é vê-la maior.
   */
  onPress: () => void;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Seletor de fotografia de perfil.
 *
 * O avatar abre a fotografia **em grande**, com o botão "Alterar" por baixo: quem tem uma
 * fotografia quer poder olhar para ela antes de decidir trocá-la, e a 96 px não se vê nada. Sem
 * fotografia não há nada para ver, e o toque vai direto ao seletor do sistema.
 *
 * O ícone de máquina fotográfica que ali estava saiu: era um símbolo de ação dentro de um avatar
 * que não fazia nada de diferente do resto do círculo - apontava para um botão que não existia.
 */
export function PhotoPicker({
  uri,
  initials,
  onPress,
  label,
  size = 96,
  style,
  ...rest
}: PhotoPickerProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const resolvedLabel = label ?? i18n.common.addPhoto;
  const [previewing, setPreviewing] = useState(false);
  // O timer do seletor pendente: o componente pode sair da árvore antes de ele disparar (voltar
  // para trás com a vista ainda a fechar), e quem fica deve ser ninguém.
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pickerTimerRef.current !== null) clearTimeout(pickerTimerRef.current);
    },
    [],
  );

  const handlePress = () => {
    if (!uri) {
      onPress();
      return;
    }
    setPreviewing(true);
  };

  const handleChange = () => {
    // Um segundo toque antes de o primeiro chegar ao seletor não abre dois.
    if (pickerTimerRef.current !== null) return;

    // **Fechar primeiro, abrir depois.** O seletor da galeria é uma apresentação nativa por cima de
    // tudo; se arrancar enquanto este Modal ainda está a desaparecer, o iOS larga a apresentação em
    // silêncio ("present while a presentation is in progress") - o modal fecha e nada se abre, e o
    // botão parecia morto. A espera é a duração do fade de fecho, mais folga.
    setPreviewing(false);
    pickerTimerRef.current = setTimeout(() => {
      pickerTimerRef.current = null;
      onPress();
    }, PICKER_OPEN_DELAY_MS);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={uri ? i18n.common.viewPhoto : resolvedLabel}
        style={[styles.container, style]}
        {...rest}>
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.primarySoft,
              borderColor: theme.borderAccent,
              borderStyle: uri ? 'solid' : 'dashed',
            },
          ]}>
          {/* Prioridade de conteúdo: fotografia > iniciais > ícone genérico */}
          {uri ? (
            <Image source={{ uri }} style={styles.image} />
          ) : initials ? (
            <Text style={[styles.initials, { fontSize: Math.round(size * 0.4), color: theme.primaryDark }]}>
              {initials}
            </Text>
          ) : (
            <Ionicons name="person-outline" size={Math.round(size * 0.42)} color={theme.textPrimary} />
          )}
        </View>
        <ThemedText type="smallBold" themeColor="primary">
          {resolvedLabel}
        </ThemedText>
      </Pressable>

      <Modal
        visible={previewing}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewing(false)}>
        {/* Tocar fora fecha; o cartão abaixo engole o toque para o botão não fechar o modal. */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setPreviewing(false)}
          accessibilityRole="button"
          accessibilityLabel={i18n.common.cancel}>
          <View
            style={[styles.previewCard, { backgroundColor: theme.surface }]}
            onStartShouldSetResponder={() => true}>
            {uri ? <Image source={{ uri }} style={styles.previewImage} accessibilityIgnoresInvertColors /> : null}
            <Pressable
              onPress={handleChange}
              accessibilityRole="button"
              accessibilityLabel={i18n.common.change}
              style={({ pressed }) => [
                styles.changeButton,
                { backgroundColor: theme.primaryDark },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.changeLabel}>
                {i18n.common.change}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
  },
  previewCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.five,
    padding: Spacing.five,
    gap: Spacing.four,
  },
  // Quadrada de cantos arredondados e do tamanho do cartão: é a mesma fotografia do avatar, sem o
  // corte do círculo (que a 96 px come os cantos) e sem os 96 px.
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
  },
  changeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.six,
  },
  pressed: {
    opacity: 0.8,
  },
  changeLabel: {
    fontSize: 15,
  },
});
