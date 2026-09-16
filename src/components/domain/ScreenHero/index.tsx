import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A fotografia da identidade no bloco - 80 px, a mesma na Home e no Perfil.
 *
 * Chegaram a ser dois tamanhos (80 na Home, 56 nos outros separadores), e a razão do 56 era boa: os
 * blocos deles tinham mais uma linha, o título do ecrã, e um bloco de 170 px em cinco separadores é
 * um quinto do ecrã. O que mudou foi quem tem identidade: **dois** separadores, a Home e o Perfil, e
 * nesses dois a fotografia é a cara do ecrã. Um número só é o que faz com que os dois blocos sejam o
 * mesmo bloco - o do Perfil é este, com a roda dentada em vez do sino e o botão de editar por baixo.
 */
export const HERO_AVATAR_SIZE = 80;

/**
 * O raio dos cantos como fração do lado da fotografia (22 num lado de 80). Um raio fixo fazia a
 * fotografia parecer redonda de um lado e quadrada do outro, conforme o tamanho.
 */
const AVATAR_RADIUS_RATIO = 0.275;

const EYEBROW_FONT_SIZE = 16;
const NAME_FONT_SIZE = 22;
const SUBTITLE_FONT_SIZE = 13;

export interface ScreenHeroProps extends ViewProps {
  name?: string;
  /** A segunda linha da identidade: o papel na Home, o curso no Perfil. */
  subtitle?: string;
  /**
   * Quantas linhas a segunda linha pode ocupar.
   *
   * Uma por omissão, e é a regra da Home: o papel é uma palavra fixa ("Tutorando", "Mentor e
   * Tutorando") e uma linha a mais era altura que saía de um ecrã desenhado para não rolar. O
   * Perfil passa **2**, porque a linha de lá é um dado escolhido pela pessoa ("Engenharia
   * Informática e Computadores, 3º ano") e não se pode truncar por causa de uma fotografia ao
   * lado.
   */
  subtitleLines?: number;
  /** A linha por cima do nome - a saudação da Home. Nenhum outro ecrã a usa. */
  eyebrow?: string;
  photoUri?: string;
  initials?: string;
  avatarSize?: number;
  /**
   * Título do ecrã. É o que os ecrãs sem identidade mostram (o Matches, o Chat e o Pesquisar); a
   * Home e o Perfil, que levam identidade, não o usam - o nome do ecrã repetido por baixo do nome
   * de quem lá está não diz nada de novo.
   */
  title?: string;
  /** Ação no canto direito, alinhada com a identidade (o sino, a roda dentada). */
  rightAction?: ReactNode;
  /**
   * Conteúdo por baixo das linhas da identidade, na mesma coluna do nome (o botão de editar do
   * Perfil).
   *
   * Vive aqui, e não num componente de identidade próprio do ecrã, por uma razão que já se pagou
   * uma vez: o Perfil chegou a trazer o seu bloco de identidade (`ProfileHeader`), com a fotografia,
   * o nome e o curso desenhados à parte - e o resultado foi uma fotografia de 96, um nome de 20 e um
   * curso cinzento ao lado dos 80, 22 e near-black da Home. Duas cópias da mesma identidade só
   * divergem. O que o Perfil tem de diferente é **isto**: uma coisa a mais por baixo das linhas.
   */
  identityExtra?: ReactNode;
  /**
   * O espaço por cima, que traz a barra de estado. Vem do ecrã porque é ele que sabe a altura da
   * barra (`insets.top`); sem isto, o gradiente fica debaixo dos ícones do sistema.
   */
  topInset?: number;
}

/**
 * O bloco em gradiente que abre os separadores - o mesmo esqueleto da Home em todos eles.
 *
 * Cinco ecrãs montavam cinco cabeçalhos diferentes: a Home com identidade e sino, o Chat e o
 * Pesquisar com o título e o campo de pesquisa, o Matches com um título só, o Perfil com o título
 * e a roda dentada do lado oposto. Aqui há um só, e cada ecrã diz o que leva lá dentro.
 *
 * **A forma**: um retângulo que encosta ao topo do ecrã (o gradiente tem de chegar à barra de
 * estado, por isso o ecrã não pode pôr o `SafeAreaView` a tratá-la em cima) e com cantos
 * arredondados só em baixo. O tom é o claro do acento na paleta (`heroTop` → `heroBottom`), o
 * mesmo que o ecrã põe por trás das listas: é o que aparece na faixa revelada ao puxar o conteúdo
 * para baixo.
 *
 * **A ordem**: a identidade (fotografia, nome, papel) com a ação do canto à direita e alinhadas
 * pelo centro, e o título do ecrã por baixo.
 *
 * **O que cada separador leva:**
 *
 * | | identidade | título | canto |
 * |---|---|---|---|
 * | Home | saudação + nome + papel (foto 80) | - | sino |
 * | Perfil | nome + curso + **Editar** (foto 80) | - | roda dentada |
 * | Matches, Chat, Pesquisar | - | o nome do ecrã | - |
 *
 * A identidade é opcional: sem `name`, o bloco fica só com o título, que sobe para o lugar dela. É
 * o caso do Matches, do Chat e do Pesquisar - o nome de quem já está a ver a app, repetido em três
 * separadores, diz menos do que o nome do ecrã, e um bloco de 150 px só para dizer "Chat" é altura
 * que sai da lista.
 *
 * O bloco rola com a lista (é o primeiro elemento dela, como na Home): quem desliza para ver
 * conteúdo está a olhar para o conteúdo, e um cabeçalho preso ao topo é o que fica a comer o ecrã.
 */
