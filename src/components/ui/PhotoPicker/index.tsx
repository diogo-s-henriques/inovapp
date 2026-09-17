import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { reportError } from '@/lib/error-reporting';

/**
 * Espera mínima antes de o avatar mostrar que a fotografia está a caminho.
 *
 * Um indicador que pisca durante 20 ms não informa ninguém - só chama a atenção para uma espera que
 * quase não existiu. O que se quer cobrir é a espera **longa** (a galeria a abrir da primeira vez,
 * ou uma fotografia grande a ser reduzida); abaixo disto não se mostra nada, e a fotografia
 * simplesmente aparece.
 */
const BUSY_SHOW_DELAY_MS = 300;

export interface PhotoPickerProps extends Omit<PressableProps, 'style' | 'onPress'> {
  uri?: string;
  initials?: string;
  /** Escolher/trocar a fotografia: abre o seletor do sistema. */
  onPress: () => void | Promise<void>;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Seletor de fotografia de perfil: um avatar que se toca e abre a galeria.
 *
 * **Um toque, uma ação.** Houve aqui uma paragem pelo caminho - o toque abria a fotografia **em
 * grande**, e era o "Alterar" dentro dessa vista que ia ao seletor. Custava duas coisas: um toque a
 * mais para trocar de fotografia (que é o que se quer fazer quase sempre) e a espera pela animação
 * de fecho do modal antes de o seletor poder arrancar - o seletor da galeria é uma apresentação
 * nativa por cima de tudo, e se arrancasse com o modal ainda a desaparecer o iOS largava a
 * apresentação em silêncio ("present while a presentation is in progress") - que era o botão parecer
 * morto. Sem modal pelo caminho não há nada para esperar: o toque e o seletor são o mesmo instante.
 *
 * **Enquanto a fotografia vem, o avatar mostra que está a vir.** Abrir a galeria não é trabalho
 * nosso e demora o que demora (a primeira vez em cada arranque é a pior: o iOS tem de levantar a
 * extensão das fotografias) - sem sinal nenhum, esses segundos lêem-se como um botão avariado. O
 * `onPress` pode devolver promessa para esta espera cobrir as duas metades: o seletor **e** a
 * preparação da imagem, que acontece depois de a escolher. Quem tem a fotografia pronta é quem sabe
 * quando isto acabou - por isso é ele que diz, e não um temporizador nosso a adivinhar.
 *
 * Sem fotografia não há nada para ver em grande nem nada para trocar: o mesmo toque é "adicionar" ou
 * "alterar", e o que muda é só a legenda (que vem de fora, no `label`).
 */
export function PhotoPicker({ uri, initials, onPress, label, size = 96, style, ...rest }: PhotoPickerProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const resolvedLabel = label ?? i18n.common.addPhoto;
  // Fotografia a caminho (seletor a abrir, ou imagem a ser preparada depois de escolhida).
  const [busy, setBusy] = useState(false);
  // Há uma fotografia a caminho. Este travão é do pedido, não da espera visível: segura o segundo
  // toque desde o primeiro instante, mesmo antes de o indicador aparecer.
  const requestingRef = useRef(false);
  // A promessa da fotografia pode chegar depois de o ecrã sair (voltar para trás com a galeria
  // aberta), e quem fica deve ser ninguém.
  const mountedRef = useRef(true);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Se o indicador chegou mesmo a aparecer - só então há estado para desfazer (e um pedido rápido
  // não mexe no ecrã de todo).
  const busyShownRef = useRef(false);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (busyTimerRef.current !== null) clearTimeout(busyTimerRef.current);
    },
    [],
  );

  /**
   * Pede a fotografia e fica ocupado enquanto ela não chega.
   *
   * O `onPress` é o ecrã: ele abre o seletor e prepara a imagem escolhida, e só resolve quando
   * tiver a fotografia pronta (ou nada, se a pessoa desistir pelo caminho).
   */
  const requestPhoto = async () => {
    requestingRef.current = true;
    busyTimerRef.current = setTimeout(() => {
      busyTimerRef.current = null;
      if (!mountedRef.current) return;
      busyShownRef.current = true;
      setBusy(true);
    }, BUSY_SHOW_DELAY_MS);

    try {
      await onPress();
    } catch (error) {
      // A leitura é do sistema (galeria, cortes, ficheiro) e pode falhar; o ecrã fica como estava,
      // sem fotografia nova, e o erro vai para o relatório como todos os outros.
      reportError(error, 'fotografia');
    } finally {
      requestingRef.current = false;
      if (busyTimerRef.current !== null) {
        clearTimeout(busyTimerRef.current);
        busyTimerRef.current = null;
      }
      if (busyShownRef.current) {
        busyShownRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    }
  };

  const handlePress = () => {
    // Já há um pedido a caminho: um segundo toque não abre duas galerias.
    if (requestingRef.current) return;
    void requestPhoto();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      // A etiqueta continua a dizer o que o avatar faz; o estado ocupado acrescenta-se ao lado, que
      // é o que um leitor de ecrã anuncia. Trocar a etiqueta pela da espera tiraria o botão a quem o
      // procura por ela enquanto a fotografia vem.
      accessibilityState={{ busy }}
      accessibilityLabel={resolvedLabel}
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
        {/* Prioridade de conteúdo: fotografia a caminho > fotografia > iniciais > ícone genérico */}
        {busy ? (
          <ActivityIndicator color={theme.primaryDark} />
        ) : uri ? (
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
        {busy ? i18n.common.loadingPhoto : resolvedLabel}
      </ThemedText>
    </Pressable>
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
});
