/**
 * Lógica pura do ecrã inicial (`src/app/(tabs)/index.tsx`).
 *
 * Vive fora do componente porque são regras com fronteiras - a hora a que a saudação muda, o que
 * conta como "à espera de resposta", o que faz a Home estar vazia - e nenhuma delas precisa de
 * React para ser verificada.
 */
import type { Translations } from '@/i18n/translations';

/** Saudação por hora do dia. Fronteiras: manhã até às 12:00, tarde até às 20:00, noite depois. */
export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function greetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 20) return 'afternoon';
  return 'evening';
}

/**
 * A saudação escrita, a partir do período do dia.
 *
 * Vive aqui, e não dentro de um componente, porque **dois ecrãs a mostram**: a Home e o Perfil - o
 * cabeçalho dos dois é o mesmo bloco, e a saudação é a linha de cima dele. Enquanto isto era um
 * `if` dentro do `HomeHeader`, o Perfil (que não passa por ele) não a podia ter sem uma segunda
 * cópia da escolha - e duas cópias da mesma escolha foi o que já se pagou uma vez com o curso do
 * perfil.
 *
 * Recebe o dicionário em vez de o ir buscar, para poder ser testada com um dicionário fixo (é pura:
 * sem React e sem base de dados).
 */
export function greetingLabel(period: GreetingPeriod, i18n: Translations): string {
  if (period === 'morning') return i18n.home.greetingMorning;
  if (period === 'afternoon') return i18n.home.greetingAfternoon;
  return i18n.home.greetingEvening;
}

/**
 * O que está à espera de uma decisão do utilizador. A ordem em que aparecem na Home é a da
 * prioridade: um pedido de conexão é uma pessoa à espera de resposta, um pedido de sessão é uma
 * aula marcada por confirmar, e as mensagens por ler são as menos urgentes das três.
 */
export type AttentionKind = 'connections' | 'sessions' | 'messages';

export interface AttentionItem {
  kind: AttentionKind;
  count: number;
}

const ATTENTION_ORDER: readonly AttentionKind[] = ['connections', 'sessions', 'messages'];

/**
 * Só o que existe: uma linha a dizer "0 pedidos" seria decoração a ocupar o topo do ecrã - e a
 * faixa só vale a pena precisamente enquanto tiver algo para dizer. Uma contagem negativa (que não
 * devia acontecer, mas vem de dados) é tratada como zero em vez de aparecer como "-1 pendências".
 */
export function toAttentionItems(counts: Record<AttentionKind, number>): AttentionItem[] {
  return ATTENTION_ORDER.filter((kind) => (counts[kind] ?? 0) > 0).map((kind) => ({ kind, count: counts[kind] }));
}

/** O que a Home tem para mostrar, reduzido ao que decide se o ecrã está vazio. */
export interface HomeFill {
  /** Sessões marcadas e ainda por acontecer. */
  sessions: number;
  /** Ligações aceites, nos dois sentidos (mentores e tutorandos). */
  connections: number;
  /** Pendências - o que `toAttentionItems` devolveu, já contado. */
  attention: number;
}

/**
 * Verdadeiro só quando não há mesmo nada: nem sessões, nem ligações, nem pendências. É isto que
 * decide se a Home mostra o guia de primeiros passos - a mesma condição é a razão de o guia
 * existir (um ecrã só com a saudação e dois atalhos) e a razão de ele sair (por cima de conteúdo
 * real, passava a ser ruído).
 */
export function isHomeEmpty(fill: HomeFill): boolean {
  return fill.sessions === 0 && fill.connections === 0 && fill.attention === 0;
}
