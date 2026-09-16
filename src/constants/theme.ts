// Paleta de cores única da app (ver src/hooks/use-theme.ts — não há modo escuro por agora).
//
// A base é **cinzenta**: o fundo dos ecrãs é um cinzento muito claro e as superfícies são brancas.
// Foi ao contrário numa versão antiga (fundo azulado com cartões brancos) e o azul do fundo pintava
// o ecrã todo, tirando força ao azul onde ele significava alguma coisa.
//
// O **acento** da app é uma ameixa (roxo). Já foi o azul da marca (`#0085CA`, o `colors.txt` dos
// mockups) e foi trocado por decisão de quem desenha o produto. A razão técnica para ter parado no
// roxo, e não noutra cor: as cores de **estado** já ocupam o verde (sucesso), o vermelho (erro) e o
// âmbar (aviso), e o acento tem de ser reconhecível ao lado delas. O roxo é a única família que
// sobra — um laranja confundia-se com o aviso, um vinho com o erro e um verde com o sucesso.
//
// O acento vive onde é um **sinal** e não decoração: a ação principal, o estado escolhido, o número
// que conta. O único fundo com cor é o bloco que abre os separadores, e é um tom tão claro que o
// texto por cima continua a ser escuro (branco não se lia sobre ele).
//
// Os ícones seguem a mesma ideia: são todos de **contorno** e a preto (`textPrimary`) sobre
// superfícies claras. As exceções são três, e cada uma tem uma razão: os que assentam num cheio
// colorido (botão primário, pastilha escura) vão a branco, senão desapareciam; os de **estado**
// (estrelas da avaliação, visto de sucesso, ponto vermelho de aviso) mantêm a sua cor, porque um
// visto cinzento deixa de dizer "correu bem".
export const Colors = {
  // O acento: botão principal, estado escolhido (chip, dia do calendário), números que contam.
  // Passa 6,9:1 de contraste com o branco — chega para texto branco por cima dele.
  primary: '#5B4BA8',
  // A tinta do acento. Faz dois trabalhos que parecem opostos: é fundo para texto branco (a
  // pastilha do perfil, o botão do modal) e é cor de texto sobre branco (os números do perfil, o
  // subtítulo de um cartão) — 11:1 nos dois sentidos.
  primaryDark: '#3F2F7A',
  // O topo do bloco que abre os separadores — o único sítio da app com cor de fundo. É quase
  // branco com um resto de ameixa, e a descer para o tom das pastilhas: claro o suficiente para a
  // saudação, o nome e o papel continuarem a preto (branco não se lia sobre ele). Lê-se sobretudo
  // pela **forma** (os cantos arredondados em baixo e a diferença para o cinzento do ecrã).
  heroTop: '#FBFAFE',
  heroBottom: '#EDE9FA',
  // O tom suave "cheio": pastilhas, quadrados de ícone e cartões que têm de se ver por cima do
  // cinzento dos ecrãs. Este mais fundo do que um primeiro `#E4DEF8` que durou uma volta: sobre o
  // cinzento, o tom claro desaparecia (1,20:1 de diferença) e as pastilhas liam-se como se não
  // tivessem fundo. Com este, a diferença é 1,30:1 e o texto preto por cima continua a 12:1.
  primarySoft: '#DCD4F5',
  borderAccent: '#D3C9F0',
  onPrimary: '#FFFFFF',

  success: '#1E9E5A',
  successSoft: '#E3F6EA',

  danger: '#E5484D',
  dangerSoft: '#FBE7E8',
  warning: '#F5A623',
  warningSoft: '#FDF0DC',

  rating: '#FFB800',

  // Contorno da fotografia de perfil. É um preto quase transparente e não uma linha cheia: serve
  // para a fotografia ganhar uma borda em qualquer fundo (o bloco do cabeçalho, o cinzento do
  // perfil) sem virar um aro gráfico. As fotografias pequenas das listas não o levam — a 32 px
  // um contorno ocupa mais do que a cara que emoldura.
  photoBorder: 'rgba(26, 26, 26, 0.14)',

  textPrimary: '#1A1A1A',
  textNav: '#5F6368',
  textMuted: '#9AA0A6',

  // Fundo dos ecrãs: cinzento muito claro, para os cartões e campos brancos se destacarem dele.
  background: '#F4F5F7',
  surface: '#FFFFFF',
  // Preenchimento secundário dentro de cartões brancos (caixas de estatística, ícones, barras).
  surfaceAlt: '#EFF1F4',
  border: '#E4E7EB',
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

/**
 * Tamanho dos ícones.
 *
 * Um só valor para **toda a interface** (`ui`), e não um por sítio: os ícones eram desenhados a
 * 14, 16, 18, 20, 22 e 24 conforme quem os escreveu, e o resultado via-se nas páginas com mais do
 * que um — o sino de 22 ao lado do chevron de 16, o lápis de 14 ao lado da roda dentada de 20,
 * tudo na mesma linha de visão. Numa página em que todos os símbolos são do mesmo tamanho, o
 * desenho passa a ser do ecrã, e não de cada componente.
 *
 * A exceção é o `state`: um ícone grande e sozinho dentro de um círculo de estado (o visto de
 * sucesso, o ponto de interrogação da confirmação, o cadeado do ecrã bloqueado). Não é um símbolo
 * de interface ao lado de outros — é a ilustração daquele estado, e a 22 px perdia-se no círculo de
 * 64. Os sinais **dentro** de um controlo pequeno (o visto da caixa de seleção, de 18 px) também
 * não seguem isto: um visto de 22 dentro de uma caixa de 18 não é estilo, é um controlo partido.
 */
export const IconSize = {
  ui: 22,
  state: 28,
} as const;

/**
 * Lado do quadrado onde um ícone de interface assenta (ícone de 22 + 2×9 de folga).
 *
 * É um valor do tema e não o valor por omissão de cada componente porque três sítios diferentes
 * têm de dar o mesmo: os cartões com ícone (`IconTextCard`), as linhas "Novidades" da Home
 * (`AttentionCard`) e o sino do cabeçalho. Andaram a 34 e a 40 ao mesmo tempo — na mesma página, a
 * 40 px de distância, e lia-se como um ícone mal desenhado, não como duas intenções.
 */
export const IconBoxSize = 40;
