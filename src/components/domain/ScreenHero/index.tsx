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

/**
 * O tamanho da segunda linha (o papel, o curso).
 *
 * É exportado porque a **ação** que a pode acompanhar tem de ser do mesmo tamanho (o "Editar" do
 * Perfil, ver `Profile/EditButton`): é isso que faz o botão caber na linha em vez de a esticar, e
 * portanto que faz a Home e o Perfil medirem o mesmo. Um número só, lido dos dois lados, é o que
 * impede os dois de divergirem por serem escritos em sítios diferentes - foi assim que a fotografia
 * de 96 chegou ao lado da de 80.
 */
export const HERO_SUBTITLE_FONT_SIZE = 13;

export interface ScreenHeroProps extends ViewProps {
  name?: string;
  /** A segunda linha da identidade: o papel na Home, o curso no Perfil. */
  subtitle?: string;
  /**
   * Quantas linhas a segunda linha pode ocupar.
   *
   * Uma por omissão, e é a regra da Home: o papel é uma palavra fixa ("Tutorando", "Mentor e
   * Tutorando") e uma linha a mais era altura que saía de um ecrã desenhado para não rolar. O
   * Perfil passa **2** para o curso de um aluno, porque a linha de lá é um dado escolhido pela
   * pessoa ("Engenharia Informática e Computadores, 3º ano") e não se pode truncar por causa de uma
   * fotografia ao lado; para um professor passa **1**, porque a linha é o papel ("Tutor") - o mesmo
   * que a Home mostra.
   */
  subtitleLines?: number;
  /** A linha por cima do nome - a saudação. A Home e o Perfil usam-na (ver `greetingLabel` em
   * src/lib/home.ts). */
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
   * Uma ação na **linha do papel**, à direita dele (o "Editar" do Perfil).
   *
   * Vive aqui, e não num bloco de identidade próprio do ecrã, por uma razão que já se pagou uma
   * vez: o Perfil chegou a trazer o seu bloco de identidade (`ProfileHeader`), com a fotografia, o
   * nome e o curso desenhados à parte - e o resultado foi uma fotografia de 96, um nome de 20 e um
   * curso cinzento ao lado dos 80, 22 e near-black da Home. Duas cópias da mesma identidade só
   * divergem. O que o Perfil tem de diferente é **isto**: uma coisa a mais na linha de baixo.
   *
   * **Porque não por baixo das linhas**, que foi onde esteve: uma quarta linha no bloco torna-o
   * mais alto, e como a identidade é centrada o bloco cresce para cima e para baixo - a fotografia,
   * o nome, o papel e a ação do canto desciam uns pixels no Perfil e não na Home, e os dois
   * cabeçalhos deixavam de estar alinhados (foi assim que ficaram com alturas diferentes).
   *
   * Na linha do papel não se acrescenta altura, **mas isso depende do que o ecrã lá põe**: a linha
   * é medida pelo texto (13 px, `HERO_SUBTITLE_FONT_SIZE`) e a ação só lá cabe se não for mais alta
   * do que ele. Uma pastilha de contorno com uma altura própria (um ícone de 22 dentro de uma caixa)
   * é mais alta do que a linha e é ela que passa a mandar na altura - o bloco do Perfil cresce, o da
   * Home não, e volta o desalinhamento que isto veio resolver. O "Editar" é um link do tamanho do
   * texto por isso, e não por ser mais bonito.
   */
  subtitleAction?: ReactNode;
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
 * **A ordem**: a identidade (fotografia, saudação, nome, papel) com a ação do canto à direita,
 * alinhadas pelo **topo**, e o título do ecrã por baixo. A ação do canto é a única peça centrada - e
 * centrada na **fotografia**, não no bloco (ver `styles.actionSlot`).
 *
 * **O que cada separador leva:**
 *
 * | | identidade | título | canto | linha do papel |
 * |---|---|---|---|---|
 * | Home | saudação + nome + papel (foto 80) | - | sino | - |
 * | Perfil | saudação + nome + papel ou curso (foto 80) | - | roda dentada | **Editar** |
 * | Matches, Chat, Pesquisar | - | o nome do ecrã | - | - |
 *
 * **Os dois ecrãs que levam identidade põem as mesmas peças no mesmo sítio.** Não é um detalhe de
 * gosto: é a razão de a ação do Perfil viver **na linha do papel** em vez de por baixo das linhas,
 * de ser do tamanho do texto em vez de uma caixa com altura própria, e de a identidade estar
 * ancorada ao topo em vez de centrada.
 *
 * Enquanto era centrada, a altura do **texto** decidia onde ficavam a fotografia, a saudação, o nome
 * e a ação do canto: um curso em duas linhas (o de um aluno) tornava o bloco do Perfil mais alto do
 * que o da Home e empurrava-os todos uns pixels para baixo só ali. Com o topo, o que pode crescer é
 * apenas o **fundo do bloco** - e é por isso que a ação do canto é centrada na fotografia e não no
 * bloco: a altura dela é a da cara (`avatarSize`), não a do que o texto ocupa.
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
  subtitleAction,
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
                {/* As três linhas respiram: 4 px entre a saudação e o nome (que se lêem como uma
                    frase) e 12 antes do papel, que é uma linha de outra natureza. */}
                <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                  {name}
                </ThemedText>
                {subtitle || subtitleAction ? (
                  <View style={styles.subtitleRow}>
                    {subtitle ? (
                      <ThemedText type="small" style={styles.subtitle} numberOfLines={subtitleLines}>
                        {subtitle}
                      </ThemedText>
                    ) : null}
                    {subtitleAction}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* A ação do canto é centrada na **fotografia**, e não no bloco todo: o bloco pode ser
              mais alto do que ela (o curso de um aluno, em duas linhas) e, com a identidade
              ancorada ao topo, centrar no bloco arrastava o sino e a roda dentada para baixo nesse
              caso. Assim ficam à altura do meio da cara, sempre. */}
          <View style={[styles.actionSlot, { height: avatarSize }]}>{rightAction}</View>
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
    // Ancorado ao **topo**, e não ao centro das peças: com o centro, a altura do texto decidia onde
    // ficavam a fotografia, o nome e a saudação - e o curso de um aluno (duas linhas) empurrava-os
    // para baixo só no Perfil, que é exatamente o desalinhamento que isto veio resolver. Com o topo,
    // as três linhas e a fotografia começam no mesmo sítio em qualquer dos ecrãs; o que cresce, se
    // crescer, é o fundo do bloco.
    alignItems: 'flex-start',
    // 12 e não 16: numa linha com uma fotografia grande, a ação e os intervalos roubam largura ao
    // nome - e o nome é a única das peças que é informação variável (um nome comprido trunca-se,
    // uma fotografia não).
    gap: Spacing.two,
  },
  identityContent: {
    flex: 1,
  },
  // A coluna da ação do canto (o sino, a roda dentada): a altura da fotografia, com a ação centrada
  // nela - é o que a põe à altura do meio da cara e não no sítio onde o texto a empurrasse.
  actionSlot: {
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  intro: {
    flex: 1,
  },
  // A linha do papel - e, no Perfil, o "Editar" ao lado dele. **Não tem altura própria**: quem a
  // mede é o texto, e a ação que a acompanha é do tamanho dele (ver `subtitleAction`). O intervalo
  // lateral é curto (8) porque o texto e o link devem ler-se como uma linha só, e não como duas
  // coisas afastadas na mesma linha.
  subtitleRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // As linhas vivem aqui, e não no JSX, para a escala do bloco estar num sítio só. O nome é preto
  // cheio; a saudação e o papel são o mesmo preto a 70% - sobre um tom tão claro, a hierarquia
  // faz-se por tamanho e por essa diferença pequena de peso, não por cor.
  eyebrow: {
    fontSize: EYEBROW_FONT_SIZE,
    color: 'rgba(26, 26, 26, 0.7)',
  },
  name: {
    // 4 px depois da saudação: "Boa tarde," e o nome lêem-se como uma frase, e é assim que se
    // separam - por pouco. O papel, esse, leva 12 (ver `subtitleRow`): é outra linha, diz outra
    // coisa e é a que pode levar uma ação ao lado.
    marginTop: Spacing.half,
    fontSize: NAME_FONT_SIZE,
    color: '#1A1A1A',
  },
  // `flexShrink` (e não `flex`) para o texto continuar colado ao botão quando é curto ("Tutor
  // Editar") e para encolher - em duas linhas, se o ecrã as pedir - quando é comprido (o curso de
  // um aluno), em vez de empurrar o botão para a outra ponta da coluna.
  subtitle: {
    flexShrink: 1,
    fontSize: HERO_SUBTITLE_FONT_SIZE,
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
