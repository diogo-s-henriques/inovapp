/**
 * Testes do `AgendaCard` — o calendário da agenda no ecrã inicial.
 *
 * O cartão faz três coisas: abre no mês em que estamos, põe um ponto nos dias com sessão e devolve
 * ao ecrã a chave do dia tocado (é o ecrã que empilha a agenda nesse dia). A primeira e a terceira
 * partem-se em silêncio — um calendário a abrir em Outubro, ou a devolver o dia errado, continua a
 * parecer um calendário.
 *
 * O ponto é o caso mais frágil de todos: um dia marcado e um dia vazio desenham a mesma célula, com
 * a mesma altura e o mesmo número, e a diferença é um círculo de 4 px sem rótulo nenhum (um sinal
 * visual não se anuncia a um leitor de ecrã). Só se lhe chega pelo estilo, e é por isso que o teste
 * o faz — é a única forma de provar que `markedDates` atravessa o cartão até à grelha.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AgendaCard } from '@/components/domain/AgendaCard';
import { Colors } from '@/constants/theme';
import { toDateKey } from '@/lib/time';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

const HOJE = new Date();

beforeEach(() => {
  useLocaleStore.getState().setLocale('pt');
});

/** A chave de um dia do mês em que estamos: o cartão abre sempre no mês de hoje. */
function diaDoMes(dia: number): string {
  return toDateKey(new Date(HOJE.getFullYear(), HOJE.getMonth(), dia));
}

/** O título do mês deslocado `salto` meses a partir de hoje (novembro depois de dezembro → janeiro). */
function tituloDoMes(salto: number): string {
  const mes = new Date(HOJE.getFullYear(), HOJE.getMonth() + salto, 1);
  return `${pt.calendar.months[mes.getMonth()]} ${mes.getFullYear()}`;
}

/**
 * O estilo do `indice`-ésimo filho de uma célula do calendário: 0 é o círculo do dia, 1 é o ponto
 * das sessões (ver CalendarMonth).
 */
function estiloDoFilho(celula: unknown, indice: number): { backgroundColor?: string; height?: number; width?: number } {
  const filhos = celula as { children: { props: { style?: unknown } }[] };
  return StyleSheet.flatten(filhos.children[indice].props.style) as {
    backgroundColor?: string;
    height?: number;
    width?: number;
  };
}

describe('calendário da agenda', () => {
  it('abre no mês em que estamos', async () => {
    const { getByText } = await render(<AgendaCard markedDates={new Set()} onPressDay={jest.fn()} />);

    expect(getByText(tituloDoMes(0))).toBeTruthy();
  });

  it('avança sozinho para o mês seguinte', async () => {
    // O mês é do cartão, e não do ecrã: navegar para ver o que vem aí é uma pergunta que se faz ao
    // calendário. Se o estado subisse para o ecrã, isto continuava a passar — mas o ecrã passava a
    // guardar estado que não usa para mais nada.
    const { getByLabelText, getByText } = await render(
      <AgendaCard markedDates={new Set()} onPressDay={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText(pt.calendar.nextMonth));

    expect(getByText(tituloDoMes(1))).toBeTruthy();
  });
});

describe('calendário da agenda — os dias com sessão', () => {
  it('marca os dias com sessão e só esses', async () => {
    const { getByLabelText } = await render(
      <AgendaCard markedDates={new Set([diaDoMes(15), diaDoMes(20)])} onPressDay={jest.fn()} />,
    );

    expect(estiloDoFilho(getByLabelText(diaDoMes(15)), 1).backgroundColor).toBe(Colors.primary);
    expect(estiloDoFilho(getByLabelText(diaDoMes(20)), 1).backgroundColor).toBe(Colors.primary);
    // O dia 16 está entre os dois e tem de ficar sem ponto: um marcador que se alastra aos vizinhos
    // diria que há sessão em todos os dias do mês.
    expect(estiloDoFilho(getByLabelText(diaDoMes(16)), 1).backgroundColor).toBe('transparent');
  });

  it('sem sessões nenhumas, nenhum dia fica marcado', async () => {
    const { getByLabelText } = await render(<AgendaCard markedDates={new Set()} onPressDay={jest.fn()} />);

    expect(estiloDoFilho(getByLabelText(diaDoMes(15)), 1).backgroundColor).toBe('transparent');
  });

  it('a célula do dia cabe no orçamento de altura da Home', async () => {
    const { getByLabelText } = await render(<AgendaCard markedDates={new Set()} onPressDay={jest.fn()} />);

    const circulo = estiloDoFilho(getByLabelText(diaDoMes(10)), 0);
    const ponto = estiloDoFilho(getByLabelText(diaDoMes(10)), 1);

    // A grelha do mês é a peça mais alta da Home, e a Home tem de caber num ecrã sem rolar (a conta
    // está no README, na entrada do ecrã inicial). Isto é um **limite**, e não o valor que lá está:
    // 28 é o de hoje e 30 ainda cabe. O que não pode voltar é o dia de 32 px que lá estava, que
    // sozinho custava 24 px de altura ao ecrã — e um ecrã que rola sem ter nada a mais.
    expect(circulo.height).toBeLessThanOrEqual(30);
    expect(circulo.width).toBeLessThanOrEqual(30);
    expect(ponto.height).toBeLessThanOrEqual(4);
  });
});

describe('calendário da agenda — o toque num dia', () => {
  it('devolve a chave do dia tocado, e não a de hoje', async () => {
    const onPressDay = jest.fn();
    const { getByLabelText } = await render(<AgendaCard markedDates={new Set()} onPressDay={onPressDay} />);

    await fireEvent.press(getByLabelText(diaDoMes(10)));

    expect(onPressDay).toHaveBeenCalledWith(diaDoMes(10));
    expect(onPressDay).toHaveBeenCalledTimes(1);
  });
});
