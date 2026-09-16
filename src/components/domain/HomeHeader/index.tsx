import type { StyleProp, ViewStyle } from 'react-native';

import { ScreenHero } from '@/components/domain/ScreenHero';
import { HeroActionButton } from '@/components/ui/HeroActionButton';
import { useI18n } from '@/hooks/use-i18n';
import type { GreetingPeriod } from '@/lib/home';

/**
 * Cabeçalho do ecrã inicial: a identidade, a saudação e o sino.
 *
 * **O desenho vive no `ScreenHero`** - o mesmo bloco que abre o Matches, o Chat, o Pesquisar e o
 * Perfil. Este componente só diz o que a Home lhe põe dentro: a saudação (que mais nenhum ecrã
 * tem), o nome completo, o papel (Tutor, Mentor ou Tutorando; ver `roleLabel` em
 * src/lib/roles.ts) e o sino. O curso e o ano nunca estiveram aqui: é informação do perfil, e o
 * cabeçalho diz quem és, não o que estudas.
 *
 * Uma coisa é só da Home e fica escrita aqui: **o sino leva o ponto das notificações por ler** - é a
 * contagem que a Home já tem em memória (pedidos de sessão e conversas por ler). No Perfil, o canto
 * é a roda dentada e não há contagem nenhuma para mostrar.
 *
 * A fotografia não é decidida aqui: são os 80 px do bloco (`HERO_AVATAR_SIZE`), os mesmos do Perfil.
 * Foi 48, 64 e 80 numa série de voltas - é a cara do ecrã inicial -, e chegou a haver um 56 só para
 * os separadores sem identidade, que já não existem.
 */
export interface HomeHeaderProps {
  name: string;
  /** Período do dia para a saudação (ver `greetingPeriod` em src/lib/home.ts). */
  period: GreetingPeriod;
  /**
   * O papel de quem está a ver o ecrã, já traduzido (ver `roleLabel` em src/lib/roles.ts).
   *
   * Chama-se `roleLabel` e não `role` porque `role` é uma propriedade do `ViewProps` (a do
   * acessibilidade, `accessibilityRole`): usar o mesmo nome escondia-a e o TypeScript recusava a
   * interface.
   */
  roleLabel: string;
  initials?: string;
  photoUri?: string;
  unreadNotifications?: number;
  onPressNotifications?: () => void;
  /** Espaço da barra de estado, que o ecrã mede (`insets.top`). */
  topInset?: number;
  /** Margens do ecrã (ver `styles.hero` em `(tabs)/index.tsx`). */
  style?: StyleProp<ViewStyle>;
}

export function HomeHeader({
  name,
  period,
  roleLabel,
  initials,
  photoUri,
  unreadNotifications = 0,
  onPressNotifications,
  topInset,
  style,
}: HomeHeaderProps) {
  const i18n = useI18n();

  const greeting =
    period === 'morning'
      ? i18n.home.greetingMorning
      : period === 'afternoon'
        ? i18n.home.greetingAfternoon
        : i18n.home.greetingEvening;

  return (
    <ScreenHero
      // O bloco é o primeiro elemento da lista, por isso rola com o resto em vez de ficar fixo.
      style={style}
      topInset={topInset}
      name={name}
      eyebrow={greeting}
      subtitle={roleLabel}
      photoUri={photoUri}
      initials={initials}
      rightAction={
        <HeroActionButton
          icon="notifications-outline"
          accessibilityLabel={i18n.home.notifications}
          onPress={onPressNotifications}
          badge={unreadNotifications > 0}
        />
      }
    />
  );
}