export function ScreenHero({
  name = '',
  subtitle,
  subtitleLines = 1,
  eyebrow,
  photoUri,
  initials,
  avatarSize = HERO_AVATAR_SIZE,
  title,
  rightAction,
  identityExtra,
  topInset = 0,
  style,
  ...rest
}: ScreenHeroProps) {
  const theme = useTheme();
  const hasIdentity = Boolean(name);

  return (
    <LinearGradient
      colors={[theme.heroTop, theme.heroBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.hero, { paddingTop: topInset + Spacing.six }, style]}
      {...rest}>
      {hasIdentity && (
        <View style={styles.identity}>
          <View style={styles.identityContent}>
            <View style={styles.row}>
              <ProfilePicCard
                image={photoUri}
                // Sem iniciais explícitas, usa a primeira letra do nome como alternativa.
                initials={initials || name.charAt(0).toUpperCase()}
                accessibilityLabel={name}
                size={avatarSize}
                fontSize={Math.round(avatarSize * 0.375)}
                radius={Math.round(avatarSize * AVATAR_RADIUS_RATIO)}
                borderWidth={2}
                // Sem fotografia, as iniciais ficam sobre branco cheio com a letra quase preta: um
                // branco translúcido sobre um bloco claro não dava contraste nenhum à letra.
                backgroundColor={theme.surface}
                textColor={theme.textPrimary}
              />
              <View style={styles.intro}>
                {eyebrow ? (
                  <ThemedText type="body" style={styles.eyebrow}>
                    {eyebrow}
                  </ThemedText>
                ) : null}
                <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                  {name}
                </ThemedText>
                {subtitle ? (
                  <ThemedText type="small" style={styles.subtitle} numberOfLines={subtitleLines}>
                    {subtitle}
                  </ThemedText>
                ) : null}
                {identityExtra ? <View style={styles.extra}>{identityExtra}</View> : null}
              </View>
            </View>
          </View>

          {rightAction}
        </View>
      )}

      {title ? (
        <ThemedText type="title" style={[styles.title, !hasIdentity && styles.titleAlone]}>
          {title}
        </ThemedText>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.five,
    // Cantos arredondados só em baixo: em cima o bloco encosta ao limite do ecrã.
    borderBottomLeftRadius: Spacing.six,
    borderBottomRightRadius: Spacing.six,
  },
  identity: {
    flexDirection: 'row',
    // Centrado nas peças: é isto que põe a ação do canto à altura da fotografia em vez de sozinha
    // por cima dela.
    alignItems: 'center',
    // 12 e não 16: numa linha com uma fotografia grande, a ação e os intervalos roubam largura ao
    // nome - e o nome é a única das peças que é informação variável (um nome comprido trunca-se,
    // uma fotografia não).
    gap: Spacing.two,
  },
  identityContent: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  intro: {
    flex: 1,
  },
  // O que os ecrãs põem por baixo das linhas (o botão de editar do Perfil): o intervalo é daqui e
  // não do `intro`, porque um `gap` na coluna mudava também a Home - que já está como deve estar.
  extra: {
    marginTop: Spacing.two,
    alignItems: 'flex-start',
  },
  // As linhas vivem aqui, e não no JSX, para a escala do bloco estar num sítio só. O nome é preto
  // cheio; a saudação e o papel são o mesmo preto a 70% - sobre um tom tão claro, a hierarquia
  // faz-se por tamanho e por essa diferença pequena de peso, não por cor.
  eyebrow: {
    fontSize: EYEBROW_FONT_SIZE,
    color: 'rgba(26, 26, 26, 0.7)',
  },
  name: {
    fontSize: NAME_FONT_SIZE,
    color: '#1A1A1A',
  },
  subtitle: {
    marginTop: 2,
    fontSize: SUBTITLE_FONT_SIZE,
    color: 'rgba(26, 26, 26, 0.7)',
  },
  // O título do ecrã não é gritado: "Matches" é um nome, não um aviso.
  title: {
    marginTop: Spacing.three,
    textTransform: 'none',
  },
  // Sem identidade por cima, o título é a primeira coisa do bloco: o intervalo existe para o
  // separar de algo, e não há nada de que o separar.
  titleAlone: {
    marginTop: 0,
  },
});
